"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { requireUser, writeAudit } from "@/lib/auth";
import {
  APPLY_STEPS,
  EDITABLE_STATUSES,
  countWords,
  getBlockingProblems,
  getCompleteness,
  getOrCreateApplication,
  stepSchemas,
  type StepSlug,
} from "@/lib/application";
import { getCallTiming } from "@/lib/call";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string } | undefined;

function nextStepSlug(current: StepSlug): string {
  const index = APPLY_STEPS.findIndex((step) => step.slug === current);
  return APPLY_STEPS[Math.min(index + 1, APPLY_STEPS.length - 1)].slug;
}

export async function saveStep(
  step: Exclude<StepSlug, "documents" | "review">,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/apply/${step}`);
  const context = await getOrCreateApplication(user.id);

  if (!context) {
    return { error: "Идэвхтэй тэтгэлгийн зарлал алга байна." };
  }

  if (!EDITABLE_STATUSES.includes(context.application.status)) {
    return { error: "Илгээсэн өргөдлийг засах боломжгүй." };
  }

  const raw = Object.fromEntries(formData);

  if (step === "essay") {
    const parsed = stepSchemas.essay.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    await prisma.application.update({
      where: { id: context.application.id },
      data: {
        essayText: parsed.data.essayText,
        essayWordCount: countWords(parsed.data.essayText),
      },
    });
  } else {
    const parsed = stepSchemas[step].safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    await prisma.application.update({
      where: { id: context.application.id },
      data: parsed.data,
    });
  }

  revalidatePath("/apply", "layout");
  redirect(`/apply/${nextStepSlug(step)}`);
}

export async function submitApplication(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/apply/review");

  if (!user.emailVerifiedAt) {
    return {
      error:
        "Өргөдөл илгээхийн өмнө и-мэйл хаягаа баталгаажуулна уу. Баталгаажуулах холбоосыг хувийн хуудаснаас дахин авах боломжтой.",
    };
  }

  const context = await getOrCreateApplication(user.id);
  if (!context) {
    return { error: "Идэвхтэй тэтгэлгийн зарлал алга байна." };
  }

  const { call, application } = context;

  if (!EDITABLE_STATUSES.includes(application.status)) {
    return { error: "Өргөдөл аль хэдийн илгээгдсэн байна." };
  }

  const timing = getCallTiming(call);
  if (!timing.isOpen) {
    return { error: "Өргөдөл хүлээн авах хугацаа дууссан байна." };
  }

  const problems = getBlockingProblems(getCompleteness(application, call));
  if (problems.length > 0) {
    return { error: problems[0] };
  }

  const submittedAt = new Date();

  await prisma.application.update({
    where: { id: application.id },
    data: { status: ApplicationStatus.SUBMITTED, submittedAt },
  });

  await writeAudit({
    actorId: user.id,
    action: "application.submit",
    targetType: "Application",
    targetId: application.id,
  });

  await sendEmail({
    to: user.email,
    template: "application-received",
    applicationId: application.id,
    data: {
      name: user.name,
      code: application.id.slice(-8).toUpperCase(),
      submittedAt: submittedAt.toLocaleString("mn-MN"),
    },
  });

  revalidatePath("/apply", "layout");
  redirect("/dashboard?submitted=1");
}

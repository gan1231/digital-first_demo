"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { requireUser, writeAudit } from "@/lib/auth";
import {
  APPLY_STEPS,
  EDITABLE_STATUSES,
  countWords,
  createApplication,
  educationSchema,
  essaySchema,
  getApplicationContext,
  getBlockingProblems,
  getCompleteness,
  majorSchema,
  personalSchema,
  type StepSlug,
} from "@/lib/application";
import { getActiveCalls, getCallTiming } from "@/lib/call";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string } | undefined;

type EditableStep = Extract<
  StepSlug,
  "personal" | "education" | "major" | "essay"
>;

function nextStepSlug(current: StepSlug): string {
  const index = APPLY_STEPS.findIndex((step) => step.slug === current);
  return APPLY_STEPS[Math.min(index + 1, APPLY_STEPS.length - 1)].slug;
}

/** Тэтгэлгийн төрлөө сонгож өргөдлөө нээх. */
export async function chooseTrack(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/apply");
  const callId = String(formData.get("callId") ?? "");

  const calls = await getActiveCalls();
  const call = calls.find((item) => item.id === callId);

  if (!call) {
    return { error: "Тэтгэлгийн төрөл олдсонгүй." };
  }

  if (!getCallTiming(call).isOpen) {
    return { error: "Энэ төрлийн хүлээн авах хугацаа дууссан байна." };
  }

  await createApplication(user.id, call.id);

  revalidatePath("/apply", "layout");
  redirect("/apply/personal");
}

export async function saveStep(
  step: EditableStep,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/apply/${step}`);
  const context = await getApplicationContext(user.id);

  if (!context) {
    return { error: "Эхлээд тэтгэлгийн төрлөө сонгоно уу." };
  }

  if (!EDITABLE_STATUSES.includes(context.application.status)) {
    return { error: "Илгээсэн өргөдлийг засах боломжгүй." };
  }

  const raw = Object.fromEntries(formData);

  if (step === "essay") {
    const parsed = essaySchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    await prisma.application.update({
      where: { id: context.application.id },
      data: {
        essayText: parsed.data.essayText,
        essayWordCount: countWords(parsed.data.essayText),
      },
    });
  } else {
    const schema =
      step === "personal"
        ? personalSchema
        : step === "major"
          ? majorSchema
          : educationSchema(context.call.track);

    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

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

  const context = await getApplicationContext(user.id);
  if (!context) {
    return { error: "Эхлээд тэтгэлгийн төрлөө сонгоно уу." };
  }

  const { call, application } = context;

  if (!EDITABLE_STATUSES.includes(application.status)) {
    return { error: "Өргөдөл аль хэдийн илгээгдсэн байна." };
  }

  if (!getCallTiming(call).isOpen) {
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
    meta: { callId: call.id, track: call.track },
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

"use server";

import { revalidatePath } from "next/cache";
import {
  ApplicationStatus,
  DecisionResult,
  Role,
  type ScoringCriterion,
} from "@prisma/client";
import { z } from "zod";
import { requireRole, writeAudit } from "@/lib/auth";
import { sendEmail, type EmailTemplate } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { computeTotal, type ScoreMap } from "@/lib/scoring";

export type FormState = { error?: string; ok?: string } | undefined;

/** Формын score__CODE / comment__CODE талбаруудыг ScoreMap болгоно. */
function readScores(
  formData: FormData,
  criteria: ScoringCriterion[],
): { scores: ScoreMap; error?: string } {
  const scores: ScoreMap = {};

  for (const criterion of criteria) {
    const rawScore = formData.get(`score__${criterion.code}`);
    const rawComment = formData.get(`comment__${criterion.code}`);

    const value = Number(rawScore);
    if (rawScore === null || rawScore === "" || Number.isNaN(value)) {
      return { scores, error: `«${criterion.label}» оноог оруулна уу.` };
    }

    if (value < 0 || value > criterion.maxScore) {
      return {
        scores,
        error: `«${criterion.label}» оноо 0-${criterion.maxScore} хооронд байна.`,
      };
    }

    scores[criterion.code] = {
      score: Math.round(value * 10) / 10,
      comment: String(rawComment ?? "").trim(),
    };
  }

  return { scores };
}

export async function saveEvaluation(
  applicationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);
  const isFinal = formData.get("intent") === "submit";

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { call: { include: { criteria: { orderBy: { sortOrder: "asc" } } } } },
  });

  if (!application) {
    return { error: "Өргөдөл олдсонгүй." };
  }

  if (application.status === ApplicationStatus.DRAFT) {
    return { error: "Илгээгээгүй өргөдлийг үнэлэх боломжгүй." };
  }

  const criteria = application.call.criteria;
  const { scores, error } = readScores(formData, criteria);
  if (error) return { error };

  // Баталгаажуулахын өмнө тайлбар шаардана — оноо яагаад тэгсэн нь мөрдөгдөх ёстой.
  if (isFinal) {
    const missing = criteria.find(
      (criterion) => scores[criterion.code].comment.length < 3,
    );
    if (missing) {
      return { error: `«${missing.label}» шалгуурт тайлбар бичнэ үү.` };
    }
  }

  const total = computeTotal(scores, criteria);
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const submittedAt = isFinal ? new Date() : null;

  await prisma.evaluation.upsert({
    where: {
      applicationId_reviewerId: { applicationId, reviewerId: user.id },
    },
    update: { scores, total, comment, submittedAt },
    create: {
      applicationId,
      reviewerId: user.id,
      scores,
      total,
      comment,
      submittedAt,
    },
  });

  // Эхний үнэлгээ ормогц өргөдөл «хянагдаж буй» төлөвт шилжинэ.
  if (application.status === ApplicationStatus.SUBMITTED) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.IN_REVIEW },
    });
  }

  await writeAudit({
    actorId: user.id,
    action: isFinal ? "evaluation.submit" : "evaluation.save",
    targetType: "Application",
    targetId: applicationId,
    meta: { total },
  });

  revalidatePath(`/reviewer/${applicationId}`);
  revalidatePath("/reviewer");
  revalidatePath("/reviewer/ranking");

  return {
    ok: isFinal
      ? `Үнэлгээ баталгаажлаа. Нийт ${total} оноо.`
      : `Ноорог хадгалагдлаа. Нийт ${total} оноо.`,
  };
}

const decisionSchema = z.object({
  result: z.enum(["APPROVED", "REJECTED", "WAITLISTED"]),
  note: z.string().trim().max(2000).optional(),
});

const emailByResult: Record<DecisionResult, EmailTemplate> = {
  APPROVED: "decision-approved",
  REJECTED: "decision-rejected",
  WAITLISTED: "decision-waitlisted",
};

const statusByResult: Record<DecisionResult, ApplicationStatus> = {
  APPROVED: ApplicationStatus.APPROVED,
  REJECTED: ApplicationStatus.REJECTED,
  WAITLISTED: ApplicationStatus.REJECTED,
};

export async function decide(
  applicationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole(Role.ADMIN);
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Шийдвэрээ сонгоно уу." };
  }

  const { result, note } = parsed.data;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: true, call: true },
  });

  if (!application) return { error: "Өргөдөл олдсонгүй." };

  await prisma.$transaction([
    prisma.decision.upsert({
      where: { applicationId },
      update: { result, note, decidedById: user.id, decidedAt: new Date() },
      create: {
        applicationId,
        result,
        note,
        decidedById: user.id,
      },
    }),
    prisma.application.update({
      where: { id: applicationId },
      data: { status: statusByResult[result] },
    }),
  ]);

  await writeAudit({
    actorId: user.id,
    action: "application.decide",
    targetType: "Application",
    targetId: applicationId,
    meta: { result },
  });

  await sendEmail({
    to: application.user.email,
    template: emailByResult[result],
    applicationId,
    data: {
      name: application.user.name,
      year: application.call.year,
      note: note ?? "",
    },
  });

  revalidatePath(`/reviewer/${applicationId}`);
  revalidatePath("/reviewer");
  revalidatePath("/reviewer/ranking");

  return { ok: "Шийдвэр хадгалагдаж, и-мэйл илгээгдлээ." };
}

/** Материал дутуу үед өргөдлийг өргөдөгч рүү буцаана. */
export async function requestFix(
  applicationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);
  const note = String(formData.get("note") ?? "").trim();

  if (note.length < 5) {
    return { error: "Юуг засах шаардлагатайг тодорхой бичнэ үү." };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });

  if (!application) return { error: "Өргөдөл олдсонгүй." };

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.NEEDS_FIX },
  });

  await writeAudit({
    actorId: user.id,
    action: "application.request_fix",
    targetType: "Application",
    targetId: applicationId,
    meta: { note },
  });

  await sendEmail({
    to: application.user.email,
    template: "needs-fix",
    applicationId,
    data: { name: application.user.name, note },
  });

  revalidatePath(`/reviewer/${applicationId}`);
  revalidatePath("/reviewer");

  return { ok: "Өргөдөгч рүү засварын хүсэлт илгээлээ." };
}

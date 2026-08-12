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

function readScores(
  formData: FormData,
  criteria: ScoringCriterion[],
): { scores: ScoreMap; error?: string } {
  const scores: ScoreMap = {};

  for (const criterion of criteria) {
    const commentKey = `comment__${criterion.code}`;
    if (!formData.has(commentKey)) {
      continue;
    }

    const rawComment = formData.get(commentKey);
    const rawScore = formData.get(`score__${criterion.code}`);
    const rawStatus = formData.get(`status__${criterion.code}`);

    let scoreValue: number | undefined = undefined;
    let statusValue: "VERIFIED" | "REJECTED" | undefined = undefined;

    if (rawScore !== null) {
      const value = Number(rawScore);
      if (rawScore === "" || Number.isNaN(value)) {
        return { scores, error: `«${criterion.label}» оноог оруулна уу.` };
      }
      if (value < 0 || value > criterion.maxScore) {
        return {
          scores,
          error: `«${criterion.label}» оноо 0-${criterion.maxScore} хооронд байна.`,
        };
      }
      scoreValue = Math.round(value * 10) / 10;
    } else if (rawStatus !== null) {
      if (rawStatus !== "VERIFIED" && rawStatus !== "REJECTED") {
        return { scores, error: `«${criterion.label}» төлөвийг зөв сонгоно уу.` };
      }
      statusValue = rawStatus;
    } else {
      return { scores, error: `«${criterion.label}» үнэлгээ байхгүй байна.` };
    }

    scores[criterion.code] = {
      score: scoreValue,
      status: statusValue,
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
  const allCriteria = [
    ...criteria,
    { code: "GUARANTOR_VERIFY", label: "Батлан даагчийн мэдээлэл", maxScore: 0 },
    { code: "APP_INFO_VERIFY", label: "Анкетны мэдээлэл", maxScore: 0 },
  ] as ScoringCriterion[];

  const { scores: newScores, error } = readScores(formData, allCriteria);
  if (error) return { error };

  const existingEvaluation = await prisma.evaluation.findUnique({
    where: { applicationId_reviewerId: { applicationId, reviewerId: user.id } },
  });
  
  // Merge scores with existing ones so that inactive sections are not lost
  const existingScores = existingEvaluation ? (existingEvaluation.scores as Record<string, any>) : {};
  const scores = { ...existingScores, ...newScores };

  // Баталгаажуулахын өмнө тайлбар шаардана — оноо яагаад тэгсэн нь мөрдөгдөх ёстой.
  if (isFinal) {
    const missing = allCriteria.find(
      (criterion) => {
        // We only require a comment if this criterion was actually submitted in the form
        // (i.e. we have it in scores and its comment is too short)
        return scores[criterion.code] !== undefined && scores[criterion.code].comment.length < 3;
      }
    );
    if (missing) {
      return { error: `«${missing.label}» шалгуурт тайлбар бичнэ үү.` };
    }
  }

  const total = computeTotal(scores, criteria, application);
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

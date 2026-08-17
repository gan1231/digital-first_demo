"use server";

import { timingSafeEqual } from "node:crypto";
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


export type FormState = { error?: string; ok?: string } | undefined;

function readScores(
  formData: FormData,
  criteria: ScoringCriterion[],
): { parsed: { criterionCode: string; score: number | null; status: "VERIFIED" | "REJECTED" | null; comment: string }[]; error?: string } {
  const parsed = [];
  for (const criterion of criteria) {
    const commentKey = `comment__${criterion.code}`;
    if (!formData.has(commentKey)) continue;

    const rawComment = formData.get(commentKey);
    const rawScore = formData.get(`score__${criterion.code}`);
    const rawStatus = formData.get(`status__${criterion.code}`);

    let scoreValue: number | null = null;
    let statusValue: "VERIFIED" | "REJECTED" | null = null;

    if (rawScore !== null) {
      const value = Number(rawScore);
      if (rawScore === "" || Number.isNaN(value)) {
        return { error: `«${criterion.label}» оноог оруулна уу.`, parsed: [] };
      }
      if (value < 0 || value > criterion.maxScore) {
        return {
          error: `«${criterion.label}» оноо 0-${criterion.maxScore} хооронд байна.`,
          parsed: [],
        };
      }
      scoreValue = Math.round(value * 10) / 10;
    } else if (rawStatus !== null) {
      if (rawStatus !== "VERIFIED" && rawStatus !== "REJECTED") {
        return { error: `«${criterion.label}» төлөвийг зөв сонгоно уу.`, parsed: [] };
      }
      statusValue = rawStatus;
    } else {
      return { error: `«${criterion.label}» үнэлгээ байхгүй байна.`, parsed: [] };
    }

    const comment = String(rawComment ?? "").trim();
    if (comment.length < 3) {
      return { error: `«${criterion.label}» шалгуурт тайлбар бичнэ үү.`, parsed: [] };
    }

    parsed.push({
      criterionCode: criterion.code,
      score: scoreValue,
      status: statusValue,
      comment,
    });
  }

  return { parsed };
}

export async function saveEvaluation(
  applicationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);

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

  const { parsed, error } = readScores(formData, allCriteria);
  if (error) return { error };
  if (!parsed || parsed.length === 0) return { error: "Хадгалах үнэлгээ олдсонгүй." };

  for (const item of parsed) {
    const existing = await prisma.criterionEvaluation.findUnique({
      where: { applicationId_criterionCode: { applicationId, criterionCode: item.criterionCode } }
    });

    if (existing && existing.reviewerId !== user.id) {
      return { error: "Шалгуурыг өөр шалгагч баталгаажуулсан байна." };
    }
  }

  await prisma.$transaction(
    parsed.map((item) =>
      prisma.criterionEvaluation.upsert({
        where: { applicationId_criterionCode: { applicationId, criterionCode: item.criterionCode } },
        update: { score: item.score, status: item.status, comment: item.comment, reviewerId: user.id },
        create: {
          applicationId,
          criterionCode: item.criterionCode,
          reviewerId: user.id,
          score: item.score,
          status: item.status,
          comment: item.comment,
        },
      })
    )
  );

  if (application.status === ApplicationStatus.SUBMITTED) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.IN_REVIEW },
    });
  }

  await writeAudit({
    actorId: user.id,
    action: "evaluation.submit",
    targetType: "Application",
    targetId: applicationId,
    meta: { codes: parsed.map(p => p.criterionCode) },
  });

  revalidatePath(`/reviewer/${applicationId}`);
  revalidatePath("/reviewer");
  revalidatePath("/reviewer/ranking");

  return { ok: "Үнэлгээ баталгаажлаа." };
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

/**
 * Жагсаалтаас нуухад шаардах нууц үг. Комиссын гишүүн бүр өөрийн эрхээр
 * ордог ч энэ үйлдэл нэмэлт баталгаа шаардана — санамсаргүй дарахаас сэргийлнэ.
 * .env-ийн ADMIN_HIDE_PASSWORD-оор солино.
 */
// `??` биш `||` — .env-д хоосон утга («ADMIN_HIDE_PASSWORD=""») үлдээсэн ч
// нууц үг хоосон болж, хэн ч дарж чаддаг болохоос сэргийлнэ.
const HIDE_PASSWORD = process.env.ADMIN_HIDE_PASSWORD || "ustgah9911";

/** Тогтмол хугацаанд харьцуулна — хугацааны зөрүүгээр нууц үг таамаглуулахгүй. */
function passwordMatches(input: string): boolean {
  if (input.length === 0) return false;
  const given = Buffer.from(input, "utf8");
  const expected = Buffer.from(HIDE_PASSWORD, "utf8");
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

/**
 * Өргөдлийг комиссын жагсаалтаас нуухад. Өгөгдөл, хавсаргасан баримт бичиг
 * устдаггүй — зөвхөн `hiddenAt` тэмдэглэгдэнэ. «Нуусан» шүүлтүүрээс буцаан
 * нээх боломжтой.
 */
export async function hideApplication(
  applicationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole(Role.ADMIN);

  if (!passwordMatches(String(formData.get("password") ?? ""))) {
    return { error: "Нууц үг буруу байна." };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { hiddenAt: true, lastName: true, firstName: true },
  });

  if (!application) return { error: "Өргөдөл олдсонгүй." };
  if (application.hiddenAt) {
    return { error: "Энэ өргөдөл аль хэдийн нуугдсан байна." };
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { hiddenAt: new Date() },
  });

  await writeAudit({
    actorId: user.id,
    action: "application.hide",
    targetType: "Application",
    targetId: applicationId,
    meta: { name: `${application.lastName ?? ""} ${application.firstName ?? ""}`.trim() },
  });

  revalidatePath("/reviewer");
  revalidatePath("/reviewer/ranking");
  revalidatePath("/reviewer/users");

  return { ok: "Өргөдлийг жагсаалтаас нууллаа." };
}

/** Нуусан өргөдлийг буцаан нээнэ. Сэргээх нь эрсдэлгүй тул нууц үг шаардахгүй. */
export async function unhideApplication(
  applicationId: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const user = await requireRole(Role.ADMIN);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { hiddenAt: true },
  });

  if (!application) return { error: "Өргөдөл олдсонгүй." };
  if (!application.hiddenAt) return { error: "Энэ өргөдөл нуугдаагүй байна." };

  await prisma.application.update({
    where: { id: applicationId },
    data: { hiddenAt: null },
  });

  await writeAudit({
    actorId: user.id,
    action: "application.unhide",
    targetType: "Application",
    targetId: applicationId,
  });

  revalidatePath("/reviewer");
  revalidatePath("/reviewer/ranking");
  revalidatePath("/reviewer/users");

  return { ok: "Өргөдлийг буцаан нээлээ." };
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

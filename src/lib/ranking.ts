import "server-only";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveCall, type ActiveCall } from "@/lib/call";
import { averageEvaluations, scoreSpread } from "@/lib/scoring";

export type RankedRow = {
  rank: number;
  applicationId: string;
  name: string;
  registerNo: string | null;
  soum: string | null;
  university: string | null;
  major: string | null;
  examScore: number | null;
  gpa: number | null;
  average: number | null;
  perCriterion: Record<string, number>;
  reviewerCount: number;
  spread: number | null;
  decision: string | null;
  status: ApplicationStatus;
};

export type RankingResult = {
  call: ActiveCall;
  rows: RankedRow[];
  /** Үнэлгээ бүрэн ороогүй тул эрэмбэд орох боломжгүй өргөдлүүд. */
  unscored: number;
};

/**
 * Эцсийн эрэмбэ. Зөвхөн баталгаажсан үнэлгээний дундажаар эрэмбэлнэ; тэнцвэл
 * ЭЕШ-ын оноо, дараа нь голч дүнгээр шийднэ.
 */
export async function getRanking(): Promise<RankingResult | null> {
  const call = await getActiveCall();
  if (!call) return null;

  const applications = await prisma.application.findMany({
    where: {
      callId: call.id,
      status: { not: ApplicationStatus.DRAFT },
    },
    include: {
      decision: true,
      evaluations: {
        select: { total: true, scores: true, submittedAt: true },
      },
    },
  });

  const scored = applications.map((application) => {
    const { average, reviewerCount, perCriterion } = averageEvaluations(
      application.evaluations,
      call.criteria,
    );

    return {
      applicationId: application.id,
      name: `${application.lastName ?? ""} ${application.firstName ?? ""}`.trim(),
      registerNo: application.registerNo,
      soum: application.soum,
      university: application.university,
      major: application.major,
      examScore: application.examScore,
      gpa: application.gpa,
      average,
      perCriterion,
      reviewerCount,
      spread: scoreSpread(application.evaluations),
      decision: application.decision?.result ?? null,
      status: application.status,
    };
  });

  const ranked = scored
    .filter((row) => row.average !== null)
    .sort(
      (a, b) =>
        (b.average ?? 0) - (a.average ?? 0) ||
        (b.examScore ?? 0) - (a.examScore ?? 0) ||
        (b.gpa ?? 0) - (a.gpa ?? 0),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    call,
    rows: ranked,
    unscored: scored.length - ranked.length,
  };
}

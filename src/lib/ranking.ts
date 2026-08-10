import "server-only";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActiveCalls, type ActiveCall } from "@/lib/call";
import { averageEvaluations, scoreSpread } from "@/lib/scoring";

export type RankedRow = {
  rank: number;
  applicationId: string;
  name: string;
  registerNo: string | null;
  soum: string | null;
  university: string | null;
  major: string | null;
  /** Төрлөөс хамаарсан гол үзүүлэлт: ЭЕШ эсхүл их сургуулийн GPA. */
  keyMetric: number | null;
  /** Журмын 4.4 — тэнцсэн үед давуу эрх олгох үндэслэл. */
  isTargetGroup: boolean;
  average: number | null;
  perCriterion: Record<string, number>;
  reviewerCount: number;
  spread: number | null;
  decision: string | null;
  status: ApplicationStatus;
};

export type CallRanking = {
  call: ActiveCall;
  rows: RankedRow[];
  /** Баталгаажсан үнэлгээгүй тул эрэмбэд ороогүй өргөдлүүд. */
  unscored: number;
};

/**
 * Төрөл тус бүрийн эцсийн эрэмбэ. Зөвхөн баталгаажсан үнэлгээний дундажаар
 * эрэмбэлнэ; тэнцвэл журмын 4.4-ийн дагуу эхлээд зорилтот бүлгийн
 * суралцагчид, дараа нь тухайн төрлийн гол үзүүлэлт өндөртэй нь дээгүүр орно.
 */
export async function getRankings(callId?: string): Promise<CallRanking[]> {
  const calls = await getActiveCalls();
  const scoped = callId ? calls.filter((call) => call.id === callId) : calls;

  return Promise.all(scoped.map((call) => rankCall(call)));
}

async function rankCall(call: ActiveCall): Promise<CallRanking> {
  const applications = await prisma.application.findMany({
    where: { callId: call.id, status: { not: ApplicationStatus.DRAFT } },
    include: {
      decision: true,
      evaluations: { select: { total: true, scores: true, submittedAt: true } },
    },
  });

  const scored = applications.map((application) => {
    const { average, reviewerCount, perCriterion } = averageEvaluations(
      application.evaluations,
      call.criteria,
      application,
    );

    return {
      applicationId: application.id,
      name: `${application.lastName ?? ""} ${application.firstName ?? ""}`.trim(),
      registerNo: application.registerNo,
      soum: application.soum,
      university: application.university,
      major: application.major,
      keyMetric:
        call.track === "STUDENT"
          ? application.universityGpa
          : application.examScore,
      isTargetGroup: application.isTargetGroup,
      average,
      perCriterion,
      reviewerCount,
      spread: scoreSpread(application.evaluations),
      decision: application.decision?.result ?? null,
      status: application.status,
    };
  });

  const rows = scored
    .filter((row) => row.average !== null)
    .sort(
      (a, b) =>
        (b.average ?? 0) - (a.average ?? 0) ||
        Number(b.isTargetGroup) - Number(a.isTargetGroup) ||
        (b.keyMetric ?? 0) - (a.keyMetric ?? 0),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return { call, rows, unscored: scored.length - rows.length };
}

import {
  AutoScoreSource,
  type Application,
  type Evaluation,
  type ScoringCriterion,
} from "@prisma/client";
import { z } from "zod";

/** Нэг шалгуурын оноо ба комиссын тайлбар. */
export type CriterionScore = {
  score: number;
  comment: string;
};

export type ScoreMap = Record<string, CriterionScore>;

export const scoreMapSchema = z.record(
  z.string(),
  z.object({
    score: z.number().min(0),
    comment: z.string(),
  }),
);

/** DB-гээс ирсэн Json-г найдвартай хэлбэрт оруулна. */
export function parseScores(value: unknown): ScoreMap {
  const parsed = scoreMapSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

/**
 * Анкетын тоон утгаас автомат оноо санал болгоно.
 * Комисс баримттай тулгаж үзээд гараар засах боломжтой.
 */
export function suggestScore(
  criterion: Pick<
    ScoringCriterion,
    "autoSource" | "autoInputMax" | "maxScore"
  >,
  application: Pick<Application, "examScore" | "gpa">,
): number | null {
  if (criterion.autoSource === AutoScoreSource.NONE || !criterion.autoInputMax) {
    return null;
  }

  const value =
    criterion.autoSource === AutoScoreSource.EXAM_SCORE
      ? application.examScore
      : application.gpa;

  if (value === null || value === undefined) return null;

  const ratio = Math.min(1, Math.max(0, value / criterion.autoInputMax));
  return Math.round(ratio * criterion.maxScore * 10) / 10;
}

export function computeTotal(
  scores: ScoreMap,
  criteria: Pick<ScoringCriterion, "code" | "maxScore">[],
): number {
  const total = criteria.reduce((sum, criterion) => {
    const raw = scores[criterion.code]?.score ?? 0;
    return sum + Math.min(Math.max(raw, 0), criterion.maxScore);
  }, 0);

  return Math.round(total * 10) / 10;
}

type SubmittedEvaluation = Pick<Evaluation, "total" | "scores" | "submittedAt">;

/** Баталгаажсан үнэлгээнүүдийн дундаж. Ноорог үнэлгээ тооцогдохгүй. */
export function averageEvaluations(
  evaluations: SubmittedEvaluation[],
  criteria: Pick<ScoringCriterion, "code">[],
): {
  average: number | null;
  reviewerCount: number;
  perCriterion: Record<string, number>;
} {
  const submitted = evaluations.filter(
    (evaluation) => evaluation.submittedAt !== null,
  );

  if (submitted.length === 0) {
    return { average: null, reviewerCount: 0, perCriterion: {} };
  }

  const sum = submitted.reduce(
    (accumulator, evaluation) => accumulator + evaluation.total,
    0,
  );

  const perCriterion: Record<string, number> = {};
  for (const criterion of criteria) {
    const values = submitted.map(
      (evaluation) => parseScores(evaluation.scores)[criterion.code]?.score ?? 0,
    );
    perCriterion[criterion.code] =
      Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }

  return {
    average: Math.round((sum / submitted.length) * 10) / 10,
    reviewerCount: submitted.length,
    perCriterion,
  };
}

/** Онооны зөрүү — комиссын гишүүдийн үнэлгээ хэр нийцэж байгааг харуулна. */
export function scoreSpread(evaluations: SubmittedEvaluation[]): number | null {
  const totals = evaluations
    .filter((evaluation) => evaluation.submittedAt !== null)
    .map((evaluation) => evaluation.total);

  if (totals.length < 2) return null;

  return Math.round((Math.max(...totals) - Math.min(...totals)) * 10) / 10;
}

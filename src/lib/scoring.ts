import {
  AutoScoreSource,
  type Application,
  type Evaluation,
  type ScoringCriterion,
} from "@prisma/client";
import { z } from "zod";

/** Нэг шалгуурын оноо ба комиссын тайлбар. */
export type CriterionScore = {
  score?: number;
  status?: "VERIFIED" | "REJECTED";
  comment: string;
};

export type ScoreMap = Record<string, CriterionScore>;

export const scoreMapSchema = z.record(
  z.string(),
  z.object({
    score: z.number().min(0).optional(),
    status: z.enum(["VERIFIED", "REJECTED"]).optional(),
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
 * Комисс баримттай тулгаж үзээд баталгаажуулна.
 */
export function suggestScore(
  criterion: Pick<
    ScoringCriterion,
    "autoSource" | "autoInputMax" | "maxScore"
  >,
  application: Pick<Application, "examScore" | "gpa" | "universityGpa">,
): number | null {
  if (criterion.autoSource === AutoScoreSource.NONE) {
    return null;
  }

  const valueBySource: Record<AutoScoreSource, number | null> = {
    [AutoScoreSource.NONE]: null,
    [AutoScoreSource.EXAM_SCORE]: application.examScore,
    [AutoScoreSource.GPA]: application.gpa,
    [AutoScoreSource.UNIVERSITY_GPA]: application.universityGpa,
  };

  const value = valueBySource[criterion.autoSource];
  if (value === null || value === undefined) return null;

  let score = 0;

  if (criterion.autoSource === AutoScoreSource.EXAM_SCORE) {
    if (value < 620) score = 0;
    else if (value === 800) score = 40;
    else if (value >= 780) {
      score = 35 + ((value - 780) / 20) * 5;
    } else {
      score = 5 + ((value - 620) / 160) * 30;
    }
  } else if (criterion.autoSource === AutoScoreSource.GPA) {
    if (value < 80) score = 0;
    else if (value >= 100) score = 10;
    else {
      score = 2 + ((value - 80) / 20) * 8;
    }
  } else if (criterion.autoSource === AutoScoreSource.UNIVERSITY_GPA) {
    if (value < 3.0) score = 0;
    else if (value >= 4.0) score = 40;
    else {
      score = 10 + ((value - 3.0) / 1.0) * 30;
    }
  } else if (criterion.autoInputMax) {
    const ratio = Math.min(1, Math.max(0, value / criterion.autoInputMax));
    score = ratio * criterion.maxScore;
  }

  return Math.round(score * 10) / 10;
}

/** 
 * Нэг үнэлгээчийн нийт оноог бодох. 
 * Хэрвээ status = VERIFIED байвал suggestScore-г (эсвэл maxScore-г MAJOR_FIT үед) нэмнэ.
 * REJECTED байвал 0 оноо өгнө.
 */
export function computeTotal(
  scores: ScoreMap,
  criteria: Pick<ScoringCriterion, "code" | "maxScore" | "autoSource" | "autoInputMax">[],
  application: Pick<Application, "examScore" | "gpa" | "universityGpa">,
): number {
  const total = criteria.reduce((sum, criterion) => {
    const s = scores[criterion.code];
    if (!s) return sum;

    let criterionScore = 0;
    
    if (s.score !== undefined) {
      // Гар аргаар өгсөн оноо
      criterionScore = Math.min(Math.max(s.score, 0), criterion.maxScore);
    } else if (s.status === "VERIFIED") {
      // Автомат оноо (Эсвэл MAJOR_FIT бол шууд maxScore)
      if (criterion.code === "MAJOR_FIT") {
        criterionScore = criterion.maxScore;
      } else {
        const suggested = suggestScore(criterion, application);
        criterionScore = suggested ?? 0;
      }
    } else if (s.status === "REJECTED") {
      criterionScore = 0;
    }

    return sum + criterionScore;
  }, 0);

  return Math.round(total * 10) / 10;
}

type SubmittedEvaluation = Pick<Evaluation, "total" | "scores" | "submittedAt">;

/** Баталгаажсан үнэлгээнүүдийн дундаж. Ноорог үнэлгээ тооцогдохгүй. */
export function averageEvaluations(
  evaluations: SubmittedEvaluation[],
  criteria: Pick<ScoringCriterion, "code" | "maxScore" | "autoSource" | "autoInputMax">[],
  application: Pick<Application, "examScore" | "gpa" | "universityGpa">,
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

  const perCriterion: Record<string, number> = {};
  let totalAverage = 0;

  for (const criterion of criteria) {
    const values = submitted
      .map((evaluation) => {
        const s = parseScores(evaluation.scores)[criterion.code];
        if (!s) return undefined;
        
        if (s.score !== undefined) return s.score;
        if (s.status === "VERIFIED") {
          return criterion.code === "MAJOR_FIT" ? criterion.maxScore : (suggestScore(criterion, application) ?? 0);
        }
        if (s.status === "REJECTED") return 0;
        return undefined;
      })
      .filter((val): val is number => val !== undefined);

    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      perCriterion[criterion.code] = Math.round(avg * 10) / 10;
      totalAverage += avg;
    } else {
      perCriterion[criterion.code] = 0;
    }
  }

  return {
    average: Math.round(totalAverage * 10) / 10,
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

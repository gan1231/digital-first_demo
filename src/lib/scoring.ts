import {
  AutoScoreSource,
  type Application,
  type CriterionEvaluation,
  type ScoringCriterion,
} from "@prisma/client";

/**
 * Анкетын тоон утгаас автомат оноо санал болгоно.
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
 * Нэг шалгуурын эцсийн оноог бодох.
 */
export function computeCriterionScore(
  evalRecord: Pick<CriterionEvaluation, "score" | "status">,
  criterion: Pick<ScoringCriterion, "code" | "maxScore" | "autoSource" | "autoInputMax">,
  application: Pick<Application, "examScore" | "gpa" | "universityGpa">,
): number {
  if (evalRecord.score !== null) {
    return Math.min(Math.max(evalRecord.score, 0), criterion.maxScore);
  } else if (evalRecord.status === "VERIFIED") {
    if (criterion.autoSource === AutoScoreSource.NONE) {
      return criterion.maxScore;
    } else {
      const suggested = suggestScore(criterion, application);
      return suggested ?? 0;
    }
  }
  return 0;
}

/** Нийт баталгаажсан үнэлгээнүүдээс эцсийн оноог бодох. */
export function calculateTotalScore(
  evaluations: Pick<CriterionEvaluation, "criterionCode" | "score" | "status">[],
  criteria: Pick<ScoringCriterion, "code" | "maxScore" | "autoSource" | "autoInputMax">[],
  application: Pick<Application, "examScore" | "gpa" | "universityGpa">,
): {
  average: number | null; // Null if no criteria evaluated
  perCriterion: Record<string, number>;
} {
  if (evaluations.length === 0) {
    return { average: null, perCriterion: {} };
  }

  const perCriterion: Record<string, number> = {};
  let totalScore = 0;

  for (const criterion of criteria) {
    const evalRecord = evaluations.find(e => e.criterionCode === criterion.code);
    if (evalRecord) {
      const score = computeCriterionScore(evalRecord, criterion, application);
      perCriterion[criterion.code] = score;
      totalScore += score;
    } else {
      perCriterion[criterion.code] = 0;
    }
  }

  return {
    average: Math.round(totalScore * 10) / 10,
    perCriterion,
  };
}

/** Онооны зөрүү - Одоо нэг л хүн шалгах тул зөрүү байхгүй. */
export function scoreSpread(): number | null {
  return null;
}

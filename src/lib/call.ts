import type {
  CallTrack,
  DocumentRequirement,
  ScholarshipCall,
  ScoringCriterion,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActiveCall = ScholarshipCall & {
  requirements: DocumentRequirement[];
  criteria: ScoringCriterion[];
};

const include = {
  requirements: { orderBy: { sortOrder: "asc" } },
  criteria: { orderBy: { sortOrder: "asc" } },
} as const;

/** Идэвхтэй бүх төрлийн тэтгэлэг. Төрөл бүр өөрийн материал, шалгууртай. */
export async function getActiveCalls(): Promise<ActiveCall[]> {
  return prisma.scholarshipCall.findMany({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { track: "asc" }],
    include,
  });
}

export async function getCallById(id: string): Promise<ActiveCall | null> {
  return prisma.scholarshipCall.findUnique({ where: { id }, include });
}

export const trackLabels: Record<CallTrack, string> = {
  GRADUATE: "12 дугаар анги төгсөгч",
  STUDENT: "2, 3 дугаар курсийн оюутан",
};

export type CallTiming = {
  isOpen: boolean;
  hasClosed: boolean;
  hasNotOpened: boolean;
  daysLeft: number;
  /** 7 хоног ба түүнээс бага үлдсэн — анхааруулга өнгө асаана. */
  isUrgent: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Хугацааны төлөв серверийн цагаар тооцогдоно — клиентийн цаг найдваргүй. */
export function getCallTiming(
  call: Pick<ScholarshipCall, "opensAt" | "closesAt">,
  now: Date = new Date(),
): CallTiming {
  const hasNotOpened = now < call.opensAt;
  const hasClosed = now > call.closesAt;
  const daysLeft = Math.max(
    0,
    Math.ceil((call.closesAt.getTime() - now.getTime()) / MS_PER_DAY),
  );

  return {
    isOpen: !hasNotOpened && !hasClosed,
    hasClosed,
    hasNotOpened,
    daysLeft,
    isUrgent: !hasClosed && !hasNotOpened && daysLeft <= 7,
  };
}

const MONTH_NAMES = [
  "01 сар",
  "02 сар",
  "03 сар",
  "04 сар",
  "05 сар",
  "06 сар",
  "07 сар",
  "08 сар",
  "09 сар",
  "10 сар",
  "11 сар",
  "12 сар",
];

/** «08 сар 31» — Улаанбаатарын цагаар. */
export function formatCallDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const day = parts.find((p) => p.type === "day")?.value ?? "";

  return `${MONTH_NAMES[month - 1]} ${day}`;
}

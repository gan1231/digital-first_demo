import type {
  DocumentRequirement,
  ScholarshipCall,
  ScoringCriterion,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActiveCall = ScholarshipCall & {
  requirements: DocumentRequirement[];
  criteria: ScoringCriterion[];
};

/**
 * Идэвхтэй тэтгэлгийн урилга. Хэд хэдэн урилга идэвхтэй байвал хамгийн сүүлд
 * хаагдахыг нь авна. Байхгүй бол null — хуудас "нээлттэй тэтгэлэг байхгүй"
 * төлөвөө үзүүлнэ.
 */
export async function getActiveCall(): Promise<ActiveCall | null> {
  return prisma.scholarshipCall.findFirst({
    where: { isActive: true },
    orderBy: { closesAt: "desc" },
    include: {
      requirements: { orderBy: { sortOrder: "asc" } },
      criteria: { orderBy: { sortOrder: "asc" } },
    },
  });
}

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

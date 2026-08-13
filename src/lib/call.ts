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
  _count: { applications: number };
};

const include = {
  requirements: { orderBy: { sortOrder: "asc" } },
  criteria: { orderBy: { sortOrder: "asc" } },
  _count: { select: { applications: true } },
} as const;

function injectHardcodedRequirements(call: ActiveCall) {
  const newRequirements = [];
  const hasGuarantorId = call.requirements.some(r => r.label === 'Батлан даагчийн иргэний үнэмлэхийн хуулбар');
  const hasHsProof = call.requirements.some(r => r.label === 'Дорноговь аймагт ерөнхий боловсрол эзэмшсэнийг нотлох баримт');
  let injectedGuarantor = false;
  let injectedHsProof = false;

  for (const req of call.requirements) {
    if (req.label === 'Иргэний үнэмлэхийн хуулбар') {
      req.label = 'Хүсэлт гаргагчийн иргэний үнэмлэхийн хуулбар';
    }
    
    newRequirements.push(req);
    // Only inject if it doesn't already exist in the database
    if (!hasGuarantorId && !injectedGuarantor && ['GUARANTOR_REQUEST', 'G_REQ_1', 'S_REQ_1'].includes(req.code)) {
      injectedGuarantor = true;
      newRequirements.push({
        id: 'hardcoded-guarantor-id',
        callId: call.id,
        code: 'GUARANTOR_ID_COPY_STATIC',
        label: 'Батлан даагчийн иргэний үнэмлэхийн хуулбар',
        description: 'Төрийн үйлчилгээний нэгдсэн систем (e-mongolia)-ээс авсан Иргэний үнэмлэхийн лавлагааг хавсаргах.',
        helpUrl: 'https://e-mongolia.mn/service/5d8b13383666c358f659b2ee',
        isRequired: true,
        allowMultiple: false,
        collectsEventName: false,
        collectsNote: false,
        sortOrder: req.sortOrder + 0.5,
      });
    }

    // Inject Dornogovi HS proof for students
    if (!hasHsProof && !injectedHsProof && (req.code === 'S_REQ_2' || req.code === 'RESIDENCE_REF' || req.label === 'Оршин суугаа газрын лавлагаа')) {
      injectedHsProof = true;
      newRequirements.push({
        id: 'hardcoded-hs-dornogovi-proof',
        callId: call.id,
        code: 'HS_DORNOGOVI_PROOF_STATIC',
        label: 'Дорноговь аймагт ерөнхий боловсрол эзэмшсэнийг нотлох баримт',
        description: null,
        helpUrl: null,
        isRequired: true,
        allowMultiple: false,
        collectsEventName: false,
        collectsNote: false,
        sortOrder: req.sortOrder + 0.5,
      });
    }


  }
  call.requirements = newRequirements;
  return call;
}

/** Идэвхтэй бүх төрлийн тэтгэлэг. Төрөл бүр өөрийн материал, шалгууртай. */
export async function getActiveCalls(): Promise<ActiveCall[]> {
  const calls = await prisma.scholarshipCall.findMany({
    where: { isActive: true },
    orderBy: [{ year: "desc" }, { track: "asc" }],
    include,
  });
  return calls.map(injectHardcodedRequirements);
}

export async function getCallById(id: string): Promise<ActiveCall | null> {
  const call = await prisma.scholarshipCall.findUnique({ where: { id }, include });
  return call ? injectHardcodedRequirements(call) : null;
}

export const trackLabels: Record<CallTrack, string> = {
  GRADUATE: "12 дугаар анги төгсөгч",
  STUDENT: "Их, дээд сургуулийн оюутан",
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

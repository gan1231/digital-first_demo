import "server-only";
import {
  ApplicationStatus,
  CallTrack,
  type Application,
  type Document,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { personalAnketSchema, programAnketSchema } from "@/lib/anket";
import { getActiveCalls, type ActiveCall } from "@/lib/call";
import {
  ESSAY_MAX_WORDS,
  ESSAY_MIN_WORDS,
  GENERATED_CODES,
} from "@/lib/application-shared";

export { ESSAY_MAX_WORDS, ESSAY_MIN_WORDS, GENERATED_CODES };

export const APPLY_STEPS = [
  { slug: "personal", label: "Хувийн мэдээлэл" },
  { slug: "education", label: "Боловсрол" },
  { slug: "major", label: "Сургууль, мэргэжил" },
  { slug: "documents", label: "Материал" },
  { slug: "review", label: "Илгээх" },
] as const;

export type StepSlug = (typeof APPLY_STEPS)[number]["slug"];

export const EDITABLE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.NEEDS_FIX,
];

const currentYear = new Date().getFullYear();

/**
 * Анкетын хувийн мэдээллийг засах алхам — бүртгэлийн формтой яг ижил схем
 * ажиллана, тиймээс шалгалт хоёр газарт салахгүй.
 */
export const personalSchema = personalAnketSchema;

const graduateEducationSchema = z.object({
  school: z.string().trim().min(3, "Төгссөн сургуулиа бичнэ үү."),
  graduationYear: z.coerce
    .number()
    .int()
    .min(currentYear - 5, "Төгссөн он буруу байна.")
    .max(currentYear, "Төгссөн он буруу байна."),
  examScore: z.coerce
    .number()
    .min(0, "ЭЕШ-ын оноо 0-800 хооронд байна.")
    .max(800, "ЭЕШ-ын оноо 0-800 хооронд байна."),
  gpa: z.coerce
    .number()
    .min(0, "Голч дүн 0-100 хооронд байна.")
    .max(100, "Голч дүн 0-100 хооронд байна."),
});

const studentEducationSchema = z.object({
  graduationYear: z.coerce
    .number()
    .int()
    .min(currentYear - 5, "Төгссөн он буруу байна.")
    .max(currentYear, "Төгссөн он буруу байна."),
  universityGpa: z.coerce
    .number()
    .min(0, "Голч дүн 0-4.0 хооронд байна.")
    .max(4, "Голч дүн 0-4.0 хооронд байна."),
  school: z.string().trim().min(3, "Төгссөн бүрэн дунд сургуулиа бичнэ үү."),
});

export function educationSchema(track: CallTrack) {
  return track === CallTrack.STUDENT
    ? studentEducationSchema
    : graduateEducationSchema;
}

/** Анкетын 2, 3 дугаар хэсэг дээр суралцах хугацаа, төлбөр нэмэгдэнэ. */
export const majorSchema = programAnketSchema.extend({
  studyYears: z.coerce
    .number()
    .int()
    .min(1, "Суралцах хугацаа 1-8 жил байна.")
    .max(8, "Суралцах хугацаа 1-8 жил байна."),
  tuitionAmount: z.coerce
    .number()
    .int()
    .min(0, "Сургалтын төлбөрийг оруулна уу.")
    .max(2000000000, "Төлбөрийн хэмжээ хэт их байна."),
  universityGpa: z.coerce
    .number()
    .min(0, "Голч дүн 0-4.0 хооронд байна.")
    .max(4, "Голч дүн 0-4.0 хооронд байна.")
    .optional(),
});

/** Эдитэрээс HTML ирнэ — үгийн тоог `lib/essay.ts` цэвэрлэсний дараа бодно. */
export const essaySchema = z.object({
  essayText: z.string().trim().min(1, "Эсээгээ бичнэ үү."),
});

export type ApplicationContext = {
  call: ActiveCall;
  application: Application & { documents: Document[] };
};

/**
 * Хэрэглэгчийн идэвхтэй өргөдөл. Нэг хүн нэг л төрөлд өргөдөл гаргана —
 * төрлөө сонгосны дараа бүх алхам тэр өргөдөл дээр ажиллана.
 */
export async function getApplicationContext(
  userId: string,
): Promise<ApplicationContext | null> {
  const calls = await getActiveCalls();
  if (calls.length === 0) return null;

  const application = await prisma.application.findFirst({
    where: { userId, callId: { in: calls.map((call) => call.id) } },
    include: { documents: true },
    orderBy: { createdAt: "desc" },
  });

  if (!application) return null;

  const call = calls.find((item) => item.id === application.callId);
  return call ? { call, application } : null;
}

/** Төрөл сонгосны дараа өргөдлийн мөр үүсгэнэ. Давхар үүсгэхээс хамгаална. */
export async function createApplication(userId: string, callId: string) {
  const existing = await getApplicationContext(userId);
  if (existing) return existing.application;

  return prisma.application.create({
    data: { userId, callId },
    include: { documents: true },
  });
}

export type StepStatus = {
  slug: StepSlug;
  label: string;
  isComplete: boolean;
  problems: string[];
};

/**
 * Алхам бүрийн бөглөгдсөн байдал. Stepper болон илгээх товчны хоёуланд
 * ижил дүгнэлт хэрэглэгдэнэ — хоёр газарт өөр логик бичихээс сэргийлнэ.
 */
export function getCompleteness(
  application: Application & { documents: Document[] },
  call: ActiveCall,
): StepStatus[] {
  const personalProblems: string[] = [];
  if (
    !application.lastName ||
    !application.firstName ||
    !application.registerNo ||
    !application.civilRegistrationNo ||
    !application.citizenship ||
    !application.clanName ||
    !application.birthDate ||
    !application.gender ||
    !application.ethnicity ||
    !application.birthAimag ||
    !application.birthSoum ||
    !application.aimag ||
    !application.soum ||
    !application.bag ||
    !application.street ||
    !application.unit ||
    !application.phone ||
    !application.contactRelation ||
    !application.contactName ||
    !application.contactPhone
  ) {
    personalProblems.push("Хувийн мэдээлэл дутуу байна.");
  }

  // Журмын 2.1 — батлан даагчтай байх.
  if (
    !application.guarantorName ||
    !application.guarantorRegisterNo ||
    !application.guarantorRelation ||
    !application.guarantorPhone ||
    !application.guarantorAddress
  ) {
    personalProblems.push("Батлан даагчийн мэдээлэл дутуу байна.");
  }

  if (
    application.isTargetGroup &&
    application.targetGroupTypes.length === 0
  ) {
    personalProblems.push("Зорилтот бүлгийн хэлбэрээ сонгоно уу.");
  }

  const educationProblems =
    call.track === CallTrack.STUDENT
      ? studentEducationProblems(application, call)
      : graduateEducationProblems(application, call);

  const majorProblems: string[] = [];
  if (
    !application.university ||
    !application.major ||
    application.studyYears === null ||
    application.tuitionAmount === null
  ) {
    majorProblems.push("Мэргэжлийн мэдээлэл дутуу байна.");
  }
  if (call.track === CallTrack.STUDENT) {
    if (application.universityGpa === null) {
      majorProblems.push("Голч дүнг оруулаагүй байна.");
    }
  }

  if (!application.isSchoolAccredited && !application.isProgramAccredited) {
    majorProblems.push("Магадлан итгэмжлэгдсэн эсэхийг тэмдэглээгүй байна.");
  }

  if (!application.claimedProfession) {
    majorProblems.push("Тэргүүлэх болон эрэлттэй мэргэжлээс сонгоогүй байна.");
  }



  const documentProblems = call.requirements
    .filter(
      (requirement) =>
        requirement.isRequired && !GENERATED_CODES.includes(requirement.code),
    )
    .filter(
      (requirement) =>
        !application.documents.some(
          (document) => document.requirementCode === requirement.code,
        ),
    )
    .map((requirement) => `«${requirement.label}» хавсаргаагүй байна.`);

  const byStep: Record<string, string[]> = {
    personal: personalProblems,
    education: educationProblems,
    major: majorProblems,
    documents: documentProblems,
  };

  return APPLY_STEPS.filter((step) => step.slug !== "review").map((step) => ({
    slug: step.slug,
    label: step.label,
    problems: byStep[step.slug] ?? [],
    isComplete: (byStep[step.slug] ?? []).length === 0,
  }));
}

function graduateEducationProblems(
  application: Application,
  call: ActiveCall,
): string[] {
  const problems: string[] = [];

  if (
    !application.school ||
    application.graduationYear === null ||
    application.examScore === null ||
    application.gpa === null
  ) {
    return ["Боловсролын мэдээлэл дутуу байна."];
  }

  return problems;
}

function studentEducationProblems(
  application: Application,
  call: ActiveCall,
): string[] {
  const problems: string[] = [];

  if (
    application.graduationYear === null ||
    !application.school
  ) {
    return ["Суралцаж буй байдлын мэдээлэл дутуу байна."];
  }

  return problems;
}

export function getBlockingProblems(steps: StepStatus[]): string[] {
  return steps.flatMap((step) => step.problems);
}

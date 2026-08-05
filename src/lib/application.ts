import "server-only";
import {
  ApplicationStatus,
  CallTrack,
  type Application,
  type Document,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveCalls, type ActiveCall } from "@/lib/call";
import {
  ESSAY_MAX_WORDS,
  ESSAY_MIN_WORDS,
  GENERATED_CODES,
} from "@/lib/application-shared";
import { SOUMS } from "@/lib/soum";

export { ESSAY_MAX_WORDS, ESSAY_MIN_WORDS, GENERATED_CODES };

export const APPLY_STEPS = [
  { slug: "personal", label: "Хувийн мэдээлэл" },
  { slug: "education", label: "Боловсрол" },
  { slug: "major", label: "Мэргэжлийн сонголт" },
  { slug: "essay", label: "Эссэ" },
  { slug: "documents", label: "Материал" },
  { slug: "review", label: "Илгээх" },
] as const;

export type StepSlug = (typeof APPLY_STEPS)[number]["slug"];

export const EDITABLE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.NEEDS_FIX,
];

const currentYear = new Date().getFullYear();

export const personalSchema = z.object({
  lastName: z.string().trim().min(2, "Овгоо бичнэ үү."),
  firstName: z.string().trim().min(2, "Нэрээ бичнэ үү."),
  registerNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[А-ЯӨҮЁ]{2}\d{8}$/,
      "Регистрийн дугаар 2 кирилл үсэг, 8 цифрээс бүрдэнэ (жишээ: АБ12345678).",
    ),
  birthDate: z.coerce.date({ message: "Төрсөн огноог оруулна уу." }),
  gender: z.enum(["MALE", "FEMALE"], { message: "Хүйсээ сонгоно уу." }),
  phone: z
    .string()
    .trim()
    .regex(/^\d{8}$/, "Утасны дугаар 8 оронтой байна."),
  soum: z.enum(SOUMS, { message: "Сумаа сонгоно уу." }),
  address: z.string().trim().min(4, "Хаягаа бичнэ үү."),
});

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
  courseYear: z.coerce
    .number()
    .int()
    .min(2, "Зөвхөн 2, 3 дугаар курсийн оюутан хамрагдана.")
    .max(3, "Зөвхөн 2, 3 дугаар курсийн оюутан хамрагдана."),
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

export const majorSchema = z.object({
  university: z.string().trim().min(3, "Их сургуулийн нэрийг бичнэ үү."),
  major: z.string().trim().min(2, "Мэргэжлээ бичнэ үү."),
  studyYears: z.coerce
    .number()
    .int()
    .min(1, "Суралцах хугацаа 1-8 жил байна.")
    .max(8, "Суралцах хугацаа 1-8 жил байна."),
  tuitionAmount: z.coerce
    .number()
    .int()
    .min(0, "Сургалтын төлбөрийг оруулна уу."),
});

export const essaySchema = z.object({
  essayText: z.string().trim().min(1, "Эссэгээ бичнэ үү."),
});

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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
    !application.birthDate ||
    !application.gender ||
    !application.phone ||
    !application.soum ||
    !application.address
  ) {
    personalProblems.push("Хувийн мэдээлэл дутуу байна.");
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

  const essayProblems: string[] = [];
  const words = application.essayWordCount ?? 0;
  if (!application.essayText) {
    essayProblems.push("Эссэ бичээгүй байна.");
  } else if (words < ESSAY_MIN_WORDS || words > ESSAY_MAX_WORDS) {
    essayProblems.push(
      `Эссэ ${ESSAY_MIN_WORDS}-${ESSAY_MAX_WORDS} үгтэй байх ёстой (одоо ${words}).`,
    );
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
    essay: essayProblems,
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

  if (call.minExamScore && application.examScore < call.minExamScore) {
    problems.push(
      `ЭЕШ-ын дундаж оноо ${call.minExamScore}-аас дээш байх шаардлагатай.`,
    );
  }
  if (call.minGpa && application.gpa < call.minGpa) {
    problems.push(`Голч дүн ${call.minGpa}-аас дээш байх шаардлагатай.`);
  }

  return problems;
}

function studentEducationProblems(
  application: Application,
  call: ActiveCall,
): string[] {
  const problems: string[] = [];

  if (
    application.courseYear === null ||
    application.universityGpa === null ||
    !application.school
  ) {
    return ["Суралцаж буй байдлын мэдээлэл дутуу байна."];
  }

  if (application.courseYear < 2 || application.courseYear > 3) {
    problems.push("Зөвхөн 2, 3 дугаар курсийн оюутан хамрагдана.");
  }
  if (
    call.minUniversityGpa &&
    application.universityGpa < call.minUniversityGpa
  ) {
    problems.push(
      `Голч дүн (GPA) ${call.minUniversityGpa}-аас дээш байх шаардлагатай.`,
    );
  }

  return problems;
}

export function getBlockingProblems(steps: StepStatus[]): string[] {
  return steps.flatMap((step) => step.problems);
}

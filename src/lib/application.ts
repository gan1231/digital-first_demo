import "server-only";
import { ApplicationStatus, type Application, type Document } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveCall, type ActiveCall } from "@/lib/call";
import { SOUMS } from "@/lib/soum";

export const ESSAY_MIN_WORDS = 500;
export const ESSAY_MAX_WORDS = 1000;

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

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const stepSchemas = {
  personal: z.object({
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
  }),

  education: z.object({
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
  }),

  major: z.object({
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
  }),

  essay: z.object({
    essayText: z.string().trim().min(1, "Эссэгээ бичнэ үү."),
  }),
} satisfies Partial<Record<StepSlug, z.ZodTypeAny>>;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Идэвхтэй урилгад тухайн хэрэглэгчийн ноорог өргөдлийг олох, байхгүй бол үүсгэх. */
export async function getOrCreateApplication(userId: string) {
  const call = await getActiveCall();
  if (!call) return null;

  const existing = await prisma.application.findUnique({
    where: { userId_callId: { userId, callId: call.id } },
    include: { documents: true },
  });

  if (existing) return { call, application: existing };

  const application = await prisma.application.create({
    data: { userId, callId: call.id },
    include: { documents: true },
  });

  return { call, application };
}

/**
 * Идэвхтэй урилга ба хэрэглэгчийн өргөдөл. Өргөдөл хараахан үүсээгүй байж
 * болно — null нь зөвхөн идэвхтэй урилга байхгүйг илэрхийлнэ.
 */
export async function getApplication(userId: string) {
  const call = await getActiveCall();
  if (!call) return null;

  const application = await prisma.application.findUnique({
    where: { userId_callId: { userId, callId: call.id } },
    include: { documents: true },
  });

  return { call, application };
}

export type StepStatus = {
  slug: StepSlug;
  label: string;
  isComplete: boolean;
  problems: string[];
};

type ApplicationWithDocuments = Application & { documents: Document[] };

/**
 * Алхам бүрийн бөглөгдсөн байдал. Stepper болон илгээх товчны хоёуланд
 * ижил дүгнэлт хэрэглэгдэнэ — хоёр газарт өөр логик бичихээс сэргийлнэ.
 */
export function getCompleteness(
  application: ApplicationWithDocuments,
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

  const educationProblems: string[] = [];
  if (
    !application.school ||
    application.graduationYear === null ||
    application.examScore === null ||
    application.gpa === null
  ) {
    educationProblems.push("Боловсролын мэдээлэл дутуу байна.");
  } else {
    if (call.minExamScore && application.examScore < call.minExamScore) {
      educationProblems.push(
        `ЭЕШ-ын дундаж оноо ${call.minExamScore}-аас дээш байх шаардлагатай.`,
      );
    }
    if (call.minGpa && application.gpa < call.minGpa) {
      educationProblems.push(
        `Голч дүн ${call.minGpa}-аас дээш байх шаардлагатай.`,
      );
    }
  }

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

  // Анкет, эссэ нь системд бөглөгддөг тул файл хавсаргах шаардлагагүй.
  const generatedCodes = ["APPLICATION_FORM", "ESSAY"];
  const documentProblems = call.requirements
    .filter(
      (requirement) =>
        requirement.isRequired && !generatedCodes.includes(requirement.code),
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

export function getBlockingProblems(steps: StepStatus[]): string[] {
  return steps.flatMap((step) => step.problems);
}

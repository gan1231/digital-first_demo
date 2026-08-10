/**
 * «ТЭТГЭЛЭГ ГОРИЛОГЧИЙН АНКЕТ»-ын талбарууд — цаасан загварын дугаарлалтыг
 * дагана. Бүртгэлийн форм (нэвтрээгүй) болон анкет засах алхмууд хоёулаа
 * эндээс уншина, тиймээс энэ файл `server-only` БИШ.
 */

import { TargetGroupType, type Application } from "@prisma/client";
import { z } from "zod";
import { SOUMS } from "@/lib/soum";
import { checkIsDemandedProfession, checkIsPriorityProfession } from "@/lib/professions";

export const TARGET_GROUP_LABELS: Record<TargetGroupType, string> = {
  ORPHAN: "Бүтэн өнчин",
  DISABILITY: "Хөгжлийн бэрхшээлтэй",
  LOW_INCOME: "Төлбөрийн чадваргүй",
  OUTSTANDING: "Онцгой амжилт гаргасан",
  OTHER: "Бусад",
};

export const TARGET_GROUP_VALUES = Object.keys(
  TARGET_GROUP_LABELS,
) as TargetGroupType[];

/**
 * Тодорхой форматтай талбарууд. Сервер тал `full`-ыг zod-д, форм тал `chars`-ыг
 * бичиж байх үеийн анхааруулгад ашиглана — хоёр газарт өөр дүрэм болохгүй.
 */
export const FORMATS = {
  registerNo: {
    /** Бөглөж дуусахад тохирох ёстой бүтэн загвар. */
    full: /^[А-ЯӨҮЁ]{2}\d{8}$/,
    /** Бичиж байх үед зөвшөөрөгдөх тэмдэгтүүд. */
    chars: /^[А-ЯӨҮЁ]{0,2}\d{0,8}$/,
    maxLength: 10,
    inputMode: undefined,
    charMessage: "Эхний 2 тэмдэгт кирилл үсэг, дараагийн 8 нь цифр байх ёстой.",
    message:
      "Регистрийн дугаар 2 кирилл үсэг, 8 цифрээс бүрдэнэ (жишээ: АБ12345678).",
  },
  civilRegistrationNo: {
    full: /^\d{12}$/,
    chars: /^\d{0,12}$/,
    maxLength: 12,
    inputMode: "numeric",
    charMessage: "Зөвхөн цифр оруулна уу.",
    message: "Иргэний бүртгэлийн дугаар зөвхөн 12 цифрээс бүрдэнэ.",
  },
  phone: {
    full: /^\d{8}$/,
    chars: /^\d{0,8}$/,
    maxLength: 8,
    inputMode: "numeric",
    charMessage: "Зөвхөн цифр оруулна уу.",
    message: "Утасны дугаар 8 оронтой байна.",
  },
  /** Нэр төрлийн талбар: зөвхөн кирилл үсэг, зай, зураас. «Бат-Эрдэнэ». */
  cyrillicName: {
    full: /^[А-ЯӨҮЁа-яөүё]+(?:[\s-][А-ЯӨҮЁа-яөүё]+)*$/,
    chars: /^[А-ЯӨҮЁа-яөүё\s-]*$/,
    maxLength: undefined,
    inputMode: undefined,
    charMessage: "Зөвхөн кирилл үсгээр бичнэ үү.",
    message: "Зөвхөн кирилл үсгээр бичнэ үү (жишээ: Бат-Эрдэнэ).",
  },
  /** Хаягийн талбар: кирилл үсэг дээр тоо орж болно. «1 дүгээр баг», «24». */
  cyrillicText: {
    full: /^[А-ЯӨҮЁа-яөүё0-9\s\-.,№\/]+$/,
    chars: /^[А-ЯӨҮЁа-яөүё0-9\s\-.,№\/]*$/,
    maxLength: undefined,
    inputMode: undefined,
    charMessage: "Кирилл үсгээр бичнэ үү — латин үсэг оруулах боломжгүй.",
    message: "Кирилл үсгээр бичнэ үү — латин үсэг оруулах боломжгүй.",
  },
} as const;

export type FormatRule = (typeof FORMATS)[keyof typeof FORMATS];

/** Формд бичиж байх үеийн зөвлөмж. Серверийн шалгалт zod-ын `.email()`. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checkbox-ын утга. Тэмдэглээгүй бол FormData-д талбар огт ирэхгүй. */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((value) => value === "on" || value === "true");

const requiredText = (label: string, min = 2) =>
  z.string().trim().min(min, `${label} бичнэ үү.`);

/** Нэр төрлийн заавал талбар — латин үсэг, тоо оруулахыг зөвшөөрөхгүй. */
const cyrillicName = (label: string, min = 2) =>
  requiredText(label, min).regex(
    FORMATS.cyrillicName.full,
    `${label} зөвхөн кирилл үсгээр бичнэ үү.`,
  );

/** Хаягийн заавал талбар — кирилл үсэг дээр тоо орж болно. */
const cyrillicText = (label: string, min = 1) =>
  requiredText(label, min).regex(
    FORMATS.cyrillicText.full,
    `${label} кирилл үсгээр бичнэ үү — латин үсэг оруулах боломжгүй.`,
  );

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

/** Сонголтоор талбар: хоосон бол алгасна, бөглөсөн бол кирилл шаардана. */
const optionalCyrillicText = (label: string) =>
  optionalText.refine(
    (value) => value === null || FORMATS.cyrillicText.full.test(value),
    { message: `${label} кирилл үсгээр бичнэ үү.` },
  );

const phone = (label: string) =>
  z
    .string()
    .trim()
    .regex(FORMATS.phone.full, `${label} 8 оронтой байх ёстой.`);

/** Анкетын 1 дүгээр хэсэг — үндсэн мэдээлэл, хаяг, холбоо барих. */
export const personalAnketSchema = z.object({
  registerNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(FORMATS.registerNo.full, FORMATS.registerNo.message),
  civilRegistrationNo: z
    .string()
    .trim()
    .regex(FORMATS.civilRegistrationNo.full, FORMATS.civilRegistrationNo.message),
  citizenship: cyrillicName("Иргэний харьяаллаа"),
  clanName: cyrillicName("Ургийн овгоо"),
  lastName: cyrillicName("Эцэг (эх)-ийн нэрээ"),
  firstName: cyrillicName("Өөрийн нэрээ"),
  gender: z.enum(["MALE", "FEMALE"], { message: "Хүйсээ сонгоно уу." }),
  birthDate: z.coerce.date({ message: "Төрсөн огноог оруулна уу." }),
  ethnicity: cyrillicName("Үндэс, угсаагаа"),
  birthAimag: requiredText("Төрсөн аймаг, хотоо"),
  birthSoum: cyrillicName("Төрсөн сум, дүүргээ"),

  // 1.9 Байнгын оршин суугаа хаяг
  aimag: requiredText("Аймаг, хотоо"),
  soum: z.enum(SOUMS, { message: "Сумаа сонгоно уу." }),
  bag: cyrillicText("Баг, хороогоо"),
  khoroolol: optionalCyrillicText("Хороолол, хотхоныг"),
  street: cyrillicText("Байр, гудамжаа"),
  unit: cyrillicText("Тоотоо"),

  // 1.10 Холбоо барих
  phone: phone("Утасны дугаар"),
  phone2: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || FORMATS.phone.full.test(value), {
      message: "2 дугаар утас 8 оронтой байх ёстой.",
    }),

  // 1.11 Зайлшгүй шаардлага гарсан үед харилцах хүн
  contactRelation: cyrillicName("Таны хэн болохыг"),
  contactName: cyrillicName("Харилцах хүний нэрийг"),
  contactPhone: phone("Харилцах хүний утасны дугаар"),

  // 1.12 Зорилтот бүлэг
  isTargetGroup: z
    .enum(["yes", "no"], { message: "Зорилтот бүлгийнх эсэхээ сонгоно уу." })
    .transform((value) => value === "yes"),
  targetGroupTypes: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) =>
      (Array.isArray(value) ? value : value ? [value] : []).filter(
        (item): item is TargetGroupType =>
          TARGET_GROUP_VALUES.includes(item as TargetGroupType),
      ),
    ),
  targetGroupNote: optionalCyrillicText("Тайлбарыг"),

  // 1.13 Батлан даагч — журмын 2.1
  guarantorName: cyrillicName("Батлан даагчийн нэрийг"),
  guarantorRegisterNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      FORMATS.registerNo.full,
      "Батлан даагчийн регистрийн дугаар 2 кирилл үсэг, 8 цифрээс бүрдэнэ.",
    ),
  guarantorRelation: cyrillicName("Батлан даагч таны хэн болохыг"),
  guarantorPhone: phone("Батлан даагчийн утасны дугаар"),
  guarantorAddress: cyrillicText("Батлан даагчийн хаягийг"),
  guarantorWorkplace: optionalCyrillicText("Батлан даагчийн ажлын газрыг"),
});

/**
 * Анкетын 2, 3 дугаар хэсэг — сургууль, хөтөлбөр, мэргэжил.
 * Сургууль, мэргэжлийн нэр нь гадаад сургууль, латин товчлол агуулж болох тул
 * кирилл үсгийн шаардлага тавихгүй.
 */
export const programAnketSchema = z.object({
  university: requiredText("Сургуулийн нэрийг", 3),
  major: requiredText("Хөтөлбөрийн нэрийг"),
  isSchoolAccredited: checkbox,
  isProgramAccredited: checkbox,
  claimedProfession: requiredText("Тэргүүлэх болон эрэлттэй мэргэжлээ"),
});

const declarationSchema = z.object({
  declaration: z
    .string()
    .optional()
    .refine((value) => value === "on" || value === "true", {
      message: "Анкетаа үнэн зөв бөглөсөн гэдгээ баталгаажуулна уу.",
    })
    .transform(() => true),
});

/** Бүртгэлийн формд илгээгддэг анкетын бүх хэсэг. */
export const anketSchema = personalAnketSchema
  .merge(programAnketSchema)
  .merge(declarationSchema)
  .superRefine((data, ctx) => {
    if (data.isTargetGroup && data.targetGroupTypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetGroupTypes"],
        message: "Зорилтот бүлгийн хэлбэрээ сонгоно уу.",
      });
    }

    if (!data.isSchoolAccredited && !data.isProgramAccredited) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isSchoolAccredited"],
        message: "Магадлан итгэмжлэгдсэн эсэхийг тэмдэглэнэ үү.",
      });
    }
  });

export const credentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("И-мэйл хаяг буруу байна."),
    password: z.string().min(8, "Нууц үг доод тал нь 8 тэмдэгт байна."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Нууц үг таарахгүй байна.",
  });

type PersonalAnket = z.infer<typeof personalAnketSchema>;
type ProgramAnket = z.infer<typeof programAnketSchema>;

/**
 * Задаргаатай хаягийг нэг мөр болгоно. Жагсаалт, комиссын хуудас, CSV экспорт
 * зэрэг нэг мөр хаяг хүлээдэг газруудад `address` хэвээр ашиглагдана.
 */
export function composeAddress(
  parts: Pick<
    PersonalAnket,
    "aimag" | "soum" | "bag" | "khoroolol" | "street" | "unit"
  >,
): string {
  return [
    parts.aimag,
    `${parts.soum} сум`,
    parts.bag,
    parts.khoroolol,
    parts.street,
    `${parts.unit} тоот`,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Хувийн мэдээллийн хэсгийг Prisma-ийн `Application` талбар руу буулгана.
 * Талбарыг нэг бүрчлэн жагсаана — схемд байхгүй түлхүүр Prisma рүү орохгүй.
 */
export function toPersonalData(data: PersonalAnket) {
  return {
    registerNo: data.registerNo,
    civilRegistrationNo: data.civilRegistrationNo,
    citizenship: data.citizenship,
    clanName: data.clanName,
    lastName: data.lastName,
    firstName: data.firstName,
    gender: data.gender,
    birthDate: data.birthDate,
    ethnicity: data.ethnicity,
    birthAimag: data.birthAimag,
    birthSoum: data.birthSoum,
    aimag: data.aimag,
    soum: data.soum,
    bag: data.bag,
    khoroolol: data.khoroolol,
    street: data.street,
    unit: data.unit,
    address: composeAddress(data),
    phone: data.phone,
    phone2: data.phone2,
    contactRelation: data.contactRelation,
    contactName: data.contactName,
    contactPhone: data.contactPhone,
    isTargetGroup: data.isTargetGroup,
    // «Тийм» гэж хариулаагүй бол сонгосон хэлбэрүүд утгагүй.
    targetGroupTypes: data.isTargetGroup ? data.targetGroupTypes : [],
    targetGroupNote: data.isTargetGroup ? data.targetGroupNote : null,
    guarantorName: data.guarantorName,
    guarantorRegisterNo: data.guarantorRegisterNo,
    guarantorRelation: data.guarantorRelation,
    guarantorPhone: data.guarantorPhone,
    guarantorAddress: data.guarantorAddress,
    guarantorWorkplace: data.guarantorWorkplace,
  };
}

export function toProgramData(data: ProgramAnket) {
  return {
    university: data.university,
    major: data.major,
    isSchoolAccredited: data.isSchoolAccredited,
    isProgramAccredited: data.isProgramAccredited,
    claimedProfession: data.claimedProfession,
    isDemandedProfession: checkIsDemandedProfession(data.claimedProfession),
    isPriorityProfession: checkIsPriorityProfession(data.claimedProfession),
  };
}

/** Бүртгэлийн формын бүтэн анкетыг `Application`-ы талбар руу буулгана. */
export function toApplicationData(data: PersonalAnket & ProgramAnket) {
  return {
    ...toPersonalData(data),
    ...toProgramData(data),
    declaredAt: new Date(),
  };
}

/**
 * Хадгалсан өргөдлийг формын `defaultValue`-д тохирох хэлбэрт буулгана —
 * анкет засах хуудсууд бүртгэлийн формтой ижил компонент ашиглана.
 */
export function anketDefaults(
  application: Application,
): Record<string, string | string[] | boolean> {
  const value = (input: string | null) => input ?? "";

  return {
    registerNo: value(application.registerNo),
    civilRegistrationNo: value(application.civilRegistrationNo),
    citizenship: value(application.citizenship),
    clanName: value(application.clanName),
    lastName: value(application.lastName),
    firstName: value(application.firstName),
    gender: value(application.gender),
    birthDate: application.birthDate
      ? application.birthDate.toISOString().slice(0, 10)
      : "",
    ethnicity: value(application.ethnicity),
    birthAimag: value(application.birthAimag),
    birthSoum: value(application.birthSoum),
    aimag: value(application.aimag),
    soum: value(application.soum),
    bag: value(application.bag),
    khoroolol: value(application.khoroolol),
    street: value(application.street),
    unit: value(application.unit),
    phone: value(application.phone),
    phone2: value(application.phone2),
    contactRelation: value(application.contactRelation),
    contactName: value(application.contactName),
    contactPhone: value(application.contactPhone),
    isTargetGroup: application.isTargetGroup ? "yes" : "no",
    targetGroupTypes: application.targetGroupTypes,
    targetGroupNote: value(application.targetGroupNote),
    guarantorName: value(application.guarantorName),
    guarantorRegisterNo: value(application.guarantorRegisterNo),
    guarantorRelation: value(application.guarantorRelation),
    guarantorPhone: value(application.guarantorPhone),
    guarantorAddress: value(application.guarantorAddress),
    guarantorWorkplace: value(application.guarantorWorkplace),
    university: value(application.university),
    major: value(application.major),
    isSchoolAccredited: application.isSchoolAccredited,
    isProgramAccredited: application.isProgramAccredited,
    claimedProfession: value(application.claimedProfession),
  };
}

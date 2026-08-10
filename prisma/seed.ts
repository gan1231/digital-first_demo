import {
  AutoScoreSource,
  CallTrack,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Тэтгэлгийн зарлал, бүрдүүлэх материал, шалгуурыг «Сургалтын төлбөрийн
 * тэтгэлэг үзүүлэх нийтлэг журам» (2026 оны төсөл)-ын дагуу үүсгэнэ.
 * Журам өөрчлөгдвөл энэ файлыг засаад `npm run db:seed` ажиллуулна.
 */
const prisma = new PrismaClient();

const YEAR = 2026;
const ACADEMIC_YEAR = "2026-2027 хичээлийн жил";
const OPENS_AT = new Date("2026-05-31T16:00:00.000Z");
const CLOSES_AT = new Date("2026-08-31T15:59:59.000Z");

type RequirementSeed = {
  code: string;
  label: string;
  description: string | null;
  helpUrl: string | null;
  isRequired: boolean;
  allowMultiple: boolean;
  collectsEventName: boolean;
  collectsNote: boolean;
  sortOrder: number;
};

/** Төрийн үйлчилгээний нэгдсэн системийн лавлагааны хуудсууд. */
const EMONGOLIA = {
  idCard: "https://e-mongolia.mn/service/5d8b13383666c358f659b2ee",
  examScore: "https://e-mongolia.mn/service/62b2787b68b7606c0980b0e8",
  secondaryGpa: "https://e-mongolia.mn/service/5dbbaa218575f952c52550fa",
  residence: "https://e-mongolia.mn/service/5d8b144a3666c358f659b2f2",
  enrollment: "https://e-mongolia.mn/service/640acdeb50c79d1bdaebb448",
} as const;

type CriterionSeed = {
  code: string;
  label: string;
  description: string | null;
  maxScore: number;
  autoSource: AutoScoreSource;
  autoInputMax: number | null;
  sortOrder: number;
};

/**
 * Хоёр төрөлд давхардаж орох материалууд. Журмын 5.1, 5.2 нь эдгээрийг өөр
 * дараалалд жагсаасан тул дарааллыг дуудах талдаа өгнө.
 */
const guarantorRequest = (sortOrder: number): RequirementSeed => ({
  code: "GUARANTOR_REQUEST",
  label: "Батлан даагчийн хүсэлт",
  description:
    "Батлан даагчийн гараар бичсэн хүсэлтийг цахим хэлбэрт шилжүүлж оруулна. PDF файл болгож сканнердах эсвэл тод гаргацтайгаар зургийг хавсаргаж болно.",
  helpUrl: null,
  isRequired: true,
  allowMultiple: false,
  collectsEventName: false,
  collectsNote: false,
  sortOrder,
});

const applicationForm = (sortOrder: number): RequirementSeed => ({
  code: "APPLICATION_FORM",
  label: "Тэтгэлэгт хамрагдах анкет",
  description: "Системд бөглөсөн анкетаас автоматаар үүснэ.",
  helpUrl: null,
  isRequired: true,
  allowMultiple: false,
  collectsEventName: false,
  collectsNote: false,
  sortOrder,
});

const essayRequirement = (sortOrder: number): RequirementSeed => ({
  code: "ESSAY",
  label: "Эссэ — 500-1000 үг",
  description:
    "«Миний сонгосон мэргэжил, ирээдүйн зорилго» сэдвээр системд шууд бичнэ.",
  helpUrl: null,
  isRequired: true,
  allowMultiple: false,
  collectsEventName: false,
  collectsNote: false,
  sortOrder,
});

const idCard = (sortOrder: number): RequirementSeed => ({
  code: "ID_CARD",
  label: "Иргэний үнэмлэхийн хуулбар",
  description:
    "Төрийн үйлчилгээний нэгдсэн систем (e-mongolia)-ээс авсан Иргэний үнэмлэхийн лавлагааг хавсаргана.",
  helpUrl: EMONGOLIA.idCard,
  isRequired: true,
  allowMultiple: false,
  collectsEventName: false,
  collectsNote: false,
  sortOrder,
});

// Photo requirement removed per user specification.

const achievementsRequirement = (
  sortOrder: number,
  description: string,
): RequirementSeed => ({
  code: "ACHIEVEMENTS",
  label: "Нийгмийн оролцоо, манлайллыг нотлох баримт",
  description,
  helpUrl: null,
  isRequired: false,
  allowMultiple: true,
  // Арга хэмжээ тус бүрээр нь нэрлэж хавсаргана.
  collectsEventName: true,
  collectsNote: true,
  sortOrder,
});

/** Нэг. Ерөнхий боловсролын сургууль төгсөгчид — журмын 5.1 дэх дараалал. */
const graduateRequirements: RequirementSeed[] = [
  guarantorRequest(1),
  applicationForm(2),
  essayRequirement(3),
  idCard(4),
  {
    code: "ADMISSION_PROOF",
    label: "Их, дээд сургуулийн элсэлтийн батламж",
    description: "Магадлан итгэмжлэгдсэн сургалтын хөтөлбөрт элссэн байх.",
    helpUrl: null,
    isRequired: true,
    allowMultiple: false,
    collectsEventName: false,
    collectsNote: false,
    sortOrder: 5,
  },
  {
    code: "SCORE_PROOF",
    label: "Элсэлтийн шалгалтын онооны баталгаажуулсан баримт",
    description:
      "Төрийн үйлчилгээний нэгдсэн систем (e-mongolia)-ээс авсан Элсэлтийн ерөнхий шалгалтын лавлагааг хавсаргана.",
    helpUrl: EMONGOLIA.examScore,
    isRequired: true,
    // e-mongolia-гийн нэг лавлагаанд бүх хичээлийн оноо багтдаг.
    allowMultiple: false,
    collectsEventName: false,
    collectsNote: false,
    sortOrder: 6,
  },
  {
    code: "EMONGOLIA_GPA",
    label: "Бүрэн дунд боловсролын үнэлгээний лавлагаа",
    description:
      "Төрийн үйлчилгээний нэгдсэн систем (e-mongolia)-ээс авсан Бүрэн дунд боловсролын үнэмлэхийн тодорхойлолтыг хавсаргана.",
    helpUrl: EMONGOLIA.secondaryGpa,
    isRequired: true,
    allowMultiple: false,
    collectsEventName: false,
    collectsNote: false,
    sortOrder: 7,
  },
  achievementsRequirement(
    8,
    "Гэрчилгээ, өргөмжлөл, сертификат, тодорхойлолтын хуулбар — байгаа тохиолдолд.",
  ),
];

const graduateCriteria: CriterionSeed[] = [
  {
    code: "MAJOR_FIT",
    label:
      "Сонгосон мэргэжил эрэлттэй, тэргүүлэх чиглэлийн бөгөөд сумын хүний нөөцийн хэрэгцээ, шаардлагад нийцсэн байдал",
    description:
      "Тухайн сумын хүний нөөцийн хэрэгцээ, тэргүүлэх чиглэлтэй хэр нийцэж байгааг үнэлнэ.",
    maxScore: 25,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 1,
  },
  {
    code: "EXAM_SCORE",
    label: "Элсэлтийн шалгалтын дундаж оноо",
    description: "ЭЕШ-ын дундаж оноог 800-гийн харьцаагаар шилжүүлж бодно.",
    maxScore: 40,
    autoSource: AutoScoreSource.EXAM_SCORE,
    autoInputMax: 800,
    sortOrder: 2,
  },
  {
    code: "GPA",
    label: "Бүрэн дунд боловсролын үнэлгээний дундаж",
    description: "Голч дүнг 100-гийн харьцаагаар шилжүүлж бодно.",
    maxScore: 10,
    autoSource: AutoScoreSource.GPA,
    autoInputMax: 100,
    sortOrder: 3,
  },
  {
    code: "SOCIAL",
    label: "Нийгмийн оролцоо, манлайллын үзүүлэлт",
    description: "Хавсаргасан гэрчилгээ, өргөмжлөл, сертификатад үндэслэнэ.",
    maxScore: 10,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 4,
  },
  {
    code: "ESSAY",
    label: "Эссэний үнэлгээ",
    description: "Агуулга, бүтэц, үнэмшил.",
    maxScore: 15,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 5,
  },

];

/** Хоёр. Их, дээд сургуулийн суралцагчид — журмын 5.2 дэх дараалал. */
const studentRequirements: RequirementSeed[] = [
  guarantorRequest(1),
  applicationForm(2),
  essayRequirement(3),
  {
    code: "RESIDENCE_REF",
    label: "Оршин суугаа газрын лавлагаа",
    description:
      "Төрийн үйлчилгээний нэгдсэн систем (e-mongolia)-ээс авсан байх.",
    helpUrl: EMONGOLIA.residence,
    isRequired: true,
    allowMultiple: false,
    collectsEventName: false,
    collectsNote: false,
    sortOrder: 4,
  },
  {
    code: "ENROLLMENT_PROOF",
    label: "Суралцаж буй сургуулийн тодорхойлолт",
    description:
      "Магадлан итгэмжлэгдсэн хөтөлбөрт суралцаж буйг нотолсон, их дээд сургуулиас олгосон албан ёсны тодорхойлолт.",
    helpUrl: EMONGOLIA.enrollment,
    isRequired: true,
    allowMultiple: false,
    collectsEventName: false,
    collectsNote: false,
    sortOrder: 5,
  },
  {
    code: "GPA_PROOF",
    label: "Голч дүнгийн тодорхойлолт",
    description:
      "Голч дүн (GPA) 3.0 ба түүнээс дээш болохыг нотолсон, албан ёсоор баталгаажсан тодорхойлолт.",
    helpUrl: null,
    isRequired: true,
    allowMultiple: false,
    collectsEventName: false,
    collectsNote: false,
    sortOrder: 6,
  },
  {
    code: "CONDUCT_PROOF",
    label: "Ёс зүйн зөрчилгүй тухай тодорхойлолт",
    description: "Суралцах хугацаанд хамаарна.",
    helpUrl: null,
    isRequired: true,
    allowMultiple: false,
    collectsEventName: false,
    collectsNote: false,
    sortOrder: 7,
  },
  idCard(8),
  achievementsRequirement(
    9,
    "Нийгмийн оролцоо, эрдэм шинжилгээ, спорт, урлаг, сайн дурын үйл ажиллагааны гэрчилгээ, өргөмжлөл, сертификатын хуулбар — байгаа тохиолдолд.",
  ),
];

const studentCriteria: CriterionSeed[] = [
  {
    code: "MAJOR_FIT",
    label:
      "Сонгосон мэргэжил эрэлттэй, тэргүүлэх чиглэлийн, мөн сумын хүний нөөцийн хэрэгцээ шаардлагад нийцсэн байдал",
    description:
      "Тухайн сумын хүний нөөцийн хэрэгцээ, тэргүүлэх чиглэлтэй хэр нийцэж байгааг үнэлнэ.",
    maxScore: 25,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 1,
  },
  {
    code: "UNIVERSITY_GPA",
    label: "Голч дүн (GPA)",
    description: "Их сургуулийн голч дүнг 4.0-ийн харьцаагаар шилжүүлж бодно.",
    maxScore: 40,
    autoSource: AutoScoreSource.UNIVERSITY_GPA,
    autoInputMax: 4,
    sortOrder: 2,
  },
  {
    code: "SOCIAL",
    label: "Нийгмийн оролцоо, манлайллын үзүүлэлт",
    description:
      "Эрдэм шинжилгээ, спорт, урлаг, сайн дурын үйл ажиллагааны оролцоог оруулна.",
    maxScore: 15,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 3,
  },

  {
    code: "ESSAY",
    label: "Эссэний үнэлгээ",
    description: "Агуулга, бүтэц, үнэмшил.",
    maxScore: 20,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 4,
  },

];

/** Квотыг журмын 3.1, 3.2-т тоогоор заагаагүй — жил бүр төсвөөр тогтооно. */
const calls = [
  {
    name: "12 дугаар анги төгсөгчдийн сургалтын төлбөрийн тэтгэлэг",
    track: CallTrack.GRADUATE,
    description:
      "Дорноговь аймагт 5-аас доошгүй жил оршин суусан, магадлан итгэмжлэгдсэн хөтөлбөрт элсэн суралцах эрх авсан төгсөгчдөд зориулав.",
    quota: 50,
    minExamScore: 620,
    minGpa: 80,
    minUniversityGpa: null,
    requirements: graduateRequirements,
    criteria: graduateCriteria,
  },
  {
    name: "Их, дээд сургуулийн оюутны сургалтын төлбөрийн тэтгэлэг",
    track: CallTrack.STUDENT,
    description:
      "Магадлан итгэмжлэгдсэн хөтөлбөрт суралцаж буй, голч дүн 3.0-оос дээш Дорноговь аймгийн харьяат оюутнуудад зориулав.",
    quota: 30,
    minExamScore: null,
    minGpa: null,
    minUniversityGpa: 3.0,
    requirements: studentRequirements,
    criteria: studentCriteria,
  },
];

async function main() {
  for (const definition of calls) {
    const total = definition.criteria.reduce(
      (sum, item) => sum + item.maxScore,
      0,
    );
    if (total !== 100) {
      throw new Error(
        `«${definition.name}» шалгуурын нийт оноо 100 байх ёстой, одоо ${total}.`,
      );
    }

    const data = {
      track: definition.track,
      academicYear: ACADEMIC_YEAR,
      description: definition.description,
      opensAt: OPENS_AT,
      quota: definition.quota,
      isActive: true,
      minExamScore: definition.minExamScore,
      minGpa: definition.minGpa,
      minUniversityGpa: definition.minUniversityGpa,
      requiredAimag: "Дорноговь",
    };

    // Нэрээр биш (жил, төрөл)-өөр тааруулна. Журам өөрчлөгдөж зарлалын нэр
    // солигдоход шинэ мөр үүсгэвэл нэг төрөлд хоёр идэвхтэй зарлал үлдэж,
    // хуучин өргөдлүүд салангид зарлал дээр үлдэх байлаа.
    const existing = await prisma.scholarshipCall.findFirst({
      where: { year: YEAR, track: definition.track },
      select: { id: true },
    });

    const call = existing
      ? await prisma.scholarshipCall.update({
          where: { id: existing.id },
          // closesAt-г шинэчлэхгүй — ашиглалтад хугацааг гараар сунгасан байж болно.
          data: { ...data, name: definition.name },
        })
      : await prisma.scholarshipCall.create({
          data: {
            ...data,
            name: definition.name,
            year: YEAR,
            closesAt: CLOSES_AT,
          },
        });

    await syncRequirements(call.id, definition.requirements);
    await syncCriteria(call.id, definition.criteria);

    console.log(
      `  ${definition.name}: ${definition.requirements.length} материал, ${definition.criteria.length} шалгуур (${total} оноо)`,
    );
  }

  await seedStaff();
  console.log("Seed дууслаа.");
}

/** Журам өөрчлөгдвөл хуучин мөрүүд үлдэхгүй байхаар бүрэн тааруулна. */
async function syncRequirements(callId: string, items: RequirementSeed[]) {
  for (const item of items) {
    await prisma.documentRequirement.upsert({
      where: { callId_code: { callId, code: item.code } },
      update: item,
      create: { ...item, callId },
    });
  }

  await prisma.documentRequirement.deleteMany({
    where: { callId, code: { notIn: items.map((item) => item.code) } },
  });
}

async function syncCriteria(callId: string, items: CriterionSeed[]) {
  for (const item of items) {
    await prisma.scoringCriterion.upsert({
      where: { callId_code: { callId, code: item.code } },
      update: item,
      create: { ...item, callId },
    });
  }

  await prisma.scoringCriterion.deleteMany({
    where: { callId, code: { notIn: items.map((item) => item.code) } },
  });
}

/** Комисс, админы бүртгэл. Нууц үг зөвхөн шинээр үүсгэх үед тавигдана. */
async function seedStaff() {
  const password = process.env.SEED_STAFF_PASSWORD ?? "Burtgel!2026";
  const passwordHash = await bcrypt.hash(password, 12);

  const staff = [
    {
      email: "admin@dornogovi.gov.mn",
      name: "Системийн админ",
      role: Role.ADMIN,
    },
    {
      email: "reviewer1@dornogovi.gov.mn",
      name: "Комиссын гишүүн 1",
      role: Role.REVIEWER,
    },
    {
      email: "reviewer2@dornogovi.gov.mn",
      name: "Комиссын гишүүн 2",
      role: Role.REVIEWER,
    },
  ];

  for (const person of staff) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: { role: person.role, name: person.name },
      create: { ...person, passwordHash, emailVerifiedAt: new Date() },
    });
  }

  if (!process.env.SEED_STAFF_PASSWORD) {
    console.warn(
      `\n  Анхаар: админ/комиссын анхны нууц үг «${password}».\n` +
        `  Ашиглалтад оруулахаас өмнө заавал солино уу.\n`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

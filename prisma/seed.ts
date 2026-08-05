import {
  AutoScoreSource,
  CallTrack,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const YEAR = 2026;
const ACADEMIC_YEAR = "2026-2027 хичээлийн жил";
const OPENS_AT = new Date("2026-05-31T16:00:00.000Z");
const CLOSES_AT = new Date("2026-08-31T15:59:59.000Z");

type RequirementSeed = {
  code: string;
  label: string;
  description: string | null;
  isRequired: boolean;
  allowMultiple: boolean;
  sortOrder: number;
};

type CriterionSeed = {
  code: string;
  label: string;
  description: string | null;
  maxScore: number;
  autoSource: AutoScoreSource;
  autoInputMax: number | null;
  sortOrder: number;
};

/** Хоёр төрөлд давхардаж орох материалууд. */
const sharedRequirements = (): RequirementSeed[] => [
  {
    code: "APPLICATION_LETTER",
    label: "Тэтгэлэг хүссэн өргөдөл",
    description: "Гарын үсэг зурсан өргөдөл.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 1,
  },
  {
    code: "APPLICATION_FORM",
    label: "Тэтгэлэгт хамрагдах анкет",
    description: "Системд бөглөсөн анкетаас автоматаар үүснэ.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 2,
  },
  {
    code: "ESSAY",
    label: "Эссэ — 500-1000 үг",
    description:
      "«Миний сонгосон мэргэжил, ирээдүйн зорилго» сэдвээр системд шууд бичнэ.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 3,
  },
  {
    code: "RESIDENCE_REF",
    label: "Иргэний оршин суугаа газрын хаягийн бүртгэлийн лавлагаа",
    description: "И-Монголиа системээс авсан байх.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 4,
  },
];

const achievementsRequirement = (
  description: string,
): RequirementSeed => ({
  code: "ACHIEVEMENTS",
  label: "Нийгмийн оролцоо, манлайллыг нотлох баримт",
  description,
  isRequired: false,
  allowMultiple: true,
  sortOrder: 8,
});

/** Нэг. 12 дугаар анги төгсөгчид. */
const graduateRequirements: RequirementSeed[] = [
  ...sharedRequirements(),
  {
    code: "ADMISSION_PROOF",
    label: "Элсэлтийн батламж, суралцах эрх олгосон баримт",
    description: "Магадлан итгэмжлэгдсэн их, дээд сургуулийн баримт бичиг.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 5,
  },
  {
    code: "MAJOR_PROOF",
    label: "Сонгосон мэргэжлийг нотлох баримт",
    description:
      "Их, дээд сургуулийн мэргэжлийн тодорхойлолт эсхүл элсэлтийн батламж.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 6,
  },
  {
    code: "SCORE_PROOF",
    label: "Элсэлтийн шалгалтын оноо, боловсролын дундажийг нотлох баримт",
    description:
      "ЭЕШ-ын дундаж оноог баталгаажуулсан баримт, бүрэн дунд боловсролын үнэлгээний дундажийг нотлох И-Монголиа лавлагаа.",
    isRequired: true,
    allowMultiple: true,
    sortOrder: 7,
  },
  achievementsRequirement(
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
    maxScore: 30,
    autoSource: AutoScoreSource.EXAM_SCORE,
    autoInputMax: 800,
    sortOrder: 2,
  },
  {
    code: "GPA",
    label: "Бүрэн дунд боловсролын үнэлгээний дундаж",
    description: "Голч дүнг 100-гийн харьцаагаар шилжүүлж бодно.",
    maxScore: 15,
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
    maxScore: 10,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 5,
  },
  {
    code: "INTERVIEW",
    label: "Ярилцлагын үнэлгээ",
    description: "Комиссын ярилцлагын дүн.",
    maxScore: 10,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 6,
  },
];

/** Хоёр. Одоо суралцаж буй 2, 3 дугаар курсийн оюутнууд. */
const studentRequirements: RequirementSeed[] = [
  ...sharedRequirements(),
  {
    code: "ENROLLMENT_PROOF",
    label: "Магадлан итгэмжлэгдсэн хөтөлбөрт суралцаж буйг нотлох тодорхойлолт",
    description: "Их, дээд сургуулиас олгосон албан ёсны тодорхойлолт.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 5,
  },
  {
    code: "GPA_PROOF",
    label: "Голч дүн (GPA) 3.0 ба түүнээс дээш болохыг нотлох дүнгийн тодорхойлолт",
    description: "Албан ёсоор баталгаажсан байх.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 6,
  },
  {
    code: "CONDUCT_PROOF",
    label: "Ёс зүйн ноцтой зөрчил гаргаж байгаагүй тухай сургуулийн тодорхойлолт",
    description: "Суралцах хугацаанд хамаарна.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 7,
  },
  achievementsRequirement(
    "Нийгмийн оролцоо, манлайлал, эрдэм шинжилгээ, спорт, урлаг, сайн дурын үйл ажиллагааны гэрчилгээ, өргөмжлөл, сертификатын хуулбар — байгаа тохиолдолд.",
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
    maxScore: 30,
    autoSource: AutoScoreSource.UNIVERSITY_GPA,
    autoInputMax: 4,
    sortOrder: 2,
  },
  {
    code: "SOCIAL",
    label: "Нийгмийн оролцоо, манлайллын үзүүлэлт",
    description:
      "Эрдэм шинжилгээ, спорт, урлаг, сайн дурын үйл ажиллагааны оролцоог оруулна.",
    maxScore: 10,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 3,
  },
  {
    code: "CONDUCT",
    label: "Суралцахуйн тодорхойлолт",
    description: "Сургуулийн тодорхойлолт, ёс зүйн байдалд үндэслэнэ.",
    maxScore: 10,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 4,
  },
  {
    code: "ESSAY",
    label: "Эссэний үнэлгээ",
    description: "Агуулга, бүтэц, үнэмшил.",
    maxScore: 10,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 5,
  },
  {
    code: "INTERVIEW",
    label: "Ярилцлагын үнэлгээ",
    description: "Комиссын ярилцлагын дүн.",
    maxScore: 15,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 6,
  },
];

const calls = [
  {
    name: "12 дугаар анги төгсөгчдийн сургалтын төлбөрийн тэтгэлэг",
    track: CallTrack.GRADUATE,
    description:
      "Дорноговь аймгийн харьяат, их дээд сургуульд элсэн суралцах эрх авсан төгсөгчдөд зориулав.",
    quota: 50,
    minExamScore: 650,
    minGpa: 80,
    minUniversityGpa: null,
    requirements: graduateRequirements,
    criteria: graduateCriteria,
  },
  {
    name: "2, 3 дугаар курсийн оюутны сургалтын төлбөрийн тэтгэлэг",
    track: CallTrack.STUDENT,
    description:
      "Магадлан итгэмжлэгдсэн хөтөлбөрт суралцаж буй, голч дүн 3.0-аас дээш Дорноговь аймгийн харьяат оюутнуудад зориулав.",
    quota: 30,
    minExamScore: null,
    minGpa: null,
    minUniversityGpa: 3,
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

    const call = await prisma.scholarshipCall.upsert({
      where: { year_name: { year: YEAR, name: definition.name } },
      // closesAt-г шинэчлэхгүй — ашиглалтад хугацааг гараар сунгасан байж болно.
      update: data,
      create: { ...data, name: definition.name, year: YEAR, closesAt: CLOSES_AT },
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

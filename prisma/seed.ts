import { AutoScoreSource, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const YEAR = 2026;

/**
 * Журмаар тогтоосон 100 онооны шалгуур үзүүлэлт.
 * autoSource-той мөрүүдийн оноог систем анкетын тоон утгаас санал болгоно —
 * комисс хүсвэл гараар засна.
 */
const criteria = [
  {
    code: "MAJOR_FIT",
    label:
      "Сонгосон мэргэжил эрэлттэй, тэргүүлэх чиглэлийн бөгөөд сумын хүний нөөцийн хэрэгцээнд нийцсэн байдал",
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
    description:
      "Хавсаргасан гэрчилгээ, өргөмжлөл, сертификат, тодорхойлолтод үндэслэнэ.",
    maxScore: 10,
    autoSource: AutoScoreSource.NONE,
    autoInputMax: null,
    sortOrder: 4,
  },
  {
    code: "ESSAY",
    label: "Эссэний үнэлгээ",
    description:
      "«Миний сонгосон мэргэжил, ирээдүйн зорилго» эссений агуулга, бүтэц, үнэмшил.",
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

/** Журмаар шаардагдах материалын жагсаалт. sortOrder нь харагдах дараалал. */
const requirements = [
  {
    code: "APPLICATION_LETTER",
    label: "Тэтгэлэг хүссэн өргөдөл",
    description: "Гараар бичсэн эсхүл хэвлэсэн, гарын үсэг зурсан өргөдөл.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 1,
  },
  {
    code: "APPLICATION_FORM",
    label: "Тэтгэлэгт хамрагдах анкет",
    description: "Системд бөглөсөн анкет автоматаар үүснэ.",
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
    code: "ID_CARD",
    label: "Иргэний үнэмлэхийн хуулбар",
    description: "Урд, ард талын хуулбар.",
    isRequired: true,
    allowMultiple: true,
    sortOrder: 4,
  },
  {
    code: "ADMISSION_PROOF",
    label: "Элсэлтийн батламж, суралцах эрх",
    description:
      "Магадлан итгэмжлэгдсэн их, дээд сургуулийн элсэлтийн батламж эсхүл суралцах эрх олгосон баримт.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 5,
  },
  {
    code: "MAJOR_PROOF",
    label: "Мэргэжлийн тодорхойлолт",
    description:
      "Сонгосон мэргэжлийг нотлох их, дээд сургуулийн мэргэжлийн тодорхойлолт.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 6,
  },
  {
    code: "EXAM_SCORE",
    label: "ЭЕШ-ын дундаж онооны баримт",
    description: "Элсэлтийн ерөнхий шалгалтын оноог баталгаажуулсан баримт.",
    isRequired: true,
    allowMultiple: true,
    sortOrder: 7,
  },
  {
    code: "EMONGOLIA_GPA",
    label: "И-Монголиа лавлагаа — дүнгийн дундаж",
    description:
      "Бүрэн дунд боловсролын үнэлгээний дундажийг нотлох И-Монголиа системээс авсан лавлагаа.",
    isRequired: true,
    allowMultiple: false,
    sortOrder: 8,
  },
  {
    code: "ACHIEVEMENTS",
    label: "Нийгмийн оролцоо, манлайллын гэрчилгээ, өргөмжлөл",
    description:
      "Гэрчилгээ, өргөмжлөл, сертификат, тодорхойлолтын хуулбар — байгаа тохиолдолд.",
    isRequired: false,
    allowMultiple: true,
    sortOrder: 9,
  },
];

async function main() {
  const call = await prisma.scholarshipCall.upsert({
    where: {
      year_name: {
        year: YEAR,
        name: "12 дугаар анги төгсөгчдийн сургалтын төлбөрийн тэтгэлэг",
      },
    },
    update: {},
    create: {
      name: "12 дугаар анги төгсөгчдийн сургалтын төлбөрийн тэтгэлэг",
      year: YEAR,
      description:
        "Дорноговь аймгийн харьяат, их дээд сургуульд элсэн суралцах эрх авсан төгсөгчдөд зориулав.",
      opensAt: new Date(`${YEAR}-06-01T00:00:00+08:00`),
      closesAt: new Date(`${YEAR}-08-31T23:59:59+08:00`),
      quota: 50,
      isActive: true,
      minExamScore: 650,
      minGpa: 80,
      requiredAimag: "Дорноговь",
    },
  });

  for (const requirement of requirements) {
    await prisma.documentRequirement.upsert({
      where: { callId_code: { callId: call.id, code: requirement.code } },
      update: requirement,
      create: { ...requirement, callId: call.id },
    });
  }

  for (const criterion of criteria) {
    await prisma.scoringCriterion.upsert({
      where: { callId_code: { callId: call.id, code: criterion.code } },
      update: criterion,
      create: { ...criterion, callId: call.id },
    });
  }

  const totalScore = criteria.reduce((sum, item) => sum + item.maxScore, 0);
  if (totalScore !== 100) {
    throw new Error(`Шалгуурын нийт оноо 100 байх ёстой, одоо ${totalScore}.`);
  }

  await seedStaff();

  console.log(
    `Seed дууслаа: «${call.name}» (${call.year}), ${requirements.length} материал, ${criteria.length} шалгуур (нийт ${totalScore} оноо).`,
  );
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

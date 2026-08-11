import { PrismaClient, CallTrack, AutoScoreSource } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Өгөгдлийн санг эхний мэдээллээр дүүргэж байна (Seeding)...')

  // Одоогийн он
  const currentYear = new Date().getFullYear()

  // ==========================================
  // 1. 12 дугаар анги төгсөгчдийн тэтгэлэг
  // ==========================================
  const call1 = await prisma.scholarshipCall.upsert({
    where: {
      year_name: {
        year: currentYear,
        name: '12 дугаар анги төгсөгчдийн сургалтын төлбөрийн тэтгэлэг'
      }
    },
    update: {},
    create: {
      name: '12 дугаар анги төгсөгчдийн сургалтын төлбөрийн тэтгэлэг',
      track: CallTrack.GRADUATE,
      year: currentYear,
      academicYear: `${currentYear}-${currentYear + 1}`,
      description: 'Дорноговь аймагт 5-аас доошгүй жил оршин суусан, магадлан итгэмжлэгдсэн хөтөлбөрт элсэн суралцах эрх авсан төгсөгчдөд зориулав.',
      opensAt: new Date(new Date().setHours(0, 0, 0, 0)),
      closesAt: new Date(new Date().setDate(new Date().getDate() + 10)), // Ойролцоогоор 10 хоног нээлттэй байна
      quota: 10,
      isActive: true,
      criteria: {
        create: [
          { code: 'G_CRIT_1', label: 'Сонгосон мэргэжил эрэлттэй, тэргүүлэх чиглэлийн бөгөөд сумын хүний нөөцийн хэрэгцээ, шаардлагад нийцсэн байдал', maxScore: 25, sortOrder: 1 },
          { code: 'G_CRIT_2', label: 'Элсэлтийн шалгалтын дундаж оноо', maxScore: 40, autoSource: AutoScoreSource.EXAM_SCORE, autoInputMax: 800, sortOrder: 2 },
          { code: 'G_CRIT_3', label: 'Бүрэн дунд боловсролын үнэлгээний дундаж', maxScore: 10, autoSource: AutoScoreSource.GPA, autoInputMax: 100, sortOrder: 3 },
          { code: 'G_CRIT_4', label: 'Нийгмийн оролцоо, манлайллын үзүүлэлт', maxScore: 10, sortOrder: 4 },
          { code: 'G_CRIT_5', label: 'Эссэний үнэлгээ', maxScore: 15, sortOrder: 5 },
        ]
      },
      requirements: {
        create: [
          { code: 'G_REQ_1', label: 'Батлан даагчийн хүсэлт', isRequired: true, sortOrder: 1 },
          { code: 'G_REQ_2', label: 'Иргэний үнэмлэхийн хуулбар', isRequired: true, sortOrder: 2 },
          { code: 'G_REQ_3', label: 'Их, дээд сургуулийн элсэлтийн батламж', isRequired: true, sortOrder: 3 },
          { code: 'G_REQ_4', label: 'Элсэлтийн шалгалтын онооны баталгаажуулсан баримт', isRequired: true, sortOrder: 4 },
          { code: 'G_REQ_5', label: 'Бүрэн дунд боловсролын үнэлгээний лавлагаа', isRequired: true, sortOrder: 5 },
          { code: 'G_REQ_6', label: 'Нийгмийн оролцоо, манлайлал нотлох баримт (сонголтоор)', isRequired: false, allowMultiple: true, collectsEventName: true, collectsNote: true, sortOrder: 6 },
        ]
      }
    }
  })
  console.log(`✅ Үүсгэсэн: ${call1.name}`)

  // ==========================================
  // 2. Их, дээд сургуулийн оюутны тэтгэлэг
  // ==========================================
  const call2 = await prisma.scholarshipCall.upsert({
    where: {
      year_name: {
        year: currentYear,
        name: 'Их, дээд сургуулийн оюутны сургалтын төлбөрийн тэтгэлэг'
      }
    },
    update: {},
    create: {
      name: 'Их, дээд сургуулийн оюутны сургалтын төлбөрийн тэтгэлэг',
      track: CallTrack.STUDENT,
      year: currentYear,
      academicYear: `${currentYear}-${currentYear + 1}`,
      description: 'Магадлан итгэмжлэгдсэн хөтөлбөрт суралцаж буй, голч дүн 3.0-оос дээш Дорноговь аймгийн харьяат оюутнуудад зориулав.',
      opensAt: new Date(new Date().setHours(0, 0, 0, 0)),
      closesAt: new Date(new Date().setDate(new Date().getDate() + 10)),
      quota: 10,
      isActive: true,
      minUniversityGpa: 3.0,
      criteria: {
        create: [
          { code: 'S_CRIT_1', label: 'Сонгосон мэргэжил эрэлттэй, тэргүүлэх чиглэлийн, мөн сумын хүний нөөцийн хэрэгцээ шаардлагад нийцсэн байдал', maxScore: 25, sortOrder: 1 },
          { code: 'S_CRIT_2', label: 'Голч дүн (GPA)', maxScore: 40, autoSource: AutoScoreSource.UNIVERSITY_GPA, autoInputMax: 4.0, sortOrder: 2 },
          { code: 'S_CRIT_3', label: 'Нийгмийн оролцоо, манлайллын үзүүлэлт', maxScore: 15, sortOrder: 3 },
          { code: 'S_CRIT_4', label: 'Эссэний үнэлгээ', maxScore: 20, sortOrder: 4 },
        ]
      },
      requirements: {
        create: [
          { code: 'S_REQ_1', label: 'Батлан даагчийн хүсэлт', isRequired: true, sortOrder: 1 },
          { code: 'S_REQ_2', label: 'Оршин суугаа газрын лавлагаа', isRequired: true, sortOrder: 2 },
          { code: 'S_REQ_3', label: 'Суралцаж буй сургуулийн тодорхойлолт', isRequired: true, sortOrder: 3 },
          { code: 'S_REQ_4', label: 'Голч дүнгийн тодорхойлолт', isRequired: true, sortOrder: 4 },
          { code: 'S_REQ_5', label: 'Ёс зүйн зөрчилгүй тухай тодорхойлолт', isRequired: true, sortOrder: 5 },
          { code: 'S_REQ_6', label: 'Иргэний үнэмлэхийн хуулбар', isRequired: true, sortOrder: 6 },
          { code: 'S_REQ_7', label: 'Нийгмийн оролцоо, манлайллыг нотлох баримт (сонголтоор)', isRequired: false, allowMultiple: true, collectsEventName: true, collectsNote: true, sortOrder: 7 },
        ]
      }
    }
  })
  console.log(`✅ Үүсгэсэн: ${call2.name}`)

  console.log('🎉 Seeding амжилттай дууслаа!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

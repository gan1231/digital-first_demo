import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Updating database...')
  
  // Update descriptions
  const currentYear = new Date().getFullYear()
  
  await prisma.scholarshipCall.updateMany({
    where: { name: '12 дугаар анги төгсөгчдийн сургалтын төлбөрийн тэтгэлэг' },
    data: {
      description: 'Дорноговь аймагт 5-аас доошгүй жил оршин суусан, магадлан итгэмжлэгдсэн хөтөлбөрт элсэн суралцах эрх авсан төгсөгчид хамаарна.'
    }
  })

  await prisma.scholarshipCall.updateMany({
    where: { name: 'Их, дээд сургуулийн оюутны сургалтын төлбөрийн тэтгэлэг' },
    data: {
      description: 'Магадлан итгэмжлэгдсэн хөтөлбөрт суралцаж буй, голч дүн 3.0-оос дээш Дорноговь аймгийн харьяат оюутнуудад хамаарна.'
    }
  })

  // Update requirement labels
  await prisma.documentRequirement.updateMany({
    where: { code: 'G_REQ_6' },
    data: { label: 'Нийгмийн оролцоо, манлайлал нотлох баримт' }
  })

  await prisma.documentRequirement.updateMany({
    where: { code: 'S_REQ_7' },
    data: { label: 'Нийгмийн оролцоо, манлайллыг нотлох баримт' }
  })

  // Delete essay criteria
  await prisma.scoringCriterion.deleteMany({
    where: {
      code: {
        in: ['G_CRIT_5', 'S_CRIT_4']
      }
    }
  })

  console.log('Update successful!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

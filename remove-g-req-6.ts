import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.documentRequirement.deleteMany({
    where: {
      code: 'G_REQ_6'
    }
  })
  console.log('Deleted G_REQ_6 requirement')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

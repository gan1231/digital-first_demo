import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const reqs = await prisma.documentRequirement.findMany({
    where: {
      code: {
        in: ['S_REQ_2_1', 'G_REQ_1_1', 'S_REQ_1_1']
      }
    }
  })
  console.log('Found requirements in DB:', reqs.map(r => r.code))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

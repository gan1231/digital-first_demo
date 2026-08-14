import { PrismaClient } from "@prisma/client";
import { storage } from "../src/lib/storage";

const prisma = new PrismaClient();

async function main() {
  console.log("Устгах үйл ажиллагаа эхэллээ...");

  // 1. Бүх баримтуудыг олж авах (storage-с физик файлыг нь устгахын тулд)
  const documents = await prisma.document.findMany({
    select: { storageKey: true },
  });

  console.log(`Нийт ${documents.length} ширхэг файл олдлоо. Устгаж байна...`);

  let deletedFilesCount = 0;
  for (const doc of documents) {
    try {
      await storage.remove(doc.storageKey);
      deletedFilesCount++;
    } catch (error) {
      console.error(`Файл устгах үед алдаа гарлаа: ${doc.storageKey}`, error);
    }
  }

  console.log(`${deletedFilesCount} ширхэг файлыг storage-с амжилттай устгалаа.`);

  // 2. Өгөгдлийн сангаас Application устгах.
  // Prisma schema дээр Application нь Document, CriterionEvaluation, Decision зэрэгтэй
  // 'onDelete: Cascade' тохиргоотой холбогдсон тул Application-ийг устгахад бусад хамааралтай өгөгдлүүд
  // автоматаар устгагдах болно. Бусад өгөгдөлд (User, ScholarshipCall гэх мэт) нөлөөлөхгүй.
  const deleteResult = await prisma.application.deleteMany({});

  console.log(
    `Өгөгдлийн сангаас нийт ${deleteResult.count} ширхэг анкет (Application) болон тэдгээрийн хавсралтууд амжилттай устгагдлаа.`
  );
}

main()
  .catch((e) => {
    console.error("Алдаа гарлаа:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { ReviewSection } from "@prisma/client";

export const SECTION_LABELS: Record<ReviewSection, string> = {
  [ReviewSection.GUARANTOR]: "Батлан даагчийн мэдээлэл шалгах",
  [ReviewSection.APPLICATION_INFO]: "Анкетны мэдээлэл шалгах",
  [ReviewSection.ACADEMIC]: "Сурлагын үзүүлэлтийн мэдээлэл шалгах",
  [ReviewSection.SCHOOL]: "Сургуулийн мэдээлэл шалгах",
  [ReviewSection.ESSAY]: "Эсээ",
  [ReviewSection.SOCIAL]: "Нийгмийн оролцоо манлайллын үзүүлэлт шалгах",
};

/**
 * Эсээг үнэлгээнээс хассан. ESSAY хэсэг шалгагчид харагдахгүй, шинээр
 * хуваарилагдахгүй. SECTION_LABELS-д нэр нь үлдсэн — хуучин хуваарилалт
 * үлдсэн гишүүний мэдээллийг зөв нэрээр харуулахын тулд.
 */
export const ACTIVE_REVIEW_SECTIONS: ReviewSection[] = Object.values(
  ReviewSection,
).filter((section) => section !== ReviewSection.ESSAY);

/**
 * Эсээний онооны шалгуурууд. Журмаас хассан тул үнэлгээ, эцсийн жагсаалт,
 * нийт онооны аль алинд орохгүй. DB-д мөр нь хэвээр үлдэнэ — буцаахыг
 * хүсвэл энэ жагсаалтыг хоослоход л хангалттай.
 */
export const ESSAY_CRITERION_CODES = ["ESSAY", "G_CRIT_5", "S_CRIT_4"];

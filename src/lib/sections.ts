import { ReviewSection } from "@prisma/client";

export const SECTION_LABELS: Record<ReviewSection, string> = {
  [ReviewSection.GUARANTOR]: "Батлан даагчийн мэдээлэл шалгах",
  [ReviewSection.APPLICATION_INFO]: "Анкетны мэдээлэл шалгах",
  [ReviewSection.ACADEMIC]: "Сурлагын үзүүлэлтийн мэдээлэл шалгах",
  [ReviewSection.SCHOOL]: "Сургуулийн мэдээлэл шалгах",
  [ReviewSection.ESSAY]: "Эсээ",
  [ReviewSection.SOCIAL]: "Нийгмийн оролцоо манлайллын үзүүлэлт шалгах",
};

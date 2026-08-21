/**
 * pdfkit-ийн standalone багц нь стандарт фонтын өгөгдлийг өөртөө агуулдаг тул
 * ажиллах үедээ .afm файл хайхгүй — Next.js-ийн standalone build дотор
 * найдвартай ажиллана. Төрлийн тодорхойлолт нь үндсэн pdfkit-тэйгээ ижил.
 */
declare module "pdfkit/js/pdfkit.standalone.js" {
  import PDFDocument from "pdfkit";
  export default PDFDocument;
}

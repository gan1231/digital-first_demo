import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import {
  CallTrack,
  type Application,
  type Document,
  type ScholarshipCall,
} from "@prisma/client";
import { TARGET_GROUP_LABELS } from "@/lib/anket";
import { fund, org } from "@/lib/brand";
import { trackLabels } from "@/lib/call";

/**
 * «ТЭТГЭЛЭГ ГОРИЛОГЧИЙН АНКЕТ»-ыг DB-д хадгалсан утгуудаас PDF болгож үүсгэнэ.
 * Админ материалыг нэг багц болгон татахад анкет нь хавсралт файл биш, зөвхөн
 * өгөгдөл хэлбэрээр байдаг тул энд үүсгэж багцад оруулна.
 *
 * Эсээг зориудаар оруулаагүй — багцад эсээ шаардлагагүй гэж тохирсон.
 *
 * Кирилл үсэг: pdfkit-ийн залгамал (Helvetica) фонтод кирилл байхгүй тул
 * DejaVu Sans-ыг public/fonts-оос уншиж суулгана. Docker дүрсэнд public/
 * бүтнээрээ хуулагддаг тул серверт ч бэлэн байна.
 */

export type AnketApplication = Application & {
  user: { name: string; email: string };
  documents: Document[];
};

type AnketCall = Pick<ScholarshipCall, "name" | "track" | "year" | "academicYear">;

const FONT_DIR = join(process.cwd(), "public", "fonts");

/** Фонт нь ~700KB тул процессын амьдралын хугацаанд нэг л удаа уншина. */
let fontsPromise: Promise<{ regular: Buffer; bold: Buffer }> | undefined;

function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  fontsPromise ??= (async () => {
    const [regular, bold] = await Promise.all([
      readFile(join(FONT_DIR, "DejaVuSans.ttf")),
      readFile(join(FONT_DIR, "DejaVuSans-Bold.ttf")),
    ]);
    return { regular, bold };
  })();
  return fontsPromise;
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDate(value: Date | null | undefined): string {
  return value ? dateFormatter.format(value) : "—";
}

function formatDateTime(value: Date | null | undefined): string {
  return value ? dateTimeFormatter.format(value).replace(",", "") : "—";
}

function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const cleaned = String(value).trim();
  return cleaned === "" ? "—" : cleaned;
}

function yesNo(value: boolean): string {
  return value ? "Тийм" : "Үгүй";
}

/** Файлын нэрэнд ороход аюулгүй болгосон «Овог_Нэр_Регистр» хэлбэр. */
export function applicantSlug(application: AnketApplication): string {
  const parts = [
    application.lastName,
    application.firstName,
    application.registerNo,
  ]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);

  const name = parts.length > 0 ? parts.join("_") : application.user.name;

  return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_") || "anket";
}

export function anketFileName(application: AnketApplication): string {
  return `Анкет_${applicantSlug(application)}.pdf`;
}

// --- Хуудас зурах туслахууд -------------------------------------------------

const PAGE_MARGIN = 45;
const LABEL_WIDTH = 165;
const LINE_GAP = 4;

type Row = [label: string, value: string];

function drawSection(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 46);
  doc.moveDown(0.6);

  const y = doc.y;
  doc
    .font("bold")
    .fontSize(10.5)
    .fillColor("#111827")
    .text(title.toUpperCase(), PAGE_MARGIN, y);

  doc
    .moveTo(PAGE_MARGIN, doc.y + 2)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y + 2)
    .lineWidth(0.8)
    .strokeColor("#9ca3af")
    .stroke();

  doc.moveDown(0.5);
}

function drawRows(doc: PDFKit.PDFDocument, rows: Row[]): void {
  const valueWidth =
    doc.page.width - PAGE_MARGIN * 2 - LABEL_WIDTH - 8;

  for (const [label, value] of rows) {
    const height = Math.max(
      doc.font("body").fontSize(9.5).heightOfString(value, { width: valueWidth }),
      doc.font("body").fontSize(9.5).heightOfString(label, { width: LABEL_WIDTH }),
    );

    ensureSpace(doc, height + LINE_GAP);
    const y = doc.y;

    doc
      .font("body")
      .fontSize(9.5)
      .fillColor("#6b7280")
      .text(label, PAGE_MARGIN, y, { width: LABEL_WIDTH });

    doc
      .font("bold")
      .fontSize(9.5)
      .fillColor("#111827")
      .text(value, PAGE_MARGIN + LABEL_WIDTH + 8, y, { width: valueWidth });

    doc.y = y + height + LINE_GAP;
  }
}

/** Мөр багтахгүй бол шинэ хуудас нээнэ — гарын үсэг, хүснэгт таслагдахаас сэргийлнэ. */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  const bottom = doc.page.height - PAGE_MARGIN - 24;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

// --- Үндсэн үүсгэгч ---------------------------------------------------------

export async function renderAnketPdf(
  application: AnketApplication,
  call: AnketCall,
  requirementLabels: Map<string, string>,
): Promise<Buffer> {
  const fonts = await loadFonts();

  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    info: {
      Title: `Тэтгэлэг горилогчийн анкет — ${text(application.registerNo)}`,
      Author: org.name,
      Subject: `${fund.name} — ${call.name}`,
    },
  });

  doc.registerFont("body", fonts.regular);
  doc.registerFont("bold", fonts.bold);

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // --- Толгой хэсэг ---------------------------------------------------------

  doc
    .font("bold")
    .fontSize(13)
    .fillColor("#111827")
    .text("ТЭТГЭЛЭГ ГОРИЛОГЧИЙН АНКЕТ", { align: "center" });

  doc
    .font("body")
    .fontSize(9.5)
    .fillColor("#4b5563")
    .text(`${fund.name} · ${org.name}`, { align: "center" });

  doc.text(
    `${call.name} · ${trackLabels[call.track]}${
      call.academicYear ? ` · ${call.academicYear}` : ""
    }`,
    { align: "center" },
  );

  doc.moveDown(0.4);

  drawSection(doc, "Бүртгэлийн мэдээлэл");
  drawRows(doc, [
    ["Өргөдлийн дугаар", application.id],
    ["Илгээсэн огноо", formatDateTime(application.submittedAt)],
    ["Баталгаа тэмдэглэсэн", formatDateTime(application.declaredAt)],
    ["Нэвтрэх и-мэйл", text(application.user.email)],
  ]);

  // --- 1. Хувийн мэдээлэл ---------------------------------------------------

  drawSection(doc, "1. Хувийн мэдээлэл");
  drawRows(doc, [
    ["Регистрийн дугаар", text(application.registerNo)],
    ["Иргэний бүртгэлийн дугаар", text(application.civilRegistrationNo)],
    ["1.1. Иргэний харьяалал", text(application.citizenship)],
    ["1.2. Ургийн овог", text(application.clanName)],
    ["1.3. Эцэг (эх)-ийн нэр", text(application.lastName)],
    ["1.4. Өөрийн нэр", text(application.firstName)],
    [
      "1.5. Хүйс",
      application.gender === "MALE"
        ? "Эрэгтэй"
        : application.gender === "FEMALE"
          ? "Эмэгтэй"
          : "—",
    ],
    ["1.6. Төрсөн огноо", formatDate(application.birthDate)],
    ["1.7. Үндэс, угсаа", text(application.ethnicity)],
    [
      "1.8. Төрсөн аймаг, сум",
      `${text(application.birthAimag)}, ${text(application.birthSoum)}`,
    ],
  ]);

  drawSection(doc, "1.9. Байнгын оршин суугаа хаяг");
  drawRows(doc, [
    ["Аймаг, хот", text(application.aimag)],
    ["Сум, дүүрэг", text(application.soum)],
    ["Баг, хороо", text(application.bag)],
    ["Хороолол, хотхон", text(application.khoroolol)],
    ["Байр, гудамж", text(application.street)],
    ["Тоот", text(application.unit)],
    ["Нэгтгэсэн хаяг", text(application.address)],
  ]);

  drawSection(doc, "1.10-1.11. Холбоо барих");
  drawRows(doc, [
    ["Утасны дугаар 1", text(application.phone)],
    ["Утасны дугаар 2", text(application.phone2)],
    ["Харилцах хүн — хэн болох", text(application.contactRelation)],
    ["Харилцах хүний нэр", text(application.contactName)],
    ["Харилцах хүний утас", text(application.contactPhone)],
  ]);

  drawSection(doc, "1.12. Зорилтот бүлэг");
  drawRows(doc, [
    ["Хамаарах эсэх", yesNo(application.isTargetGroup)],
    [
      "Хэлбэр",
      application.targetGroupTypes.length > 0
        ? application.targetGroupTypes
            .map((type) => TARGET_GROUP_LABELS[type] ?? type)
            .join(", ")
        : "—",
    ],
    ["Тайлбар", text(application.targetGroupNote)],
  ]);

  // --- 2. Батлан даагч ------------------------------------------------------

  drawSection(doc, "2. Батлан даагч");
  drawRows(doc, [
    ["Эцэг (эх)-ийн нэр, нэр", text(application.guarantorName)],
    ["Регистрийн дугаар", text(application.guarantorRegisterNo)],
    ["Горилогчийн хэн болох", text(application.guarantorRelation)],
    ["Утасны дугаар", text(application.guarantorPhone)],
    ["Оршин суугаа хаяг", text(application.guarantorAddress)],
    ["Ажлын газар, албан тушаал", text(application.guarantorWorkplace)],
  ]);

  // --- 3. Боловсрол ---------------------------------------------------------

  drawSection(doc, "3. Боловсрол, сурлагын үзүүлэлт");

  const educationRows: Row[] = [
    ["Төгссөн/суралцсан сургууль", text(application.school)],
    ["Төгссөн он", text(application.graduationYear)],
  ];

  if (call.track === CallTrack.GRADUATE) {
    educationRows.push(
      ["ЭЕШ-ын оноо", text(application.examScore)],
      ["Бүрэн дунд боловсролын голч", text(application.gpa)],
    );
  } else {
    educationRows.push(
      ["Суралцаж буй курс", text(application.courseYear)],
      [
        "Их сургуулийн голч (4.0)",
        application.universityGpa === null
          ? "—"
          : application.universityGpa.toFixed(2),
      ],
    );
  }

  drawRows(doc, educationRows);

  // --- 4. Сургууль, мэргэжил ------------------------------------------------

  drawSection(doc, "4. Суралцаж буй их, дээд сургууль, мэргэжил");
  drawRows(doc, [
    ["Сургуулийн нэр", text(application.university)],
    ["Хөтөлбөрийн нэр", text(application.major)],
    ["Суралцах хугацаа", application.studyYears ? `${application.studyYears} жил` : "—"],
    [
      "Сургалтын төлбөр",
      application.tuitionAmount
        ? `${application.tuitionAmount.toLocaleString("en-US")} ₮`
        : "—",
    ],
    ["Сургууль магадлан итгэмжлэгдсэн", yesNo(application.isSchoolAccredited)],
    ["Хөтөлбөр магадлан итгэмжлэгдсэн", yesNo(application.isProgramAccredited)],
    ["Сонгосон мэргэжил", text(application.claimedProfession)],
    ["Эрэлттэй мэргэжил", yesNo(application.isDemandedProfession)],
    ["Тэргүүлэх мэргэжил", yesNo(application.isPriorityProfession)],
  ]);

  // --- 5. Бүрдүүлсэн материал ----------------------------------------------

  drawSection(doc, "5. Бүрдүүлсэн материалын жагсаалт");

  if (application.documents.length === 0) {
    doc
      .font("body")
      .fontSize(9.5)
      .fillColor("#6b7280")
      .text("Хавсаргасан материал алга.", PAGE_MARGIN, doc.y);
  } else {
    const sorted = [...application.documents].sort((a, b) =>
      a.requirementCode.localeCompare(b.requirementCode),
    );

    drawRows(
      doc,
      sorted.map((document, index): Row => [
        `${index + 1}. ${requirementLabels.get(document.requirementCode) ?? document.requirementCode}`,
        [
          document.fileName,
          document.eventName ? `(${document.eventName})` : null,
          document.note ? `— ${document.note}` : null,
        ]
          .filter(Boolean)
          .join(" "),
      ]),
    );
  }

  // --- Хөл --------------------------------------------------------------------

  ensureSpace(doc, 40);
  doc.moveDown(1);
  doc
    .font("body")
    .fontSize(8)
    .fillColor("#9ca3af")
    .text(
      `Энэхүү баримтыг ${formatDateTime(new Date())}-нд ${org.siteName} системээс автоматаар үүсгэв.`,
      PAGE_MARGIN,
      doc.y,
      { width: doc.page.width - PAGE_MARGIN * 2, align: "center" },
    );

  doc.end();
  return finished;
}

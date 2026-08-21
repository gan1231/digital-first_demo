import "server-only";
import { ZipArchive } from "archiver";
import { Readable } from "node:stream";
import type {
  Application,
  Document,
  DocumentRequirement,
  ScholarshipCall,
} from "@prisma/client";
import { anketFileName, applicantSlug, renderAnketPdf } from "@/lib/anket-pdf";
import { injectRequirements, trackLabels } from "@/lib/call";
import { GENERATED_CODES } from "@/lib/application-shared";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/**
 * Админ өргөдөгчийн материалыг нэг хавтас (ZIP) болгон татах.
 *
 * Файлууд MinIO/дискэн дээр байдаг тул нэг бүрчлэн уншиж, ZIP руу урсгалаар
 * (stream) дамжуулна — олон хүний материалыг санах ойд бүтнээр нь барихгүй.
 * Багц дотор анкет нь PDF болж үүснэ; эсээ ордоггүй.
 */

export type BundleApplication = Application & {
  user: { name: string; email: string };
  documents: Document[];
  call: ScholarshipCall & { requirements: DocumentRequirement[] };
};

const bundleInclude = {
  user: { select: { name: true, email: true } },
  documents: { orderBy: { uploadedAt: "asc" } },
  call: {
    include: { requirements: { orderBy: { sortOrder: "asc" } } },
  },
} as const;

/**
 * Журмаар нэмэгдсэн (DB-д мөргүй) шаардлагуудыг оруулж өгнө. Эс тэгвэл
 * тэдгээрт хавсаргасан баримт «тодорхойгүй» нэртэй ZIP-д орох байсан.
 */
function withInjectedRequirements(application: BundleApplication): BundleApplication {
  application.call.requirements = injectRequirements(
    application.callId,
    application.call.requirements,
  );
  return application;
}

export async function getBundleApplication(
  id: string,
): Promise<BundleApplication | null> {
  const application = await prisma.application.findUnique({
    where: { id },
    include: bundleInclude,
  });

  return application ? withInjectedRequirements(application as BundleApplication) : null;
}

export type BundleScope = "complete" | "all";

/** Багцад орох өргөдлүүд. `complete` — заавал шаардах материалаа бүрэн ирүүлсэн нь. */
export async function getBundleApplications(options: {
  callId?: string;
  scope: BundleScope;
}): Promise<BundleApplication[]> {
  const applications = (await prisma.application.findMany({
    where: {
      status: { not: "DRAFT" },
      hiddenAt: null,
      // Зарлал заагаагүй бол зөвхөн идэвхтэй зарлалынх — жагсаалтын хуудастай
      // ижил хамрах хүрээ.
      ...(options.callId
        ? { callId: options.callId }
        : { call: { isActive: true } }),
    },
    include: bundleInclude,
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
  })) as BundleApplication[];

  const withRequirements = applications.map(withInjectedRequirements);

  return options.scope === "complete"
    ? withRequirements.filter((application) => countMissing(application).length === 0)
    : withRequirements;
}

/** Дутуу байгаа заавал шаардах материалын нэрс. */
export function countMissing(application: BundleApplication): string[] {
  const uploaded = new Set(
    application.documents.map((document) => document.requirementCode),
  );

  // Зөвхөн заавал шаардах материалыг тооцно — жагсаалтын хуудсууд «бүрдэл»-ийг
  // ижилхэн ингэж бодож байгаа тул хоёр газарт өөр тоо гарахгүй.
  return application.call.requirements
    .filter(
      (requirement) =>
        requirement.isRequired &&
        !GENERATED_CODES.includes(requirement.code) &&
        !uploaded.has(requirement.code),
    )
    .map((requirement) => requirement.label);
}

export function requirementLabelMap(
  application: BundleApplication,
): Map<string, string> {
  return new Map(
    application.call.requirements.map((requirement) => [
      requirement.code,
      requirement.label,
    ]),
  );
}

// --- Файлын нэр -------------------------------------------------------------

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** ZIP доторх зам болгоход аюулгүй болгосон нэр. */
function safeSegment(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

function documentEntryName(
  document: Document,
  labels: Map<string, string>,
  order: number,
  duplicateIndex: number,
): string {
  const label = safeSegment(
    labels.get(document.requirementCode) ?? document.requirementCode,
  );
  const suffix = duplicateIndex > 0 ? `_${duplicateIndex + 1}` : "";
  const extension = EXTENSION_BY_MIME[document.mimeType] ?? "bin";

  return `${String(order).padStart(2, "0")}_${label}${suffix}.${extension}`;
}

/** Багц доторх нэг өргөдөгчийн хавтасны нэр — «0001_Овог_Нэр_АБ12345678». */
export function folderName(application: BundleApplication, index: number): string {
  return `${String(index + 1).padStart(4, "0")}_${safeSegment(applicantSlug(application))}`;
}

export function bundleFileName(
  call: { year: number; name: string } | null,
  count: number,
): string {
  // Файлын нэр хэт урт болохоос сэргийлж зарлалын нэрийг богиносгоно.
  const base = call
    ? `${call.year}-${safeSegment(call.name).slice(0, 40).trim()}`
    : "tetgeleg";
  return `${base}-materialuud-${count}.zip`.replace(/\s+/g, "_");
}

// --- ZIP урсгал -------------------------------------------------------------

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const cell = String(value);
  return /[",;\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

/** Багцын үндэс дэх нэгтгэл — Excel-д шууд нээгдэнэ (BOM-той). */
function summaryCsv(applications: BundleApplication[]): string {
  const header = [
    "Хавтас",
    "Овог",
    "Нэр",
    "Регистр",
    "И-мэйл",
    "Утас",
    "Тэтгэлгийн төрөл",
    "Сум",
    "Их сургууль",
    "Мэргэжил",
    "Төлөв",
    "Илгээсэн",
    "Материалын тоо",
    "Дутуу материал",
  ];

  const lines = [header.map(csvCell).join(",")];

  applications.forEach((application, index) => {
    const missing = countMissing(application);
    lines.push(
      [
        folderName(application, index),
        application.lastName,
        application.firstName,
        application.registerNo,
        application.user.email,
        application.phone,
        trackLabels[application.call.track],
        application.soum,
        application.university,
        application.major,
        application.status,
        application.submittedAt?.toISOString().slice(0, 10) ?? "",
        application.documents.length,
        missing.join("; "),
      ]
        .map(csvCell)
        .join(","),
    );
  });

  return `﻿${lines.join("\r\n")}`;
}

export type BundleResult = {
  stream: ReadableStream<Uint8Array>;
  /** Багцад орсон файлын тоо — мөрдлийн бичилтэд. */
  documentCount: number;
};

/**
 * Өргөдлүүдийг ZIP болгоно.
 *
 * `useFolders=false` үед (нэг өргөдөгч) файлууд ZIP-ийн үндэст шууд орно.
 * Хадгалалтаас файл олдоогүй тохиолдолд багц бүхэлдээ унахгүй — алдааг
 * `_дутуу-файл.txt`-д бичиж үлдээнэ.
 */
export function buildBundle(
  applications: BundleApplication[],
  options: { useFolders: boolean; includeSummary: boolean },
): BundleResult {
  // Материалууд аль хэдийн шахагдсан PDF/JPG тул дахин шахахгүй — CPU хэмнэнэ.
  const archive = new ZipArchive({ store: true });
  const documentCount = applications.reduce(
    (sum, application) => sum + application.documents.length,
    0,
  );

  void (async () => {
    const problems: string[] = [];

    try {
      if (options.includeSummary) {
        archive.append(Buffer.from(summaryCsv(applications), "utf8"), {
          name: "00_Нэгтгэл.csv",
        });
      }

      for (const [index, application] of applications.entries()) {
        const prefix = options.useFolders
          ? `${folderName(application, index)}/`
          : "";
        const labels = requirementLabelMap(application);

        try {
          const pdf = await renderAnketPdf(application, application.call, labels);
          archive.append(pdf, { name: `${prefix}00_${anketFileName(application)}` });
        } catch (error) {
          problems.push(
            `${prefix || applicantSlug(application)}: анкет үүсгэхэд алдаа — ${String(error)}`,
          );
        }

        // Шаардлагын дараалалд тааруулж дугаарлана — цаасан бүрдэлтэй ижил дэс дараалал.
        const order = new Map(
          application.call.requirements.map((requirement, position) => [
            requirement.code,
            position + 1,
          ]),
        );
        const seen = new Map<string, number>();

        for (const document of application.documents) {
          const duplicateIndex = seen.get(document.requirementCode) ?? 0;
          seen.set(document.requirementCode, duplicateIndex + 1);

          try {
            const bytes = await storage.read(document.storageKey);
            archive.append(bytes, {
              name:
                prefix +
                documentEntryName(
                  document,
                  labels,
                  order.get(document.requirementCode) ?? 99,
                  duplicateIndex,
                ),
            });
          } catch (error) {
            problems.push(
              `${prefix}${document.fileName}: файл уншигдсангүй — ${String(error)}`,
            );
          }
        }
      }

      if (problems.length > 0) {
        archive.append(Buffer.from(problems.join("\r\n"), "utf8"), {
          name: "_дутуу-файл.txt",
        });
      }

      await archive.finalize();
    } catch (error) {
      archive.destroy(error as Error);
    }
  })();

  return {
    stream: Readable.toWeb(archive as unknown as Readable) as ReadableStream<Uint8Array>,
    documentCount,
  };
}

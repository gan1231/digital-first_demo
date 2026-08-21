import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { requireRole, writeAudit } from "@/lib/auth";
import { GENERATED_CODES } from "@/lib/application-shared";
import { trackLabels } from "@/lib/call";
import { getBundleApplication } from "@/lib/export-bundle";
import { Alert, Card, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Өргөдөгчийн материал" };
export const dynamic = "force-dynamic";

export default async function ApplicantDownloadsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(Role.ADMIN);
  const { id } = await params;
  const application = await getBundleApplication(id);

  if (!application) notFound();

  await writeAudit({
    actorId: user.id,
    action: "application.downloads_view",
    targetType: "Application",
    targetId: application.id,
  });

  // Шаардлага бүрд хамаарах баримтууд. Шаардлагад холбогдоогүй үлдэгдэл
  // баримт (журам өөрчлөгдөхөд үүсдэг) тусад нь доор харагдана.
  const groups = application.call.requirements
    .filter((requirement) => !GENERATED_CODES.includes(requirement.code))
    .map((requirement) => ({
      requirement,
      documents: application.documents.filter(
        (document) => document.requirementCode === requirement.code,
      ),
    }));

  const knownCodes = new Set(
    application.call.requirements.map((requirement) => requirement.code),
  );
  const orphans = application.documents.filter(
    (document) => !knownCodes.has(document.requirementCode),
  );

  const missingCount = groups.filter(
    (group) => group.requirement.isRequired && group.documents.length === 0,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-neutral-900">
            {application.lastName} {application.firstName}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            {application.registerNo ?? "—"} · {application.user.email} ·{" "}
            {trackLabels[application.call.track]}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={application.status} />
            <span className="text-xs text-neutral-500">
              Нийт {application.documents.length} файл
              {missingCount > 0 ? ` · ${missingCount} шаардлага дутуу` : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/reviewer/downloads"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-50"
          >
            Жагсаалт руу буцах
          </Link>
          <Link
            href={`/reviewer/${application.id}`}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-50"
          >
            Өргөдөл харах
          </Link>
          <a
            href={`/api/admin/bundle/${application.id}`}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm text-white transition-colors hover:bg-brand-blue-dark"
          >
            Бүх материалыг ZIP-ээр татах
          </a>
        </div>
      </div>

      <Card title="Анкет">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-600">
            Өргөдөгчийн бөглөсөн анкетыг системээс PDF болгон үүсгэнэ. Өргөдөл
            засагдвал татах бүрд шинэчлэгдсэн хувилбар үүснэ.
          </p>
          <a
            href={`/api/admin/anket/${application.id}`}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm whitespace-nowrap text-neutral-800 transition-colors hover:bg-neutral-50"
          >
            Анкет PDF татах
          </a>
        </div>
      </Card>

      <Card title="Хавсаргасан материал">
        <ul className="divide-y divide-neutral-100">
          {groups.map(({ requirement, documents }) => (
            <li key={requirement.code} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {requirement.label}
                </span>
                {requirement.isRequired ? (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    Заавал
                  </span>
                ) : null}
                {documents.length === 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      requirement.isRequired
                        ? "bg-red-100 text-red-800"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    Хавсаргаагүй
                  </span>
                ) : null}
              </div>

              {documents.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {documents.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-neutral-900">
                          {document.fileName}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {formatSize(document.size)} · {shortType(document.mimeType)} ·{" "}
                          {formatDate(document.uploadedAt)}
                          {document.eventName ? ` · ${document.eventName}` : ""}
                          {document.note ? ` · ${document.note}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <a
                          href={`/api/documents/${document.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-800 transition-colors hover:bg-neutral-50"
                        >
                          Үзэх
                        </a>
                        <a
                          href={`/api/documents/${document.id}?download=1`}
                          className="rounded-md bg-brand-blue px-2.5 py-1 text-xs text-white transition-colors hover:bg-brand-blue-dark"
                        >
                          Татах
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {orphans.length > 0 ? (
        <Card title="Шаардлагад холбогдоогүй файл">
          <Alert tone="info">
            Журмын жагсаалтад байхгүй код дээр хавсаргасан баримтууд. ZIP багцад
            эдгээр нь мөн орно.
          </Alert>
          <ul className="mt-3 space-y-1.5">
            {orphans.map((document) => (
              <li
                key={document.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-neutral-900">
                    {document.fileName}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {document.requirementCode} · {formatSize(document.size)}
                  </div>
                </div>
                <a
                  href={`/api/documents/${document.id}?download=1`}
                  className="rounded-md bg-brand-blue px-2.5 py-1 text-xs text-white transition-colors hover:bg-brand-blue-dark"
                >
                  Татах
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortType(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/jpeg") return "JPG";
  if (mimeType === "image/png") return "PNG";
  return mimeType;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

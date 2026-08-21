import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { GENERATED_CODES } from "@/lib/application-shared";
import { getActiveCalls, trackLabels } from "@/lib/call";
import { prisma } from "@/lib/prisma";
import { Alert, StatusBadge, inputClass, statusLabels } from "@/components/ui";

export const metadata: Metadata = { title: "Материал татах" };
export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  call?: string;
  scope?: string;
  status?: string;
};

/** Шүүлтүүрийн «бүрдэл» утга — ZIP-ийн scope параметртэй нэг нэршилтэй. */
const SCOPES = [
  { value: "complete", label: "Материалаа бүрэн ирүүлсэн" },
  { value: "incomplete", label: "Дутуу ирүүлсэн" },
  { value: "all", label: "Бүгд" },
] as const;

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);
  const filters = await searchParams;
  const calls = await getActiveCalls();

  if (calls.length === 0) {
    return <Alert tone="warning">Идэвхтэй тэтгэлгийн зарлал алга байна.</Alert>;
  }

  const scope = SCOPES.some((item) => item.value === filters.scope)
    ? (filters.scope as (typeof SCOPES)[number]["value"])
    : "complete";

  const selectedCall = filters.call
    ? calls.find((call) => call.id === filters.call)
    : undefined;
  const scopedCalls = selectedCall ? [selectedCall] : calls;

  const applications = await prisma.application.findMany({
    where: {
      callId: { in: scopedCalls.map((call) => call.id) },
      status: { not: ApplicationStatus.DRAFT },
      hiddenAt: null,
      ...(filters.status ? { status: filters.status as ApplicationStatus } : {}),
      ...(filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q, mode: "insensitive" } },
              { lastName: { contains: filters.q, mode: "insensitive" } },
              { registerNo: { contains: filters.q, mode: "insensitive" } },
              { user: { email: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      documents: { select: { requirementCode: true } },
    },
    orderBy: [{ submittedAt: "asc" }, { createdAt: "asc" }],
  });

  const allRows = applications
    .map((application) => {
      const call = calls.find((item) => item.id === application.callId)!;
      const uploaded = new Set(
        application.documents.map((document) => document.requirementCode),
      );
      const required = call.requirements.filter(
        (requirement) =>
          requirement.isRequired && !GENERATED_CODES.includes(requirement.code),
      );

      return {
        application,
        call,
        totalDocuments: application.documents.length,
        uploadedCount: required.filter((requirement) => uploaded.has(requirement.code))
          .length,
        requiredCount: required.length,
      };
    });

  // Тоонууд нь «бүрдэл» шүүлтүүрээс хамаарахгүй — шүүлтүүр солиход нийт зураг
  // өөрчлөгдвөл харьцуулах боломжгүй болно.
  const rows = allRows.filter((row) => {
    const isComplete = row.uploadedCount === row.requiredCount;
    if (scope === "complete") return isComplete;
    if (scope === "incomplete") return !isComplete;
    return true;
  });

  const completeCount = allRows.filter(
    (row) => row.uploadedCount === row.requiredCount,
  ).length;
  const documentTotal = allRows.reduce((sum, row) => sum + row.totalDocuments, 0);

  // Бөөнөөр татах холбоос нь одоогийн шүүлтүүрийг дагана. «Дутуу» сонголтод
  // бөөн татах утгагүй тул зөвхөн бүрэн/бүгд хоёрт л идэвхтэй.
  const bulkParams = new URLSearchParams();
  if (selectedCall) bulkParams.set("call", selectedCall.id);
  bulkParams.set("scope", scope === "incomplete" ? "all" : scope);
  const bulkHref = `/api/admin/bundle?${bulkParams.toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-neutral-900">Материал татах</h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            Өргөдөгчийн анкетыг PDF-ээр, хавсаргасан материалыг файлаар эсхүл
            бүгдийг нь нэг ZIP хавтсаар татна. Эсээ багцад ордоггүй.
          </p>
        </div>

        <a
          href={bulkHref}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm text-white transition-colors hover:bg-brand-blue-dark"
        >
          Жагсаалтыг бүхэлд нь ZIP-ээр татах
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Нийт өргөдөл" value={allRows.length} tone="strong" />
        <Stat label="Бүрэн ирүүлсэн" value={completeCount} />
        <Stat label="Дутуу" value={allRows.length - completeCount} />
        <Stat label="Нийт файл" value={documentTotal} />
        <Stat label="Жагсаалтад харагдаж буй" value={rows.length} />
      </div>

      <form className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-3">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Нэр, регистр, и-мэйлээр хайх"
          className={`${inputClass} w-64`}
        />
        <select
          name="call"
          defaultValue={filters.call ?? ""}
          className={`${inputClass} w-56`}
        >
          <option value="">Бүх төрөл</option>
          {calls.map((call) => (
            <option key={call.id} value={call.id}>
              {trackLabels[call.track]}
            </option>
          ))}
        </select>
        <select name="scope" defaultValue={scope} className={`${inputClass} w-56`}>
          {SCOPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className={`${inputClass} w-44`}
        >
          <option value="">Бүх төлөв</option>
          {Object.entries(statusLabels)
            .filter(([status]) => status !== ApplicationStatus.DRAFT)
            .map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm text-white transition-colors hover:bg-brand-blue-dark"
        >
          Шүүх
        </button>
      </form>

      {rows.length === 0 ? (
        <Alert tone="info">Шүүлтүүрт тохирох өргөдөл олдсонгүй.</Alert>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">Өргөдөгч</th>
                <th className="px-3 py-2 font-medium">Регистр</th>
                <th className="px-3 py-2 font-medium">Тэтгэлэг</th>
                <th className="px-3 py-2 text-center font-medium">Бүрдэл</th>
                <th className="px-3 py-2 text-center font-medium">Файл</th>
                <th className="px-3 py-2 font-medium">Төлөв</th>
                <th className="px-3 py-2 text-right font-medium">Татах</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ application, call, uploadedCount, requiredCount, totalDocuments }) => (
                <tr
                  key={application.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-neutral-900">
                      {application.lastName} {application.firstName}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {application.user.email}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-700">
                    {application.registerNo ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {trackLabels[call.track]}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={
                        uploadedCount === requiredCount
                          ? "text-green-700"
                          : "text-red-700"
                      }
                    >
                      {uploadedCount}/{requiredCount}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums text-neutral-700">
                    {totalDocuments}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/reviewer/downloads/${application.id}`}
                        className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-800 transition-colors hover:bg-neutral-50"
                      >
                        Файлууд
                      </Link>
                      <a
                        href={`/api/admin/anket/${application.id}`}
                        className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-800 transition-colors hover:bg-neutral-50"
                      >
                        Анкет PDF
                      </a>
                      <a
                        href={`/api/admin/bundle/${application.id}`}
                        className="rounded-md bg-brand-blue px-2.5 py-1 text-xs text-white transition-colors hover:bg-brand-blue-dark"
                      >
                        ZIP
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number;
  tone?: "normal" | "strong";
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
      <div className="text-xs text-neutral-600">{label}</div>
      <div
        className={`mt-0.5 text-xl tabular-nums ${
          tone === "strong"
            ? "font-semibold text-neutral-900"
            : "font-medium text-neutral-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

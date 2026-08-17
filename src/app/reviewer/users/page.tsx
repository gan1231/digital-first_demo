import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { GENERATED_CODES } from "@/lib/application-shared";
import { getActiveCalls, trackLabels } from "@/lib/call";
import { prisma } from "@/lib/prisma";
import { Alert, StatusBadge, inputClass, statusLabels } from "@/components/ui";

export const metadata: Metadata = { title: "Нийт хэрэглэгчийн төлөв" };
export const dynamic = "force-dynamic";

type SearchParams = { q?: string; state?: string };

/** «Огт эхлээгүй» нь өргөдлийн төлөв биш тул тусад нь нэрлэнэ. */
const NOT_STARTED = "NOT_STARTED";

const orderedStatuses: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.IN_REVIEW,
  ApplicationStatus.NEEDS_FIX,
  ApplicationStatus.APPROVED,
  ApplicationStatus.REJECTED,
];

export default async function UsersStatusPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);
  const filters = await searchParams;
  const calls = await getActiveCalls();

  // Зарлал бүрийн заавал шаардагдах баримтын код — бүрдэл тоолоход.
  const requiredByCall = new Map(
    calls.map((call) => [
      call.id,
      call.requirements
        .filter(
          (requirement) =>
            requirement.isRequired && !GENERATED_CODES.includes(requirement.code),
        )
        .map((requirement) => requirement.code),
    ]),
  );

  const users = await prisma.user.findMany({
    where: { role: Role.APPLICANT },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        include: { documents: { select: { requirementCode: true } } },
      },
    },
  });

  const staffCount = await prisma.user.count({
    where: { role: { in: [Role.REVIEWER, Role.ADMIN] } },
  });

  const rows = users.map((user) => {
    // Нэг хэрэглэгч зарлал тус бүрд нэг өргөдөлтэй байж болно.
    const applications = user.applications.map((application) => {
      const required = requiredByCall.get(application.callId) ?? [];
      const uploaded = new Set(
        application.documents.map((document) => document.requirementCode),
      );

      return {
        id: application.id,
        callId: application.callId,
        status: application.status,
        hiddenAt: application.hiddenAt,
        submittedAt: application.submittedAt,
        uploadedCount: required.filter((code) => uploaded.has(code)).length,
        requiredCount: required.length,
        totalDocuments: application.documents.length,
      };
    });

    return { user, applications };
  });

  // --- Хураангуй тоонууд ---------------------------------------------------

  const allApplications = rows.flatMap((row) => row.applications);
  const countByStatus = new Map<ApplicationStatus, number>();
  for (const application of allApplications) {
    countByStatus.set(
      application.status,
      (countByStatus.get(application.status) ?? 0) + 1,
    );
  }

  const notStartedCount = rows.filter(
    (row) => row.applications.length === 0,
  ).length;
  const hiddenCount = allApplications.filter(
    (application) => application.hiddenAt !== null,
  ).length;
  const verifiedCount = rows.filter(
    (row) => row.user.emailVerifiedAt !== null,
  ).length;

  // --- Шүүлтүүр ------------------------------------------------------------

  const query = filters.q?.trim().toLowerCase() ?? "";
  const filtered = rows.filter((row) => {
    if (query) {
      const haystack =
        `${row.user.name} ${row.user.email} ${row.user.phone ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (!filters.state) return true;
    if (filters.state === NOT_STARTED) return row.applications.length === 0;
    return row.applications.some(
      (application) => application.status === filters.state,
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-neutral-900">
            Нийт хэрэглэгчийн төлөв
          </h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            Бүртгүүлсэн бүх өргөдөгч — ноорог, огт эхлээгүй нь ч харагдана.
            Комиссын {staffCount} гишүүн энд ороогүй.
          </p>
        </div>

        <Link
          href="/reviewer"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-50"
        >
          Өргөдлүүд рүү буцах
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Бүртгүүлсэн" value={rows.length} tone="strong" />
        <Stat label="И-мэйл баталгаажсан" value={verifiedCount} />
        <Stat label="Өргөдөл эхлээгүй" value={notStartedCount} />
        <Stat label="Нийт өргөдөл" value={allApplications.length} tone="strong" />
        <Stat label="Нуусан" value={hiddenCount} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {orderedStatuses.map((status) => (
          <Stat
            key={status}
            label={statusLabels[status]}
            value={countByStatus.get(status) ?? 0}
          />
        ))}
      </div>

      <form className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-3">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Нэр, и-мэйл, утсаар хайх"
          className={`${inputClass} w-64`}
        />
        <select
          name="state"
          defaultValue={filters.state ?? ""}
          className={`${inputClass} w-52`}
        >
          <option value="">Бүх төлөв</option>
          <option value={NOT_STARTED}>Өргөдөл эхлээгүй</option>
          {orderedStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm text-white transition-colors hover:bg-brand-blue-dark"
        >
          Шүүх
        </button>
        <span className="ml-auto self-center text-sm text-neutral-600">
          {filtered.length} / {rows.length}
        </span>
      </form>

      {filtered.length === 0 ? (
        <Alert tone="info">Шүүлтүүрт тохирох хэрэглэгч олдсонгүй.</Alert>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">Хэрэглэгч</th>
                <th className="px-3 py-2 font-medium">Утас</th>
                <th className="px-3 py-2 font-medium">Бүртгүүлсэн</th>
                <th className="px-3 py-2 font-medium">Тэтгэлэг</th>
                <th className="px-3 py-2 text-center font-medium">Бүрдэл</th>
                <th className="px-3 py-2 font-medium">Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ user, applications }) => (
                <tr
                  key={user.id}
                  className="border-b border-neutral-100 align-top last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-neutral-900">
                      {user.name}
                      {!user.emailVerifiedAt ? (
                        <span
                          title="И-мэйлээ баталгаажуулаагүй."
                          className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        >
                          Баталгаажаагүй
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-neutral-500">{user.email}</div>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {user.phone ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-neutral-600">
                    {formatDate(user.createdAt)}
                  </td>

                  {applications.length === 0 ? (
                    <>
                      <td className="px-3 py-2 text-xs text-neutral-400">—</td>
                      <td className="px-3 py-2 text-center text-neutral-400">—</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                          Эхлээгүй
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-xs text-neutral-600">
                        {applications.map((application) => (
                          <div key={application.id} className="py-0.5">
                            {trackLabels[
                              calls.find((call) => call.id === application.callId)
                                ?.track ?? "GRADUATE"
                            ]}
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {applications.map((application) => (
                          <div key={application.id} className="py-0.5">
                            <span
                              className={
                                application.uploadedCount ===
                                application.requiredCount
                                  ? "text-green-700"
                                  : "text-red-700"
                              }
                            >
                              {application.uploadedCount}/
                              {application.requiredCount}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2">
                        {applications.map((application) => (
                          <div
                            key={application.id}
                            className="flex items-center gap-1.5 py-0.5"
                          >
                            <Link href={`/reviewer/${application.id}`}>
                              <StatusBadge status={application.status} />
                            </Link>
                            {application.hiddenAt ? (
                              <span
                                title="Жагсаалтаас нуусан."
                                className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                              >
                                Нуусан
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </td>
                    </>
                  )}
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

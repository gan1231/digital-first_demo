import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationStatus, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { getActiveCall } from "@/lib/call";
import { prisma } from "@/lib/prisma";
import { averageEvaluations } from "@/lib/scoring";
import { SOUMS } from "@/lib/soum";
import { Alert, StatusBadge, inputClass, statusLabels } from "@/components/ui";

export const metadata: Metadata = { title: "Өргөдлүүд" };
export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  status?: string;
  soum?: string;
  mine?: string;
};

/** Анкет, эссэ нь системд бөглөгддөг тул бүрдэлд файлаар тооцогдохгүй. */
const GENERATED_CODES = ["APPLICATION_FORM", "ESSAY"];

export default async function ReviewerListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);
  const filters = await searchParams;
  const call = await getActiveCall();

  if (!call) {
    return <Alert tone="warning">Идэвхтэй тэтгэлгийн зарлал алга байна.</Alert>;
  }

  const requiredCount = call.requirements.filter(
    (requirement) =>
      requirement.isRequired && !GENERATED_CODES.includes(requirement.code),
  ).length;

  const applications = await prisma.application.findMany({
    where: {
      callId: call.id,
      status: { not: ApplicationStatus.DRAFT },
      ...(filters.status ? { status: filters.status as ApplicationStatus } : {}),
      ...(filters.soum ? { soum: filters.soum } : {}),
      ...(filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q, mode: "insensitive" } },
              { lastName: { contains: filters.q, mode: "insensitive" } },
              { registerNo: { contains: filters.q, mode: "insensitive" } },
              { major: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      documents: { select: { requirementCode: true } },
      evaluations: {
        select: {
          total: true,
          scores: true,
          submittedAt: true,
          reviewerId: true,
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  const rows = applications
    .map((application) => {
      const { average, reviewerCount } = averageEvaluations(
        application.evaluations,
        call.criteria,
      );
      const mine = application.evaluations.find(
        (evaluation) => evaluation.reviewerId === user.id,
      );
      const uploaded = new Set(
        application.documents.map((document) => document.requirementCode),
      );

      return {
        application,
        average,
        reviewerCount,
        myTotal: mine?.total ?? null,
        mySubmitted: Boolean(mine?.submittedAt),
        completeness: call.requirements.filter(
          (requirement) =>
            requirement.isRequired &&
            !GENERATED_CODES.includes(requirement.code) &&
            uploaded.has(requirement.code),
        ).length,
      };
    })
    .filter((row) => (filters.mine === "1" ? !row.mySubmitted : true))
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-neutral-900">Өргөдлүүд</h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            {call.name} · нийт {rows.length}
          </p>
        </div>
      </div>

      <form className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white p-3">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Нэр, регистр, мэргэжлээр хайх"
          className={`${inputClass} w-56`}
        />
        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className={`${inputClass} w-44`}
        >
          <option value="">Бүх төлөв</option>
          {Object.entries(statusLabels)
            .filter(([key]) => key !== "DRAFT")
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
        <select
          name="soum"
          defaultValue={filters.soum ?? ""}
          className={`${inputClass} w-40`}
        >
          <option value="">Бүх сум</option>
          {SOUMS.map((soum) => (
            <option key={soum} value={soum}>
              {soum}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-1 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={filters.mine === "1"}
            className="size-4"
          />
          Миний үнэлээгүй
        </label>
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
                <th className="px-3 py-2 font-medium">Сум</th>
                <th className="px-3 py-2 font-medium">Мэргэжил</th>
                <th className="px-3 py-2 text-right font-medium">ЭЕШ</th>
                <th className="px-3 py-2 text-right font-medium">Голч</th>
                <th className="px-3 py-2 text-center font-medium">Бүрдэл</th>
                <th className="px-3 py-2 text-right font-medium">Миний оноо</th>
                <th className="px-3 py-2 text-right font-medium">Дундаж</th>
                <th className="px-3 py-2 font-medium">Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.application.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/reviewer/${row.application.id}`}
                      className="text-brand-blue hover:underline"
                    >
                      {row.application.lastName} {row.application.firstName}
                    </Link>
                    <span className="block text-xs text-neutral-500">
                      {row.application.registerNo}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.application.soum ?? "—"}</td>
                  <td className="max-w-[220px] truncate px-3 py-2">
                    {row.application.major ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.application.examScore ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.application.gpa ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={
                        row.completeness === requiredCount
                          ? "text-green-700"
                          : "text-red-700"
                      }
                    >
                      {row.completeness}/{requiredCount}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.myTotal === null ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      <span
                        className={
                          row.mySubmitted ? "text-neutral-900" : "text-amber-700"
                        }
                      >
                        {row.myTotal}
                        {row.mySubmitted ? "" : " (ноорог)"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {row.average ?? "—"}
                    {row.reviewerCount > 0 ? (
                      <span className="ml-1 text-xs font-normal text-neutral-500">
                        ({row.reviewerCount})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.application.status} />
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

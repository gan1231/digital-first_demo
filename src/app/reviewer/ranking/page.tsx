import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { getRanking } from "@/lib/ranking";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Эцсийн жагсаалт" };
export const dynamic = "force-dynamic";

const decisionLabels: Record<string, string> = {
  APPROVED: "Тэнцсэн",
  REJECTED: "Тэнцээгүй",
  WAITLISTED: "Нөөц",
};

export default async function RankingPage() {
  await requireRole(Role.REVIEWER, Role.ADMIN);
  const result = await getRanking();

  if (!result) {
    return <Alert tone="warning">Идэвхтэй тэтгэлгийн зарлал алга байна.</Alert>;
  }

  const { call, rows, unscored } = result;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-neutral-900">
            Эцсийн жагсаалт
          </h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            {call.name} · тэтгэлгийн тоо {call.quota} · эрэмбэлэгдсэн{" "}
            {rows.length}
          </p>
        </div>

        <a
          href="/reviewer/ranking/export"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-50"
        >
          CSV татах
        </a>
      </div>

      {unscored > 0 ? (
        <Alert tone="warning">
          {unscored} өргөдөл баталгаажсан үнэлгээгүй тул жагсаалтад ороогүй
          байна.
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <Alert tone="info">
          Одоогоор баталгаажсан үнэлгээ алга. Комиссын гишүүд үнэлгээгээ
          баталгаажуулсны дараа жагсаалт үүснэ.
        </Alert>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs text-neutral-600">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Өргөдөгч</th>
                <th className="px-3 py-2 font-medium">Сум</th>
                <th className="px-3 py-2 font-medium">Мэргэжил</th>
                {call.criteria.map((criterion) => (
                  <th
                    key={criterion.code}
                    className="px-2 py-2 text-right font-medium"
                    title={criterion.label}
                  >
                    {criterion.code === "MAJOR_FIT"
                      ? "Мэргэжил"
                      : criterion.code === "EXAM_SCORE"
                        ? "ЭЕШ"
                        : criterion.code === "GPA"
                          ? "Голч"
                          : criterion.code === "SOCIAL"
                            ? "Нийгэм"
                            : criterion.code === "ESSAY"
                              ? "Эссэ"
                              : "Ярилцлага"}
                    <span className="block text-[10px] font-normal text-neutral-400">
                      /{criterion.maxScore}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Нийт</th>
                <th className="px-3 py-2 text-center font-medium">Зөрүү</th>
                <th className="px-3 py-2 font-medium">Шийдвэр</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.applicationId}>
                  <tr
                    className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 ${
                      row.rank <= call.quota ? "" : "text-neutral-500"
                    }`}
                  >
                    <td className="px-3 py-2 tabular-nums">{row.rank}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/reviewer/${row.applicationId}`}
                        className="text-brand-blue hover:underline"
                      >
                        {row.name}
                      </Link>
                      <span className="block text-xs text-neutral-500">
                        {row.registerNo}
                      </span>
                    </td>
                    <td className="px-3 py-2">{row.soum ?? "—"}</td>
                    <td className="max-w-[200px] truncate px-3 py-2">
                      {row.major ?? "—"}
                    </td>
                    {call.criteria.map((criterion) => (
                      <td
                        key={criterion.code}
                        className="px-2 py-2 text-right tabular-nums"
                      >
                        {row.perCriterion[criterion.code] ?? "—"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {row.average}
                      <span className="ml-1 text-xs font-normal text-neutral-500">
                        ({row.reviewerCount})
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {row.spread === null ? (
                        <span className="text-neutral-400">—</span>
                      ) : (
                        <span
                          className={
                            row.spread > 15 ? "text-red-700" : "text-neutral-600"
                          }
                        >
                          {row.spread}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.decision ? decisionLabels[row.decision] : "—"}
                    </td>
                  </tr>

                  {row.rank === call.quota && rows.length > call.quota ? (
                    <tr>
                      <td
                        colSpan={5 + call.criteria.length + 3}
                        className="border-y-2 border-dashed border-brand-orange bg-brand-sand px-3 py-1.5 text-center text-xs text-amber-900"
                      >
                        Тэтгэлгийн хязгаар — {call.quota} хүн
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Эрэмбэ нь баталгаажсан үнэлгээний дундажаар тогтоно. Оноо тэнцвэл
        ЭЕШ-ын оноо, дараа нь голч дүнгээр шийднэ. «Зөрүү» багана нь комиссын
        гишүүдийн онооны хамгийн их зөрүүг харуулна — 15-аас дээш бол дахин
        хэлэлцэх шаардлагатай.
      </p>
    </div>
  );
}

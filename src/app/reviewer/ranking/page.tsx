import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { trackLabels } from "@/lib/call";
import { getRankings, type CallRanking } from "@/lib/ranking";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Эцсийн жагсаалт" };
export const dynamic = "force-dynamic";

const decisionLabels: Record<string, string> = {
  APPROVED: "Тэнцсэн",
  REJECTED: "Тэнцээгүй",
  WAITLISTED: "Нөөц",
};

/** Багана нарийн байхын тулд шалгуурын товч нэр. */
const shortLabels: Record<string, string> = {
  MAJOR_FIT: "Мэргэжил",
  EXAM_SCORE: "ЭЕШ",
  GPA: "Голч",
  UNIVERSITY_GPA: "GPA",
  SOCIAL: "Нийгэм",
  CONDUCT: "Суралцахуй",
  ESSAY: "Эсээ",
  INTERVIEW: "Ярилцлага",
};

export default async function RankingPage() {
  await requireRole(Role.REVIEWER, Role.ADMIN);
  const rankings = await getRankings();

  if (rankings.length === 0) {
    return <Alert tone="warning">Идэвхтэй тэтгэлгийн зарлал алга байна.</Alert>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-medium text-neutral-900">Эцсийн жагсаалт</h1>
        <p className="mt-0.5 text-sm text-neutral-600">
          Эрэмбэ нь баталгаажсан үнэлгээний дундажаар тогтоно. Тэнцсэн
          тохиолдолд журмын 4.4-ийн дагуу зорилтот бүлгийн суралцагч, дараа нь
          ЭЕШ/GPA өндөртэй нь дээгүүр орно. «Зөрүү» багана нь комиссын гишүүдийн
          онооны хамгийн их зөрүү — 15-аас дээш бол дахин хэлэлцэх шаардлагатай.
        </p>
      </div>

      {rankings.map((ranking) => (
        <RankingTable key={ranking.call.id} ranking={ranking} />
      ))}
    </div>
  );
}

function RankingTable({ ranking }: { ranking: CallRanking }) {
  const { call, rows, unscored } = ranking;
  const columnCount = 6 + call.criteria.length + 3;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-neutral-900">
            {trackLabels[call.track]}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-600">
            {call.name} · тэтгэлгийн тоо {call.quota} · эрэмбэлэгдсэн{" "}
            {rows.length}
          </p>
        </div>

        <a
          href={`/reviewer/ranking/export?call=${call.id}`}
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
                <th
                  className="px-3 py-2 text-center font-medium"
                  title="Журмын 4.4 — тэнцсэн үед давуу эрх"
                >
                  Зорилтот бүлэг
                </th>
                {call.criteria.map((criterion) => (
                  <th
                    key={criterion.code}
                    className="px-2 py-2 text-right font-medium"
                    title={criterion.label}
                  >
                    {shortLabels[criterion.code] ?? criterion.code}
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
                    <td className="max-w-[180px] truncate px-3 py-2">
                      {row.major ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.isTargetGroup ? (
                        <span className="inline-flex rounded-full bg-brand-sand px-2 py-0.5 text-[11px] text-amber-900">
                          тийм
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
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
                            row.spread > 15
                              ? "text-red-700"
                              : "text-neutral-600"
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
                        colSpan={columnCount}
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
    </section>
  );
}

import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole, writeAudit } from "@/lib/auth";
import { trackLabels } from "@/lib/call";
import { getRankings } from "@/lib/ranking";

const decisionLabels: Record<string, string> = {
  APPROVED: "Тэнцсэн",
  REJECTED: "Тэнцээгүй",
  WAITLISTED: "Нөөц",
};

function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);
  const callId = new URL(request.url).searchParams.get("call") ?? undefined;
  const rankings = await getRankings(callId);

  if (rankings.length === 0) {
    return NextResponse.json({ error: "Зарлал олдсонгүй." }, { status: 404 });
  }

  const lines: string[] = [];

  for (const { call, rows } of rankings) {
    lines.push(csvCell(`${trackLabels[call.track]} — ${call.name}`));

    const header = [
      "Эрэмбэ",
      "Овог нэр",
      "Регистр",
      "Сум",
      "Их сургууль",
      "Мэргэжил",
      "Зорилтот бүлэг",
      call.track === "STUDENT" ? "GPA" : "ЭЕШ",
      ...call.criteria.map(
        (criterion) => `${criterion.label} (${criterion.maxScore})`,
      ),
      "Нийт дундаж",
      "Үнэлсэн гишүүн",
      "Онооны зөрүү",
      "Тэтгэлгийн хязгаарт",
      "Шийдвэр",
    ];

    lines.push(header.map(csvCell).join(","));

    for (const row of rows) {
      lines.push(
        [
          row.rank,
          row.name,
          row.registerNo,
          row.soum,
          row.university,
          row.major,
          row.isTargetGroup ? "тийм" : "үгүй",
          row.keyMetric,
          ...call.criteria.map(
            (criterion) => row.perCriterion[criterion.code] ?? null,
          ),
          row.average,
          row.reviewerCount,
          row.spread,
          row.rank <= call.quota ? "тийм" : "үгүй",
          row.decision ? decisionLabels[row.decision] : "",
        ]
          .map(csvCell)
          .join(","),
      );
    }

    lines.push("");
  }

  await writeAudit({
    actorId: user.id,
    action: "ranking.export",
    targetType: "ScholarshipCall",
    targetId: callId ?? "all",
    meta: { rows: rankings.reduce((sum, item) => sum + item.rows.length, 0) },
  });

  // BOM — Excel кирилл үсгийг зөв уншихад шаардлагатай.
  const csv = `﻿${lines.join("\r\n")}`;
  const year = rankings[0].call.year;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tetgeleg-${year}-jagsaalt.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

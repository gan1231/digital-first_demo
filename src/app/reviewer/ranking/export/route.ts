import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireRole, writeAudit } from "@/lib/auth";
import { getRanking } from "@/lib/ranking";

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

export async function GET() {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);
  const result = await getRanking();

  if (!result) {
    return NextResponse.json(
      { error: "Идэвхтэй зарлал алга." },
      { status: 404 },
    );
  }

  const { call, rows } = result;

  const header = [
    "Эрэмбэ",
    "Овог нэр",
    "Регистр",
    "Сум",
    "Их сургууль",
    "Мэргэжил",
    "ЭЕШ",
    "Голч",
    ...call.criteria.map(
      (criterion) => `${criterion.label} (${criterion.maxScore})`,
    ),
    "Нийт дундаж",
    "Үнэлсэн гишүүн",
    "Онооны зөрүү",
    "Тэтгэлгийн хязгаарт",
    "Шийдвэр",
  ];

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.rank,
        row.name,
        row.registerNo,
        row.soum,
        row.university,
        row.major,
        row.examScore,
        row.gpa,
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
    ),
  ];

  await writeAudit({
    actorId: user.id,
    action: "ranking.export",
    targetType: "ScholarshipCall",
    targetId: call.id,
    meta: { rows: rows.length },
  });

  // BOM — Excel кирилл үсгийг зөв уншихад шаардлагатай.
  const csv = `﻿${lines.join("\r\n")}`;
  const fileName = `tetgeleg-${call.year}-jagsaalt.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

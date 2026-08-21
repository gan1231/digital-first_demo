import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser, writeAudit } from "@/lib/auth";
import {
  buildBundle,
  bundleFileName,
  getBundleApplications,
  type BundleScope,
} from "@/lib/export-bundle";

/**
 * Олон өргөдөгчийн материалыг нэг ZIP-д — өргөдөгч тус бүр өөрийн хавтастай,
 * үндэст нь нэгтгэлийн CSV байна.
 *
 * ?call=<id>            — зөвхөн тухайн зарлалынх (заавал биш)
 * ?scope=complete|all   — бүрэн ирүүлсэн эсэх (залгамал: complete)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });
  }
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Зөвхөн админ татах боломжтой." }, { status: 403 });
  }

  const url = new URL(request.url);
  const callId = url.searchParams.get("call") ?? undefined;
  const scope: BundleScope = url.searchParams.get("scope") === "all" ? "all" : "complete";

  const applications = await getBundleApplications({ callId, scope });

  if (applications.length === 0) {
    return NextResponse.json(
      { error: "Шүүлтүүрт тохирох өргөдөл олдсонгүй." },
      { status: 404 },
    );
  }

  const { stream, documentCount } = buildBundle(applications, {
    useFolders: true,
    includeSummary: true,
  });

  await writeAudit({
    actorId: user.id,
    action: "application.bundle_download_bulk",
    targetType: "ScholarshipCall",
    targetId: callId ?? "all",
    meta: {
      scope,
      applicationCount: applications.length,
      documentCount,
      applicationIds: applications.map((application) => application.id),
    },
  });

  const fileName = bundleFileName(applications[0].call, applications.length);

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

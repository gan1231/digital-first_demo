import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser, writeAudit } from "@/lib/auth";
import { applicantSlug } from "@/lib/anket-pdf";
import { buildBundle, getBundleApplication } from "@/lib/export-bundle";

/**
 * Нэг өргөдөгчийн бүх материалыг нэг ZIP-д: анкет (PDF) + хавсаргасан баримтууд.
 * Эсээ ордоггүй.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });
  }
  if (user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Зөвхөн админ татах боломжтой." }, { status: 403 });
  }

  const { id } = await params;
  const application = await getBundleApplication(id);

  if (!application) {
    return NextResponse.json({ error: "Өргөдөл олдсонгүй." }, { status: 404 });
  }

  const { stream, documentCount } = buildBundle([application], {
    useFolders: false,
    includeSummary: false,
  });

  await writeAudit({
    actorId: user.id,
    action: "application.bundle_download",
    targetType: "Application",
    targetId: application.id,
    meta: { documentCount },
  });

  const fileName = `${applicantSlug(application)}_materialuud.zip`;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

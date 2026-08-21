import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser, writeAudit } from "@/lib/auth";
import { anketFileName, renderAnketPdf } from "@/lib/anket-pdf";
import { getBundleApplication, requirementLabelMap } from "@/lib/export-bundle";

/**
 * Өргөдөгчийн анкетыг PDF болгож татах. Анкет нь хавсралт файл биш, DB дэх
 * өгөгдөл тул хүсэлт бүрд шинээр үүснэ — өргөдөл засагдвал PDF нь ч шинэчлэгдэнэ.
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

  const pdf = await renderAnketPdf(
    application,
    application.call,
    requirementLabelMap(application),
  );

  await writeAudit({
    actorId: user.id,
    action: "anket.pdf_download",
    targetType: "Application",
    targetId: application.id,
  });

  const fileName = anketFileName(application);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

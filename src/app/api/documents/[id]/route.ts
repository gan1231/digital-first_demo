import { NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import { getCurrentUser, isStaff, writeAudit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

const EDITABLE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.NEEDS_FIX,
];

async function loadDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { application: { select: { id: true, userId: true, status: true } } },
  });
}

/** Баримт үзэх. Хувийн мэдээлэлтэй тул эрх шалгаж, үзсэн бүрд мөрдөл бичнэ. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });
  }

  const { id } = await params;
  const document = await loadDocument(id);

  if (!document) {
    return NextResponse.json({ error: "Баримт олдсонгүй." }, { status: 404 });
  }

  const isOwner = document.application.userId === user.id;
  if (!isOwner && !isStaff(user)) {
    return NextResponse.json({ error: "Хандах эрхгүй." }, { status: 403 });
  }

  await writeAudit({
    actorId: user.id,
    action: "document.view",
    targetType: "Document",
    targetId: document.id,
    meta: { applicationId: document.application.id },
  });

  // MinIO дээр байвал сервер дундуур явуулахгүй — түр хугацааны шууд холбоос өгнө.
  if (storage.presignGet) {
    const url = await storage.presignGet(document.storageKey, document.fileName);
    return NextResponse.redirect(url);
  }

  try {
    const bytes = await storage.read(document.storageKey);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Баримт уншихад алдаа гарлаа:", error);
    return new NextResponse("Файл олдсонгүй эсвэл устгагдсан байна.", { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });
  }

  const { id } = await params;
  const document = await loadDocument(id);

  if (!document) {
    return NextResponse.json({ error: "Баримт олдсонгүй." }, { status: 404 });
  }

  if (document.application.userId !== user.id) {
    return NextResponse.json({ error: "Хандах эрхгүй." }, { status: 403 });
  }

  if (!EDITABLE_STATUSES.includes(document.application.status)) {
    return NextResponse.json(
      { error: "Илгээсэн өргөдлийн материалыг устгах боломжгүй." },
      { status: 409 },
    );
  }

  await storage.remove(document.storageKey);
  await prisma.document.delete({ where: { id: document.id } });

  await writeAudit({
    actorId: user.id,
    action: "document.delete",
    targetType: "Document",
    targetId: document.id,
    meta: { requirementCode: document.requirementCode },
  });

  return NextResponse.json({ ok: true });
}

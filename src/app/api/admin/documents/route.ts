import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser, writeAudit } from "@/lib/auth";
import { getCallById } from "@/lib/call";
import { prisma } from "@/lib/prisma";
import {
  MAX_FILE_SIZE,
  buildKey,
  isAllowedMimeType,
  sniffMimeType,
  storage,
} from "@/lib/storage";

/**
 * Зөвхөн системийн админд. Өргөдөгчийн материалыг нэмэх, солих, устгах.
 *
 * Өргөдөгчийн /api/uploads-аас ялгаатай нь өргөдлийн төлөв шалгахгүй —
 * админ илгээгдсэн, хянагдаж буй өргөдлийн баримтыг ч засварлах эрхтэй.
 * Үйлдэл бүр AuditLog-д бичигдэнэ.
 */

const NOTE_MAX_LENGTH = 200;

function cleanText(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 }) };
  }
  if (user.role !== Role.ADMIN) {
    return { error: NextResponse.json({ error: "Зөвхөн админ хийх боломжтой." }, { status: 403 }) };
  }
  return { user };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const formData = await request.formData();
  const file = formData.get("file");
  const applicationId = String(formData.get("applicationId") ?? "");
  const requirementCode = String(formData.get("requirementCode") ?? "");
  const note = cleanText(formData.get("note"));
  const eventName = cleanText(formData.get("eventName"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл ирээгүй байна." }, { status: 400 });
  }

  for (const field of [
    { value: eventName, name: "Арга хэмжээний нэр" },
    { value: note, name: "Тайлбар" },
  ]) {
    if (field.value.length > NOTE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `${field.name} ${NOTE_MAX_LENGTH} тэмдэгтээс хэтрэхгүй.` },
        { status: 400 },
      );
    }
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Файл хоосон байна." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Файлын хэмжээ 10MB-аас хэтэрсэн байна." },
      { status: 400 },
    );
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, callId: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Өргөдөл олдсонгүй." }, { status: 404 });
  }

  const call = await getCallById(application.callId);
  const requirement = call?.requirements.find((item) => item.code === requirementCode);

  if (!requirement) {
    return NextResponse.json(
      { error: "Ийм төрлийн материал байхгүй байна." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Өргөтгөл, хэрэглэгчийн мэдээлсэн төрөлд найдахгүй — эхний байтуудаар шалгана.
  const mimeType = sniffMimeType(bytes);
  if (!mimeType || !isAllowedMimeType(mimeType)) {
    return NextResponse.json(
      { error: "Зөвхөн PDF, JPG, PNG файл хавсаргана." },
      { status: 400 },
    );
  }

  // Нэг утгатай шаардлагад шинийг хуулбал хуучин нь солигдоно.
  const replaced: string[] = [];
  if (!requirement.allowMultiple) {
    const existing = await prisma.document.findMany({
      where: { applicationId: application.id, requirementCode },
    });

    for (const document of existing) {
      await storage.remove(document.storageKey);
      replaced.push(document.fileName);
    }

    await prisma.document.deleteMany({
      where: { applicationId: application.id, requirementCode },
    });
  }

  const key = buildKey(application.id, requirementCode, mimeType);
  await storage.put(key, bytes, mimeType);

  const document = await prisma.document.create({
    data: {
      applicationId: application.id,
      requirementCode,
      storageKey: key,
      fileName: file.name,
      mimeType,
      size: bytes.byteLength,
      eventName: eventName || null,
      note: note || null,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "document.admin_upload",
    targetType: "Document",
    targetId: document.id,
    meta: {
      applicationId: application.id,
      requirementCode,
      fileName: file.name,
      size: bytes.byteLength,
      replaced,
    },
  });

  return NextResponse.json({
    id: document.id,
    fileName: document.fileName,
    size: document.size,
    replaced,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const user = auth.user!;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document) {
    return NextResponse.json({ error: "Баримт олдсонгүй." }, { status: 404 });
  }

  await storage.remove(document.storageKey);
  await prisma.document.delete({ where: { id: document.id } });

  await writeAudit({
    actorId: user.id,
    action: "document.admin_delete",
    targetType: "Document",
    targetId: document.id,
    meta: {
      applicationId: document.applicationId,
      requirementCode: document.requirementCode,
      fileName: document.fileName,
    },
  });

  return NextResponse.json({ ok: true });
}

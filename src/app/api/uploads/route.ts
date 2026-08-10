import { NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import { getCurrentUser, writeAudit } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_FILE_SIZE,
  buildKey,
  isAllowedMimeType,
  sniffMimeType,
  storage,
} from "@/lib/storage";

const EDITABLE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.DRAFT,
  ApplicationStatus.NEEDS_FIX,
];

const NOTE_MAX_LENGTH = 200;

/** Нэг мөрт багтах бичвэр — мөр таслалт, давхар зайг цэгцэлнэ. */
function cleanText(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const requirementCode = String(formData.get("requirementCode") ?? "");
  // Арга хэмжээ, гэрчилгээний нэр латинаар байх нь элбэг (IELTS, Microsoft
  // гэх мэт) тул эдгээр хоёр талбарт кирилл үсгийн шаардлага тавихгүй.
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

  const application = await prisma.application.findFirst({
    where: { userId: user.id },
    include: { call: { include: { requirements: true } } },
  });

  if (!application) {
    return NextResponse.json({ error: "Өргөдөл олдсонгүй." }, { status: 404 });
  }

  if (!EDITABLE_STATUSES.includes(application.status)) {
    return NextResponse.json(
      { error: "Илгээсэн өргөдөлд файл нэмэх боломжгүй." },
      { status: 409 },
    );
  }

  const requirement = application.call.requirements.find(
    (item) => item.code === requirementCode,
  );

  if (!requirement) {
    return NextResponse.json(
      { error: "Ийм төрлийн материал байхгүй байна." },
      { status: 400 },
    );
  }

  // Асуудаг болгож тохируулсан талбарыг заавал бөглөнө — олон баримт
  // хавсаргах үед аль нь юу болохыг комисс ялгаж чаддаг байх ёстой.
  if (requirement.collectsEventName && !eventName) {
    return NextResponse.json(
      { error: "Арга хэмжээний нэрийг бичнэ үү." },
      { status: 400 },
    );
  }

  if (requirement.collectsNote && !note) {
    return NextResponse.json(
      { error: "Тайлбарыг бичнэ үү." },
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

  if (!requirement.allowMultiple) {
    const existing = await prisma.document.findMany({
      where: { applicationId: application.id, requirementCode },
    });

    for (const document of existing) {
      await storage.remove(document.storageKey);
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
    action: "document.upload",
    targetType: "Document",
    targetId: document.id,
    meta: { requirementCode, fileName: file.name, size: bytes.byteLength },
  });

  return NextResponse.json({
    id: document.id,
    fileName: document.fileName,
    size: document.size,
    mimeType: document.mimeType,
    requirementCode: document.requirementCode,
    eventName: document.eventName,
    note: document.note,
  });
}

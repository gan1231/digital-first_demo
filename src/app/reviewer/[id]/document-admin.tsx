"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { inputClass } from "@/components/ui";

/**
 * Зөвхөн админд харагдах баримт удирдах хэсэг. Өргөдөгчийн материалыг
 * нэмэх, солих, устгах — /api/admin/documents руу хандана.
 */

const NOTE_MAX_LENGTH = 200;

export function AdminDocumentUpload({
  applicationId,
  requirementCode,
  allowMultiple,
  collectsEventName,
  collectsNote,
  hasExisting,
}: {
  applicationId: string;
  requirementCode: string;
  allowMultiple: boolean;
  collectsEventName: boolean;
  collectsNote: boolean;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [eventName, setEventName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function upload() {
    const file = fileRef.current?.files?.[0];
    setError(null);
    setOk(null);

    if (!file) {
      setError("Файлаа сонгоно уу.");
      return;
    }

    if (collectsEventName && !eventName.trim()) {
      setError("Арга хэмжээний нэрийг бичнэ үү.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("applicationId", applicationId);
    body.append("requirementCode", requirementCode);
    if (eventName.trim()) body.append("eventName", eventName.trim());
    if (note.trim()) body.append("note", note.trim());

    setUploading(true);
    try {
      const response = await fetch("/api/admin/documents", {
        method: "POST",
        body,
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Файл хуулахад алдаа гарлаа.");
        return;
      }

      setOk(
        result.replaced?.length
          ? `«${result.replaced[0]}»-г «${result.fileName}»-ээр сольсон.`
          : `«${result.fileName}» нэмэгдлээ.`,
      );
      if (fileRef.current) fileRef.current.value = "";
      setEventName("");
      setNote("");
      startTransition(() => router.refresh());
    } catch {
      setError("Сүлжээний алдаа. Дахин оролдоно уу.");
    } finally {
      setUploading(false);
    }
  }

  // Нэг утгатай шаардлагад баримт нь байвал шинийг хуулах нь солих үйлдэл.
  const actionLabel = !allowMultiple && hasExisting ? "Солих" : "Нэмэх";

  return (
    <div className="mt-2 ml-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/60 p-2.5">
      {collectsEventName ? (
        <input
          value={eventName}
          onChange={(event) => setEventName(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Арга хэмжээний нэр"
          className={`${inputClass} mb-2 text-xs`}
        />
      ) : null}

      {collectsNote ? (
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Тайлбар"
          className={`${inputClass} mb-2 text-xs`}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="flex-1 text-xs text-neutral-700 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-200 file:px-2.5 file:py-1.5 file:text-xs file:text-neutral-800 hover:file:bg-neutral-300"
        />
        <button
          type="button"
          onClick={upload}
          disabled={isUploading}
          className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading ? "Хуулж байна…" : actionLabel}
        </button>
      </div>

      <p className="mt-1.5 text-[11px] text-neutral-500">
        PDF, JPG, PNG · 10MB хүртэл
        {!allowMultiple && hasExisting ? " · хуучин баримт солигдоно" : ""}
      </p>

      {error ? <p className="mt-1.5 text-xs text-red-700">{error}</p> : null}
      {ok ? <p className="mt-1.5 text-xs text-green-700">{ok}</p> : null}
    </div>
  );
}

export function AdminDocumentDelete({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function remove() {
    setError(null);
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/documents?id=${encodeURIComponent(documentId)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.error ?? "Устгахад алдаа гарлаа.");
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setError("Сүлжээний алдаа. Дахин оролдоно уу.");
    } finally {
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={`«${fileName}»-г бүрмөсөн устгана.`}
        className="text-xs text-red-600 transition-colors hover:underline"
      >
        Устгах
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-neutral-600">Устгах уу?</span>
      <button
        type="button"
        onClick={remove}
        disabled={isDeleting}
        className="font-medium text-red-600 hover:underline disabled:opacity-60"
      >
        {isDeleting ? "Устгаж байна…" : "Тийм"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isDeleting}
        className="text-neutral-600 hover:underline disabled:opacity-60"
      >
        Үгүй
      </button>
      {error ? <span className="text-red-700">{error}</span> : null}
    </span>
  );
}

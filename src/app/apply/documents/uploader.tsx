"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

export type UploadedDocument = {
  id: string;
  fileName: string;
  size: number;
  requirementCode: string;
};

type UploaderProps = {
  requirementCode: string;
  allowMultiple: boolean;
  documents: UploadedDocument[];
};

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Uploader({
  requirementCode,
  allowMultiple,
  documents,
}: UploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function upload(file: File) {
    setError(null);
    setUploading(true);

    const body = new FormData();
    body.append("file", file);
    body.append("requirementCode", requirementCode);

    try {
      const response = await fetch("/api/uploads", { method: "POST", body });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Файл хуулахад алдаа гарлаа.");
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setError("Сүлжээний алдаа. Дахин оролдоно уу.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setError(null);
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error ?? "Устгахад алдаа гарлаа.");
      return;
    }

    startTransition(() => router.refresh());
  }

  const busy = isUploading || isPending;
  const canAdd = allowMultiple || documents.length === 0;

  return (
    <div className="space-y-2">
      {documents.length > 0 ? (
        <ul className="space-y-1.5">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
            >
              <a
                href={`/api/documents/${document.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate text-brand-blue hover:underline"
              >
                {document.fileName}
              </a>
              <span className="shrink-0 text-xs text-neutral-500">
                {formatSize(document.size)}
              </span>
              <button
                type="button"
                onClick={() => remove(document.id)}
                disabled={busy}
                className="shrink-0 rounded px-2 py-0.5 text-xs text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                Устгах
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {canAdd ? (
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-brand-blue-dark disabled:opacity-50"
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-neutral-500 hover:text-neutral-800"
        >
          Солихын тулд эхлээд устгана уу
        </button>
      )}

      {isUploading ? (
        <p className="text-xs text-neutral-500">Хуулж байна…</p>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

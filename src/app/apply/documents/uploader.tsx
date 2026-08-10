"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { inputClass } from "@/components/ui";

export type UploadedDocument = {
  id: string;
  fileName: string;
  size: number;
  requirementCode: string;
  eventName: string | null;
  note: string | null;
};

type UploaderProps = {
  requirementCode: string;
  allowMultiple: boolean;
  /** Арга хэмжээний нэр асуух эсэх — нийгмийн оролцооны баримтад л хэрэгтэй. */
  collectsEventName: boolean;
  /** Тайлбар асуух эсэх. Лавлагаа шиг нэг утгатай баримтад илүүц. */
  collectsNote: boolean;
  documents: UploadedDocument[];
};

/** Нэг мөр: арга хэмжээний нэр, тайлбар, файл. Хараахан хуулаагүй. */
type DraftRow = {
  key: number;
  eventName: string;
  note: string;
  file: File | null;
};

const NOTE_MAX_LENGTH = 200;

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const emptyRow = (key: number): DraftRow => ({
  key,
  eventName: "",
  note: "",
  file: null,
});

export function Uploader({
  requirementCode,
  allowMultiple,
  collectsEventName,
  collectsNote,
  documents,
}: UploaderProps) {
  const router = useRouter();
  const singleInputRef = useRef<HTMLInputElement>(null);
  const nextKey = useRef(1);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow(0)]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<number | null>(null);
  const [isUploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function upload(
    file: File,
    fields: { eventName?: string; note?: string } = {},
  ): Promise<boolean> {
    setError(null);

    const body = new FormData();
    body.append("file", file);
    body.append("requirementCode", requirementCode);
    if (fields.eventName) body.append("eventName", fields.eventName);
    if (fields.note) body.append("note", fields.note);

    try {
      const response = await fetch("/api/uploads", { method: "POST", body });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Файл хуулахад алдаа гарлаа.");
        return false;
      }

      startTransition(() => router.refresh());
      return true;
    } catch {
      setError("Сүлжээний алдаа. Дахин оролдоно уу.");
      return false;
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

  function patchRow(key: number, patch: Partial<DraftRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((current) => [...current, emptyRow(nextKey.current++)]);
  }

  function dropRow(key: number) {
    setRows((current) => {
      const rest = current.filter((row) => row.key !== key);
      // Хамгийн багадаа нэг хоосон мөр үлдээнэ — эс тэгвээс нэмэх товчгүй болно.
      return rest.length > 0 ? rest : [emptyRow(nextKey.current++)];
    });
  }

  async function submitRow(row: DraftRow) {
    if (!row.file) return;

    const eventName = row.eventName.trim();
    const note = row.note.trim();

    // Гэрчилгээ, арга хэмжээний нэр латинаар байж болно — энд кирилл
    // үсгийн шаардлага тавихгүй, зөвхөн бөглөгдсөн эсэхийг шалгана.
    if (collectsEventName && !eventName) {
      setError("Арга хэмжээний нэрийг бичнэ үү.");
      return;
    }
    if (collectsNote && !note) {
      setError("Тайлбарыг бичнэ үү.");
      return;
    }

    setUploadingKey(row.key);
    const ok = await upload(row.file, { eventName, note });
    setUploadingKey(null);

    if (ok) dropRow(row.key);
  }

  const busy = isUploading || isPending || uploadingKey !== null;
  // Бичих талбар байхгүй бол мөрийн бүтэц илүүц — файл сонгомогц шууд хуулна.
  const usesRows = collectsEventName || collectsNote;

  /** Асуудаг талбарууд нь заавал бөглөгдөнө. */
  const isRowReady = (row: DraftRow) =>
    Boolean(row.file) &&
    (!collectsEventName || row.eventName.trim() !== "") &&
    (!collectsNote || row.note.trim() !== "");

  return (
    <div className="space-y-2">
      {documents.length > 0 ? (
        <ul className="space-y-1.5">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1">
                {document.eventName ? (
                  <span className="block font-medium text-neutral-900">
                    {document.eventName}
                  </span>
                ) : null}
                {document.note ? (
                  <span className="block text-neutral-700">
                    {document.note}
                  </span>
                ) : null}
                <a
                  href={`/api/documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-brand-blue hover:underline"
                >
                  {document.fileName}
                </a>
              </span>
              <span className="shrink-0 pt-0.5 text-xs text-neutral-500">
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

      {usesRows ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="rounded-lg border border-neutral-200 p-3"
            >
              <div className="space-y-2">
                <div
                  className={`grid gap-2 ${
                    collectsEventName ? "sm:grid-cols-2" : ""
                  }`}
                >
                  {collectsEventName ? (
                    <input
                      value={row.eventName}
                      maxLength={NOTE_MAX_LENGTH}
                      onChange={(event) =>
                        patchRow(row.key, { eventName: event.target.value })
                      }
                      required
                      className={inputClass}
                      placeholder="Арга хэмжээний нэр *"
                      aria-label="Арга хэмжээний нэр"
                    />
                  ) : null}

                  {collectsNote ? (
                    <input
                      value={row.note}
                      maxLength={NOTE_MAX_LENGTH}
                      onChange={(event) =>
                        patchRow(row.key, { note: event.target.value })
                      }
                      required
                      className={inputClass}
                      placeholder="Тайлбар *"
                      aria-label="Баримтын тайлбар"
                    />
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    disabled={busy}
                    onChange={(event) =>
                      patchRow(row.key, {
                        file: event.target.files?.[0] ?? null,
                      })
                    }
                    aria-label="Баримт сонгох"
                    className="block max-w-[13rem] text-sm text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-200 file:px-3 file:py-1.5 file:text-sm file:text-neutral-800 hover:file:bg-neutral-300 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => void submitRow(row)}
                    disabled={busy || !isRowReady(row)}
                    className="shrink-0 rounded-lg bg-brand-blue px-3 py-1.5 text-sm text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingKey === row.key ? "Хуулж байна…" : "Хавсаргах"}
                  </button>

                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => dropRow(row.key)}
                      disabled={busy}
                      aria-label="Мөр хасах"
                      className="shrink-0 rounded px-1.5 py-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {allowMultiple ? (
            <button
              type="button"
              onClick={addRow}
              disabled={busy}
              className="rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              + Мөр нэмэх
            </button>
          ) : null}
        </div>
      ) : allowMultiple || documents.length === 0 ? (
        <input
          ref={singleInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setUploading(true);
            await upload(file);
            setUploading(false);
            if (singleInputRef.current) singleInputRef.current.value = "";
          }}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-brand-blue-dark disabled:opacity-50"
        />
      ) : (
        <p className="text-xs text-neutral-500">
          Солихын тулд эхлээд устгана уу.
        </p>
      )}

      {isUploading ? (
        <p className="text-xs text-neutral-500">Хуулж байна…</p>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

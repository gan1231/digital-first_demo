"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, inputClass } from "@/components/ui";
import type { FormState } from "./actions";

type ActionFn = (state: FormState, formData: FormData) => Promise<FormState>;

const MIN_PASSWORD_LENGTH = 8;

function ConfirmButtons({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-60"
      >
        Болих
      </button>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-blue px-4 py-2 text-sm text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Хадгалж байна…" : "Сэргээх"}
      </button>
    </div>
  );
}

/**
 * Админ хэрэглэгчийн нууц үгийг сэргээх товч. Дарахад шинэ нууц үг бичих
 * цонх нээгдэнэ. Нууц үг зөвхөн сервер рүү явж хэшлэгдэнэ.
 */
export function ResetPasswordButton({
  action,
  name,
  email,
}: {
  action: ActionFn;
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Амжилттай болмогц цонхыг хааж, мөрөнд богино мэдэгдэл үлдээнэ.
  useEffect(() => {
    if (state?.ok) {
      setDone(state.ok);
      setOpen(false);
    }
  }, [state?.ok]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDone(null);
          setOpen(true);
        }}
        title="Шинэ нууц үг тавина. Хэрэглэгчийн нээлттэй бүх session хаагдана."
        className="text-xs text-brand-blue transition-colors hover:underline"
      >
        Нууц үг сэргээх
      </button>

      {done ? (
        <span className="ml-2 text-xs text-green-700">Шинэчлэгдсэн</span>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-lg"
          >
            <h2 id="reset-title" className="text-base font-medium text-neutral-900">
              Нууц үг сэргээх
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">{name}</span>
              <span className="text-neutral-500"> · {email}</span>
            </p>

            <form action={formAction} className="mt-4 space-y-3">
              {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

              <div className="space-y-1.5">
                <label
                  htmlFor="reset-password"
                  className="block text-sm font-medium text-neutral-800"
                >
                  Шинэ нууц үг
                </label>
                <input
                  ref={inputRef}
                  id="reset-password"
                  type="text"
                  name="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="off"
                  defaultValue="Burtgel!2026"
                  className={inputClass}
                />
                <p className="text-xs text-neutral-500">
                  Доод тал нь {MIN_PASSWORD_LENGTH} тэмдэгт. Хэрэглэгчид өөрт нь
                  дамжуулна уу — дараа нь дахин харагдахгүй.
                </p>
              </div>

              <Alert tone="warning">
                Сэргээмэгц уг хэрэглэгчийн нэвтэрсэн бүх төхөөрөмж гарна.
              </Alert>

              <ConfirmButtons onCancel={() => setOpen(false)} />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

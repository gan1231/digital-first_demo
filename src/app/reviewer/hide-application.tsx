"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, inputClass } from "@/components/ui";
import type { FormState } from "./actions";

type ActionFn = (state: FormState, formData: FormData) => Promise<FormState>;

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
        className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Нууж байна…" : "Устгах"}
      </button>
    </div>
  );
}

/**
 * Жагсаалтаас өргөдөл нуух товч. Дарахад нууц үг асуух цонх нээгдэнэ.
 * Нууц үгийг сервер дээр шалгана — энд хадгалагдахгүй.
 */
export function HideApplicationButton({
  action,
  name,
}: {
  action: ActionFn;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Амжилттай болмогц цонхыг хаана — мөр нь жагсаалтаас алга болно.
  useEffect(() => {
    if (state?.ok) setOpen(false);
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
        onClick={() => setOpen(true)}
        title="Жагсаалтаас нууна. Өгөгдөл, баримт устахгүй."
        className="text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
      >
        Устгах
      </button>

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
            aria-labelledby="hide-title"
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-lg"
          >
            <h2 id="hide-title" className="text-base font-medium text-neutral-900">
              Өргөдөл гаргагчийг устгах
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">{name}</span>-ийн
              өргөдлийг жагсаалтаас хасна. Баримт бичиг, үнэлгээ нь устахгүй —
              «Нуусан» шүүлтүүрээс буцаан нээх боломжтой.
            </p>

            <form action={formAction} className="mt-4 space-y-3">
              {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

              <div className="space-y-1.5">
                <label
                  htmlFor="hide-password"
                  className="block text-sm font-medium text-neutral-800"
                >
                  Нууц үг
                </label>
                <input
                  ref={inputRef}
                  id="hide-password"
                  type="password"
                  name="password"
                  required
                  autoComplete="off"
                  placeholder="Устгах нууц үгээ оруулна уу"
                  className={inputClass}
                />
              </div>

              <ConfirmButtons onCancel={() => setOpen(false)} />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Нуусан өргөдлийг буцаан нээх товч. Нууц үг шаардахгүй. */
export function UnhideApplicationButton({ action }: { action: ActionFn }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        title="Жагсаалтад буцаан харуулна."
        className="text-xs text-brand-blue transition-colors hover:underline"
      >
        Сэргээх
      </button>
      {state?.error ? (
        <p className="mt-1 text-xs text-red-700">{state.error}</p>
      ) : null}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, inputClass } from "@/components/ui";
import type { FormState } from "../actions";

type ActionFn = (state: FormState, formData: FormData) => Promise<FormState>;

export function DecisionForm({
  action,
  currentResult,
  currentNote,
}: {
  action: ActionFn;
  currentResult: string | null;
  currentNote: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <select
        name="result"
        defaultValue={currentResult ?? ""}
        required
        className={inputClass}
      >
        <option value="" disabled>
          Шийдвэр сонгоно уу
        </option>
        <option value="APPROVED">Тэнцсэн</option>
        <option value="REJECTED">Тэнцээгүй</option>
        <option value="WAITLISTED">Нөөц</option>
      </select>

      <textarea
        name="note"
        rows={3}
        defaultValue={currentNote}
        placeholder="Өргөдөгчид илгээх и-мэйлд орох тайлбар…"
        className={`${inputClass} resize-y text-[13px]`}
      />

      <SubmitButton className="w-full" pendingLabel="Илгээж байна…">
        Шийдвэр гаргаж и-мэйл илгээх
      </SubmitButton>
    </form>
  );
}

export function RequestFixForm({ action }: { action: ActionFn }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      <textarea
        name="note"
        rows={2}
        placeholder="Юуг засах шаардлагатай вэ?"
        className={`${inputClass} resize-y text-[13px]`}
      />

      <SubmitButton
        variant="secondary"
        className="w-full"
        pendingLabel="Илгээж байна…"
      >
        Засварт буцаах
      </SubmitButton>
    </form>
  );
}

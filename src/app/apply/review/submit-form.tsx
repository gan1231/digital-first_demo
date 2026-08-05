"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { submitApplication, type FormState } from "../actions";

export function SubmitForm({ disabled }: { disabled: boolean }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    submitApplication,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      {disabled ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-lg bg-neutral-200 px-4 py-2.5 text-sm text-neutral-500"
        >
          Дутуу зүйлээ гүйцээнэ үү
        </button>
      ) : (
        <SubmitButton className="w-full" pendingLabel="Илгээж байна…">
          Өргөдлөө илгээх
        </SubmitButton>
      )}

      <p className="text-center text-xs text-neutral-500">
        Илгээсний дараа анкет түгжигдэнэ. Комисс засвар шаардвал дахин нээгдэнэ.
      </p>
    </form>
  );
}

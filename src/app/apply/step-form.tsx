"use client";

import { useActionState, type ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import type { FormState } from "./actions";

type StepFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  isEditable?: boolean;
};

export function StepForm({
  action,
  children,
  submitLabel = "Хадгалаад үргэлжлүүлэх",
  isEditable = true,
}: StepFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <fieldset disabled={!isEditable} className="space-y-4">
        {children}
      </fieldset>
      {isEditable && (
        <div className="flex justify-end pt-2">
          <SubmitButton>{submitLabel}</SubmitButton>
        </div>
      )}
    </form>
  );
}

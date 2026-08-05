"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import { chooseTrack, type FormState } from "../actions";

export function TrackPicker({
  callId,
  disabled,
}: {
  callId: string;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    chooseTrack,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-2">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <input type="hidden" name="callId" value={callId} />

      {disabled ? (
        <span className="block cursor-not-allowed rounded-lg bg-neutral-200 px-4 py-2.5 text-center text-sm text-neutral-500">
          Хүлээн авах хугацаа дууссан
        </span>
      ) : (
        <SubmitButton className="w-full" pendingLabel="Нээж байна…">
          Энэ төрлөөр өргөдөл гаргах
        </SubmitButton>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";
import { register, type FormState } from "../actions";

export function RegisterForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    register,
    undefined,
  );

  return (
    <form action={formAction} className="mt-5 space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <Field label="Овог, нэр" htmlFor="name" required>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          className={inputClass}
          placeholder="Бат-Эрдэнэ Сувд"
        />
      </Field>

      <Field label="И-мэйл хаяг" htmlFor="email" required>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder="suvd@example.com"
        />
      </Field>

      <Field
        label="Утасны дугаар"
        htmlFor="phone"
        required
        hint="8 оронтой дугаар"
      >
        <input
          id="phone"
          name="phone"
          inputMode="numeric"
          autoComplete="tel"
          required
          className={inputClass}
          placeholder="99001122"
        />
      </Field>

      <Field
        label="Нууц үг"
        htmlFor="password"
        required
        hint="Доод тал нь 8 тэмдэгт"
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </Field>

      <Field label="Нууц үг давтах" htmlFor="passwordConfirm" required>
        <input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Бүртгэж байна…">
        Бүртгүүлэх
      </SubmitButton>
    </form>
  );
}

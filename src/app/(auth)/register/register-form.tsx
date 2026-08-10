"use client";

import { useActionState, useState } from "react";
import type { CallTrack } from "@prisma/client";
import { EMAIL_PATTERN } from "@/lib/anket";
import {
  AnketSection,
  CheckField,
  PersonalAnketFields,
  ProgramAnketFields,
} from "@/components/anket-fields";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";
import { register, type FormState } from "../actions";

export type CallOption = {
  id: string;
  name: string;
  track: CallTrack;
  trackLabel: string;
  closesLabel: string;
  isOpen: boolean;
};

export function RegisterForm({ calls }: { calls: CallOption[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    register,
    undefined,
  );

  const defaults = state?.values ?? {};
  const defaultCallId =
    typeof defaults.callId === "string"
      ? defaults.callId
      : (calls.find((call) => call.isOpen)?.id ?? "");

  // 1.10-д бичсэн хаяг нь нэвтрэх нэр — бичиж байхад доод талд нь харагдана.
  const [email, setEmail] = useState(
    typeof defaults.email === "string" ? defaults.email : "",
  );
  const [emailTouched, setEmailTouched] = useState(false);
  const emailError =
    emailTouched && email.trim() !== "" && !EMAIL_PATTERN.test(email.trim())
      ? "И-мэйл хаяг буруу байна. Жишээ: suvd@example.com"
      : undefined;

  const fullName = [defaults.lastName, defaults.firstName]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join(" ");

  return (
    <form action={formAction} className="space-y-6">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <AnketSection
        number="0."
        title="Тэтгэлгийн төрөл"
        description="Нэг хүн нэг л төрөлд өргөдөл гаргана."
      >
        <div className="space-y-2">
          {calls.map((call) => (
            <label
              key={call.id}
              className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${
                call.isOpen
                  ? "cursor-pointer border-neutral-300 hover:bg-neutral-50"
                  : "border-neutral-200 bg-neutral-50 text-neutral-400"
              }`}
            >
              <input
                type="radio"
                name="callId"
                value={call.id}
                required
                disabled={!call.isOpen}
                defaultChecked={defaultCallId === call.id}
                className="mt-0.5 size-4 border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
              />
              <span>
                <span className="block text-neutral-900">{call.trackLabel}</span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {call.name}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {call.isOpen
                    ? `Хүлээн авах эцсийн хугацаа: ${call.closesLabel}`
                    : "Хүлээн авах хугацаа дууссан"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </AnketSection>

      <PersonalAnketFields
        defaults={defaults}
        emailSlot={
          <Field
            label="Цахим шуудангийн хаяг"
            htmlFor="email"
            required
            error={emailError}
            hint="Энэ хаяг таны нэвтрэх нэр болно. Шийдвэрийг мөн энэ хаягаар мэдэгдэнэ."
          >
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              aria-invalid={emailError ? true : undefined}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              className={`${inputClass} ${
                emailError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : ""
              }`}
              placeholder="suvd@example.com"
            />
          </Field>
        }
      />

      <ProgramAnketFields defaults={defaults} />

      <AnketSection number="4." title="Баталгаажуулалт">
        <CheckField
          name="declaration"
          label={
            fullName
              ? `${fullName} — анкетаа үнэн зөв бөглөсөн болно.`
              : "Анкетаа үнэн зөв бөглөсөн болно."
          }
          defaultChecked={defaults.declaration === "on"}
        />
        <p className="mt-2 text-xs text-neutral-500">
          Худал мэдээлэл оруулсан нь тогтоогдвол өргөдөл хүчингүй болно.
        </p>
      </AnketSection>

      <AnketSection
        number="5."
        title="Нэвтрэх мэдээлэл"
        description="Анкетаа хадгалсны дараа энэ мэдээллээр системд нэвтэрч, үлдсэн материалаа бүрдүүлнэ."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Нэвтрэх нэр"
            className="sm:col-span-2"
            hint="1.10-д бичсэн цахим шуудангийн хаягаас автоматаар үүснэ."
          >
            <input
              readOnly
              value={email}
              placeholder="Дээр и-мэйл хаягаа бичнэ үү"
              className={`${inputClass} bg-neutral-50 text-neutral-600`}
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
        </div>
      </AnketSection>

      <SubmitButton className="w-full" pendingLabel="Бүртгэж байна…">
        Анкет илгээж бүртгүүлэх
      </SubmitButton>
    </form>
  );
}

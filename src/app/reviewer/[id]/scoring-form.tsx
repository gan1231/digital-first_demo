"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import type { FormState } from "../actions";

export type CriterionView = {
  code: string;
  label: string;
  description: string | null;
  maxScore: number;
  suggested: number | null;
  score: number | null;
  status?: "VERIFIED" | "REJECTED";
  comment: string;
  isStatusOnly: boolean; // Шинэ: Зөвхөн Үнэн/Зөрүүтэй гэж тэмдэглэх эсэх
};

type ScoringFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  criteria: CriterionView[];
  submittedAt: string | null;
};

export function ScoringForm({
  action,
  criteria,
  submittedAt,
}: ScoringFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      {submittedAt ? (
        <Alert tone="info">
          Таны үнэлгээ {submittedAt}-нд баталгаажсан байна.
        </Alert>
      ) : null}

      <div className="space-y-4">
        {criteria.map((criterion) => {
          return (
            <div
              key={criterion.code}
              className="border-t border-neutral-200 pt-4 first:border-0 first:pt-0"
            >
              <div className="flex flex-col gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {criterion.label}
                  </p>
                  {criterion.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                      {criterion.description}
                    </p>
                  ) : null}
                </div>

                {criterion.isStatusOnly ? (
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="radio"
                        name={`status__${criterion.code}`}
                        value="VERIFIED"
                        defaultChecked={criterion.status === "VERIFIED"}
                        disabled={!!submittedAt}
                        required
                        className="text-brand-blue focus:ring-brand-blue"
                      />
                      Мэдээлэл үнэн зөв
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="radio"
                        name={`status__${criterion.code}`}
                        value="REJECTED"
                        defaultChecked={criterion.status === "REJECTED"}
                        disabled={!!submittedAt}
                        required
                        className="text-brand-blue focus:ring-brand-blue"
                      />
                      Мэдээлэл зөрүүтэй
                    </label>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5 mt-2">
                    <input
                      name={`score__${criterion.code}`}
                      type="number"
                      min={0}
                      max={criterion.maxScore}
                      step={0.1}
                      defaultValue={criterion.score ?? criterion.suggested ?? ""}
                      disabled={!!submittedAt}
                      placeholder="0.0"
                      className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm font-medium text-neutral-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                    />
                    <span className="text-sm text-neutral-500">
                      / {criterion.maxScore} оноо
                    </span>
                  </div>
                )}

                <textarea
                  name={`comment__${criterion.code}`}
                  rows={2}
                  defaultValue={criterion.comment}
                  disabled={!!submittedAt}
                  placeholder="Тайлбар бичих..."
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:opacity-60 disabled:bg-neutral-50"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <div className="flex items-center justify-end gap-3">
          <SubmitButton
            name="intent"
            value="save"
            variant="secondary"
            disabled={!!submittedAt}
            pendingLabel="Хадгалж байна…"
          >
            Ноороглох
          </SubmitButton>
          <SubmitButton name="intent" value="submit" disabled={!!submittedAt} pendingLabel="Хадгалж байна…">
            Баталгаажуулах
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

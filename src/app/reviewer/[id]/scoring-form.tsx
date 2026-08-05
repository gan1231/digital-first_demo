"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, inputClass } from "@/components/ui";
import type { FormState } from "../actions";

export type CriterionView = {
  code: string;
  label: string;
  description: string | null;
  maxScore: number;
  /** Анкетын тоон утгаас бодогдсон санал. NONE шалгуурт null. */
  suggested: number | null;
  score: number | null;
  comment: string;
};

type ScoringFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  criteria: CriterionView[];
  overallComment: string;
  submittedAt: string | null;
};

export function ScoringForm({
  action,
  criteria,
  overallComment,
  submittedAt,
}: ScoringFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      criteria.map((criterion) => [
        criterion.code,
        criterion.score ?? criterion.suggested ?? 0,
      ]),
    ),
  );

  const total =
    Math.round(
      criteria.reduce(
        (sum, criterion) => sum + (scores[criterion.code] ?? 0),
        0,
      ) * 10,
    ) / 10;

  const maxTotal = criteria.reduce(
    (sum, criterion) => sum + criterion.maxScore,
    0,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}

      {submittedAt ? (
        <Alert tone="info">
          Таны үнэлгээ {submittedAt}-нд баталгаажсан. Дахин хадгалбал шинэчлэгдэнэ.
        </Alert>
      ) : null}

      <div className="space-y-4">
        {criteria.map((criterion) => {
          const isAuto = criterion.suggested !== null;
          const value = scores[criterion.code] ?? 0;
          const changed = isAuto && value !== criterion.suggested;

          return (
            <div
              key={criterion.code}
              className="border-t border-neutral-200 pt-4 first:border-0 first:pt-0"
            >
              <div className="flex items-start justify-between gap-3">
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

                <div className="flex shrink-0 items-center gap-1.5">
                  <input
                    name={`score__${criterion.code}`}
                    type="number"
                    min={0}
                    max={criterion.maxScore}
                    /* Автомат бодогдсон оноо нэг аравтын нарийвчлалтай ирдэг
                       тул алхам нь 0.1 байх ёстой — эс тэгвээс браузерын
                       шалгалтад унаж форм чимээгүй илгээгдэхгүй болно. */
                    step="0.1"
                    required
                    value={value}
                    onChange={(event) =>
                      setScores((previous) => ({
                        ...previous,
                        [criterion.code]: Number(event.target.value),
                      }))
                    }
                    className={`${inputClass} w-20 text-right tabular-nums`}
                  />
                  <span className="text-sm text-neutral-500">
                    / {criterion.maxScore}
                  </span>
                </div>
              </div>

              {isAuto ? (
                <p className="mt-1 text-xs text-neutral-500">
                  {changed ? (
                    <span className="text-amber-700">
                      Гараар засварласан (автомат санал: {criterion.suggested})
                    </span>
                  ) : (
                    <>Анкетын мэдээллээс автоматаар бодогдсон</>
                  )}
                </p>
              ) : null}

              <textarea
                name={`comment__${criterion.code}`}
                rows={2}
                defaultValue={criterion.comment}
                placeholder="Онооны үндэслэл…"
                className={`${inputClass} mt-2 resize-y text-[13px]`}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <label
          className="block text-sm font-medium text-neutral-800"
          htmlFor="comment"
        >
          Ерөнхий дүгнэлт
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          defaultValue={overallComment}
          className={`${inputClass} mt-1.5 resize-y text-[13px]`}
        />
      </div>

      <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-neutral-200 bg-white px-5 py-3">
        <p className="text-sm">
          Нийт оноо{" "}
          <span className="text-lg font-medium tabular-nums text-neutral-900">
            {total}
          </span>
          <span className="text-neutral-500"> / {maxTotal}</span>
        </p>

        <div className="flex gap-2">
          <SubmitButton variant="secondary" name="intent" value="draft">
            Түр хадгалах
          </SubmitButton>
          <SubmitButton name="intent" value="submit">
            Баталгаажуулах
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

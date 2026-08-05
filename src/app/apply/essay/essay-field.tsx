"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";

const MIN_WORDS = 500;
const MAX_WORDS = 1000;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function EssayField({ defaultValue }: { defaultValue: string }) {
  const [words, setWords] = useState(() => countWords(defaultValue));

  const isValid = words >= MIN_WORDS && words <= MAX_WORDS;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-800" htmlFor="essayText">
        «Миний сонгосон мэргэжил, ирээдүйн зорилго»
        <span className="text-brand-orange"> *</span>
      </label>

      <textarea
        id="essayText"
        name="essayText"
        rows={18}
        required
        defaultValue={defaultValue}
        onChange={(event) => setWords(countWords(event.target.value))}
        className={`${inputClass} resize-y leading-relaxed`}
        placeholder="Эссэгээ энд бичнэ үү…"
      />

      <p
        className={`text-xs ${isValid ? "text-green-700" : "text-neutral-500"}`}
        aria-live="polite"
      >
        {words} үг · шаардлага {MIN_WORDS}–{MAX_WORDS} үг
        {isValid ? " · шаардлага хангасан" : null}
      </p>
    </div>
  );
}

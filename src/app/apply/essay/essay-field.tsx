"use client";

import { RichTextEditor } from "@/components/rich-text-editor";
import { ESSAY_MAX_WORDS, ESSAY_MIN_WORDS } from "@/lib/application-shared";

const TOPIC = "«Миний сонгосон мэргэжил, ирээдүйн зорилго»";

export function EssayField({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <p className="block text-sm font-medium text-neutral-800">
        {TOPIC}
        <span className="text-brand-orange"> *</span>
      </p>

      <RichTextEditor
        name="essayText"
        defaultValue={defaultValue}
        minWords={ESSAY_MIN_WORDS}
        maxWords={ESSAY_MAX_WORDS}
        ariaLabel={TOPIC}
        placeholder="Эсээгээ энд бичнэ үү…"
      />
    </div>
  );
}

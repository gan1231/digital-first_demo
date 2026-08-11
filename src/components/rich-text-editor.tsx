"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { essayProseClass } from "@/components/ui";

/**
 * Эсээ бичих энгийн текст эдитэр. Гуравдагч сангаас хамаарахгүйн тулд
 * `contentEditable` дээр суурилсан. Гаралт нь HTML бөгөөд нуугдмал input-аар
 * форм руу явна — сервер тал үүнийг заавал цэвэрлэнэ (`src/lib/essay.ts`).
 */

type ToolbarButton = {
  command: string;
  value?: string;
  label: string;
  title: string;
  /** Товчийн бичиглэлийг тухайн форматаар нь харуулна. */
  className?: string;
};

const TOOLBAR: ToolbarButton[][] = [
  [
    { command: "bold", label: "B", title: "Тод (Ctrl+B)", className: "font-bold" },
    { command: "italic", label: "I", title: "Налуу (Ctrl+I)", className: "italic" },
    {
      command: "underline",
      label: "U",
      title: "Доогуур зураас (Ctrl+U)",
      className: "underline",
    },
    {
      command: "strikeThrough",
      label: "S",
      title: "Дундуур зураас",
      className: "line-through",
    },
  ],
  [
    { command: "insertUnorderedList", label: "•—", title: "Цэгт жагсаалт" },
    { command: "insertOrderedList", label: "1.", title: "Дугаартай жагсаалт" },
    { command: "formatBlock", value: "blockquote", label: "❝", title: "Ишлэл" },
  ],
  [
    {
      command: "removeFormat",
      label: "✕",
      title: "Сонгосон хэсгийн үсгийн форматыг арилгах",
    },
  ],
];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const NESTED_BLOCKS =
  "p > ul, p > ol, p > blockquote, div > ul, div > ol, div > blockquote";

/**
 * `execCommand` нь жагсаалт, ишлэлийг догол мөрийн **дотор** үүсгэдэг тул
 * `<p><ul>…</ul></p>` гэсэн хүчингүй бүтэц гарна. Браузер уншихдаа өөрөө
 * зассан ч ийм HTML хадгалахгүйн тулд гадагш нь гаргана.
 *
 * Засварыг эдитэрийн **хуулбар** дээр хийнэ — амьд DOM-г хөндвөл бичиж
 * байгаа хүний курсор үсэрнэ.
 */
function cleanHtml(source: HTMLElement): string {
  const clone = source.cloneNode(true) as HTMLElement;

  // Гүн давхарласан тохиолдолд хэд дахин давтана, гэхдээ хязгаартай.
  for (let depth = 0; depth < 5; depth += 1) {
    const nested = clone.querySelectorAll<HTMLElement>(NESTED_BLOCKS);
    if (nested.length === 0) break;

    let unwrapped = false;
    nested.forEach((block) => {
      const parent = block.parentElement;
      // Зөвхөн догол мөр нь энэ блокоос өөр агуулгагүй үед л задлана.
      if (parent && parent.textContent?.trim() === block.textContent?.trim()) {
        parent.replaceWith(block);
        unwrapped = true;
      }
    });

    if (!unwrapped) break;
  }

  return clone.innerHTML;
}

export function RichTextEditor({
  name,
  defaultValue,
  minWords,
  maxWords,
  placeholder,
  ariaLabel,
  readOnly,
}: {
  name: string;
  defaultValue: string;
  minWords: number;
  maxWords: number;
  placeholder?: string;
  ariaLabel?: string;
  readOnly?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);
  const [words, setWords] = useState(0);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [isEmpty, setIsEmpty] = useState(true);

  const sync = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const text = editor.innerText;
    setHtml(cleanHtml(editor));
    setWords(countWords(text));
    setIsEmpty(text.trim() === "");
  }, []);

  const refreshActive = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const group of TOOLBAR) {
      for (const button of group) {
        if (button.command === "removeFormat") continue;
        try {
          next[button.command] =
            button.command === "formatBlock"
              ? document.queryCommandValue("formatBlock").toLowerCase() ===
                button.value
              : document.queryCommandState(button.command);
        } catch {
          next[button.command] = false;
        }
      }
    }
    setActive(next);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Анхны утгыг DOM руу нэг л удаа тавина — цаашид браузер өөрөө удирдана.
    editor.innerHTML = defaultValue || "<p><br /></p>";
    try {
      // Enter дарахад <div> биш <p> үүсгэнэ — цэвэрлэгчийн загвартай нийцнэ.
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // Дэмжихгүй браузерт зүгээр л <div> үүснэ, сервер тал <p> болгоно.
    }
    sync();
    // defaultValue нь энэ хуудсын хугацаанд өөрчлөгдөхгүй.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      const editor = editorRef.current;
      const selection = document.getSelection();
      if (!editor || !selection?.anchorNode) return;
      if (editor.contains(selection.anchorNode)) refreshActive();
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [refreshActive]);

  const exec = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    if (command === "formatBlock") {
      // Дахин дарахад ишлэлээс гарна.
      const current = document.queryCommandValue("formatBlock").toLowerCase();
      document.execCommand(command, false, current === value ? "p" : value);
    } else {
      document.execCommand(command, false, value);
    }
    sync();
    refreshActive();
  };

  const isValid = words >= minWords && words <= maxWords;

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={html} readOnly />

      <div className="overflow-hidden rounded-lg border border-neutral-300 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20">
        {!readOnly && (
          <div
            role="toolbar"
            aria-label="Бичвэрийн формат"
            className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-1.5 py-1.5"
          >
            {TOOLBAR.map((group, index) => (
              <div key={index} className="flex items-center gap-1">
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className="mx-0.5 h-5 w-px bg-neutral-300"
                  />
                ) : null}
                {group.map((button) => (
                  <button
                    key={button.command + (button.value ?? "")}
                    type="button"
                    title={button.title}
                    aria-label={button.title}
                    aria-pressed={active[button.command] ?? false}
                    // mousedown-г таслахгүй бол товч дарахад сонголт алдагдана.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => exec(button.command, button.value)}
                    className={`min-w-8 rounded px-2 py-1 text-sm transition-colors ${
                      button.className ?? ""
                    } ${
                      active[button.command]
                        ? "bg-brand-blue/10 text-brand-blue"
                        : "text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          {isEmpty && placeholder ? (
            <p className="pointer-events-none absolute px-3 py-2.5 text-sm text-neutral-400">
              {placeholder}
            </p>
          ) : null}

          <div
            ref={editorRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={ariaLabel}
            onInput={sync}
            onKeyUp={refreshActive}
            onMouseUp={refreshActive}
            onBlur={sync}
            onPaste={(event) => {
              // Word, вэбээс хуулахад ирдэг форматыг авахгүй — зөвхөн бичвэр.
              event.preventDefault();
              const text = event.clipboardData.getData("text/plain");
              document.execCommand("insertText", false, text);
              sync();
            }}
            className={`min-h-[22rem] max-h-[36rem] overflow-y-auto bg-white px-3 py-2.5 outline-none ${essayProseClass}`}
          />
        </div>
      </div>

      <p
        className={`text-xs ${isValid ? "text-green-700" : "text-neutral-500"}`}
        aria-live="polite"
      >
        {words} үг · шаардлага {minWords}–{maxWords} үг
        {isValid ? " · шаардлага хангасан" : null}
      </p>
    </div>
  );
}

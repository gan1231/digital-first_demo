"use client";

import { useState, useEffect } from "react";

export function DocumentPreview({ url, fileName }: { url: string; fileName?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const checkStr = (fileName || url || "").toLowerCase().split("?")[0];
  const isImage = /\.(jpeg|jpg|gif|png|webp|avif)$/i.test(checkStr);
  const isPdf = /\.pdf$/i.test(checkStr);

  if (!isImage && !isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-brand-blue hover:underline"
      >
        {fileName || "Файл үзэх"}
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-left text-brand-blue hover:underline flex items-center gap-1.5"
        type="button"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{fileName || "Файл үзэх"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/70 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsOpen(false)} 
            aria-hidden="true" 
          />
          <div className="relative flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-neutral-900/5">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 bg-neutral-50/50">
              <h3 className="truncate pr-4 font-medium text-neutral-900">
                {fileName || "Баримт бичиг"}
              </h3>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-brand-blue hover:underline"
                >
                  Шинэ цонхонд нээх
                </a>
                <div className="h-4 w-px bg-neutral-300" />
                <button
                  onClick={() => setIsOpen(false)}
                  className="-m-1.5 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 transition-colors"
                  title="Хаах (Esc)"
                >
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="relative flex-1 bg-neutral-200/50 p-2 sm:p-4">
              <div className="absolute inset-0 flex items-center justify-center">
                {isImage ? (
                  <img 
                    src={url} 
                    alt={fileName || "Preview"} 
                    className="max-h-full max-w-full rounded bg-white object-contain shadow-sm ring-1 ring-neutral-200" 
                  />
                ) : (
                  <iframe 
                    src={`${url}#toolbar=0`} 
                    className="h-full w-full rounded bg-white shadow-sm ring-1 ring-neutral-200" 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

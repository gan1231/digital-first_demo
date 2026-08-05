import type { ReactNode } from "react";

/** Формын талбаруудад давтагддаг класс. Бүх хуудсанд ижил харагдана. */
export const inputClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:bg-neutral-100 disabled:text-neutral-500";

export const labelClass = "block text-sm font-medium text-neutral-800";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className={labelClass} htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-brand-orange"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-neutral-500">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-green-200 bg-green-50 text-green-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    danger: "border-red-200 bg-red-50 text-red-900",
  } as const;

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-0.5" : ""}>{children}</div>
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-neutral-200 bg-white p-5 ${className}`}
    >
      {title ? (
        <header className="mb-4">
          <h2 className="text-base font-medium text-neutral-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-neutral-600">{description}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

const statusTones = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  NEEDS_FIX: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
} as const;

export const statusLabels = {
  DRAFT: "Ноорог",
  SUBMITTED: "Илгээсэн",
  IN_REVIEW: "Хянагдаж буй",
  NEEDS_FIX: "Засвар шаардлагатай",
  APPROVED: "Тэнцсэн",
  REJECTED: "Тэнцээгүй",
} as const;

export function StatusBadge({
  status,
}: {
  status: keyof typeof statusLabels;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTones[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

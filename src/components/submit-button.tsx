"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  pendingLabel?: string;
  name?: string;
  value?: string;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  variant = "primary",
  pendingLabel = "Хадгалж байна…",
  name,
  value,
  className = "",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  const styles =
    variant === "primary"
      ? "bg-brand-blue text-white hover:bg-brand-blue-dark"
      : "border border-neutral-300 text-neutral-800 hover:bg-neutral-50";

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className={`rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

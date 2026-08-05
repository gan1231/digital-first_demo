import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Бүртгүүлэх" };

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h1 className="text-xl font-medium text-neutral-900">Бүртгүүлэх</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Бүртгүүлснээр анкетаа бөглөж, материалаа хавсаргах боломжтой болно.
      </p>

      <RegisterForm />

      <p className="mt-5 text-center text-sm text-neutral-600">
        Бүртгэлтэй юу?{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          Нэвтрэх
        </Link>
      </p>
    </div>
  );
}

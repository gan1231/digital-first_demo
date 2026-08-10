import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-6">
      <h1 className="text-xl font-medium text-neutral-900">Нэвтрэх</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Бүртгэлтэй и-мэйл хаяг, нууц үгээ оруулна уу.
      </p>

      <LoginForm next={next} />

      <p className="mt-5 text-center text-sm text-neutral-600">
        Бүртгэлгүй юу?{" "}
        <Link href="/register" className="text-brand-blue hover:underline">
          Бүртгүүлэх
        </Link>
      </p>
    </div>
  );
}

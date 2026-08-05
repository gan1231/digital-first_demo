import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function ReviewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 text-sm sm:px-6">
          <Link
            href="/reviewer"
            className="text-neutral-700 transition-colors hover:text-brand-blue"
          >
            Өргөдлүүд
          </Link>
          <Link
            href="/reviewer/ranking"
            className="text-neutral-700 transition-colors hover:text-brand-blue"
          >
            Эцсийн жагсаалт
          </Link>
          <span className="ml-auto text-xs text-neutral-500">
            {user.role === Role.ADMIN ? "Админ" : "Комиссын гишүүн"}
          </span>
        </div>
      </div>

      <main className="flex-1 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

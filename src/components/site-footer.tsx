import Link from "next/link";
import { org } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="bg-brand-blue text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="leading-relaxed">
          <p className="font-medium">{org.name}</p>
          <p className="text-white/80">
            {org.address} · {org.phone} · {org.email}
          </p>
        </div>
        <div className="flex items-center gap-4 text-white/80">
          <Link href="/privacy" className="transition-colors hover:text-white">
            Нууцлалын бодлого
          </Link>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

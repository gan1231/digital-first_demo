import Image from "next/image";
import Link from "next/link";
import { department, fund, org } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="bg-brand-blue text-white">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 text-sm sm:grid-cols-2 sm:px-6">
        <div className="flex items-start gap-3">
          <Image
            src={org.logo}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0"
          />
          <div className="leading-relaxed">
            <p className="font-medium">{org.name}</p>
            <p className="text-white/80">{org.address}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Image
            src={department.logo}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0"
          />
          <div className="leading-relaxed">
            <p className="font-medium">{department.name}</p>
            <p className="text-white/80">
              {department.phone} · {department.email}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-white/80 sm:px-6">
          <span>
            {fund.name} · {fund.tagline}
          </span>
          <span className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Нууцлалын бодлого
            </Link>
            <span>© {new Date().getFullYear()}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

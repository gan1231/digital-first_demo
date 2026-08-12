import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { department, fund, org } from "@/lib/brand";

const navigation = [
  { href: "/#tetgeleg", label: "Тэтгэлгийн тухай" },
  { href: "/#material", label: "Материал" },
  { href: "/#shaardlaga", label: "Шаардлага" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header>
      <div className="bg-brand-blue text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6">
          <span>{org.name}</span>
          <span className="hidden text-white/85 sm:inline">{org.domain}</span>
        </div>
      </div>

      <div className="border-b-2 border-brand-orange bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <Image
                src="/dornogovi-logo.png"
                alt="ДОРНОГОВЬ АЙМГИЙН ЗАСАГ ДАРГЫН ТАМГЫН ГАЗАР"
                width={44}
                height={44}
                priority
                className="size-11"
              />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-medium text-neutral-900 uppercase">
                ДОРНОГОВЬ АЙМГИЙН ЗАСАГ ДАРГЫН ТАМГЫН ГАЗАР
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-5 text-sm">
            {!user
              ? navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hidden text-neutral-600 transition-colors hover:text-neutral-900 md:inline"
                  >
                    {item.label}
                  </Link>
                ))
              : null}

            {user ? (
              <>
                <Link
                  href={isStaff(user) ? "/reviewer" : "/dashboard"}
                  className="text-neutral-900 transition-colors hover:text-brand-blue"
                >
                  {isStaff(user) ? "Комиссын самбар" : "Миний өргөдөл"}
                </Link>
                <span className="hidden text-neutral-500 sm:inline">
                  {user.name}
                </span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    Гарах
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-neutral-900 transition-colors hover:text-brand-blue"
                >
                  Нэвтрэх
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-brand-blue px-3.5 py-2 text-white transition-colors hover:bg-brand-blue-dark"
                >
                  Анкет бөглөх
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 bg-neutral-50">
        {/* Бүртгэл нь бүтэн анкет тул өргөн. Нэвтрэх, баталгаажуулах хуудас
            өөрсдөө max-w-md-д багтана. */}
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

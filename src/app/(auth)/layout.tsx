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
        <div className="mx-auto max-w-md px-4 py-12 sm:px-6">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

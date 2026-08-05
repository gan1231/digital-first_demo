import { Criteria } from "@/components/landing/criteria";
import { Documents } from "@/components/landing/documents";
import { Hero } from "@/components/landing/hero";
import { Steps } from "@/components/landing/steps";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveCall, getCallTiming } from "@/lib/call";

// Үлдсэн хоног серверийн цагаас хамаардаг тул хуудсыг кэшлэхгүй.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const call = await getActiveCall();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {call ? (
          <>
            <Hero call={call} timing={getCallTiming(call)} />
            <Steps />
            <Documents requirements={call.requirements} />
            <Criteria call={call} />
          </>
        ) : (
          <EmptyState />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function EmptyState() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-medium text-neutral-900">
        Одоогоор нээлттэй тэтгэлэг байхгүй байна
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
        Дараагийн жилийн тэтгэлгийн зарлал нээгдэхэд энэ хуудсанд мэдээлэл
        байршина. Дэлгэрэнгүй мэдээллийг Засаг даргын Тамгын газраас авна уу.
      </p>
    </section>
  );
}

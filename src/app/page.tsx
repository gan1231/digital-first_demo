import Link from "next/link";
import { CallSummary } from "@/components/call-summary";
import { Steps } from "@/components/landing/steps";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";
import { department, fund, org } from "@/lib/brand";
import { getActiveCalls, getCallTiming } from "@/lib/call";

// Үлдсэн хоног серверийн цагаас хамаардаг тул хуудсыг кэшлэхгүй.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const calls = await getActiveCalls();
  const anyOpen = calls.some((call) => getCallTiming(call).isOpen);
  const academicYear = calls.find((call) => call.academicYear)?.academicYear;

  // Бүртгэл нь анкет өөрөө тул нэвтрээгүй зочин шууд анкет руу орно.
  const user = await getCurrentUser();
  const applyHref = user ? "/apply" : "/register";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-14">
            {academicYear ? (
              <span className="inline-flex rounded-full bg-brand-sand px-3 py-1 text-xs text-amber-900">
                {academicYear}
              </span>
            ) : null}

            <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-medium leading-tight text-neutral-900 sm:text-4xl">
              ДОРНОГОВЬ АЙМГИЙН ЗАСАГ ДАРГЫН ТАМГЫН ГАЗАР
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-600">
              {org.name}, {department.name} хамтран олгох сургалтын төлбөрийн
              тэтгэлэг. Материалаа онлайнаар бүрдүүлж, шийдвэрээ и-мэйлээр
              аваарай.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {anyOpen ? (
                <Link
                  href={applyHref}
                  className="rounded-lg bg-brand-orange px-6 py-2.5 text-white transition-colors hover:bg-brand-orange-dark"
                >
                  Анкет бөглөх
                </Link>
              ) : (
                <span className="cursor-not-allowed rounded-lg bg-neutral-200 px-6 py-2.5 text-neutral-500">
                  Хүлээн авах хугацаа дууссан
                </span>
              )}
              <a
                href="#tetgeleg"
                className="rounded-lg border border-neutral-300 px-6 py-2.5 text-neutral-800 transition-colors hover:bg-white"
              >
                Шаардлага үзэх
              </a>
              <a
                href="/2026tetgeleg.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-brand-blue bg-white px-6 py-2.5 text-brand-blue transition-colors hover:bg-brand-blue/5"
              >
                Удирдамж татах (PDF)
              </a>
            </div>
          </div>
        </section>

        <Steps />

        <section
          id="tetgeleg"
          className="border-t border-neutral-200 bg-neutral-50 py-10"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-lg font-medium text-neutral-900">
              Тэтгэлгийн төрөл
            </h2>


            {calls.length === 0 ? (
              <p className="mt-6 text-sm text-neutral-600">
                Одоогоор нээлттэй тэтгэлэг байхгүй байна. Дараагийн зарлал
                нээгдэхэд энэ хуудсанд мэдээлэл байршина.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {calls.map((call) => (
                  <CallSummary
                    key={call.id}
                    call={call}
                    action={
                      getCallTiming(call).isOpen ? (
                        <Link
                          href={applyHref}
                          className="block rounded-lg bg-brand-blue px-4 py-2.5 text-center text-sm text-white transition-colors hover:bg-brand-blue-dark"
                        >
                          ӨРГӨДӨЛ ГАРГАХ
                        </Link>
                      ) : (
                        <span className="block cursor-not-allowed rounded-lg bg-neutral-200 px-4 py-2.5 text-center text-sm text-neutral-500">
                          Хүлээн авах хугацаа дууссан
                        </span>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

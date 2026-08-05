import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  APPLY_STEPS,
  EDITABLE_STATUSES,
  getApplicationContext,
  getCompleteness,
} from "@/lib/application";
import { trackLabels } from "@/lib/call";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default async function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/apply");
  const context = await getApplicationContext(user.id);

  if (context && !EDITABLE_STATUSES.includes(context.application.status)) {
    redirect("/dashboard");
  }

  const steps = context
    ? getCompleteness(context.application, context.call)
    : [];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1 bg-neutral-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          {context ? (
            <>
              <p className="mb-3 text-xs text-neutral-500">
                Сонгосон төрөл:{" "}
                <span className="text-neutral-800">
                  {trackLabels[context.call.track]}
                </span>
              </p>
              <Stepper steps={steps} />
            </>
          ) : null}
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Stepper({
  steps,
}: {
  steps: { slug: string; label: string; isComplete: boolean }[];
}) {
  const completed = steps.filter((step) => step.isComplete).length;

  return (
    <nav className="mb-6" aria-label="Анкетын алхмууд">
      <ol className="flex flex-wrap gap-1.5">
        {APPLY_STEPS.map((step, index) => {
          const status = steps.find((item) => item.slug === step.slug);
          const isReview = step.slug === "review";
          const isDone = isReview
            ? completed === steps.length
            : Boolean(status?.isComplete);

          return (
            <li key={step.slug}>
              <Link
                href={`/apply/${step.slug}`}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  isDone
                    ? "border-green-300 bg-green-50 text-green-900"
                    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <span
                  className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
                    isDone
                      ? "bg-green-600 text-white"
                      : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

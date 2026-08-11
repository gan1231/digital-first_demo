import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { requireUser, isStaff } from "@/lib/auth";
import {
  getApplicationContext,
  getCompleteness,
  type ApplicationContext,
} from "@/lib/application";
import { formatCallDate, getActiveCalls, getCallTiming, trackLabels } from "@/lib/call";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, Card, StatusBadge, statusLabels } from "@/components/ui";

export const metadata: Metadata = { title: "Миний өргөдөл" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser("/dashboard");

  if (isStaff(user)) {
    redirect("/reviewer");
  }

  const { submitted } = await searchParams;
  const context = await getApplicationContext(user.id);
  const calls = context ? [] : await getActiveCalls();
  const anyOpen = calls.some((call) => getCallTiming(call).isOpen);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1 bg-neutral-50">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
          <h1 className="text-xl font-medium text-neutral-900">
            Миний өргөдөл
          </h1>

          {submitted ? (
            <Alert tone="success" title="Өргөдөл амжилттай илгээгдлээ">
              Комиссын шийдвэрийг {user.email} хаягаар мэдэгдэнэ.
            </Alert>
          ) : null}

          {context ? (
            <ApplicationCard context={context} />
          ) : calls.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-600">
                Одоогоор нээлттэй тэтгэлгийн зарлал байхгүй байна.
              </p>
            </Card>
          ) : (
            <Card>
              <p className="text-sm font-medium text-neutral-900">
                Та өргөдөл гаргаагүй байна
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {calls.length} төрлийн тэтгэлэг нээлттэй байна. Төрлөө сонгож
                анкетаа бөглөнө үү — түр хадгалаад дараа үргэлжлүүлж болно.
              </p>

              {anyOpen ? (
                <Link
                  href="/apply/track"
                  className="mt-4 inline-block rounded-lg bg-brand-orange px-4 py-2 text-sm text-white transition-colors hover:bg-brand-orange-dark"
                >
                  Тэтгэлгийн төрөл сонгох
                </Link>
              ) : (
                <p className="mt-4 text-sm text-neutral-500">
                  Өргөдөл хүлээн авах хугацаа дууссан байна.
                </p>
              )}
            </Card>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function ApplicationCard({ context }: { context: ApplicationContext }) {
  const { call, application } = context;
  const steps = getCompleteness(application, call);
  const done = steps.filter((step) => step.isComplete).length;
  const timing = getCallTiming(call);
  const isEditable =
    application.status === ApplicationStatus.DRAFT ||
    application.status === ApplicationStatus.NEEDS_FIX;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full bg-brand-sand px-2.5 py-0.5 text-[11px] text-amber-900">
            {trackLabels[call.track]}
          </span>
          <p className="mt-1.5 text-sm font-medium text-neutral-900">
            {call.name}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Эцсийн хугацаа: {formatCallDate(call.closesAt)} ·{" "}
            {timing.hasClosed
              ? "хугацаа дууссан"
              : `${timing.daysLeft} хоног үлдсэн`}
          </p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-neutral-500">Бүрдэл</dt>
          <dd className="mt-0.5 font-medium">
            {done}/{steps.length}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Материал</dt>
          <dd className="mt-0.5 font-medium">{application.documents.length}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Эсээ</dt>
          <dd className="mt-0.5 font-medium">
            {application.essayWordCount ?? 0} үг
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Илгээсэн</dt>
          <dd className="mt-0.5 font-medium">
            {application.submittedAt
              ? application.submittedAt.toLocaleDateString("mn-MN")
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-neutral-200 pt-4">
        {isEditable ? (
          <Link
            href="/apply"
            className="inline-block rounded-lg bg-brand-orange px-4 py-2 text-sm text-white transition-colors hover:bg-brand-orange-dark"
          >
            {done === 0 ? "Анкет бөглөж эхлэх" : "Үргэлжлүүлэн бөглөх"}
          </Link>
        ) : (
          <p className="text-sm text-neutral-600">
            Таны өргөдөл «{statusLabels[application.status]}» төлөвтэй байна.
            Шийдвэр гарсны дараа и-мэйлээр мэдэгдэнэ.
          </p>
        )}
      </div>
    </Card>
  );
}

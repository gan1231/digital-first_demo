import Link from "next/link";
import { CheckCircleIcon, ClockIcon } from "@/components/icons";
import { formatCallDate, type ActiveCall, type CallTiming } from "@/lib/call";

type HeroProps = {
  call: ActiveCall;
  timing: CallTiming;
};

export function Hero({ call, timing }: HeroProps) {
  return (
    <section id="tetgeleg" className="border-b border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <StatusBadge timing={timing} year={call.year} />

        <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-medium leading-tight text-neutral-900 sm:text-4xl">
          {call.name}
        </h1>

        {call.description ? (
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-neutral-600">
            {call.description} Материалаа онлайнаар бүрдүүлж, шийдвэрээ и-мэйлээр
            аваарай.
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {timing.isOpen ? (
            <Link
              href="/register"
              className="rounded-lg bg-brand-orange px-6 py-2.5 text-white transition-colors hover:bg-brand-orange-dark"
            >
              Өргөдөл гаргах
            </Link>
          ) : (
            <span
              className="cursor-not-allowed rounded-lg bg-neutral-200 px-6 py-2.5 text-neutral-500"
              aria-disabled="true"
            >
              {timing.hasClosed
                ? "Хүлээн авах хугацаа дууссан"
                : "Хүлээн авалт эхлээгүй"}
            </span>
          )}
          <a
            href="#material"
            className="rounded-lg border border-neutral-300 px-6 py-2.5 text-neutral-800 transition-colors hover:bg-white"
          >
            Шаардлага үзэх
          </a>
        </div>

        <dl className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            accent="border-t-brand-blue"
            label="Хугацаа дуусах"
            value={formatCallDate(call.closesAt)}
          />
          <Stat
            accent="border-t-brand-orange"
            label={timing.hasClosed ? "Төлөв" : "Үлдсэн хоног"}
            value={timing.hasClosed ? "Хаагдсан" : String(timing.daysLeft)}
            highlight={timing.isUrgent}
          />
          <Stat
            accent="border-t-brand-gold"
            label="Тэтгэлгийн тоо"
            value={String(call.quota)}
          />
        </dl>
      </div>
    </section>
  );
}

function StatusBadge({ timing, year }: { timing: CallTiming; year: number }) {
  if (timing.hasClosed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-3 py-1 text-xs text-neutral-700">
        <ClockIcon className="size-3.5" />
        {year} оны хүлээн авалт хаагдсан
      </span>
    );
  }

  if (timing.hasNotOpened) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-sand px-3 py-1 text-xs text-amber-800">
        <ClockIcon className="size-3.5" />
        {year} оны хүлээн авалт удахгүй эхэлнэ
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs text-green-800">
      <CheckCircleIcon className="size-3.5" />
      {year} оны элсэлт нээлттэй
    </span>
  );
}

function Stat({
  label,
  value,
  accent,
  highlight = false,
}: {
  label: string;
  value: string;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border-t-2 bg-white p-3 ${accent}`}>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd
        className={`mt-0.5 text-xl font-medium ${
          highlight ? "text-brand-orange-dark" : "text-neutral-900"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

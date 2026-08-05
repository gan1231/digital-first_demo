import type { ActiveCall } from "@/lib/call";
import { formatCallDate, getCallTiming, trackLabels } from "@/lib/call";
import { GENERATED_CODES } from "@/lib/application-shared";

/**
 * Нэг төрлийн тэтгэлгийн товч танилцуулга — материалын жагсаалт, шалгуур,
 * хугацаа. Нүүр хуудас, төрөл сонгох хуудсанд хоёуланд хэрэглэгдэнэ.
 */
export function CallSummary({
  call,
  action,
}: {
  call: ActiveCall;
  action?: React.ReactNode;
}) {
  const timing = getCallTiming(call);
  const documents = call.requirements.filter(
    (requirement) => !GENERATED_CODES.includes(requirement.code),
  );

  return (
    <section className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5">
      <header>
        <span className="inline-flex rounded-full bg-brand-sand px-2.5 py-0.5 text-[11px] text-amber-900">
          {trackLabels[call.track]}
        </span>
        <h3 className="mt-2 text-base font-medium text-neutral-900">
          {call.name}
        </h3>
        {call.description ? (
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            {call.description}
          </p>
        ) : null}
      </header>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-neutral-50 p-2.5">
          <dt className="text-[11px] text-neutral-500">Хугацаа дуусах</dt>
          <dd className="mt-0.5 font-medium">
            {formatCallDate(call.closesAt)}
          </dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2.5">
          <dt className="text-[11px] text-neutral-500">
            {timing.hasClosed ? "Төлөв" : "Үлдсэн хоног"}
          </dt>
          <dd
            className={`mt-0.5 font-medium ${
              timing.isUrgent ? "text-brand-orange-dark" : ""
            }`}
          >
            {timing.hasClosed ? "Хаагдсан" : timing.daysLeft}
          </dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2.5">
          <dt className="text-[11px] text-neutral-500">Тэтгэлгийн тоо</dt>
          <dd className="mt-0.5 font-medium">{call.quota}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-neutral-900">
          Бүрдүүлэх материал
        </h4>
        <ul className="mt-2 space-y-1.5">
          {documents.map((requirement) => (
            <li
              key={requirement.id}
              className="flex items-start gap-2 text-[13px] leading-snug"
            >
              <span
                className={`mt-1 size-1.5 shrink-0 rounded-full ${
                  requirement.isRequired ? "bg-brand-blue" : "bg-brand-orange"
                }`}
              />
              <span className="text-neutral-700">
                {requirement.label}
                {!requirement.isRequired ? (
                  <span className="text-neutral-400"> (сонголтоор)</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-neutral-900">
          Шалгуур үзүүлэлт — нийт 100 оноо
        </h4>
        <ul className="mt-2 space-y-1">
          {call.criteria.map((criterion) => (
            <li
              key={criterion.id}
              className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-1 text-[13px] leading-snug last:border-0"
            >
              <span className="text-neutral-700">{criterion.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-neutral-900">
                {criterion.maxScore}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {action ? <div className="mt-5 pt-1">{action}</div> : null}
    </section>
  );
}

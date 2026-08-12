import type { ActiveCall } from "@/lib/call";
import { formatCallDate, getCallTiming, trackLabels } from "@/lib/call";
import { GENERATED_CODES } from "@/lib/application-shared";
import { Countdown } from "@/components/countdown";

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
  
  const hardcodedGraduateCriteria = [
    "Монгол Улсын иргэн байх;",
    "Дорноговь аймагт 5-аас доошгүй жил оршин суусан байх;",
    "Боловсролын газраас баталсан эрэлттэй, тэргүүлэх мэргэжлийг сонгосон байх;",
    "Магадлан итгэмжлэгдсэн сургалтын хөтөлбөрт элссэн байх;",
    "Элсэлтийн шалгалтын дундаж оноо 600 ба түүнээс дээш байх;",
    "Бүрэн дунд боловсролын үнэлгээний дундаж 80 хувиас доошгүй байх;",
    "Төгсөөд Дорноговь аймагт 5-аас доошгүй жил ажиллах гэрээ байгуулах;",
    "Батлан даагчтай байх;",
    "Амралтын хугацаанд аймагт дадлага хийх;"
  ];

  const hardcodedStudentCriteria = [
    "Монгол Улсын иргэн байх;",
    "Дорноговь аймгийн нутаг дэвсгэрт байнга оршин суугчаар бүртгэлтэй бөгөөд тус аймагт ерөнхий боловсрол эзэмшсэн, эсхүл өмнө нь 5-аас доошгүй жил оршин суусан байх;",
    "Эрэлттэй, тэргүүлэх мэргэжлээр суралцаж байх;",
    "Магадлан итгэмжлэгдсэн сургалтын хөтөлбөрт суралцаж байх;",
    "Голч дүн (GPA) 3.0 ба түүнээс дээш байх;",
    "Ёс зүйн ноцтой зөрчил гаргаж байгаагүй байх;",
    "Төгсөөд Дорноговь аймагт 3-аас 5 жил ажиллах гэрээ байгуулах;",
    "Амралтын хугацаанд аймагт дадлага хийх;"
  ];

  const displayCriteria = call.track === "GRADUATE" ? hardcodedGraduateCriteria : hardcodedStudentCriteria;

  const targetDeadline = new Date("2026-08-20T23:59:00+08:00");
  const hasClosed = new Date() > targetDeadline;

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
            {formatCallDate(targetDeadline)}
          </dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2.5">
          <dt className="text-[11px] text-neutral-500">
            {hasClosed ? "Төлөв" : "Үлдсэн хугацаа"}
          </dt>
          <dd
            className={`mt-0.5 font-medium ${
              timing.isUrgent ? "text-brand-orange-dark" : ""
            }`}
          >
            {hasClosed ? "Хаагдсан" : <Countdown targetDate={targetDeadline} />}
          </dd>
        </div>
        <div className="rounded-lg bg-neutral-50 p-2.5">
          <dt className="text-[11px] text-neutral-500">Тэтгэлэг горилогчийн тоо</dt>
          <dd className="mt-0.5 font-medium">{call._count.applications}</dd>
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
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-neutral-900">
          Шалгуур үзүүлэлт
        </h4>
        <ul className="mt-2 space-y-1">
          {displayCriteria.map((criterionLabel, index) => (
            <li
              key={index}
              className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-1 text-[13px] leading-snug last:border-0"
            >
              <span className="text-neutral-700">{criterionLabel}</span>
            </li>
          ))}
        </ul>
      </div>

      {action ? <div className="mt-auto pt-5">{action}</div> : null}
    </section>
  );
}

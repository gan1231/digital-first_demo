import type { ActiveCall } from "@/lib/call";

type CriteriaProps = {
  call: ActiveCall;
};

export function Criteria({ call }: CriteriaProps) {
  const items = [
    call.minExamScore
      ? {
          label: "ЭЕШ-ын дундаж",
          value: `${call.minExamScore}-аас дээш`,
        }
      : null,
    call.minGpa
      ? {
          label: "Голч дүн",
          value: `${call.minGpa}-аас дээш`,
        }
      : null,
    call.requiredAimag
      ? {
          label: "Харьяалал",
          value: `${call.requiredAimag} аймаг`,
        }
      : null,
  ].filter((item) => item !== null);

  if (items.length === 0) {
    return null;
  }

  return (
    <section id="shaardlaga" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="text-lg font-medium text-neutral-900">
        Тавигдах шаардлага
      </h2>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-neutral-200 p-3.5"
          >
            <dt className="text-xs text-neutral-500">{item.label}</dt>
            <dd className="mt-1 text-lg font-medium text-neutral-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

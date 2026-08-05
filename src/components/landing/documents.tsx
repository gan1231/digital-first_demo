import type { DocumentRequirement } from "@prisma/client";
import { AwardIcon, FileTextIcon } from "@/components/icons";

type DocumentsProps = {
  requirements: DocumentRequirement[];
};

export function Documents({ requirements }: DocumentsProps) {
  const required = requirements.filter((item) => item.isRequired);
  const optional = requirements.filter((item) => !item.isRequired);

  return (
    <section
      id="material"
      className="border-y border-neutral-200 bg-neutral-50 py-10"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-lg font-medium text-neutral-900">
          Бүрдүүлэх материал
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          {required.length} бичиг заавал
          {optional.length > 0 ? `, ${optional.length} нь сонголтоор` : ""}
        </p>

        <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {required.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-lg bg-white p-3"
            >
              <FileTextIcon className="mt-0.5 size-4 shrink-0 text-brand-blue" />
              <span>
                <span className="block text-[13px] leading-snug text-neutral-900">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </li>
          ))}

          {optional.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 rounded-lg border border-dashed border-neutral-300 bg-white p-3 md:col-span-2"
            >
              <AwardIcon className="mt-0.5 size-4 shrink-0 text-brand-orange" />
              <span className="flex-1">
                <span className="block text-[13px] leading-snug text-neutral-900">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
                    {item.description}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 rounded-full bg-brand-sand px-2.5 py-0.5 text-[11px] text-amber-800">
                сонголтоор
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

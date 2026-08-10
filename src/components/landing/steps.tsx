import {
  FormIcon,
  MailCheckIcon,
  PaperclipIcon,
  UserPlusIcon,
} from "@/components/icons";

const steps = [
  {
    icon: FormIcon,
    title: "1. Анкет бөглөх",
    text: "Тэтгэлэг горилогчийн анкетыг онлайнаар бөглөнө",
    tone: "text-brand-blue",
  },
  {
    icon: UserPlusIcon,
    title: "2. Бүртгэл үүсгэх",
    text: "И-мэйл хаяг тань нэвтрэх нэр болно",
    tone: "text-brand-blue",
  },
  {
    icon: PaperclipIcon,
    title: "3. Материал хавсаргах",
    text: "PDF эсвэл зураг хуулна",
    tone: "text-brand-orange",
  },
  {
    icon: MailCheckIcon,
    title: "4. Хариу авах",
    text: "Шийдвэр и-мэйлээр ирнэ",
    tone: "text-brand-orange",
  },
];

export function Steps() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h2 className="text-lg font-medium text-neutral-900">Хэрхэн оролцох вэ</h2>

      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.title} className="rounded-lg bg-neutral-50 p-4">
            <step.icon className={`size-5 ${step.tone}`} />
            <p className="mt-2 text-sm font-medium text-neutral-900">
              {step.title}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-600">
              {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

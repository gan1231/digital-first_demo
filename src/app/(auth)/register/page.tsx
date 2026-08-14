import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatCallDate, getActiveCalls, getCallTiming, trackLabels } from "@/lib/call";
import { Alert } from "@/components/ui";
import { RegisterForm, type CallOption } from "./register-form";

export const metadata: Metadata = { title: "Тэтгэлэг горилогчийн анкет" };

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const calls: CallOption[] = (await getActiveCalls()).map((call) => ({
    id: call.id,
    name: call.name,
    track: call.track,
    trackLabel: trackLabels[call.track],
    closesLabel: formatCallDate(call.closesAt),
    isOpen: getCallTiming(call).isOpen,
  }));

  const anyOpen = calls.some((call) => call.isOpen);

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-8">
        <div className="rounded-xl border border-neutral-200 bg-white p-6">
          <h1 className="text-xl font-medium text-neutral-900">
            Тэтгэлэг горилогчийн анкет
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Анкетаа бөглөж дуусахад бүртгэл автоматаар үүснэ — цахим шуудангийн
            хаяг тань нэвтрэх нэр болно.
          </p>

          {anyOpen ? (
            <div className="mt-6">
              <RegisterForm calls={calls} />
            </div>
          ) : (
            <div className="mt-5">
              <Alert tone="warning" title="Идэвхтэй тэтгэлгийн зарлал алга">
                Одоогоор өргөдөл хүлээн авах нээлттэй зарлал байхгүй байна. Зарлал
                нээгдэх үед энэ хуудсаар бүртгүүлнэ.
              </Alert>
            </div>
          )}

          <p className="mt-5 text-center text-sm text-neutral-600">
            Бүртгэлтэй юу?{" "}
            <Link href="/login" className="text-brand-blue hover:underline">
              Нэвтрэх
            </Link>
          </p>
        </div>
      </div>
      <div className="mt-8 lg:col-span-4 lg:mt-0">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-neutral-900 mb-4">САНАМЖ</h3>
          <ul className="space-y-3 text-sm text-neutral-700">
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 text-brand-blue">➤</span>
              <span>Өөрийн ашигладаг цахим хаягаар бүртгүүлэх</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 text-brand-blue">➤</span>
              <span>Мэдээллээ нэг удаа үнэн, зөв бөглөнө.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 text-brand-blue">➤</span>
              <span>Мэдээллээ илгээсэн тохиолдолд засварлах боломжгүй.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 text-brand-blue">➤</span>
              <span>Худал мэдээлэл ирүүлсэн тохиолдолд тэтгэлэгт хамрагдах боломжгүй</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 text-brand-blue">➤</span>
              <span>Хавсаргах материалыг чанартай, харагдахуйц тод оруулах</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 flex-shrink-0 text-brand-orange">➤</span>
              <span className="font-medium text-brand-orange">Материал бүрдүүлэх болон системтэй холбоотой тусламж хэрэгтэй бол 90090826 дугаарт холбогдоно уу.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

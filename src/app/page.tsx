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
              <a
                href="/havsralt.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-brand-blue bg-white px-6 py-2.5 text-brand-blue transition-colors hover:bg-brand-blue/5"
              >
                Эрэлттэй мэргэжлийн жагсаалт харах
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

      <section className="bg-white py-14 border-t border-neutral-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-xl font-medium text-neutral-900 mb-8 text-center uppercase">
            Түгээмэл асуулт, хариулт
          </h2>
          <div className="space-y-4">
            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                1. Хэн тэтгэлэгт хамрагдах боломжтой вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                <ul className="list-disc space-y-1">
                  <li>Их сургуульд суралцаж буй оюутан, ерөнхий боловсролын сургууль болон мэргэжлийн болон техникийн боловсролын сургалтын байгууллагын төгсөгчид хамрагдах боломжтой.</li>
                  <li>Монгол Улсын иргэн, Дорноговь аймагт бүртгэлтэй (сүүлийн 5-аас доошгүй жил оршин суусан байх шаардлагатай)</li>
                </ul>
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                2. Ямар шалгуурыг хангасан суралцагч тэтгэлэгт хамрагдах боломжтой вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                <p className="font-medium text-neutral-800 mb-1">Ерөнхий боловсролын сургууль болон мэргэжлийн болон техникийн боловсролын сургалтын байгууллагын төгсөгч:</p>
                <ul className="list-disc space-y-1 mb-3">
                  <li>Их сургуульд элсэн орсон элсэлтийн шалгалтын оноо 620 болон түүнээс дээш байх</li>
                  <li>Бүрэн дунд боловсролын үнэлгээний дундаж 80 хувиас доошгүй байх</li>
                  <li>Аймгийн баталсан эрэлттэй, тэргүүлэх мэргэжлийг сонгож их сургуульд суралцах эрхийн бичгээ тухайн элссэн сургуулиасаа авсан байх</li>
                  <li>Тухайн элссэн сургуулийн сургалтын хөтөлбөр нь магадлан итгэмжлэгдсэн байх</li>
                  <li>Эцэг эх, асран хамгаалагч нь батлан даагчийн хүсэлт гаргасан байх</li>
                </ul>
                <p className="font-medium text-neutral-800 mb-1">Их сургуульд суралцаж буй оюутан:</p>
                <ul className="list-disc space-y-1">
                  <li>Тухайн улирлын голч дүн (GPA) 3.2 ба түүнээс дээш байх;</li>
                  <li>Их сургуульд суралцаж байх хугацаанд ёс зүйн ноцтой зөрчил гаргаагүй байх;</li>
                  <li>Аймгийн баталсан эрэлттэй, тэргүүлэх мэргэжлийг сонгож их сургуульд суралцах эрхийн бичгээ тухайн элссэн сургуулиасаа авсан байх</li>
                  <li>Тухайн элссэн сургуулийн сургалтын хөтөлбөр нь магадлан итгэмжлэгдсэн байх</li>
                  <li>Эцэг эх, асран хамгаалагч нь батлан даагчийн хүсэлт гаргасан байх</li>
                  <li>Оюутан нь эзэмшиж буй мэргэжлийн дагуу улирал, зуны амралтын хугацаанд орон нутагтаа дадлага хийх</li>
                </ul>
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                3. Тэтгэлгийг хэдий хугацаанд олгох вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                Суралцаж байх хугацаандаа гэрээгээр хүлээсэн үүргээ зөрчөөгүй тохиолдолд тэтгэлгийг төгсөх хүртэлх хугацаанд бүрэн олгоно. Жишээбэл: 1 дүгээр курсээс тэтгэлэгт хамрагдсан бол төгсөх хүртэл тэтгэлэгт хамрагдана.
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                4. Тэтгэлгийг хэрхэн олгох вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                Тэтгэлэг олгогч тухайн сургуулийн сургалтын төлбөрийн нэхэмжлэлийн дагуу жилд 1 удаа сургалтын байгууллагын дансанд 100% бүрэн байршуулна.
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                5. Ямар нөхцөлд тэтгэлгийг түдгэлзүүлэх вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                Сургуулиас хасагдсан, голч дүн шаардлага хангаагүй, худал мэдээлэл өгсөн, ёс зүйн ноцтой зөрчил гаргасан, гэрээний үүргээ биелүүлээгүй болон журманд заасан бусад заалтуудыг зөрчсөн тохиолдолд тэтгэлгийг зогсооно.
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                6. Нэг айлаас хэдэн хүүхэд хамрагдах боломжтой вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                Журмын дагуу шалгуур хангасан тохиолдолд нэг айлаас 2 хүртэл хүүхэд хамрагдах боломжтой.
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                7. Батлан даагч гэж хэн бэ, ямар үүрэгтэй вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                Батлан даагч нь хүсэлт гаргаснаар тэтгэлэгт хамрагдагчийн гэрээний биелэлтийг хамтран хариуцаж гэрээ зөрчсөн тохиолдолд сургалтын төлбөрийг нөхөн төлнө. /Батлан даагч нь эцэг эх, асран хамгаалагч, төрсөн ах, эгч болно/
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                8. Сонгон шалгаруулалтын явц яаж явагдах вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                Хүсэлтийг цахимаар хүлээн авч, материалыг хиймэл оюунд суурилан сонгон шалгаруулалт явуулна. Эхний шатанд материал тэнцсэн суралцагчидтай ярилцлага зохион байгуулж, сонгон шалгаруулалтын үр дүнг нээлттэй мэдээлнэ.
              </div>
            </details>

            <details className="group rounded-lg border border-neutral-200 bg-neutral-50 p-4 open:bg-white">
              <summary className="cursor-pointer font-medium text-neutral-900">
                9. Төгсөөд хэдий хэр хугацаанд аймагт ажиллах ёстой вэ?
              </summary>
              <div className="mt-3 text-sm text-neutral-600 pl-5">
                Ерөнхий боловсролын төгсөгчид 5-аас доошгүй жил, их сургуулийн оюутнууд 3-аас доошгүй жил ажиллана.
              </div>
            </details>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

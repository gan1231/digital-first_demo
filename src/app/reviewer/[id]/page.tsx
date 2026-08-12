import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CallTrack, Role, ReviewSection } from "@prisma/client";
import { requireRole, writeAudit } from "@/lib/auth";
import { TARGET_GROUP_LABELS } from "@/lib/anket";
import { GENERATED_CODES } from "@/lib/application-shared";
import { essayToHtml } from "@/lib/essay";
import { trackLabels } from "@/lib/call";
import { prisma } from "@/lib/prisma";
import { calculateTotalScore, suggestScore } from "@/lib/scoring";
import { Alert, Card, StatusBadge, essayProseClass } from "@/components/ui";
import { DocumentPreview } from "@/components/ui/document-preview";
import { saveEvaluation } from "../actions";
import { ScoringForm, type CriterionView } from "./scoring-form";
import { SECTION_LABELS } from "@/lib/sections";

export const metadata: Metadata = { title: "Өргөдөл үнэлэх" };
export const dynamic = "force-dynamic";

type SearchParams = {
  section?: string;
};

export default async function ApplicationReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);
  const { id } = await params;
  const { section: sectionParam } = await searchParams;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true } },
      documents: true,
      decision: true,
      evaluations: {
        include: { reviewer: { select: { id: true, name: true } } },
      },
      call: {
        include: {
          criteria: { orderBy: { sortOrder: "asc" } },
          requirements: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!application) notFound();

  await writeAudit({
    actorId: user.id,
    action: "application.view",
    targetType: "Application",
    targetId: application.id,
  });

  const { average } = calculateTotalScore(
    application.evaluations,
    application.call.criteria,
    application,
  );

  const allApplications = await prisma.application.findMany({
    where: { callId: application.callId, status: { not: "DRAFT" } },
    select: { id: true, evaluations: { select: { reviewerId: true, createdAt: true } } },
    orderBy: { createdAt: "asc" }
  });

  const totalCount = allApplications.length;
  let evaluatedCount = 0;
  
  const ids = allApplications.map(a => {
    const isEvaluated = a.evaluations.some(e => e.reviewerId === user.id);
    if (isEvaluated) evaluatedCount++;
    return a.id;
  });

  const currentIndex = ids.indexOf(id);
  const prevId = currentIndex > 0 ? ids[currentIndex - 1] : null;
  const nextId = currentIndex < ids.length - 1 ? ids[currentIndex + 1] : null;
  const unevaluatedCount = totalCount - evaluatedCount;

  const assignedSections =
    user.role === Role.ADMIN
      ? Object.values(ReviewSection)
      : user.assignedSections;

  const activeSection = (
    assignedSections.includes(sectionParam as ReviewSection)
      ? sectionParam
      : assignedSections[0]
  ) as ReviewSection;

  if (!activeSection) {
    return (
      <Alert tone="warning">
        Танд шалгах хэсэг хуваарилагдаагүй байна. Админд хандана уу.
      </Alert>
    );
  }

  // Active Section-д харгалзах шалгууруудыг бэлтгэх
  let activeCriteriaCodes: string[] = [];
  const fakeCriteriaMap: Record<string, CriterionView> = {};

  if (activeSection === ReviewSection.GUARANTOR) {
    activeCriteriaCodes = ["GUARANTOR_VERIFY"];
    const ev = application.evaluations.find(e => e.criterionCode === "GUARANTOR_VERIFY");
    fakeCriteriaMap["GUARANTOR_VERIFY"] = {
      code: "GUARANTOR_VERIFY",
      label: "Батлан даагчийн мэдээлэл",
      description: "Анкет болон батлан даалтын гэрээг тулгаж шалгана.",
      maxScore: 0,
      suggested: null,
      score: null,
      status: (ev?.status as any) ?? undefined,
      comment: ev?.comment ?? "",
      isStatusOnly: true,
      verifiedBy: ev ? ev.reviewer.name : undefined,
      verifiedAt: ev ? ev.createdAt.toLocaleString("mn-MN") : undefined,
    };
  } else if (activeSection === ReviewSection.APPLICATION_INFO) {
    activeCriteriaCodes = ["APP_INFO_VERIFY"];
    const ev = application.evaluations.find(e => e.criterionCode === "APP_INFO_VERIFY");
    fakeCriteriaMap["APP_INFO_VERIFY"] = {
      code: "APP_INFO_VERIFY",
      label: "Анкетны мэдээлэл",
      description: "Оршин суугаа газрын лавлагаа болон бусад мэдээлэл.",
      maxScore: 0,
      suggested: null,
      score: null,
      status: (ev?.status as any) ?? undefined,
      comment: ev?.comment ?? "",
      isStatusOnly: true,
      verifiedBy: ev ? ev.reviewer.name : undefined,
      verifiedAt: ev ? ev.createdAt.toLocaleString("mn-MN") : undefined,
    };
  } else if (activeSection === ReviewSection.ACADEMIC) {
    activeCriteriaCodes = ["EXAM_SCORE", "GPA", "UNIVERSITY_GPA", "G_CRIT_2", "G_CRIT_3", "S_CRIT_2"];
  } else if (activeSection === ReviewSection.SCHOOL) {
    activeCriteriaCodes = ["MAJOR_FIT", "G_CRIT_1", "S_CRIT_1"];
  } else if (activeSection === ReviewSection.ESSAY) {
    activeCriteriaCodes = ["ESSAY", "G_CRIT_5", "S_CRIT_4"];
  } else if (activeSection === ReviewSection.SOCIAL) {
    activeCriteriaCodes = ["SOCIAL", "G_CRIT_4", "S_CRIT_3"];
  }

  const activeCriteriaViews: CriterionView[] = [];
  
  for (const code of activeCriteriaCodes) {
    if (fakeCriteriaMap[code]) {
      activeCriteriaViews.push(fakeCriteriaMap[code]);
    } else {
      const dbCriterion = application.call.criteria.find((c) => c.code === code);
      if (dbCriterion) {
        const ev = application.evaluations.find(e => e.criterionCode === code);
        activeCriteriaViews.push({
          code: dbCriterion.code,
          label: dbCriterion.label,
          description: dbCriterion.description,
          maxScore: dbCriterion.maxScore,
          suggested: suggestScore(dbCriterion, application),
          score: ev?.score ?? null,
          status: (ev?.status as any) ?? undefined,
          comment: ev?.comment ?? "",
          isStatusOnly: ["ESSAY", "G_CRIT_5", "S_CRIT_4", "SOCIAL", "G_CRIT_4", "S_CRIT_3"].includes(code) ? false : true,
          verifiedBy: ev ? ev.reviewer.name : undefined,
          verifiedAt: ev ? ev.createdAt.toLocaleString("mn-MN") : undefined,
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <nav className="flex flex-col gap-1 rounded-xl bg-white p-3 shadow-sm border border-neutral-200">
          <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Шалгах хэсгүүд
          </h2>
          {Object.entries(SECTION_LABELS).map(([sectionKey, label]) => {
            const isAssigned = assignedSections.includes(sectionKey as ReviewSection);
            const isActive = activeSection === sectionKey;
            
            if (!isAssigned) {
              return (
                <div
                  key={sectionKey}
                  className="px-3 py-2 text-sm text-neutral-400 cursor-not-allowed"
                >
                  {label}
                </div>
              );
            }
            
            return (
              <Link
                key={sectionKey}
                href={`/reviewer/${application.id}?section=${sectionKey}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        
        {user.role === Role.ADMIN && (
          <div className="mt-4 rounded-xl bg-white p-4 shadow-sm border border-neutral-200">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Үнэлгээ хийсэн гишүүд
            </h2>
            <div className="space-y-3">
              {application.evaluations.length > 0 ? (
                (() => {
                  const grouped: Record<string, { name: string, count: number }> = {};
                  application.evaluations.forEach(ev => {
                    if (!grouped[ev.reviewerId]) {
                      grouped[ev.reviewerId] = { name: ev.reviewer.name, count: 0 };
                    }
                    grouped[ev.reviewerId].count++;
                  });
                  return Object.values(grouped).map((g, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-medium text-neutral-900">{g.name}</div>
                      <div className="text-xs text-neutral-500">
                        {g.count} шалгуур баталгаажуулсан
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <div className="text-sm text-neutral-500">Үнэлгээ хийгдээгүй</div>
              )}
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 space-y-4 min-w-0">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">
                {(() => {
                  const d = application.submittedAt || application.createdAt;
                  return `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}${d.getHours().toString().padStart(2, "0")}${d.getMinutes().toString().padStart(2, "0")}${d.getSeconds().toString().padStart(2, "0")}`;
                })()}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-600">
                {application.registerNo} · {application.soum} сум ·{" "}
                {application.user.email}
              </p>
            </div>
            <div className="text-right">
              <StatusBadge status={application.status} />
              <p className="mt-1 text-xs text-neutral-500">
                {trackLabels[application.call.track]}
              </p>
              <p className="text-xs text-neutral-500">
                Нийт дундаж оноо: {average ?? "—"}
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center justify-between border-t border-neutral-200 pt-4">
            <div className="flex gap-2">
              <Link
                href={prevId ? `/reviewer/${prevId}?section=${activeSection}` : "#"}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
                  prevId
                    ? "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    : "border-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
                aria-disabled={!prevId}
              >
                &larr; Өмнөх
              </Link>
              <Link
                href={nextId ? `/reviewer/${nextId}?section=${activeSection}` : "#"}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium border ${
                  nextId
                    ? "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    : "border-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
                aria-disabled={!nextId}
              >
                Дараагийн &rarr;
              </Link>
            </div>
            <div className="text-sm font-medium text-neutral-700">
              Нийт: {totalCount} | Үнэлсэн: {evaluatedCount} | Үлдсэн: {unevaluatedCount}
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            {activeSection === ReviewSection.GUARANTOR && (
              <Card title="Батлан даагчийн мэдээлэл">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
                  <Item label="Овог, нэр" value={application.guarantorName} />
                  <Item label="Регистр" value={application.guarantorRegisterNo} />
                  <Item label="Утас" value={application.guarantorPhone} />
                  <Item label="Таны хэн болох" value={application.guarantorRelation} />
                  <Item label="Гэрийн хаяг" value={application.guarantorAddress} className="sm:col-span-2" />
                  <Item label="Ажлын газар" value={application.guarantorWorkplace} className="sm:col-span-2" />
                </dl>
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <DocumentList application={application} reqCodes={["G_REQ_1", "S_REQ_1"]} />
                </div>
              </Card>
            )}

            {activeSection === ReviewSection.APPLICATION_INFO && (
              <Card title="Анкетны мэдээлэл">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
                  <Item label="Ургийн овог" value={application.clanName} />
                  <Item label="Төрсөн огноо" value={application.birthDate?.toLocaleDateString("mn-MN")} />
                  <Item label="Үндэс, угсаа" value={application.ethnicity} />
                  <Item label="Төрсөн газар" value={`${application.birthAimag}, ${application.birthSoum ?? ""}`} />
                  <Item label="Иргэний харьяалал" value={application.citizenship} />
                  <Item label="Утас 1" value={application.phone} />
                  <Item label="Утас 2" value={application.phone2} />
                  <Item label="Яаралтай холбогдох" value={application.contactName ? `${application.contactName} (${application.contactRelation}) - ${application.contactPhone}` : null} className="sm:col-span-2" />
                  <Item label="Хаяг" value={application.address} className="sm:col-span-2" />
                  <Item label="Зорилтот бүлэг" value={application.isTargetGroup ? application.targetGroupTypes.map(t => TARGET_GROUP_LABELS[t]).join(", ") + " (" + (application.targetGroupNote||"") + ")" : "Үгүй"} className="sm:col-span-2" />
                </dl>
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <DocumentList application={application} reqCodes={["G_REQ_2", "S_REQ_6", "S_REQ_2"]} />
                </div>
              </Card>
            )}

            {activeSection === ReviewSection.ACADEMIC && (
              <Card title="Сурлагын үзүүлэлтийн мэдээлэл">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
                  {application.call.track === CallTrack.GRADUATE ? (
                    <>
                      <Item label="ЭЕШ-ын оноо" value={application.examScore?.toString()} />
                      <Item label="Бүрэн дунд GPA" value={application.gpa?.toString()} />
                    </>
                  ) : (
                    <>
                      <Item label="Голч дүн (GPA)" value={application.universityGpa?.toFixed(2)} />
                    </>
                  )}
                  <Item label="Төгссөн он" value={application.graduationYear?.toString()} />
                  <Item label="Төгссөн сургууль" value={application.school} className="sm:col-span-2" />
                </dl>
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <DocumentList application={application} reqCodes={["G_REQ_4", "G_REQ_5", "S_REQ_4"]} />
                </div>
              </Card>
            )}

            {activeSection === ReviewSection.SCHOOL && (
              <Card title="Сургуулийн мэдээлэл">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
                  <Item label="Их сургууль" value={application.university} />
                  <Item label="Мэргэжил" value={application.major} />
                  <Item label="Магадлан итгэмжлэл" value={[application.isSchoolAccredited ? "Сургууль" : null, application.isProgramAccredited ? "Хөтөлбөр" : null].filter(Boolean).join(", ") || "Тэмдэглээгүй"} />
                  <Item label="Мэргэжлийн ангилал" value={[application.isDemandedProfession ? "Эрэлттэй" : null, application.isPriorityProfession ? "Тэргүүлэх" : null].filter(Boolean).join(", ") || "Тэмдэглээгүй"} />
                  <Item label="Суралцах хугацаа" value={application.studyYears ? `${application.studyYears} жил` : null} />
                  <Item label="Сургалтын төлбөр" value={application.tuitionAmount ? `${application.tuitionAmount.toLocaleString("mn-MN")} ₮` : null} />
                </dl>
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <DocumentList application={application} reqCodes={["G_REQ_3", "S_REQ_3", "S_REQ_5"]} />
                </div>
              </Card>
            )}

            {activeSection === ReviewSection.ESSAY && (
              <Card title="Эсээ" description={`${application.essayWordCount ?? 0} үг`}>
                {application.essayText ? (
                  <div
                    className={essayProseClass}
                    dangerouslySetInnerHTML={{
                      __html: essayToHtml(application.essayText),
                    }}
                  />
                ) : (
                  <p className="text-sm text-neutral-600">Эсээ бичээгүй байна.</p>
                )}
                <div className="mt-4 border-t border-neutral-200 pt-4">
                  <DocumentList application={application} reqCodes={["ESSAY_REQ"]} />
                </div>
              </Card>
            )}

            {activeSection === ReviewSection.SOCIAL && (
              <Card title="Нийгмийн оролцоо манлайллын үзүүлэлт">
                <div className="pt-2">
                  <DocumentList application={application} reqCodes={["G_REQ_6", "S_REQ_7"]} />
                </div>
              </Card>
            )}
          </div>
          
          <div>
            <Card>
              <ScoringForm
                action={saveEvaluation.bind(null, application.id)}
                criteria={activeCriteriaViews}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Item({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-900">{value ?? "—"}</dd>
    </div>
  );
}

function DocumentList({ application, reqCodes }: { application: any; reqCodes: string[] }) {
  // Requirement codes mapped roughly to what might be in DB. 
  // We can just filter by keywords or exact codes.
  const reqs = application.call.requirements.filter((r: any) => 
    reqCodes.some(code => r.code.includes(code)) || reqCodes.includes(r.code)
  );

  if (reqs.length === 0) {
    return <p className="text-sm text-neutral-500">Энэ хэсэгт хамаарах баримт бичиг шаардаагүй байна.</p>;
  }

  return (
    <ul className="space-y-2">
      {reqs.map((requirement: any) => {
        const documents = application.documents.filter(
          (document: any) => document.requirementCode === requirement.code,
        );
        const missing = requirement.isRequired && documents.length === 0;

        return (
          <li key={requirement.id} className="flex flex-col gap-1 text-sm">
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  missing
                    ? "bg-red-100 text-red-700"
                    : documents.length > 0
                      ? "bg-green-600 text-white"
                      : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {missing ? "!" : documents.length > 0 ? "✓" : "–"}
              </span>
              <span className="flex-1 font-medium text-neutral-900">
                {requirement.label}
              </span>
            </div>
            {documents.length > 0 && (
              <ul className="ml-6 space-y-3 mt-2">
                {documents.map((doc: any) => (
                  <li key={doc.id} className={doc.eventName ? "rounded-lg border border-neutral-200 p-3 bg-neutral-50/50" : ""}>
                    {doc.eventName && (
                      <div className="mb-2">
                        <div className="text-sm font-semibold text-neutral-800">{doc.eventName}</div>
                        {doc.note && <div className="text-xs text-neutral-500 mt-0.5">{doc.note}</div>}
                      </div>
                    )}
                    <DocumentPreview url={`/api/documents/${doc.id}`} fileName={doc.fileName} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallTrack, Role } from "@prisma/client";
import { requireRole, writeAudit } from "@/lib/auth";
import { GENERATED_CODES } from "@/lib/application-shared";
import { trackLabels } from "@/lib/call";
import { prisma } from "@/lib/prisma";
import { averageEvaluations, parseScores, suggestScore } from "@/lib/scoring";
import { Alert, Card, StatusBadge } from "@/components/ui";
import { decide, requestFix, saveEvaluation } from "../actions";
import { DecisionForm, RequestFixForm } from "./decision-form";
import { ScoringForm, type CriterionView } from "./scoring-form";

export const metadata: Metadata = { title: "Өргөдөл үнэлэх" };
export const dynamic = "force-dynamic";

export default async function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(Role.REVIEWER, Role.ADMIN);
  const { id } = await params;

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

  // Хувийн мэдээлэл агуулсан анкет тул хэн үзсэнийг мөрдөнө.
  await writeAudit({
    actorId: user.id,
    action: "application.view",
    targetType: "Application",
    targetId: application.id,
  });

  const myEvaluation = application.evaluations.find(
    (evaluation) => evaluation.reviewerId === user.id,
  );
  const myScores = parseScores(myEvaluation?.scores);

  const criteria: CriterionView[] = application.call.criteria.map(
    (criterion) => ({
      code: criterion.code,
      label: criterion.label,
      description: criterion.description,
      maxScore: criterion.maxScore,
      suggested: suggestScore(criterion, application),
      score: myScores[criterion.code]?.score ?? null,
      comment: myScores[criterion.code]?.comment ?? "",
    }),
  );

  const { average, reviewerCount } = averageEvaluations(
    application.evaluations,
    application.call.criteria,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-medium text-neutral-900">
                {application.lastName} {application.firstName}
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
                Дундаж оноо: {average ?? "—"}{" "}
                {reviewerCount > 0 ? `(${reviewerCount} гишүүн)` : ""}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-200 pt-4 text-sm sm:grid-cols-3">
            <Item label="Утас" value={application.phone} />
            <Item label="Хаяг" value={application.address} />
            <Item
              label="Төрсөн огноо"
              value={application.birthDate?.toLocaleDateString("mn-MN")}
            />
            <Item label="Төгссөн сургууль" value={application.school} />

            {application.call.track === CallTrack.STUDENT ? (
              <>
                <Item
                  label="Суралцаж буй курс"
                  value={
                    application.courseYear
                      ? `${application.courseYear} дугаар курс`
                      : null
                  }
                />
                <Item
                  label="Голч дүн (GPA)"
                  value={application.universityGpa?.toFixed(2)}
                />
              </>
            ) : (
              <>
                <Item
                  label="Төгссөн он"
                  value={application.graduationYear?.toString()}
                />
                <Item
                  label="ЭЕШ-ын дундаж"
                  value={application.examScore?.toString()}
                />
                <Item label="Голч дүн" value={application.gpa?.toString()} />
              </>
            )}

            <Item label="Их сургууль" value={application.university} />
            <Item label="Мэргэжил" value={application.major} />
            <Item
              label="Суралцах хугацаа"
              value={
                application.studyYears ? `${application.studyYears} жил` : null
              }
            />
            <Item
              label="Сургалтын төлбөр"
              value={
                application.tuitionAmount
                  ? `${application.tuitionAmount.toLocaleString("mn-MN")} ₮`
                  : null
              }
            />
            <Item
              label="Илгээсэн"
              value={application.submittedAt?.toLocaleString("mn-MN")}
            />
          </dl>
        </Card>

        <Card
          title="Эссэ"
          description={`${application.essayWordCount ?? 0} үг`}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
            {application.essayText || "Эссэ бичээгүй байна."}
          </p>
        </Card>

        <Card title="Хавсаргасан материал">
          <ul className="space-y-2">
            {application.call.requirements
              .filter(
                (requirement) => !GENERATED_CODES.includes(requirement.code),
              )
              .map((requirement) => {
                const documents = application.documents.filter(
                  (document) => document.requirementCode === requirement.code,
                );
                const missing = requirement.isRequired && documents.length === 0;

                return (
                  <li
                    key={requirement.id}
                    className="flex items-start gap-2.5 text-sm"
                  >
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
                    <span className="flex-1">
                      <span className="block text-neutral-900">
                        {requirement.label}
                      </span>
                      {documents.length > 0 ? (
                        <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {documents.map((document) => (
                            <a
                              key={document.id}
                              href={`/api/documents/${document.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-brand-blue hover:underline"
                            >
                              {document.fileName}
                            </a>
                          ))}
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs text-neutral-500">
                          {missing ? "Хавсаргаагүй" : "Сонголтоор — хавсаргаагүй"}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
          </ul>
        </Card>

        {application.evaluations.length > 0 ? (
          <Card title="Комиссын үнэлгээнүүд">
            <ul className="space-y-2 text-sm">
              {application.evaluations.map((evaluation) => (
                <li
                  key={evaluation.id}
                  className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-2 last:border-0 last:pb-0"
                >
                  <span>
                    {evaluation.reviewer.name}
                    {evaluation.submittedAt ? null : (
                      <span className="ml-1.5 text-xs text-amber-700">
                        ноорог
                      </span>
                    )}
                  </span>
                  <span className="font-medium tabular-nums">
                    {evaluation.total}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card title="Миний үнэлгээ" description="Оноо тус бүрд үндэслэл бичнэ.">
          <ScoringForm
            action={saveEvaluation.bind(null, application.id)}
            criteria={criteria}
            overallComment={myEvaluation?.comment ?? ""}
            submittedAt={
              myEvaluation?.submittedAt?.toLocaleString("mn-MN") ?? null
            }
          />
        </Card>

        <Card title="Засварт буцаах">
          <RequestFixForm action={requestFix.bind(null, application.id)} />
        </Card>

        {user.role === Role.ADMIN ? (
          <Card title="Эцсийн шийдвэр">
            {reviewerCount === 0 ? (
              <Alert tone="warning">
                Баталгаажсан үнэлгээ алга байна. Шийдвэр гаргахаас өмнө комиссын
                гишүүд үнэлгээгээ баталгаажуулсан байх ёстой.
              </Alert>
            ) : null}
            <div className={reviewerCount === 0 ? "mt-3" : ""}>
              <DecisionForm
                action={decide.bind(null, application.id)}
                currentResult={application.decision?.result ?? null}
                currentNote={application.decision?.note ?? ""}
              />
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Item({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-neutral-900">{value || "—"}</dd>
    </div>
  );
}

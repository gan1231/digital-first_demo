import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GENERATED_CODES, getApplicationContext } from "@/lib/application";
import { Alert, Card } from "@/components/ui";
import { Uploader } from "./uploader";

export const metadata: Metadata = { title: "Материал хавсаргах" };

export default async function DocumentsStepPage() {
  const user = await requireUser("/apply/documents");
  const context = await getApplicationContext(user.id);

  if (!context) redirect("/apply/track");

  const { call, application } = context;
  const requirements = call.requirements.filter(
    (requirement) => !GENERATED_CODES.includes(requirement.code),
  );

  return (
    <Card
      title="Материал хавсаргах"
      description="PDF, JPG, PNG. Файл тус бүр 10MB хүртэл."
    >
      <div className="space-y-5">
        {requirements.map((requirement) => {
          const documents = application.documents.filter(
            (document) => document.requirementCode === requirement.code,
          );

          return (
            <div
              key={requirement.id}
              className="border-t border-neutral-200 pt-4 first:border-0 first:pt-0"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {requirement.label}
                    {requirement.isRequired ? (
                      <span className="text-brand-orange"> *</span>
                    ) : null}
                  </p>
                  {requirement.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                      {requirement.description}
                    </p>
                  ) : null}
                </div>
                {!requirement.isRequired ? (
                  <span className="shrink-0 rounded-full bg-brand-sand px-2.5 py-0.5 text-[11px] text-amber-800">
                    сонголтоор
                  </span>
                ) : null}
              </div>

              <Uploader
                requirementCode={requirement.code}
                allowMultiple={requirement.allowMultiple}
                documents={documents.map((document) => ({
                  id: document.id,
                  fileName: document.fileName,
                  size: document.size,
                  requirementCode: document.requirementCode,
                }))}
              />
            </div>
          );
        })}

        <Alert tone="info">
          Анкет болон эссэг систем автоматаар бүрдүүлэх тул тусад нь хавсаргах
          шаардлагагүй.
        </Alert>

        <div className="flex justify-end">
          <Link
            href="/apply/review"
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm text-white transition-colors hover:bg-brand-blue-dark"
          >
            Үргэлжлүүлэх
          </Link>
        </div>
      </div>
    </Card>
  );
}

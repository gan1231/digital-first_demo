import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOrCreateApplication } from "@/lib/application";
import { Card, Field, inputClass } from "@/components/ui";
import { saveStep } from "../actions";
import { StepForm } from "../step-form";

export const metadata: Metadata = { title: "Боловсрол" };

export default async function EducationStepPage() {
  const user = await requireUser("/apply/education");
  const context = await getOrCreateApplication(user.id);
  const application = context?.application;
  const call = context?.call;

  return (
    <Card
      title="Боловсрол"
      description="Оруулсан оноог хавсаргасан баримттай тулган шалгана."
    >
      <StepForm action={saveStep.bind(null, "education")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Төгссөн сургууль"
            htmlFor="school"
            required
            className="sm:col-span-2"
          >
            <input
              id="school"
              name="school"
              required
              defaultValue={application?.school ?? ""}
              className={inputClass}
              placeholder="Сайншанд сумын 1-р сургууль"
            />
          </Field>

          <Field label="Төгссөн он" htmlFor="graduationYear" required>
            <input
              id="graduationYear"
              name="graduationYear"
              type="number"
              inputMode="numeric"
              required
              defaultValue={
                application?.graduationYear ?? new Date().getFullYear()
              }
              className={inputClass}
            />
          </Field>

          <Field
            label="ЭЕШ-ын дундаж оноо"
            htmlFor="examScore"
            required
            hint={
              call?.minExamScore
                ? `${call.minExamScore}-аас дээш байх шаардлагатай (дээд оноо 800)`
                : "0-800 хооронд"
            }
          >
            <input
              id="examScore"
              name="examScore"
              type="number"
              step="0.1"
              required
              defaultValue={application?.examScore ?? ""}
              className={inputClass}
            />
          </Field>

          <Field
            label="Бүрэн дунд боловсролын голч дүн"
            htmlFor="gpa"
            required
            hint={
              call?.minGpa
                ? `${call.minGpa}-аас дээш байх шаардлагатай (дээд нь 100)`
                : "0-100 хооронд"
            }
          >
            <input
              id="gpa"
              name="gpa"
              type="number"
              step="0.01"
              required
              defaultValue={application?.gpa ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </StepForm>
    </Card>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getApplicationContext } from "@/lib/application";
import { Card, Field, inputClass } from "@/components/ui";
import { saveStep } from "../actions";
import { StepForm } from "../step-form";

export const metadata: Metadata = { title: "Мэргэжлийн сонголт" };

export default async function MajorStepPage() {
  const user = await requireUser("/apply/major");
  const context = await getApplicationContext(user.id);

  if (!context) redirect("/apply/track");

  const application = context.application;

  return (
    <Card
      title="Мэргэжлийн сонголт"
      description="Сонгосон мэргэжил нь сумын хүний нөөцийн хэрэгцээнд нийцэж байгаа эсэхийг комисс үнэлнэ."
    >
      <StepForm action={saveStep.bind(null, "major")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Их, дээд сургууль"
            htmlFor="university"
            required
            className="sm:col-span-2"
          >
            <input
              id="university"
              name="university"
              required
              defaultValue={application.university ?? ""}
              className={inputClass}
              placeholder="Монгол Улсын Их Сургууль"
            />
          </Field>

          <Field
            label="Мэргэжил"
            htmlFor="major"
            required
            className="sm:col-span-2"
          >
            <input
              id="major"
              name="major"
              required
              defaultValue={application.major ?? ""}
              className={inputClass}
              placeholder="Багш, математикийн боловсрол"
            />
          </Field>

          <Field label="Суралцах хугацаа (жил)" htmlFor="studyYears" required>
            <input
              id="studyYears"
              name="studyYears"
              type="number"
              required
              defaultValue={application.studyYears ?? 4}
              className={inputClass}
            />
          </Field>

          <Field
            label="Жилийн сургалтын төлбөр (₮)"
            htmlFor="tuitionAmount"
            required
          >
            <input
              id="tuitionAmount"
              name="tuitionAmount"
              type="number"
              required
              defaultValue={application.tuitionAmount ?? ""}
              className={inputClass}
              placeholder="3500000"
            />
          </Field>
        </div>
      </StepForm>
    </Card>
  );
}

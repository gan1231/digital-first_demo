import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CallTrack } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { anketDefaults } from "@/lib/anket";
import { getApplicationContext } from "@/lib/application";
import { AnketSection, ProgramAnketFields } from "@/components/anket-fields";
import { Card, Field, inputClass } from "@/components/ui";
import { saveStep } from "../actions";
import { StepForm } from "../step-form";

export const metadata: Metadata = { title: "Мэргэжлийн сонголт" };

export default async function MajorStepPage() {
  const user = await requireUser("/apply/major");
  const context = await getApplicationContext(user.id);

  if (!context) redirect("/apply/track");

  const { application, call } = context;
  const isStudent = call.track === CallTrack.STUDENT;

  return (
    <Card
      title="Сургууль, мэргэжил"
      description="Анкетын 2, 3 дугаар хэсэг. Сонгосон мэргэжил нь сумын хүний нөөцийн хэрэгцээнд нийцэж байгаа эсэхийг комисс үнэлнэ."
    >
      <StepForm action={saveStep.bind(null, "major")}>
        <div className="space-y-6">
          <ProgramAnketFields defaults={anketDefaults(application)} />

          <AnketSection number="—" title="Сургалтын төлбөр">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Суралцах хугацаа (жил)"
                htmlFor="studyYears"
                required
              >
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
          </AnketSection>

          {isStudent && (
            <AnketSection number="—" title="Голч дүн">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Голч дүн (GPA)"
                  htmlFor="universityGpa"
                  required
                  hint={
                    call.minUniversityGpa
                      ? `${call.minUniversityGpa}-аас дээш байх шаардлагатай (4.0 систем)`
                      : "4.0 систем"
                  }
                >
                  <input
                    id="universityGpa"
                    name="universityGpa"
                    type="number"
                    step="0.01"
                    min={0}
                    max={4}
                    required
                    defaultValue={application.universityGpa ?? ""}
                    className={inputClass}
                    placeholder="3.45"
                  />
                </Field>
              </div>
            </AnketSection>
          )}
        </div>
      </StepForm>
    </Card>
  );
}

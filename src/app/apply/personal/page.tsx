import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getApplicationContext } from "@/lib/application";
import { SOUMS } from "@/lib/soum";
import { Card, Field, inputClass } from "@/components/ui";
import { saveStep } from "../actions";
import { StepForm } from "../step-form";

export const metadata: Metadata = { title: "Хувийн мэдээлэл" };

function isoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function PersonalStepPage() {
  const user = await requireUser("/apply/personal");
  const context = await getApplicationContext(user.id);

  if (!context) redirect("/apply/track");

  const application = context.application;

  return (
    <Card
      title="Хувийн мэдээлэл"
      description="Иргэний үнэмлэх дээрх мэдээлэлтэй тохирч байх ёстой."
    >
      <StepForm action={saveStep.bind(null, "personal")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Овог" htmlFor="lastName" required>
            <input
              id="lastName"
              name="lastName"
              required
              defaultValue={application.lastName ?? ""}
              className={inputClass}
            />
          </Field>

          <Field label="Нэр" htmlFor="firstName" required>
            <input
              id="firstName"
              name="firstName"
              required
              defaultValue={application.firstName ?? ""}
              className={inputClass}
            />
          </Field>

          <Field
            label="Регистрийн дугаар"
            htmlFor="registerNo"
            required
            hint="Жишээ: АБ12345678"
          >
            <input
              id="registerNo"
              name="registerNo"
              required
              defaultValue={application.registerNo ?? ""}
              className={inputClass}
            />
          </Field>

          <Field label="Төрсөн огноо" htmlFor="birthDate" required>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              defaultValue={isoDate(application.birthDate ?? null)}
              className={inputClass}
            />
          </Field>

          <Field label="Хүйс" htmlFor="gender" required>
            <select
              id="gender"
              name="gender"
              required
              defaultValue={application.gender ?? ""}
              className={inputClass}
            >
              <option value="" disabled>
                Сонгоно уу
              </option>
              <option value="MALE">Эрэгтэй</option>
              <option value="FEMALE">Эмэгтэй</option>
            </select>
          </Field>

          <Field label="Утасны дугаар" htmlFor="phone" required>
            <input
              id="phone"
              name="phone"
              inputMode="numeric"
              required
              defaultValue={application.phone ?? user.phone ?? ""}
              className={inputClass}
            />
          </Field>

          <Field label="Сум" htmlFor="soum" required>
            <select
              id="soum"
              name="soum"
              required
              defaultValue={application.soum ?? ""}
              className={inputClass}
            >
              <option value="" disabled>
                Сонгоно уу
              </option>
              {SOUMS.map((soum) => (
                <option key={soum} value={soum}>
                  {soum}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Хаяг" htmlFor="address" required>
            <input
              id="address"
              name="address"
              required
              defaultValue={application.address ?? ""}
              className={inputClass}
              placeholder="1-р баг, 5-р байр"
            />
          </Field>
        </div>
      </StepForm>
    </Card>
  );
}

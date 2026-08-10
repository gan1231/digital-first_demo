import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { anketDefaults } from "@/lib/anket";
import { getApplicationContext } from "@/lib/application";
import { PersonalAnketFields } from "@/components/anket-fields";
import { Card, Field, inputClass } from "@/components/ui";
import { saveStep } from "../actions";
import { StepForm } from "../step-form";

export const metadata: Metadata = { title: "Хувийн мэдээлэл" };

export default async function PersonalStepPage() {
  const user = await requireUser("/apply/personal");
  const context = await getApplicationContext(user.id);

  if (!context) redirect("/apply/track");

  return (
    <Card
      title="Хувийн мэдээлэл"
      description="Бүртгүүлэхдээ бөглөсөн анкетын 1 дүгээр хэсэг. Иргэний үнэмлэх дээрх мэдээлэлтэй тохирч байх ёстой."
    >
      <StepForm action={saveStep.bind(null, "personal")}>
        <div className="space-y-6">
          <PersonalAnketFields
            defaults={anketDefaults(context.application)}
            emailSlot={
              <Field
                label="Цахим шуудангийн хаяг"
                hint="Таны нэвтрэх нэр. Шийдвэрийг энэ хаягаар мэдэгдэнэ."
              >
                <input
                  type="email"
                  readOnly
                  defaultValue={user.email}
                  className={`${inputClass} bg-neutral-50 text-neutral-600`}
                />
              </Field>
            }
          />
        </div>
      </StepForm>
    </Card>
  );
}

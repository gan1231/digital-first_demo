import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getApplicationContext, EDITABLE_STATUSES } from "@/lib/application";
import { essayToHtml } from "@/lib/essay";
import { Card } from "@/components/ui";
import { saveStep } from "../actions";
import { StepForm } from "../step-form";
import { EssayField } from "./essay-field";

export const metadata: Metadata = { title: "Эсээ" };

export default async function EssayStepPage() {
  const user = await requireUser("/apply/essay");
  const context = await getApplicationContext(user.id);

  if (!context) redirect("/apply/track");

  return (
    <Card
      title="Эсээ"
      description="500–1000 үгтэй байх ёстой. Түр хадгалаад дараа үргэлжлүүлж болно."
    >
      <StepForm action={saveStep.bind(null, "essay")} isEditable={EDITABLE_STATUSES.includes(context.application.status)}>
        <EssayField
          defaultValue={
            context.application.essayText
              ? essayToHtml(context.application.essayText)
              : ""
          }
          readOnly={!EDITABLE_STATUSES.includes(context.application.status)}
        />
      </StepForm>
    </Card>
  );
}

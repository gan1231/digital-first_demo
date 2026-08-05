import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOrCreateApplication } from "@/lib/application";
import { Card } from "@/components/ui";
import { saveStep } from "../actions";
import { StepForm } from "../step-form";
import { EssayField } from "./essay-field";

export const metadata: Metadata = { title: "Эссэ" };

export default async function EssayStepPage() {
  const user = await requireUser("/apply/essay");
  const context = await getOrCreateApplication(user.id);

  return (
    <Card
      title="Эссэ"
      description="500–1000 үгтэй байх ёстой. Түр хадгалаад дараа үргэлжлүүлж болно."
    >
      <StepForm action={saveStep.bind(null, "essay")}>
        <EssayField defaultValue={context?.application.essayText ?? ""} />
      </StepForm>
    </Card>
  );
}

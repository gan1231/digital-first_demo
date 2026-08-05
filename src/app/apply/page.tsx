import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCompleteness, getOrCreateApplication } from "@/lib/application";

/** Дуусаагүй эхний алхам руу чиглүүлнэ. */
export default async function ApplyIndexPage() {
  const user = await requireUser("/apply");
  const context = await getOrCreateApplication(user.id);

  if (!context) {
    redirect("/dashboard");
  }

  const steps = getCompleteness(context.application, context.call);
  const firstIncomplete = steps.find((step) => !step.isComplete);

  redirect(`/apply/${firstIncomplete?.slug ?? "review"}`);
}

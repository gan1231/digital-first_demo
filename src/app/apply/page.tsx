import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getApplicationContext, getCompleteness } from "@/lib/application";

/** Төрөл сонгоогүй бол сонгуулна, эс бөгөөс дуусаагүй эхний алхам руу. */
export default async function ApplyIndexPage() {
  const user = await requireUser("/apply");
  const context = await getApplicationContext(user.id);

  if (!context) {
    redirect("/apply/track");
  }

  const steps = getCompleteness(context.application, context.call);
  const firstIncomplete = steps.find((step) => !step.isComplete);

  redirect(`/apply/${firstIncomplete?.slug ?? "review"}`);
}

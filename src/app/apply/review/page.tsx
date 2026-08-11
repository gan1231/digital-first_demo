import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getBlockingProblems,
  getCompleteness,
  getApplicationContext,
  EDITABLE_STATUSES,
} from "@/lib/application";
import { formatCallDate, getCallTiming } from "@/lib/call";
import { Alert, Card } from "@/components/ui";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = { title: "Илгээх" };

export default async function ReviewStepPage() {
  const user = await requireUser("/apply/review");
  const context = await getApplicationContext(user.id);

  if (!context) redirect("/apply/track");

  const { call, application } = context;
  const steps = getCompleteness(application, call);
  const problems = getBlockingProblems(steps);
  const timing = getCallTiming(call);
  const isEditable = EDITABLE_STATUSES.includes(application.status);

  const blocked = problems.length > 0 || !timing.isOpen;

  return (
    <div className="space-y-4">
      <Card
        title={isEditable ? "Илгээхийн өмнө" : "Бүрдэл"}
        description={`Хүлээн авах эцсийн хугацаа: ${formatCallDate(call.closesAt)}`}
      >
        <ul className="space-y-2">
          {steps.map((step) => (
            <li
              key={step.slug}
              className="flex items-start gap-2.5 text-sm"
            >
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  step.isComplete
                    ? "bg-green-600 text-white"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {step.isComplete ? "✓" : "!"}
              </span>
              <span className="flex-1">
                <Link
                  href={`/apply/${step.slug}`}
                  className="text-neutral-900 hover:underline"
                >
                  {step.label}
                </Link>
                {step.problems.map((problem) => (
                  <span
                    key={problem}
                    className="mt-0.5 block text-xs text-red-700"
                  >
                    {problem}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {!timing.isOpen && isEditable ? (
        <Alert tone="danger" title="Хүлээн авах хугацаа дууссан">
          Энэ жилийн өргөдөл хүлээн авах хугацаа дууссан байна.
        </Alert>
      ) : null}

      <Card>
        {isEditable ? (
          <SubmitForm disabled={blocked} />
        ) : (
          <Alert tone="info">Энэ өргөдөл илгээгдсэн тул өөрчлөлт оруулах боломжгүй.</Alert>
        )}
      </Card>
    </div>
  );
}

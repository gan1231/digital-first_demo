import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getApplicationContext } from "@/lib/application";
import { getActiveCalls, getCallTiming } from "@/lib/call";
import { CallSummary } from "@/components/call-summary";
import { Alert } from "@/components/ui";
import { TrackPicker } from "./track-picker";

export const metadata: Metadata = { title: "Тэтгэлгийн төрөл сонгох" };

export default async function TrackPage() {
  const user = await requireUser("/apply/track");

  if (await getApplicationContext(user.id)) {
    redirect("/apply");
  }

  const calls = await getActiveCalls();

  if (calls.length === 0) {
    return (
      <Alert tone="warning" title="Идэвхтэй тэтгэлгийн зарлал алга">
        Одоогоор нээлттэй тэтгэлэг байхгүй байна.
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-medium text-neutral-900">
          Тэтгэлгийн төрлөө сонгоно уу
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Нэг хүн нэг л төрөлд өргөдөл гаргана. Сонгосныхоо дараа анкетаа
          бөглөнө.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {calls.map((call) => (
          <CallSummary
            key={call.id}
            call={call}
            action={
              <TrackPicker
                callId={call.id}
                disabled={!getCallTiming(call).isOpen}
              />
            }
          />
        ))}
      </div>
    </div>
  );
}

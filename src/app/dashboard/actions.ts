"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { resendVerification } from "@/app/(auth)/actions";

export async function resendVerificationEmail(): Promise<void> {
  const user = await requireUser("/dashboard");
  await resendVerification(user.id);
  revalidatePath("/dashboard");
}

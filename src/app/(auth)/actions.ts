"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { anketSchema, credentialsSchema, toApplicationData } from "@/lib/anket";
import {
  createSession,
  createVerificationToken,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { getActiveCalls, getCallTiming } from "@/lib/call";
import { sendEmail } from "@/lib/email";

/**
 * `values` нь алдаа гарсан үед бөглөсөн талбарыг буцааж өгнө. React нь form
 * action дуусахад uncontrolled input-уудыг цэвэрлэдэг тул 30 гаруй талбартай
 * анкетад энэ заавал хэрэгтэй. Нууц үг хэзээ ч буцаж явахгүй.
 */
export type FormState =
  | { error?: string; values?: Record<string, string | string[]> }
  | undefined;

const SECRET_FIELDS = ["password", "passwordConfirm"];

/** Илгээсэн утгыг формд буцааж дүүргэхэд тохирох хэлбэрт хөрвүүлнэ. */
function echoValues(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || SECRET_FIELDS.includes(key)) continue;

    const existing = values[key];
    if (existing === undefined) {
      values[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      values[key] = [existing, value];
    }
  }

  return values;
}

/**
 * Бүртгэл нь анкет өөрөө. Анкетаа бөглөж дуусахад 1.10-д бичсэн цахим
 * шуудангийн хаяг нэвтрэх нэр болж, нууц үгтэйгээ хамт бүртгэл үүснэ.
 * Хэрэглэгч, өргөдөл хоёр нэг transaction-д үүснэ — хагас бүртгэл үлдэхгүй.
 */
export async function register(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = echoValues(formData);
  const raw = Object.fromEntries(formData);

  const callId = String(formData.get("callId") ?? "");
  const calls = await getActiveCalls();
  const call = calls.find((item) => item.id === callId);

  if (!call) {
    return { error: "Тэтгэлгийн төрлөө сонгоно уу.", values };
  }

  if (!getCallTiming(call).isOpen) {
    return { error: "Энэ төрлийн хүлээн авах хугацаа дууссан байна.", values };
  }

  const anket = anketSchema.safeParse({
    ...raw,
    targetGroupTypes: formData.getAll("targetGroupTypes"),
  });

  if (!anket.success) {
    return { error: anket.error.issues[0].message, values };
  }

  const credentials = credentialsSchema.safeParse(raw);

  if (!credentials.success) {
    return { error: credentials.error.issues[0].message, values };
  }

  const { email, password } = credentials.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      error:
        "Энэ и-мэйл хаягаар бүртгэл үүссэн байна. Нэвтэрч орно уу.",
      values,
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: `${anket.data.lastName} ${anket.data.firstName}`,
      phone: anket.data.phone,
      applications: {
        create: { callId: call.id, ...toApplicationData(anket.data) },
      },
    },
  });

  await sendVerificationEmail(user.id, user.email, user.name);
  await createSession(user.id);

  redirect("/apply");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1, "Нууц үгээ оруулна уу."),
  next: z.string().optional(),
});

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, password, next } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // И-мэйл байхгүй үед ч нууц үг шалгаж, хариу буцаах хугацааг ойролцоо
  // байлгана — ямар хаяг бүртгэлтэй байгааг таахаас сэргийлнэ.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "$2b$12$invalidinvalidinvalidinvalidinva");

  if (!user || !ok) {
    return { error: "И-мэйл эсвэл нууц үг буруу байна." };
  }

  // Нууц үг зөв болсны дараа шалгана — эс тэгвээс аль хаяг идэвхгүй болохыг
  // гаднаас таах боломж үүснэ.
  if (!user.isActive) {
    return {
      error:
        "Таны эрх идэвхгүй болсон байна. Дэлгэрэнгүйг админаас лавлана уу.",
    };
  }

  await createSession(user.id);

  const target =
    next && next.startsWith("/")
      ? next
      : user.role === "APPLICANT"
        ? "/dashboard"
        : "/reviewer";

  redirect(target);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt) return;

  await sendVerificationEmail(user.id, user.email, user.name);
}

async function sendVerificationEmail(
  userId: string,
  email: string,
  name: string,
): Promise<void> {
  const token = await createVerificationToken(userId);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  await sendEmail({
    to: email,
    template: "verify-email",
    data: { name, link: `${appUrl}/verify/${token}` },
  });
}

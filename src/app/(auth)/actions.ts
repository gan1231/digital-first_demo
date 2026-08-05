"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  createVerificationToken,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export type FormState = { error?: string } | undefined;

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Нэрээ бүрэн бичнэ үү."),
    email: z.string().trim().toLowerCase().email("И-мэйл хаяг буруу байна."),
    phone: z
      .string()
      .trim()
      .regex(/^\d{8}$/, "Утасны дугаар 8 оронтой байх ёстой."),
    password: z.string().min(8, "Нууц үг доод тал нь 8 тэмдэгт байна."),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Нууц үг таарахгүй байна.",
  });

export async function register(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Энэ и-мэйл хаягаар бүртгэл үүссэн байна." };
  }

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password) },
  });

  await sendVerificationEmail(user.id, user.email, user.name);
  await createSession(user.id);

  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("И-мэйл хаяг буруу байна."),
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

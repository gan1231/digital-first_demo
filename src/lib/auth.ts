import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role, TokenPurpose, type User } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "burtgel_session";
const SESSION_DAYS = 30;
const VERIFY_TOKEN_HOURS = 24;
const BCRYPT_ROUNDS = 12;

/** Cookie дотор түүхий токен явна; DB-д зөвхөн хэш нь хадгалагдана. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  store.delete(SESSION_COOKIE);
}

/** Нэг хүсэлтийн дотор олон компонент дуудсан ч DB рүү нэг л удаа очно. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
});

export async function requireUser(returnTo = "/"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

/** Комисс/админы хуудсуудад. Эрхгүй хэрэглэгчийг нүүр рүү буцаана. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}

export function isStaff(user: Pick<User, "role">): boolean {
  return user.role === Role.REVIEWER || user.role === Role.ADMIN;
}

/** И-мэйл баталгаажуулах токен үүсгээд түүхий утгыг буцаана (нэг л удаа харагдана). */
export async function createVerificationToken(
  userId: string,
  purpose: TokenPurpose = TokenPurpose.EMAIL_VERIFY,
): Promise<string> {
  const token = newToken();

  await prisma.verificationToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      purpose,
      expiresAt: new Date(Date.now() + VERIFY_TOKEN_HOURS * 60 * 60 * 1000),
    },
  });

  return token;
}

export async function consumeVerificationToken(
  token: string,
  purpose: TokenPurpose = TokenPurpose.EMAIL_VERIFY,
): Promise<User | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (
    !record ||
    record.purpose !== purpose ||
    record.usedAt !== null ||
    record.expiresAt < new Date()
  ) {
    return null;
  }

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return record.user;
}

type AuditInput = {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
};

/** Хувийн мэдээлэл үзсэн, шийдвэр гаргасан үйлдлийг мөрдөнө. */
export async function writeAudit({
  actorId,
  action,
  targetType,
  targetId,
  meta,
}: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      targetType,
      targetId,
      meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined,
    },
  });
}

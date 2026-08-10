"use server";

import { revalidatePath } from "next/cache";
import { Role, ReviewSection } from "@prisma/client";
import { requireRole, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createCommissionMember(formData: FormData) {
  await requireRole(Role.ADMIN);

  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const organization = String(formData.get("organization") ?? "");
  const jobTitle = String(formData.get("jobTitle") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const assignedSections = formData.getAll("assignedSections") as ReviewSection[];

  if (!name || !email || !password || !organization || !jobTitle || !phone) {
    throw new Error("Бүх талбарыг бөглөнө үү.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Энэ и-мэйл хаягаар бүртгэл үүссэн байна.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      organization,
      jobTitle,
      phone,
      assignedSections,
      role: Role.REVIEWER,
      emailVerifiedAt: new Date(),
    },
  });

  revalidatePath("/reviewer/commission");
}

export async function removeCommissionMember(id: string) {
  await requireRole(Role.ADMIN);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== Role.REVIEWER) {
    throw new Error("Хэрэглэгч олдсонгүй эсвэл эрх хасах боломжгүй байна.");
  }

  await prisma.user.update({
    where: { id },
    data: { role: Role.APPLICANT },
  });

  revalidatePath("/reviewer/commission");
}

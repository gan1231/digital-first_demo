import type { Metadata } from "next";
import { Role, ReviewSection } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { ACTIVE_REVIEW_SECTIONS, SECTION_LABELS } from "@/lib/sections";
import {
  createCommissionMember,
  removeCommissionMember,
  restoreCommissionMember,
} from "./actions";

export const metadata: Metadata = { title: "Ажлын хэсэг" };

export default async function CommissionPage() {
  await requireRole(Role.ADMIN);

  const members = await prisma.user.findMany({
    where: { role: { in: [Role.REVIEWER, Role.ADMIN] } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">
          Баримт, бичгийг хянан шалгах ажлын хэсэг
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-neutral-500">Нэр</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Албан тушаал</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Утас</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Хариуцсан хэсгүүд</th>
                    <th className="px-4 py-3 font-medium text-neutral-500">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {members.map((member) => {
                    // Эсээ хасагдсан тул хуучин хуваарилалтаас түүнийг харуулахгүй.
                    const sections = member.assignedSections.filter((section) =>
                      ACTIVE_REVIEW_SECTIONS.includes(section),
                    );

                    return (
                    <tr key={member.id} className="hover:bg-neutral-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium text-neutral-900">
                          {member.name}
                          {!member.isActive ? (
                            <span className="ml-2 inline-flex items-center rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
                              Идэвхгүй
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-neutral-500">{member.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                        {member.organization ? (
                          <>
                            <div>{member.organization}</div>
                            <div className="text-xs text-neutral-500">{member.jobTitle}</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                        {member.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {member.role === Role.ADMIN ? (
                          <span className="inline-flex items-center rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                            Бүх эрхтэй (Админ)
                          </span>
                        ) : sections.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sections.map((section) => (
                              <span key={section} className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-700">
                                {SECTION_LABELS[section as ReviewSection]}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">Томилогдоогүй</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                        {member.role === Role.REVIEWER ? (
                          member.isActive ? (
                            <form action={removeCommissionMember.bind(null, member.id)}>
                              <button
                                type="submit"
                                className="text-red-600 hover:text-red-700"
                                title="Эрхийг нь түр хаана. Өгсөн үнэлгээ нь хэвээр үлдэнэ."
                              >
                                Эрх хасах
                              </button>
                            </form>
                          ) : (
                            <form action={restoreCommissionMember.bind(null, member.id)}>
                              <button
                                type="submit"
                                className="text-brand-blue hover:underline"
                                title="Эрхийг нь буцаан нээнэ."
                              >
                                Эрх сэргээх
                              </button>
                            </form>
                          )
                        ) : null}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {members.length === 0 && (
              <div className="p-4 text-center text-sm text-neutral-500">
                Одоогоор гишүүн байхгүй байна.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-medium text-neutral-900">
              Шинээр гишүүн нэмэх
            </h2>
            <form action={createCommissionMember} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Овог, нэр</label>
                <input type="text" name="name" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">И-мэйл хаяг</label>
                <input type="email" name="email" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Утасны дугаар</label>
                <input type="text" name="phone" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Байгууллага</label>
                <input type="text" name="organization" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Албан тушаал</label>
                <input type="text" name="jobTitle" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Хариуцах хэсгүүд</label>
                <div className="mt-2 space-y-2">
                  {ACTIVE_REVIEW_SECTIONS.map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <input type="checkbox" name="assignedSections" value={key} className="rounded border-neutral-300 text-brand-blue focus:ring-brand-blue" />
                      <span className="text-sm text-neutral-700">{SECTION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">Анхны нууц үг</label>
                <input type="text" name="password" required defaultValue="Burtgel!2026" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue" />
              </div>
              <SubmitButton pendingLabel="Нэмж байна..." className="w-full">
                Нэмэх
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

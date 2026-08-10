import type { Metadata } from "next";
import Link from "next/link";
import { consumeVerificationToken } from "@/lib/auth";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "И-мэйл баталгаажуулах" };

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await consumeVerificationToken(token);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-6">
      {user ? (
        <>
          <Alert tone="success" title="И-мэйл хаяг баталгаажлаа">
            {user.email} хаягийг баталгаажууллаа. Одоо өргөдлөө илгээх боломжтой.
          </Alert>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm text-white transition-colors hover:bg-brand-blue-dark"
          >
            Хувийн хуудас руу
          </Link>
        </>
      ) : (
        <>
          <Alert tone="danger" title="Холбоос хүчингүй байна">
            Баталгаажуулах холбоосын хугацаа дууссан эсвэл аль хэдийн
            ашиглагдсан байна. Хувийн хуудаснаасаа шинэ холбоос авна уу.
          </Alert>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-800 transition-colors hover:bg-neutral-50"
          >
            Хувийн хуудас руу
          </Link>
        </>
      )}
    </div>
  );
}

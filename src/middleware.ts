import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * IIS reverse proxy нь дотоод host-оо дамжуулдаг тул Next-ийн Server Action
 * CSRF шалгалт (`origin` ↔ `x-forwarded-host`) унадаг. Түүнийг гадаад
 * домэйнөөр солино.
 *
 * ЗӨВХӨН production-д ажиллана — локал хөгжүүлэлт, дотоод IP-гээр нэвтрэхэд
 * host-ыг дарж бичвэл эсрэгээрээ бүх Server Action «Invalid Server Actions
 * request» гэж унана.
 */
const PUBLIC_HOST = process.env.PUBLIC_HOST ?? "burtgel.dornogovi.gov.mn";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-forwarded-host", PUBLIC_HOST);
  requestHeaders.set("host", PUBLIC_HOST);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // IIS Reverse Proxy-оос ирж буй буруу Host мэдээллийг дарж бичих
  const requestHeaders = new Headers(request.headers);
  
  // Next.js Server Action-ийн хамгаалалтыг давахын тулд 
  // Host болон x-forwarded-host толгойнуудыг Origin-тэй ижилхэн болгож хуурна.
  requestHeaders.set('x-forwarded-host', 'burtgel.dornogovi.gov.mn');
  requestHeaders.set('host', 'burtgel.dornogovi.gov.mn');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

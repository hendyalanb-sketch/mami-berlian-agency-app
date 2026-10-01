import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/permissions";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if ((request.nextUrl.pathname.startsWith("/master") || request.nextUrl.pathname.startsWith("/integrasi")) && !isAdmin(token.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/health|api/capabilities|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|login).*)"],
};

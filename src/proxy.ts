import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/permissions";

const ADMIN_PATHS = ["/master", "/integrasi", "/audit", "/pengaturan"];

export async function proxy(request: NextRequest) {
  // Galeri komponen /dev/* hanya untuk development lokal; halamannya sendiri juga 404 di production.
  if (process.env.NODE_ENV !== "production" && request.nextUrl.pathname.startsWith("/dev/")) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (ADMIN_PATHS.some((path) => request.nextUrl.pathname.startsWith(path)) && !isAdmin(token.role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/health|api/capabilities|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|login|canva-connected).*)"],
};

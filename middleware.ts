import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only protect specific paths
  const protectedPrefixes = ["/dashboard", "/support"];
  if (!protectedPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const phoneVerified = (token as any)?.phoneVerified ?? false;

  if (!phoneVerified) {
    const url = req.nextUrl.clone();
    url.pathname = "/account/phone-verification";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/support/:path*"],
};
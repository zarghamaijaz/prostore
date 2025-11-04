// middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Only imports the auth helper, not full config

export default async function middleware(req: Request) {
  const session = await auth(); // lightweight check using session cookie

  const url = new URL(req.url);
  const protectedPaths = [
    /^\/shipping-address/,
    /^\/payment-method/,
    /^\/place-order/,
    /^\/profile/,
    /^\/user\//,
    /^\/order\//,
    /^\/admin/,
  ];

  const isProtected = protectedPaths.some((p) => p.test(url.pathname));

  if (!session && isProtected) {
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

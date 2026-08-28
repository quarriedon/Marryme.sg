import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Optimistic auth check — reads the session JWT from the cookie only
 * (no database hit), per the Next.js Proxy guidance. Proxy runs on
 * the Node.js runtime here (Next.js 16+), so this works whether the
 * auth library is Edge-compatible or not. Real authorization still
 * happens close to the data (route handlers, Server Components),
 * this is just the first line of defense / redirect-based UX.
 */
const protectedPaths = ["/dashboard", "/admin"];

export default auth((req) => {
  const isProtected = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !req.auth) {
    const redirectUrl = new URL("/login", req.nextUrl);
    redirectUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

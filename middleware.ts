// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const allowedSubs = ["car", "bike", "bus", "www"];
const defaultLocale = "fa";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const hostname = host.replace(/:\d+$/, "");

  const hostParts = hostname.split(".");
  const MAIN_DOMAIN = hostParts.length > 2 ? hostParts.slice(-2).join(".") : hostname;

  // Skip static files and Next.js internals
  if (
    pathname.match(/\.(.*)$/) ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // Main domain handling
  if (hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}`) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

    // No locale in path, redirect to default locale
    if (!localeMatch) {
      req.nextUrl.pathname = `/${defaultLocale}${pathname}`;
      return NextResponse.redirect(req.nextUrl);
    }

    return NextResponse.next();
  }

  // Extract subdomain
  const sub = hostname.split(".")[0];

  // Block disallowed subdomains
  if (!allowedSubs.includes(sub)) {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = MAIN_DOMAIN;
    redirectUrl.pathname = `/${defaultLocale}`;
    redirectUrl.search = ""; // Clear any query params
    return NextResponse.redirect(redirectUrl, 302);
  }

  // Check if path has locale
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

  // No locale in path
  if (!localeMatch) {
    // Root path: redirect to /fa/login
    if (pathname === "/") {
      req.nextUrl.pathname = `/${defaultLocale}/login`;
      return NextResponse.redirect(req.nextUrl);
    }

    // Other paths: rewrite to /fa/subdomain/path
    req.nextUrl.pathname = `/${defaultLocale}/${sub}${pathname}`;
    return NextResponse.rewrite(req.nextUrl);
  }

  // Has locale in path
  const locale = localeMatch[1];
  const pathWithoutLocale = pathname.slice(3); // Remove /fa or /en

  // Root of locale: redirect to login
  if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
    req.nextUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(req.nextUrl);
  }

  // Rewrite: /fa/dashboard → /fa/subdomain/dashboard
  req.nextUrl.pathname = `/${locale}/${sub}${pathWithoutLocale}`;
  return NextResponse.rewrite(req.nextUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

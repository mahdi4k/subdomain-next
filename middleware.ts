// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const allowedSubs = ["car", "bike", "bus", "www"];
const defaultLocale = "fa";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // ---------- MINIMAL CHANGE: split host into hostname + port ----------
  const [hostnameOnly, portFromHost] = host.split(":");
  const hostname = (hostnameOnly || "").toLowerCase();
  const port = portFromHost || "";

  const hostParts = hostname.split(".");
  // ---------- MINIMAL CHANGE: treat localhost/*.localhost as MAIN_DOMAIN = 'localhost' ----------
  const MAIN_DOMAIN =
    hostname === "localhost" || hostname.endsWith(".localhost")
      ? "localhost"
      : hostParts.length > 2
      ? hostParts.slice(-2).join(".")
      : hostname;

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
      // use absolute URL and preserve port so dev (localhost:3000) works
      const redirectUrl = new URL(req.url);
      redirectUrl.pathname = `/${defaultLocale}${pathname}`;
      if (port) redirectUrl.port = port;
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  // Extract subdomain
  const sub = hostname.split(".")[0];

  // Block disallowed subdomains
  if (!allowedSubs.includes(sub)) {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = MAIN_DOMAIN;
    if (port) redirectUrl.port = port; // preserve port in dev
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
      const redirectUrl = new URL(req.url);
      redirectUrl.pathname = `/${defaultLocale}/login`;
      if (port) redirectUrl.port = port;
      return NextResponse.redirect(redirectUrl);
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
    const redirectUrl = new URL(req.url);
    redirectUrl.pathname = `/${locale}/login`;
    if (port) redirectUrl.port = port;
    return NextResponse.redirect(redirectUrl);
  }

  // Rewrite: /fa/dashboard → /fa/subdomain/dashboard
  req.nextUrl.pathname = `/${locale}/${sub}${pathWithoutLocale}`;
  return NextResponse.rewrite(req.nextUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

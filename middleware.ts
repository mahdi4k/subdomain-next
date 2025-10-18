import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const allowedSubs = ["porterage", "driver", "customer"];
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || "localhost";

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  const hostname = host.replace(/:\d+$/, "").toLowerCase();

  // ✅ Extract port if exists
  const portMatch = host.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : "";

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

  // Handle www redirect
  if (hostname.startsWith("www.")) {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = hostname.replace("www.", "");
    return NextResponse.redirect(redirectUrl, 301);
  }

  const isMainDomain = hostname === MAIN_DOMAIN;

  if (isMainDomain) {
    if (pathname === "/") {
      const redirectUrl = new URL(req.url);
      // ✅ Build hostname with port
      redirectUrl.hostname = `porterage.${MAIN_DOMAIN}`;
      if (port) redirectUrl.port = port;
      redirectUrl.pathname = "/fa/login";
      return NextResponse.redirect(redirectUrl);
    }
    // ✅ Let next-intl handle main domain requests
    return intlMiddleware(req);
  }

  // Extract subdomain
  const parts = hostname.split(".");
  const sub = parts.length > MAIN_DOMAIN.split(".").length ? parts[0] : undefined;

  // ✅ If invalid subdomain, redirect to main domain root WITH PORT
  if (!sub || !allowedSubs.includes(sub)) {
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = MAIN_DOMAIN;
    if (port) redirectUrl.port = port; // ✅ Preserve port
    redirectUrl.pathname = "/";
    redirectUrl.search = ""; // ✅ Clear query params
    return NextResponse.redirect(redirectUrl, 302);
  }

  // Extract locale from pathname (e.g., /en/dashboard -> en)
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

  // ✅ If no locale in URL, let next-intl handle it first
  if (!localeMatch) {
    const intlResponse = intlMiddleware(req);

    // Get the locale that next-intl added
    const newPathname = intlResponse.headers.get("x-middleware-request") || req.nextUrl.pathname;
    const newLocaleMatch = newPathname.match(/^\/([a-z]{2})(\/|$)/);
    const detectedLocale = newLocaleMatch ? newLocaleMatch[1] : "fa";

    // Now rewrite with subdomain
    req.nextUrl.pathname = `/${detectedLocale}/${sub}${pathname === "/" ? "/login" : pathname}`;
    const response = NextResponse.rewrite(req.nextUrl);
    response.headers.set("x-subdomain", sub);
    return response;
  }

  const locale = localeMatch[1];
  const pathWithoutLocale = pathname.slice(3);

  // Handle root with locale (e.g., /en or /fa)
  if (pathWithoutLocale === "/" || pathname === `/${locale}`) {
    req.nextUrl.pathname = `/${locale}/${sub}/login`;
    const response = NextResponse.rewrite(req.nextUrl);
    response.headers.set("x-subdomain", sub);
    return response;
  }

  // Rewrite: /en/dashboard -> /en/porterage/dashboard
  req.nextUrl.pathname = `/${locale}/${sub}${pathWithoutLocale}`;
  const response = NextResponse.rewrite(req.nextUrl);

  // Add subdomain to headers
  response.headers.set("x-subdomain", sub);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

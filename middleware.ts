// middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const allowedSubs = ["porterage", "driver", "customer"];
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || "kiwipart.ir";

// next-intl middleware instance
const intlMiddleware = createMiddleware(routing);

function normalizeHost(hostHeader: string) {
  return hostHeader.replace(/:\d+$/, "").toLowerCase();
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostHeader = req.headers.get("host") || "";
  const hostname = normalizeHost(hostHeader);

  const portMatch = hostHeader.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : "";

  // Skip assets and internals - IMPORTANT: do this first
  if (
    pathname.match(/\.(.*)$/) ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // ---------- 1) handle www -> non-www ----------
  if (hostname === `www.${MAIN_DOMAIN}`) {
    const target = new URL(req.url);
    target.hostname = MAIN_DOMAIN;
    if (port) target.port = port;
    return NextResponse.redirect(target, 301);
  }

  // ---------- 2) Identify subdomain ----------
  const isSubOfMain = hostname.endsWith(`.${MAIN_DOMAIN}`);
  const sub =
    isSubOfMain && hostname !== MAIN_DOMAIN ? hostname.slice(0, hostname.length - `.${MAIN_DOMAIN}`.length) : undefined;

  // If subdomain exists but NOT in allowed list, redirect to main domain
  if (sub && !allowedSubs.includes(sub)) {
    const target = new URL(req.url);
    target.hostname = MAIN_DOMAIN;
    if (port) target.port = port;
    // Don't modify pathname - let next-intl handle locale on main domain
    return NextResponse.redirect(target, 302);
  }

  // ---------- 3) Main domain handling ----------
  const isMainDomain = hostname === MAIN_DOMAIN;

  if (isMainDomain) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

    // If no locale in path, redirect to default locale
    if (!localeMatch) {
      if (pathname === "/") {
        const target = new URL(req.url);
        target.pathname = "/fa";
        if (port) target.port = port;
        return NextResponse.redirect(target, 302);
      }

      // Add default locale to path
      const target = new URL(req.url);
      target.pathname = `/fa${pathname}`;
      if (port) target.port = port;
      return NextResponse.redirect(target, 302);
    }

    // Has locale, continue normally
    return NextResponse.next();
  }

  // ---------- 4) Valid subdomain handling ----------
  if (sub && allowedSubs.includes(sub)) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

    // No locale in path
    if (!localeMatch) {
      // For root path, redirect to /fa/login
      if (pathname === "/") {
        const target = new URL(req.url);
        target.pathname = "/fa/login";
        if (port) target.port = port;
        const response = NextResponse.redirect(target, 302);
        response.headers.set("x-subdomain", sub);
        return response;
      }

      // For other paths without locale, add default locale and rewrite with subdomain
      req.nextUrl.pathname = `/fa/${sub}${pathname}`;
      const response = NextResponse.rewrite(req.nextUrl);
      response.headers.set("x-subdomain", sub);
      return response;
    }

    // Has locale in path
    const locale = localeMatch[1];
    const pathWithoutLocale = pathname.slice(3); // Remove /fa or /en

    // If at root of locale (e.g., /fa or /fa/), redirect to login
    if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
      const target = new URL(req.url);
      target.pathname = `/${locale}/login`;
      if (port) target.port = port;
      const response = NextResponse.redirect(target, 302);
      response.headers.set("x-subdomain", sub);
      return response;
    }

    // Rewrite path to include subdomain for app router
    req.nextUrl.pathname = `/${locale}/${sub}${pathWithoutLocale}`;
    const response = NextResponse.rewrite(req.nextUrl);
    response.headers.set("x-subdomain", sub);
    return response;
  }

  // Fallback: unknown host, redirect to main domain
  const fallback = new URL(req.url);
  fallback.hostname = MAIN_DOMAIN;
  if (port) fallback.port = port;
  // Don't set pathname, let next-intl handle it
  return NextResponse.redirect(fallback, 302);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

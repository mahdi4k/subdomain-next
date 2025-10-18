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

  // Skip assets and internals
  if (
    pathname.match(/\.(.*)$/) ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  const currentAbsolute = (() => {
    const cur = new URL(req.url);
    return `${cur.origin}${cur.pathname}${cur.search || ""}`;
  })();

  // ---------- 1) handle www -> non-www ----------
  if (hostname === `www.${MAIN_DOMAIN}`) {
    const target = new URL(req.url);
    target.hostname = MAIN_DOMAIN;
    if (port) target.port = port;

    const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
    if (currentAbsolute === targetAbsolute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(target, 301);
  }

  // ---------- 2) handle subdomains ----------
  const isSubOfMain = hostname.endsWith(`.${MAIN_DOMAIN}`);
  const sub =
    isSubOfMain && hostname !== MAIN_DOMAIN ? hostname.slice(0, hostname.length - `.${MAIN_DOMAIN}`.length) : undefined;

  // If subdomain exists but NOT in allowed list, redirect to main domain
  if (sub && !allowedSubs.includes(sub)) {
    const target = new URL(req.url);
    target.hostname = MAIN_DOMAIN;
    if (port) target.port = port;
    // Keep the current path instead of forcing /fa
    // If user was on /en/something, they stay on /en/something

    const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
    if (currentAbsolute === targetAbsolute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(target, 302);
  }

  // ---------- 3) main domain handling ----------
  const isMainDomain = hostname === MAIN_DOMAIN;
  if (isMainDomain) {
    // Simply let next-intl handle ALL paths on main domain
    // It will handle locale detection and routing
    return intlMiddleware(req);
  }

  // ---------- 4) subdomain + locale routing ----------
  if (sub) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

    if (!localeMatch) {
      const intlResponse = intlMiddleware(req);
      const newPathname = intlResponse.headers.get("x-middleware-request") || req.nextUrl.pathname;
      const newLocaleMatch = newPathname.match(/^\/([a-z]{2})(\/|$)/);
      const detectedLocale = newLocaleMatch ? newLocaleMatch[1] : "fa";

      if (pathname === "/") {
        const target = new URL(req.url);
        target.pathname = `/${detectedLocale}/login`;
        if (port) target.port = port;
        const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
        if (currentAbsolute === targetAbsolute) return NextResponse.next();
        const response = NextResponse.redirect(target, 302);
        response.headers.set("x-subdomain", sub);
        return response;
      }

      req.nextUrl.pathname = `/${detectedLocale}/${sub}${pathname}`;
      const response = NextResponse.rewrite(req.nextUrl);
      response.headers.set("x-subdomain", sub);
      return response;
    }

    const locale = localeMatch[1];
    const pathWithoutLocale = pathname.slice(3);

    if (pathWithoutLocale === "/" || pathname === `/${locale}`) {
      const target = new URL(req.url);
      target.pathname = `/${locale}/${sub}/login`;
      if (port) target.port = port;
      const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
      if (currentAbsolute === targetAbsolute) return NextResponse.next();
      const response = NextResponse.redirect(target, 302);
      response.headers.set("x-subdomain", sub);
      return response;
    }

    req.nextUrl.pathname = `/${locale}/${sub}${pathWithoutLocale}`;
    const response = NextResponse.rewrite(req.nextUrl);
    response.headers.set("x-subdomain", sub);
    return response;
  }

  // Fallback for unknown hosts
  const fallback = new URL(req.url);
  fallback.hostname = MAIN_DOMAIN;
  if (port) fallback.port = port;
  fallback.pathname = "/fa";
  const fallbackAbsolute = `${fallback.origin}${fallback.pathname}${fallback.search || ""}`;
  if (currentAbsolute === fallbackAbsolute) return NextResponse.next();
  return NextResponse.redirect(fallback, 302);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

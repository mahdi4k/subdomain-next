// middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const allowedSubs = ["porterage", "driver", "customer"];
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || "kiwipart.ir"; // set in Vercel env or fallback

// next-intl middleware instance
const intlMiddleware = createMiddleware(routing);

function normalizeHost(hostHeader: string) {
  // remove port if present, lowercase
  return hostHeader.replace(/:\d+$/, "").toLowerCase();
}

export default function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;
  const hostHeader = req.headers.get("host") || "";
  const hostname = normalizeHost(hostHeader);

  // extract port if any (dev)
  const portMatch = hostHeader.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : "";

  // quickly skip assets and internals
  if (
    pathname.match(/\.(.*)$/) ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // helper to avoid redirect loops: compare absolute origin+path
  const currentAbsolute = (() => {
    // origin from req.nextUrl contains protocol + host (no trailing slash)
    const cur = new URL(req.url);
    return `${cur.origin}${cur.pathname}${cur.search || ""}`;
  })();

  // ---------- 1) handle www -> non-www (permanent) ----------
  if (hostname === `www.${MAIN_DOMAIN}`) {
    const target = new URL(req.url);
    target.hostname = MAIN_DOMAIN;
    if (port) target.port = port;

    const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
    if (currentAbsolute === targetAbsolute) {
      // we are already at target — avoid redirect loop
      return NextResponse.next();
    }
    return NextResponse.redirect(target, 301);
  }

  // ---------- 2) handle subdomains ----------
  // If hostname ends with .MAIN_DOMAIN and is not exactly MAIN_DOMAIN
  const isSubOfMain = hostname.endsWith(`.${MAIN_DOMAIN}`);
  const sub = isSubOfMain && hostname !== MAIN_DOMAIN ? hostname.slice(0, hostname.length - (`.${MAIN_DOMAIN}`).length) : undefined;

  // If there is a subdomain but it's not in allowed list, strip it and go to main domain
  if (sub && !allowedSubs.includes(sub)) {
    // build absolute target URL (ensures browser updates the host)
    const target = new URL(req.url);
    target.hostname = MAIN_DOMAIN;
    if (port) target.port = port;
    // prefer redirecting users to a sensible default (main locale)
    target.pathname = "/fa";
    target.search = "";

    const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
    if (currentAbsolute === targetAbsolute) {
      // already at the main domain root path — avoid loop
      return NextResponse.next();
    }
    return NextResponse.redirect(target, 302);
  }

  // ---------- 3) main domain handling ----------
  const isMainDomain = hostname === MAIN_DOMAIN;
  if (isMainDomain) {
    // if root on main domain, send users to default subdomain login (optional)
    if (pathname === "/") {
      const redirectUrl = new URL(req.url);
      redirectUrl.hostname = `porterage.${MAIN_DOMAIN}`;
      if (port) redirectUrl.port = port;
      redirectUrl.pathname = "/fa/login";

      const targetAbsolute = `${redirectUrl.origin}${redirectUrl.pathname}${redirectUrl.search || ""}`;
      if (currentAbsolute === targetAbsolute) return NextResponse.next();
      return NextResponse.redirect(redirectUrl, 302);
    }
    // let next-intl handle locale routing on the main domain
    return intlMiddleware(req);
  }

  // ---------- 4) subdomain + locale routing ----------
  // At this point we are either on a valid subdomain (allowedSubs) or some other host.
  // If it's a valid subdomain, we insert the sub into the path for app routing.
  if (sub) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

    // if no locale, let next-intl detect and then rewrite to include locale + sub
    if (!localeMatch) {
      const intlResponse = intlMiddleware(req);
      const newPathname = intlResponse.headers.get("x-middleware-request") || req.nextUrl.pathname;
      const newLocaleMatch = newPathname.match(/^\/([a-z]{2})(\/|$)/);
      const detectedLocale = newLocaleMatch ? newLocaleMatch[1] : "fa";

      // if root, redirect to locale + login so browser URL updates
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

      // otherwise rewrite internally to include sub
      req.nextUrl.pathname = `/${detectedLocale}/${sub}${pathname}`;
      const response = NextResponse.rewrite(req.nextUrl);
      response.headers.set("x-subdomain", sub);
      return response;
    }

    // if a locale exists in the path, rewrite to include the sub as part of path
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

  // If we reach here, it's some other host (not main domain and not a recognized subdomain)
  // Best safe default: redirect to main domain
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

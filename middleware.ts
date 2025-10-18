// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const allowedSubs = ["car", "bike", "bus", "www"];
const defaultLocale = "fa";

/**
 * Return the canonical main domain for the given hostname.
 */
function getMainDomainFromHost(hostname: string) {
  const parts = hostname.split(".");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "localhost";
  }
  if (parts.length <= 1) return hostname;
  return parts.slice(-2).join(".");
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostHeader = req.headers.get("host") || "";
  const [hostnameRaw, portFromHost] = hostHeader.split(":");
  const hostname = (hostnameRaw || "").toLowerCase();
  const port = portFromHost || "";

  // Build current absolute URL for loop detection
  const parsed = new URL(req.url);
  const currentAbsolute = `${parsed.origin}${parsed.pathname}${parsed.search || ""}`;

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

  const MAIN_DOMAIN = getMainDomainFromHost(hostname);

  // ----- NEW: Always handle www.* first (minimal change) -----
  if (hostname.startsWith("www.")) {
    const target = new URL(req.url);
    target.hostname = hostname.replace(/^www\./, "");
    if (port) target.port = port;
    const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
    if (currentAbsolute === targetAbsolute) return NextResponse.next();
    return NextResponse.redirect(target, 301);
  }

  // 2) If we're on the main domain (e.g. kiwipart.ir or localhost)
  if (hostname === MAIN_DOMAIN) {
    const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

    // If no locale prefix, redirect to default locale (so browser URL changes)
    if (!localeMatch) {
      const target = new URL(req.url);
      target.pathname = `/${defaultLocale}${pathname}`;
      if (port) target.port = port;
      const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
      if (currentAbsolute === targetAbsolute) return NextResponse.next();
      return NextResponse.redirect(target, 302);
    }

    return NextResponse.next();
  }

  // Not main domain -> probably a subdomain. Extract sub label.
  const hostParts = hostname.split(".");
  const sub = hostParts[0];

  // ----- NEW: If sub is "www" (because you kept it in allowedSubs), treat it as www and strip it -----
  if (sub === "www") {
    const target = new URL(req.url);
    target.hostname = MAIN_DOMAIN;
    if (port) target.port = port;
    target.pathname = `/${defaultLocale}`;
    target.search = "";
    const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
    if (currentAbsolute === targetAbsolute) return NextResponse.next();
    return NextResponse.redirect(target, 302);
  }

  // If subdomain is not allowed -> strip it and redirect to main domain (default locale)
  if (!allowedSubs.includes(sub)) {
    const target = new URL(req.url);
    // Build absolute URL to ensure browser updates host
    const protocol = parsed.protocol; // includes ':'
    const newOrigin = `${protocol}//${MAIN_DOMAIN}${port ? `:${port}` : ""}`;
    const newUrl = `${newOrigin}/${defaultLocale}`;
    if (currentAbsolute === `${newOrigin}${parsed.pathname}${parsed.search || ""}`) {
      return NextResponse.next();
    }
    return NextResponse.redirect(newUrl, 302);
  }

  // Valid subdomain -> integrate locale logic
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

  if (!localeMatch) {
    if (pathname === "/") {
      const protocol = parsed.protocol;
      const newOrigin = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
      const newUrl = `${newOrigin}/${defaultLocale}/login`;
      if (currentAbsolute === `${newOrigin}${parsed.pathname}${parsed.search || ""}`) return NextResponse.next();
      return NextResponse.redirect(newUrl, 302);
    }

    req.nextUrl.pathname = `/${defaultLocale}/${sub}${pathname}`;
    const res = NextResponse.rewrite(req.nextUrl);
    res.headers.set("x-subdomain", sub);
    return res;
  }

  const locale = localeMatch[1];
  const pathWithoutLocale = pathname.slice(3);

  if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
    const protocol = parsed.protocol;
    const newOrigin = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    const newUrl = `${newOrigin}/${locale}/login`;
    if (currentAbsolute === `${newOrigin}${parsed.pathname}${parsed.search || ""}`) return NextResponse.next();
    return NextResponse.redirect(newUrl, 302);
  }

  req.nextUrl.pathname = `/${locale}/${sub}${pathWithoutLocale}`;
  const res = NextResponse.rewrite(req.nextUrl);
  res.headers.set("x-subdomain", sub);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

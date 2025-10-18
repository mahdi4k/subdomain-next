// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const allowedSubs = ["car", "bike", "bus"]; // do NOT include 'www'
const defaultLocale = "fa";

/**
 * Return the canonical main domain for the given hostname.
 * Examples:
 *  - "porterage.kiwipart.ir" -> "kiwipart.ir"
 *  - "kiwipart.ir" -> "kiwipart.ir"
 *  - "porterage.localhost" -> "localhost"
 *  - "localhost" -> "localhost"
 */
function getMainDomainFromHost(hostname: string) {
  const parts = hostname.split(".");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "localhost";
  }
  // if only one label (uncommon), return it
  if (parts.length <= 1) return hostname;
  // common case: take last two labels (example.com)
  return parts.slice(-2).join(".");
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostHeader = req.headers.get("host") || "";
  const [hostnameRaw, portFromHost] = hostHeader.split(":");
  const hostname = (hostnameRaw || "").toLowerCase();
  const port = portFromHost || "";

  // Build current absolute for loop detection
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

  // 1) handle www.* -> non-www (permanent)
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

    // If no locale prefix, redirect to default locale (so the browser URL changes)
    if (!localeMatch) {
      const target = new URL(req.url);
      // keep same host + port but add locale prefix
      target.pathname = `/${defaultLocale}${pathname}`;
      if (port) target.port = port;
      const targetAbsolute = `${target.origin}${target.pathname}${target.search || ""}`;
      if (currentAbsolute === targetAbsolute) return NextResponse.next();
      return NextResponse.redirect(target, 302);
    }

    // main domain + locale exists -> continue
    return NextResponse.next();
  }

  // 3) Not main domain -> probably a subdomain. Extract sub label.
  const hostParts = hostname.split(".");
  const sub = hostParts[0];

  // If subdomain is not allowed -> strip it and redirect to main domain (default locale)
  // e.g., foo.kiwipart.ir  ->  kiwipart.ir/fa
  if (!allowedSubs.includes(sub)) {
    const target = new URL(req.url);
    // Build a full absolute URL pointing to main domain to guarantee browser updates host
    // Use parsed.protocol to preserve http/https in dev/prod
    const protocol = parsed.protocol; // includes trailing colon, e.g. 'http:'
    const newOrigin = `${protocol}//${MAIN_DOMAIN}${port ? `:${port}` : ""}`;
    const newUrl = `${newOrigin}/${defaultLocale}`;
    if (currentAbsolute === `${newOrigin}${parsed.pathname}${parsed.search || ""}`) {
      // already at main domain default -> no redirect
      return NextResponse.next();
    }
    return NextResponse.redirect(newUrl, 302);
  }

  // 4) Valid subdomain (allowedSubs) — integrate locale logic:
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

  // No locale in path
  if (!localeMatch) {
    // If root of subdomain, redirect browser to /{locale}/login so URL updates
    if (pathname === "/") {
      const target = new URL(req.url);
      const protocol = parsed.protocol;
      const newOrigin = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
      const newUrl = `${newOrigin}/${defaultLocale}/login`;
      if (currentAbsolute === `${newOrigin}${parsed.pathname}${parsed.search || ""}`) return NextResponse.next();
      return NextResponse.redirect(newUrl, 302);
    }

    // For non-root, rewrite internally to include sub (browser URL unchanged)
    req.nextUrl.pathname = `/${defaultLocale}/${sub}${pathname}`;
    const res = NextResponse.rewrite(req.nextUrl);
    res.headers.set("x-subdomain", sub);
    return res;
  }

  // Has locale in path (e.g., /fa/...)
  const locale = localeMatch[1];
  const pathWithoutLocale = pathname.slice(3); // remove "/fa"

  // if locale root -> redirect to login (so browser shows correct URL)
  if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
    const target = new URL(req.url);
    const protocol = parsed.protocol;
    const newOrigin = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
    const newUrl = `${newOrigin}/${locale}/login`;
    if (currentAbsolute === `${newOrigin}${parsed.pathname}${parsed.search || ""}`) return NextResponse.next();
    return NextResponse.redirect(newUrl, 302);
  }

  // General rewrite to include sub in path
  req.nextUrl.pathname = `/${locale}/${sub}${pathWithoutLocale}`;
  const res = NextResponse.rewrite(req.nextUrl);
  res.headers.set("x-subdomain", sub);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

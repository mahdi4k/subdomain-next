// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// CONFIGURATION
// ============================================================================
const ALLOWED_SUBDOMAINS = ["car", "bike", "bus"];
const DEFAULT_LOCALE = "fa";
const SUPPORTED_LOCALES = ["fa", "en"];

// ============================================================================
// HELPER: Extract root domain dynamically
// ============================================================================
function getRootDomain(hostname: string): string {
  // Handle localhost environments
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "localhost";
  }

  // Handle production domains (e.g., kiwipart.ir)
  const parts = hostname.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
}

// ============================================================================
// HELPER: Extract subdomain from hostname
// ============================================================================
function extractSubdomain(request: NextRequest): string | null {
  const host = request.headers.get("host") || "";
  const [hostname] = host.split(":"); // Remove port
  const lowercaseHostname = hostname.toLowerCase();

  const rootDomain = getRootDomain(lowercaseHostname);

  // If accessing the root domain directly, no subdomain
  if (lowercaseHostname === rootDomain) {
    return null;
  }

  // If accessing www.domain, treat as no subdomain
  if (lowercaseHostname === `www.${rootDomain}`) {
    return null;
  }

  // Extract subdomain: car.kiwipart.ir -> "car"
  if (lowercaseHostname.endsWith(`.${rootDomain}`)) {
    return lowercaseHostname.replace(`.${rootDomain}`, "");
  }

  return null;
}

// ============================================================================
// HELPER: Check if path has a locale prefix
// ============================================================================
function getLocaleFromPath(pathname: string): {
  locale: string | null;
  pathWithoutLocale: string;
} {
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/|$)/);

  if (localeMatch && SUPPORTED_LOCALES.includes(localeMatch[1])) {
    return {
      locale: localeMatch[1],
      pathWithoutLocale: pathname.slice(3), // Remove /fa or /en
    };
  }

  return {
    locale: null,
    pathWithoutLocale: pathname,
  };
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";
  const [hostname, port] = host.split(":");

  // --------------------------------------------------------------------------
  // 1. SKIP: Static files and Next.js internals
  // --------------------------------------------------------------------------
  if (
    pathname.match(/\.(.*)$/) || // Files with extensions (.ico, .png, etc.)
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // --------------------------------------------------------------------------
  // 2. REDIRECT: www to non-www
  // --------------------------------------------------------------------------
  if (hostname.startsWith("www.")) {
    const target = new URL(req.url);
    target.hostname = hostname.replace(/^www\./, "");
    if (port) target.port = port;
    return NextResponse.redirect(target, 301);
  }

  const rootDomain = getRootDomain(hostname.toLowerCase());
  const subdomain = extractSubdomain(req);

  // --------------------------------------------------------------------------
  // 3. MAIN DOMAIN: Handle locale routing
  // --------------------------------------------------------------------------
  if (!subdomain) {
    const { locale } = getLocaleFromPath(pathname);

    // No locale in path, redirect to add default locale
    if (!locale) {
      const redirectUrl = new URL(req.url);
      redirectUrl.pathname = `/${DEFAULT_LOCALE}${pathname}`;
      if (port) redirectUrl.port = port;
      return NextResponse.redirect(redirectUrl);
    }

    // Locale exists, continue normally
    return NextResponse.next();
  }

  // --------------------------------------------------------------------------
  // 4. SUBDOMAIN: Validate allowed subdomains
  // --------------------------------------------------------------------------
  if (!ALLOWED_SUBDOMAINS.includes(subdomain)) {
    // Redirect disallowed subdomains to main domain
    const redirectUrl = new URL(req.url);
    redirectUrl.hostname = rootDomain;
    redirectUrl.pathname = `/${DEFAULT_LOCALE}`;
    redirectUrl.search = "";
    if (port) redirectUrl.port = port;
    return NextResponse.redirect(redirectUrl, 302);
  }

  // --------------------------------------------------------------------------
  // 5. SUBDOMAIN: Handle locale and routing
  // --------------------------------------------------------------------------
  const { locale, pathWithoutLocale } = getLocaleFromPath(pathname);

  // No locale in path
  if (!locale) {
    // Root path: redirect to /fa/login
    if (pathname === "/") {
      const redirectUrl = new URL(req.url);
      redirectUrl.pathname = `/${DEFAULT_LOCALE}/login`;
      if (port) redirectUrl.port = port;
      return NextResponse.redirect(redirectUrl);
    }

    // Other paths: rewrite to /fa/subdomain/path
    req.nextUrl.pathname = `/${DEFAULT_LOCALE}/${subdomain}${pathname}`;
    return NextResponse.rewrite(req.nextUrl);
  }

  // Locale exists in path
  // Root of locale: redirect to login
  if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
    const redirectUrl = new URL(req.url);
    redirectUrl.pathname = `/${locale}/login`;
    if (port) redirectUrl.port = port;
    return NextResponse.redirect(redirectUrl);
  }

  // Rewrite: /fa/dashboard → /fa/subdomain/dashboard
  req.nextUrl.pathname = `/${locale}/${subdomain}${pathWithoutLocale}`;
  return NextResponse.rewrite(req.nextUrl);
}

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================
export const config = {
  // Match all paths except static files, _next internals, and favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// middleware.ts
import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_SUBDOMAINS = ["porterage", "driver", "customer"];
const MAIN_DOMAIN = "kiwipart.ir";

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host")?.toLowerCase() || "";

  // Skip static files and API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Extract subdomain if exists
  const hostParts = hostname.split(".");
  let subdomain: string | null = null;

  // Check if hostname has subdomain (more than 2 parts: sub.kiwipart.ir)
  if (hostParts.length > 2) {
    subdomain = hostParts[0];
  }

  // If there's a subdomain but it's NOT in the allowed list
  if (subdomain && !ALLOWED_SUBDOMAINS.includes(subdomain)) {
    // Redirect to main domain
    const url = new URL(req.url);
    url.hostname = MAIN_DOMAIN;
    return NextResponse.redirect(url, 302);
  }

  // All good, continue
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
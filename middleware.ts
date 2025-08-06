// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const allowedSubs = ["car", "bike", "bicycle"];
const MAIN_DOMAIN = process.env.MAIN_DOMAIN || "localhost"; // Set in production!

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") || "";

  // Remove port from host (e.g., localhost:3000 → localhost)
  const hostname = host.replace(/:\d+$/, "");

  if (
    pathname.match(/\.(.*)$/) ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next();
  }
  // Allow requests to main domain
  if (hostname === MAIN_DOMAIN) {
    if (pathname === "/") {
      const redirectUrl = new URL(req.url);
      redirectUrl.hostname = `bike.${MAIN_DOMAIN}`;
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }
  // Extract subdomain (car.example.com → car)
  const sub = hostname.split(".")[0];

  // Block disallowed subdomains
  if (!allowedSubs.includes(sub)) {
    return new NextResponse("Subdomain not allowed", { status: 403 });
  }

  // ✅ Redirect root path to login page (e.g., / → /car/login)
  if (pathname === "/") {
    req.nextUrl.pathname = `/login`;
    return NextResponse.redirect(req.nextUrl);
  }

  // Rewrite path: /about → /car/about
  req.nextUrl.pathname = `/${sub}${pathname}`;
  return NextResponse.rewrite(req.nextUrl);
}

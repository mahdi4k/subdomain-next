// middleware.ts (Next.js 15+)
// runs on the edge (no fs, etc)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PRIMARY_DOMAIN = 'kiwipart.ir';
const ALLOWED_SUBDOMAINS = new Set(['', 'www', 'car', 'bus', 'byke']); // '' = apex

export function middleware(req: NextRequest) {
  // host may include port (host:port)
  const hostHeader = req.headers.get('host') || '';
  const hostname = hostHeader.split(':')[0].toLowerCase();

  // only operate for your domain; if request is to other host, let it pass
  if (!hostname.endsWith(PRIMARY_DOMAIN)) return NextResponse.next();

  // compute subdomain (empty string for apex or www)
  const sub = hostname === PRIMARY_DOMAIN
    ? ''
    : hostname === `www.${PRIMARY_DOMAIN}`
    ? 'www'
    : hostname.replace(`.${PRIMARY_DOMAIN}`, '');

  // if subdomain not allowed, redirect to primary
  if (!ALLOWED_SUBDOMAINS.has(sub)) {
    // preserve path + query
    const destination = `https://${PRIMARY_DOMAIN}${req.nextUrl.pathname}${req.nextUrl.search}`;
    return NextResponse.redirect(destination, 302);
  }

  return NextResponse.next();
}

// don't run middleware on static assets to reduce overhead
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

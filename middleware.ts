import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const mainDomain = 'kiwipart.ir';
  
  // Check if hostname is NOT the main domain (has subdomain)
  if (hostname !== mainDomain && hostname.endsWith(`.${mainDomain}`)) {
    // Build redirect URL to main domain
    const url = request.nextUrl.clone();
    url.host = mainDomain;
    
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
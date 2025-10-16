import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Split hostname to check for subdomain
  const parts = hostname.split('.');
  
  // If there are more than 2 parts (e.g., car.example.com has 3 parts)
  // or if it has 3+ parts including port (e.g., car.localhost:3000)
  const hasSubdomain = parts.length > 2 || (parts.length === 2 && !hostname.includes('localhost'));
  
  if (hasSubdomain) {
    // Extract main domain (last two parts for standard domains)
    // Handle localhost differently
    let mainDomain;
    
    if (hostname.includes('localhost')) {
      mainDomain = hostname.split('.').slice(-1)[0]; // Get 'localhost:3000'
    } else {
      mainDomain = parts.slice(-2).join('.'); // Get 'example.com'
    }
    
    // Build redirect URL with same protocol and path
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
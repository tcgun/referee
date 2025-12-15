import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // CORS headers for API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        const origin = request.headers.get('origin');
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
        
        // Allow same-origin requests or whitelisted origins
        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
        } else if (!origin) {
            // Same-origin request
            response.headers.set('Access-Control-Allow-Origin', '*');
        }
        
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-admin-key, Authorization');
        response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
        
        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { status: 204, headers: response.headers });
        }
    }

    // Protect admin panel route
    if (request.nextUrl.pathname.startsWith('/admin-secret-panel')) {
        // Optional: Add IP whitelist check here
        // const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        // const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];
        // if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        // }

        // Add security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // General security headers for all routes
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
}

export const config = {
    matcher: [
        '/api/:path*',
        '/admin-secret-panel/:path*',
    ],
};


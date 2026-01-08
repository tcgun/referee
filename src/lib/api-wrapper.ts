import { NextResponse } from 'next/server';
import { verifyAdminKey, verifyAdminToken } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

type ApiHandler = (request: Request) => Promise<NextResponse>;

/**
 * Admin API rotaları için güvenlik katmanı.
 * Rate limiting, Secret Key kontrolü ve Admin Token doğrulamasını sağlar.
 * 
 * Security layer for Admin API routes.
 * Provides rate limiting, Secret Key check, and Admin Token verification.
 * 
 * @param request - Gelen istek
 * @param handler - Çalıştırılacak asıl API işleyicisi
 */
export async function withAdminGuard(
    request: Request,
    handler: ApiHandler
): Promise<NextResponse> {
    try {
        // 1. Rate Limit (İstek Sınırlama)
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(`admin-api:${clientIP}`, 60, 60000); // 60 req/min (Dakikada 60 istek)

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Too many requests', retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000) },
                { status: 429 }
            );
        }

        // 2. Secret Key Check (Layer 1 - Gizli Anahtar Kontrolü)
        const secretKey = request.headers.get('x-admin-key');
        if (!verifyAdminKey(secretKey)) {
            return NextResponse.json({ error: 'Unauthorized: Invalid Secret Key' }, { status: 401 });
        }

        // 3. User Token Check (Layer 2 - Strong Auth / Kullanıcı Token Kontrolü)
        // Eğer ADMIN_UIDS tanımlıysa token doğrulaması zorunludur.
        const authHeader = request.headers.get('Authorization');
        const enforceToken = (process.env.ADMIN_UIDS || '').length > 0;

        if (enforceToken) {
            const token = authHeader?.replace('Bearer ', '');
            if (!token) {
                return NextResponse.json({ error: 'Unauthorized: Missing Admin Token', code: 'MISSING_TOKEN' }, { status: 403 });
            }

            const isValidToken = await verifyAdminToken(token || null);

            if (!isValidToken) {
                return NextResponse.json({ error: 'Unauthorized: Invalid Admin Token (Check UID Whitelist)', code: 'INVALID_TOKEN' }, { status: 403 });
            }
        }

        // 4. Run Handler (İşleyiciyi Çalıştır)
        return await handler(request);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

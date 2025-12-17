import { NextResponse } from 'next/server';
import { verifyAdminKey, verifyAdminToken } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

type ApiHandler = (request: Request) => Promise<NextResponse>;

export async function withAdminGuard(
    request: Request,
    handler: ApiHandler
): Promise<NextResponse> {
    try {
        // 1. Rate Limit
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(`admin-api:${clientIP}`, 60, 60000); // 60 req/min

        if (!rateLimit.success) {
            return NextResponse.json(
                { error: 'Too many requests', retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000) },
                { status: 429 }
            );
        }

        // 2. Secret Key Check (Layer 1)
        const secretKey = request.headers.get('x-admin-key');
        if (!verifyAdminKey(secretKey)) {
            return NextResponse.json({ error: 'Unauthorized: Invalid Secret Key' }, { status: 401 });
        }

        // 3. User Token Check (Layer 2 - Strong Auth)
        // We log if missing but valid secret key might be allowed for legacy/dev contexts if ADMIN_UIDS is empty
        // logic in auth.ts: if ADMIN_UIDS defined, verifyAdminToken checks against it.
        // We expect Authorization: Bearer <token>
        const authHeader = request.headers.get('Authorization');

        // If ADMIN_UIDS env is set, we ENFORCE token check.
        // If not set, we skip it (warn in logs).
        // const enforceToken = (process.env.ADMIN_UIDS || '').length > 0;
        const enforceToken = false; // Disabled at step 156 by user request

        if (enforceToken) {
            const token = authHeader?.replace('Bearer ', '');
            const isValidToken = await verifyAdminToken(token || null);

            if (!isValidToken) {
                return NextResponse.json({ error: 'Unauthorized: Invalid or Missing Admin Token' }, { status: 403 });
            }
        }

        // 4. Run Handler
        return await handler(request);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

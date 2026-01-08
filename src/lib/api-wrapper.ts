/**
 * HOC for protecting API Routes.
 * Enforces Rate Limiting, Admin Key verification, and optional Token verification.
 *
 * @module lib/api-wrapper
 */

import { NextResponse } from 'next/server';
import { verifyAdminKey, verifyAdminToken } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

type ApiHandler = (request: Request) => Promise<NextResponse>;

/**
 * Wraps an API handler with Admin Security Guards.
 *
 * 1. Checks Rate Limit (60 req/min).
 * 2. Checks `x-admin-key` header.
 * 3. Optionally checks `Authorization: Bearer <token>` if ADMIN_UIDS is configured.
 *
 * @param {Request} request - The incoming request.
 * @param {ApiHandler} handler - The actual route handler logic.
 * @returns {Promise<NextResponse>} The response from the handler or an error response.
 */
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
                {
                    error: 'Too many requests',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                },
                { status: 429 }
            );
        }

        // 2. Secret Key Check (Layer 1)
        const secretKey = request.headers.get('x-admin-key');
        if (!verifyAdminKey(secretKey)) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid Secret Key' },
                { status: 401 }
            );
        }

        // 3. User Token Check (Layer 2 - Strong Auth)
        // If ADMIN_UIDS env is set, we ENFORCE token check.
        const authHeader = request.headers.get('Authorization');
        const enforceToken = (process.env.ADMIN_UIDS || '').length > 0;

        if (enforceToken) {
            const token = authHeader?.replace('Bearer ', '').trim();
            if (!token) {
                return NextResponse.json(
                    { error: 'Unauthorized: Missing Admin Token', code: 'MISSING_TOKEN' },
                    { status: 403 }
                );
            }

            const isValidToken = await verifyAdminToken(token || null);

            if (!isValidToken) {
                return NextResponse.json(
                    { error: 'Unauthorized: Invalid Admin Token (Check UID Whitelist)', code: 'INVALID_TOKEN' },
                    { status: 403 }
                );
            }
        }

        // 4. Run Handler
        return await handler(request);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

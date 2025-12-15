import { NextResponse } from 'next/server';
import { firestore } from '@/firebase/admin';
import { verifyAdminKey } from '@/lib/auth';
import { matchSchema } from '@/lib/validations';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
    try {
        // Rate limiting: 20 requests per 10 seconds per IP
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(`admin-api:${clientIP}`, 20, 10000);
        if (!rateLimit.success) {
            return NextResponse.json(
                {
                    error: 'Too many requests',
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': rateLimit.limit.toString(),
                        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
                        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
                    }
                }
            );
        }

        const authHeader = request.headers.get('x-admin-key');
        if (!verifyAdminKey(authHeader)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate with Zod
        const validationResult = matchSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validationResult.error.format()
                },
                { status: 400 }
            );
        }

        const data = validationResult.data;
        await firestore.collection('matches').doc(data.id).set(data);

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        const isDev = process.env.NODE_ENV === 'development';
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';

        console.error('Error adding match:', error);

        return NextResponse.json(
            {
                error: 'Internal Server Error',
                ...(isDev && { details: errorMessage })
            },
            { status: 500 }
        );
    }
}

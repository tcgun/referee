import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';

// Safe debug route for checking environment configuration
export async function GET(request: Request) {
    // Only allow checking if specific query param is present or admin key
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const adminKey = process.env.ADMIN_KEY;

    // Simple security check - requires admin key in query param
    if (!key || key !== adminKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            // Check Env Vars Presence (Safe)
            const envCheck = {
                NODE_ENV: process.env.NODE_ENV,
                FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
                FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
                FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
                // Check key format (length > 100 usually means it's a real key)
                FIREBASE_PRIVATE_KEY_VALID: (process.env.FIREBASE_PRIVATE_KEY?.length || 0) > 100,
                ADMIN_KEY: !!process.env.ADMIN_KEY,
                NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY
            };

            const matchesSnapshot = await firestore.collection('matches').limit(5).get();
            const matches = matchesSnapshot.docs.map(doc => doc.data());

            return NextResponse.json({
                status: 'ok',
                envCheck,
                matchCount: matches.length,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('Debug error:', error);
            return NextResponse.json({
                error: 'Debug failed',
                details: error.message
            }, { status: 500 });
        }
    });
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';

export async function GET(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            const matchesSnapshot = await firestore.collection('matches').limit(5).get();
            const matches = matchesSnapshot.docs.map(doc => doc.data());

            const teamsSnapshot = await firestore.collection('teams').limit(5).get();
            const teams = teamsSnapshot.docs.map(doc => doc.data());

            return NextResponse.json({
                matches,
                teams,
                env: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Debug error:', error);
            return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
        }
    });
}

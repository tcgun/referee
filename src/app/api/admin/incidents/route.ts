import { NextResponse } from 'next/server';
import { firestore } from '@/firebase/admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('x-admin-key');
        if (authHeader !== process.env.ADMIN_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        if (!data.id || !data.matchId) {
            return NextResponse.json({ error: 'Missing matchId or id' }, { status: 400 });
        }

        // Add to subcollection
        await firestore
            .collection('matches')
            .doc(data.matchId)
            .collection('incidents')
            .doc(data.id)
            .set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error adding incident:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

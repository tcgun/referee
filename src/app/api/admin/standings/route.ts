import { NextResponse } from 'next/server';
import { firestore } from '@/firebase/admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('x-admin-key');
        if (authHeader !== process.env.ADMIN_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        if (!data.id) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        // Lookup Team Name
        const teamSnap = await firestore.collection('teams').doc(data.id).get();
        if (teamSnap.exists) {
            data.teamName = teamSnap.data()?.name || data.id;
        } else {
            // Optional: If team not found in seeding, use the ID or provided name
            data.teamName = data.teamName || data.id;
        }

        await firestore.collection('standings').doc(data.id).set(data);

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error adding standing:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

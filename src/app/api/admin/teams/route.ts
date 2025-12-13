import { NextResponse } from 'next/server';
import { firestore } from '@/firebase/admin';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('x-admin-key');
        if (authHeader !== process.env.ADMIN_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();
        // Basic validation
        if (!data.id || !data.name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await firestore.collection('teams').doc(data.id).set(data);

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error adding team:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

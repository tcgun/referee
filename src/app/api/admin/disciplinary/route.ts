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
            data.id = firestore.collection('disciplinary_actions').doc().id;
        }

        await firestore.collection('disciplinary_actions').doc(data.id).set(data);

        return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
        console.error('Error adding disciplinary action:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Provide id param' });

    const db = getAdminDb();

    // 1. Check exact doc
    const docRef = db.collection('matches').doc(id);
    const snap = await docRef.get();

    // 2. List all IDs to check for similarity
    const allSnaps = await db.collection('matches').listDocuments();
    const allIds = allSnaps.map(d => d.id);

    const similar = allIds.filter(x => x.includes('gaziantep'));

    return NextResponse.json({
        searchedFor: id,
        searchedLength: id.length,
        exists: snap.exists,
        similarIds: similar.map(s => ({ id: s, len: s.length })),
        allIdsCount: allIds.length
    });
}

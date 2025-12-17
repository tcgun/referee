import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { incidentSchema } from '@/lib/validations';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const body = await req.json();

        // Allow partial updates
        const validationResult = incidentSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        if (!data.id || !data.matchId) {
            return NextResponse.json({ error: 'ID and Match ID are required' }, { status: 400 });
        }

        await firestore
            .collection('matches')
            .doc(data.matchId)
            .collection('incidents')
            .doc(data.id)
            .set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    });
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('matchId');
        const id = searchParams.get('id');

        console.log(`[DELETE INCIDENT] matchId: ${matchId}, id: ${id}`);

        if (!matchId || !id) {
            return NextResponse.json({ error: 'Match ID and Incident ID are required' }, { status: 400 });
        }

        const firestore = getAdminDb();
        await firestore
            .collection('matches')
            .doc(matchId)
            .collection('incidents')
            .doc(id)
            .delete();

        return NextResponse.json({ success: true });
    });
}

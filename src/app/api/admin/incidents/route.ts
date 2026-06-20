import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { incidentSchema } from '@/lib/validations';
import { getCachedMatches, writeLocalMatches, invalidateCache } from '@/lib/cache';
import { Incident } from '@/types';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
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

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const matches = await getCachedMatches();
            const matchIdx = matches.findIndex(m => m.id === data.matchId);
            if (matchIdx === -1) {
                return NextResponse.json({ error: 'Match not found' }, { status: 404 });
            }

            const match = matches[matchIdx]!;
            const incidents = (match as any).incidents || [];
            const existingIdx = incidents.findIndex((inc: any) => inc.id === data.id);

            const cleanIncident = data as Incident;

            if (existingIdx > -1) {
                incidents[existingIdx] = { ...incidents[existingIdx], ...cleanIncident };
            } else {
                incidents.push(cleanIncident);
            }

            (match as any).incidents = incidents;
            matches[matchIdx] = match;

            writeLocalMatches(matches);
            invalidateCache();
            return NextResponse.json({ success: true, id: data.id });
        }

        const firestore = getAdminDb();
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
        const { searchParams } = new URL(req.url);
        const matchId = searchParams.get('matchId');
        const id = searchParams.get('id');

        console.log(`[DELETE INCIDENT] matchId: ${matchId}, id: ${id}`);

        if (!matchId || !id) {
            return NextResponse.json({ error: 'Match ID and Incident ID are required' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const matches = await getCachedMatches();
            const matchIdx = matches.findIndex(m => m.id === matchId);
            if (matchIdx > -1) {
                const match = matches[matchIdx]!;
                const incidents = (match as any).incidents || [];
                (match as any).incidents = incidents.filter((inc: any) => inc.id !== id);
                matches[matchIdx] = match;
                writeLocalMatches(matches);
                invalidateCache();
            }
            return NextResponse.json({ success: true });
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

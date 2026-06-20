import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { opinionSchema } from '@/lib/validations';
import { getCachedMatches, writeLocalMatches, invalidateCache } from '@/lib/cache';
import { Opinion } from '@/types';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const body = await req.json();

        // Allow partial updates
        const validationResult = opinionSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        if (!data.id || !data.matchId || !data.incidentId) {
            return NextResponse.json({ error: 'ID, Match ID and Incident ID are required' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const matches = await getCachedMatches();
            const matchIdx = matches.findIndex(m => m.id === data.matchId);
            if (matchIdx === -1) {
                return NextResponse.json({ error: 'Match not found' }, { status: 404 });
            }

            const match = matches[matchIdx]!;
            const incidents = (match as any).incidents || [];
            const incidentIdx = incidents.findIndex((inc: any) => inc.id === data.incidentId);
            if (incidentIdx === -1) {
                return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
            }

            const incident = incidents[incidentIdx];
            const opinions = incident.opinions || [];
            const existingIdx = opinions.findIndex((op: any) => op.id === data.id);

            const cleanOpinion = data as Opinion;

            if (existingIdx > -1) {
                opinions[existingIdx] = { ...opinions[existingIdx], ...cleanOpinion };
            } else {
                opinions.push(cleanOpinion);
            }

            incident.opinions = opinions;
            incidents[incidentIdx] = incident;
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
            .doc(data.incidentId)
            .collection('opinions')
            .doc(data.id)
            .set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    });
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const { searchParams } = new URL(request.url);
        const matchId = searchParams.get('matchId');
        const incidentId = searchParams.get('incidentId');
        const id = searchParams.get('id');

        console.log(`[DELETE OPINION] matchId: ${matchId}, incidentId: ${incidentId}, id: ${id}`);

        if (!matchId || !incidentId || !id) {
            return NextResponse.json({ error: 'Match, Incident, and Opinion IDs are required' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const matches = await getCachedMatches();
            const matchIdx = matches.findIndex(m => m.id === matchId);
            if (matchIdx > -1) {
                const match = matches[matchIdx]!;
                const incidents = (match as any).incidents || [];
                const incidentIdx = incidents.findIndex((inc: any) => inc.id === incidentId);
                if (incidentIdx > -1) {
                    const incident = incidents[incidentIdx];
                    const opinions = incident.opinions || [];
                    incident.opinions = opinions.filter((op: any) => op.id !== id);
                    incidents[incidentIdx] = incident;
                    (match as any).incidents = incidents;
                    matches[matchIdx] = match;
                    writeLocalMatches(matches);
                    invalidateCache();
                }
            }
            return NextResponse.json({ success: true });
        }

        const firestore = getAdminDb();
        await firestore
            .collection('matches')
            .doc(matchId)
            .collection('incidents')
            .doc(incidentId)
            .collection('opinions')
            .doc(id)
            .delete();

        return NextResponse.json({ success: true });
    });
}

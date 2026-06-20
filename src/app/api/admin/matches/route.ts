import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { matchSchema } from '@/lib/validations';
import { v4 as uuidv4 } from 'uuid';
import { invalidateCache, getCachedMatches, writeLocalMatches } from '@/lib/cache';
import { Match } from '@/types';

export async function GET(request: Request) {
    return withAdminGuard(request, async (req) => {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        console.log(`[API] Fetching match id: "${id}" (len: ${id.length})`); // DEBUG LOG

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const matches = await getCachedMatches();
            const match = matches.find(m => m.id === id);
            if (!match) {
                return NextResponse.json({ error: 'Match not found' }, { status: 404 });
            }
            return NextResponse.json(match);
        }

        const firestore = getAdminDb();
        const snap = await firestore.collection('matches').doc(id).get();
        if (!snap.exists) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        return NextResponse.json({ id: snap.id, ...snap.data() });
    });
}

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const body = await req.json();

        // Allow partial updates for flexibility
        const validationResult = matchSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        if (!data.id) {
            return NextResponse.json({ error: 'ID is required for update/create' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const matches = await getCachedMatches();
            const existingIdx = matches.findIndex(m => m.id === data.id);
            
            let mergedMatch: Match;
            if (existingIdx > -1) {
                mergedMatch = { ...matches[existingIdx], ...data } as Match;
                matches[existingIdx] = mergedMatch;
            } else {
                mergedMatch = data as Match;
                matches.push(mergedMatch);
            }

            writeLocalMatches(matches);
            invalidateCache();
            return NextResponse.json({ success: true, id: data.id });
        }

        const firestore = getAdminDb();
        await firestore.collection('matches').doc(data.id).set(data, { merge: true });
        invalidateCache();
        return NextResponse.json({ success: true, id: data.id });
    });
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const matches = await getCachedMatches();
            const filtered = matches.filter(m => m.id !== id);
            writeLocalMatches(filtered);
            invalidateCache();
            return NextResponse.json({ success: true });
        }

        const firestore = getAdminDb();
        const matchRef = firestore.collection('matches').doc(id);

        /** 
         * RECURSIVE DELETE: 
         * Firestore doesn't delete sub-collections automatically.
         * We need to manually delete incidents and their opinions.
         */

        // 1. Get all incidents
        const incidentsSnap = await matchRef.collection('incidents').get();

        // 2. Process all incidents in parallel
        await Promise.all(incidentsSnap.docs.map(async (incDoc) => {
            // 3. Get and delete all opinions for each incident in parallel
            const opinionsSnap = await incDoc.ref.collection('opinions').get();
            await Promise.all(opinionsSnap.docs.map(opDoc => opDoc.ref.delete()));

            // 4. Delete the incident document
            await incDoc.ref.delete();
        }));

        // 5. Finally delete the match document itself
        await matchRef.delete();
        invalidateCache();

        return NextResponse.json({ success: true });
    });
}

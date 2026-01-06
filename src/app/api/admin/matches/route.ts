import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { matchSchema } from '@/lib/validations';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        console.log(`[API] Fetching match id: "${id}" (len: ${id.length})`); // DEBUG LOG

        const snap = await firestore.collection('matches').doc(id).get();
        if (!snap.exists) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        return NextResponse.json({ id: snap.id, ...snap.data() });
    });
}

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const body = await req.json();

        // Allow partial updates for flexibility
        const validationResult = matchSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        // Ensure ID presence (if new doc, use provided or generate?)
        // Schema checks ID existence, but if partial, maybe ID is missing?
        // Basic rule: ID must be known to update/create.
        if (!data.id) {
            // Check if we can generate one or if it's required. Schema says required string.
            // If user sends partial without ID, we can't update.
            return NextResponse.json({ error: 'ID is required for update/create' }, { status: 400 });
        }

        await firestore.collection('matches').doc(data.id).set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    });
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const matchRef = firestore.collection('matches').doc(id);

        /** 
         * RECURSIVE DELETE: 
         * Firestore doesn't delete sub-collections automatically.
         * We need to manually delete incidents and their opinions.
         */

        // 1. Get all incidents
        const incidentsSnap = await matchRef.collection('incidents').get();
        for (const incDoc of incidentsSnap.docs) {
            // 2. Get all opinions for each incident
            const opinionsSnap = await incDoc.ref.collection('opinions').get();
            for (const opDoc of opinionsSnap.docs) {
                await opDoc.ref.delete();
            }
            // 3. Delete the incident document
            await incDoc.ref.delete();
        }

        // 4. Finally delete the match document itself
        await matchRef.delete();

        return NextResponse.json({ success: true });
    });
}

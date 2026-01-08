/**
 * API Route for Match Management.
 * Handles GET, POST (Create/Update), and DELETE operations for Matches.
 * Secured with Admin Guard and validated with Zod schemas.
 *
 * @module api/admin/matches
 */

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { matchSchema } from '@/lib/validations';

/**
 * GET: Retrieve a specific match by ID.
 * @param {Request} request
 * @returns {Promise<NextResponse>} Match data or error.
 */
export async function GET(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const snap = await firestore.collection('matches').doc(id).get();
        if (!snap.exists) {
            return NextResponse.json({ error: 'Match not found' }, { status: 404 });
        }

        return NextResponse.json({ id: snap.id, ...snap.data() });
    });
}

/**
 * POST: Create or Update a match.
 * Validates input using `matchSchema` (partial allowed for updates).
 * Uses `set` with `merge: true`.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>} Success status and ID.
 */
export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        // Allow partial updates for flexibility
        const validationResult = matchSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;

        if (!data.id) {
            return NextResponse.json({ error: 'ID is required for update/create' }, { status: 400 });
        }

        // Security: Strip out any fields that shouldn't be manually set if any (Schema handles most)
        // Here we trust the Admin schema validation.

        await firestore.collection('matches').doc(data.id).set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    });
}

/**
 * DELETE: Deletes a match and its sub-collections (incidents, opinions).
 * Performs a recursive delete since Firestore shallow deletes by default.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>} Success status.
 */
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

        try {
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
        } catch (error) {
            console.error('Delete operation failed:', error);
            return NextResponse.json({ error: 'Failed to delete match completely' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    });
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { matchSchema } from '@/lib/validations';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const body = await req.json();

        if (!body || !Array.isArray(body.matches)) {
            return NextResponse.json({ error: 'Matches array is required' }, { status: 400 });
        }

        const matches = body.matches as Array<{ id?: string }>;
        console.log(`[BULK API] Processing bulk save for ${matches.length} matches`);

        const matchesCol = firestore.collection('matches');

        // Extract IDs to fetch existing documents first to preserve entered information
        const docRefs = matches.map((m) => {
            const id = m.id || '';
            return matchesCol.doc(id);
        }).filter((ref): ref is FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> => !!ref.id);

        const existingMap = new Map<string, FirebaseFirestore.DocumentData>();
        if (docRefs.length > 0) {
            try {
                const snapshots = await firestore.getAll(...docRefs);
                snapshots.forEach((snap) => {
                    const data = snap.data();
                    if (snap.exists && data) {
                        existingMap.set(snap.id, data);
                    }
                });
            } catch (err) {
                console.error('[BULK API] Failed to fetch existing documents:', err);
                // Continue without existing mapping if query fails
            }
        }

        const batch = firestore.batch();

        for (const match of matches) {
            // Validate match ID
            if (!match.id) {
                return NextResponse.json({ error: 'Each match must have an ID' }, { status: 400 });
            }

            // Partially validate the schema
            const validationResult = matchSchema.partial().safeParse(match);
            if (!validationResult.success) {
                return NextResponse.json({ 
                    error: `Validation failed for match ID: ${match.id}`, 
                    details: validationResult.error.format() 
                }, { status: 400 });
            }

            const cleanData = validationResult.data;
            const existingData = existingMap.get(cleanData.id!);

            let mergedData = { ...cleanData };

            if (existingData) {
                // Start with the existing database data to preserve everything (stats, officials, lineups, refereeStats, etc.)
                mergedData = {
                    ...existingData,
                    ...cleanData,
                };

                // If new payload contains empty strings for stadium/referee/varReferee, preserve the existing DB data
                if (existingData.stadium && (!cleanData.stadium || cleanData.stadium.trim() === '')) {
                    mergedData.stadium = existingData.stadium;
                }
                if (existingData.referee && (!cleanData.referee || cleanData.referee.trim() === '')) {
                    mergedData.referee = existingData.referee;
                }
                if (existingData.varReferee && (!cleanData.varReferee || cleanData.varReferee.trim() === '')) {
                    mergedData.varReferee = existingData.varReferee;
                }

                // If existing match has a non-draft status, keep it
                if (existingData.status && existingData.status !== 'draft' && cleanData.status === 'draft') {
                    mergedData.status = existingData.status;
                }

                // If existing match has a custom competition type, keep it
                if (existingData.competition && cleanData.competition === 'league') {
                    mergedData.competition = existingData.competition;
                }

                // If the new payload does NOT define a score, but the database already has a score, keep the DB score
                if (!cleanData.score && existingData.score) {
                    mergedData.score = existingData.score;
                    mergedData.homeScore = existingData.homeScore;
                    mergedData.awayScore = existingData.awayScore;
                }
            }

            const docRef = matchesCol.doc(cleanData.id!);
            batch.set(docRef, mergedData, { merge: true });
        }

        await batch.commit();
        console.log(`[BULK API] Successfully saved ${matches.length} matches`);

        return NextResponse.json({ success: true, count: matches.length });
    });
}


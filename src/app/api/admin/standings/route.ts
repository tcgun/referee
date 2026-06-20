import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { standingSchema } from '@/lib/validations';
import { Standing } from '@/types';
import { getCachedStandings, writeLocalStandings, invalidateCache } from '@/lib/cache';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        try {
            const body = await req.json();

            if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
                const localStandings = await getCachedStandings();
                const updatedStandings = [...localStandings];
                const results = [];

                if (Array.isArray(body)) {
                    for (const item of body) {
                        const validationResult = standingSchema.partial().safeParse(item);
                        if (!validationResult.success) {
                            return NextResponse.json({
                                error: 'Validation failed for item: ' + (item.id || 'unknown'),
                                details: validationResult.error.format()
                            }, { status: 400 });
                        }

                        const data = validationResult.data;
                        if (!data.id) {
                            return NextResponse.json({ error: 'ID is required for all items' }, { status: 400 });
                        }

                        const existingIdx = updatedStandings.findIndex(s => s.id === data.id);
                        if (existingIdx > -1) {
                            updatedStandings[existingIdx] = { ...updatedStandings[existingIdx], ...data } as Standing;
                        } else {
                            const fullStanding: Standing = {
                                id: data.id,
                                teamName: data.teamName || '',
                                played: data.played || 0,
                                won: data.won || 0,
                                drawn: data.drawn || 0,
                                lost: data.lost || 0,
                                goalsFor: data.goalsFor || 0,
                                goalsAgainst: data.goalsAgainst || 0,
                                goalDiff: data.goalDiff || 0,
                                points: data.points || 0,
                                rank: data.rank,
                                season: data.season
                            };
                            updatedStandings.push(fullStanding);
                        }
                        results.push(data.id);
                    }

                    writeLocalStandings(updatedStandings);
                    invalidateCache();
                    return NextResponse.json({ success: true, count: results.length, ids: results });
                }

                // Handle single item update
                const validationResult = standingSchema.partial().safeParse(body);
                if (!validationResult.success) {
                    return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
                }

                const data = validationResult.data;
                if (!data.id) {
                    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
                }

                const existingIdx = updatedStandings.findIndex(s => s.id === data.id);
                if (existingIdx > -1) {
                    updatedStandings[existingIdx] = { ...updatedStandings[existingIdx], ...data } as Standing;
                } else {
                    const fullStanding: Standing = {
                        id: data.id,
                        teamName: data.teamName || '',
                        played: data.played || 0,
                        won: data.won || 0,
                        drawn: data.drawn || 0,
                        lost: data.lost || 0,
                        goalsFor: data.goalsFor || 0,
                        goalsAgainst: data.goalsAgainst || 0,
                        goalDiff: data.goalDiff || 0,
                        points: data.points || 0,
                        rank: data.rank,
                        season: data.season
                    };
                    updatedStandings.push(fullStanding);
                }

                writeLocalStandings(updatedStandings);
                invalidateCache();
                return NextResponse.json({ success: true, id: data.id });
            }

            const firestore = getAdminDb();

            // Handle bulk updates (array)
            if (Array.isArray(body)) {
                const batch = firestore.batch();
                const results = [];

                for (const item of body) {
                    const validationResult = standingSchema.partial().safeParse(item);
                    if (!validationResult.success) {
                        return NextResponse.json({
                            error: 'Validation failed for item: ' + (item.id || 'unknown'),
                            details: validationResult.error.format()
                        }, { status: 400 });
                    }

                    const data = validationResult.data;
                    if (!data.id) {
                        return NextResponse.json({ error: 'ID is required for all items' }, { status: 400 });
                    }

                    const docRef = firestore.collection('standings').doc(data.id);
                    batch.set(docRef, data, { merge: true });
                    results.push(data.id);
                }

                await batch.commit();
                invalidateCache();
                return NextResponse.json({ success: true, count: results.length, ids: results });
            }

            // Handle single item update (existing logic)
            const validationResult = standingSchema.partial().safeParse(body);
            if (!validationResult.success) {
                return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
            }

            const data = validationResult.data;
            if (!data.id) {
                return NextResponse.json({ error: 'ID is required' }, { status: 400 });
            }

            await firestore.collection('standings').doc(data.id).set(data, { merge: true });
            invalidateCache();

            return NextResponse.json({ success: true, id: data.id });
        } catch (error: any) {
            console.error('Error saving standing:', error);
            return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
        }
    });
}

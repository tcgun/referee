import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, Opinion } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const firestore = getAdminDb();

        // 1. PFDK Summary (Last 7 Days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const dateStr = oneWeekAgo.toISOString().split('T')[0];

        const pfdkSnapshot = await firestore
            .collection('disciplinary_actions')
            .where('date', '>=', dateStr)
            .get();

        const pfdkCount = pfdkSnapshot.size;

        // 2. Fetch All Matches temporarily (to avoid collectionGroup index)
        // In production with thousands of matches, this should be paginated or limited to current season.
        const matchesSnap = await firestore.collection('matches').get();
        console.log(`Stats API: Found ${matchesSnap.size} matches`);
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));

        let maxControversialCount = 0;
        let mostControversialMatchName = '-';

        const refereeErrorCounts: Record<string, number> = {};

        // 3. Iterate Matches to calc stats
        // This avoids 'collectionGroup' index requirements by doing N reads (parallelized)
        // Limit to recent matches if needed for performance, but for now we process all.

        const promises = matches.map(async (match) => {
            const opinionsSnap = await firestore
                .collection('matches')
                .doc(match.id)
                .collection('opinions')
                .get();

            let matchControversialCount = 0;
            const viewedIncidents = new Set<string>();

            opinionsSnap.forEach(doc => {
                const op = doc.data() as Opinion;
                const incidentId = op.incidentId || 'unknown';

                // Count Controversial
                if (op.judgment === 'controversial') {
                    // We count distinct incidents if possible, or total opinions?
                    // Previous logic: Count unique incidents that have at least one 'controversial' opinion.
                    // A bit hard to do perfectly without fetching incidents, but let's assume raw count of controversial opinions is a good enough proxy OR track incident IDs.
                    if (!viewedIncidents.has(incidentId)) {
                        matchControversialCount++;
                        viewedIncidents.add(incidentId);
                    }
                }

                // Count Referee Errors
                if (op.judgment === 'incorrect') {
                    if (match.referee) {
                        refereeErrorCounts[match.referee] = (refereeErrorCounts[match.referee] || 0) + 1;
                    }
                }
            });

            if (matchControversialCount > maxControversialCount) {
                maxControversialCount = matchControversialCount;
                mostControversialMatchName = `${match.homeTeamName} - ${match.awayTeamName}`;
            }
        });

        await Promise.all(promises);


        // Find Most Error Referee
        let mostErrorReferee = '-';
        let maxErrorCount = 0;
        Object.entries(refereeErrorCounts).forEach(([ref, count]) => {
            if (count > maxErrorCount) {
                maxErrorCount = count;
                mostErrorReferee = ref;
            }
        });

        return NextResponse.json({
            controversial: {
                matchName: mostControversialMatchName,
                count: maxControversialCount
            },
            referee: {
                name: mostErrorReferee,
                count: maxErrorCount
            },
            pfdk: {
                count: pfdkCount
            }
        });

    } catch (error: any) {
        console.error('Stats Error:', error);
        return NextResponse.json({
            error: 'Failed to calc stats',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, Opinion } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const firestore = getAdminDb();
        const matchesSnap = await firestore.collection('matches').get();
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));

        const refereeStats: Record<string, {
            name: string;
            matches: number;
            errors: number;
            controversial: number;
            correct: number;
        }> = {};

        // Parallel fetch for opinions
        const promises = matches.map(async (match) => {
            if (!match.referee) return;
            const refName = match.referee;

            if (!refereeStats[refName]) {
                refereeStats[refName] = { name: refName, matches: 0, errors: 0, controversial: 0, correct: 0 };
            }

            // We increment match count once per match (obviously)
            // Race condition if multiple matches processed for same referee in parallel?
            // JS is single threaded event loop, but the map/async structure means we modify the object.
            // Since we are modifying a shared object in callbacks, we need to be careful? 
            // Actually, `await` yields, but the execution of the callback logic (aggregation) happens synchronously after the await.
            // However, to be safe and cleaner, let's just modify the object.

            // NOTE: We only want to count the match ONCE per referee.
            // But we are iterating matches, so we visit each match once.
            refereeStats[refName].matches += 1;

            const opinionsSnap = await firestore
                .collection('matches')
                .doc(match.id)
                .collection('opinions')
                .get();

            opinionsSnap.forEach(doc => {
                const op = doc.data() as Opinion;
                if (op.judgment === 'incorrect') refereeStats[refName].errors += 1;
                else if (op.judgment === 'controversial') refereeStats[refName].controversial += 1;
                else if (op.judgment === 'correct') refereeStats[refName].correct += 1;
            });
        });

        await Promise.all(promises);

        // Convert to array and sort by match count (desc) then errors (desc)
        const statsArray = Object.values(refereeStats).sort((a, b) => b.matches - a.matches || b.errors - a.errors);

        return NextResponse.json(statsArray);

    } catch (error: any) {
        console.error('Referee Stats Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

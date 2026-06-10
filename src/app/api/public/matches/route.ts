import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, Opinion } from '@/types';
import { unstable_cache } from 'next/cache';

interface MatchGroupedOpinions {
    matchId: string;
    matchName: string;
    week?: number;
    homeTeam?: string;
    awayTeam?: string;
    score?: string;
    opinions: Opinion[];
    againstCount?: number;
    date?: string;
}

// 1. Cache the initial weeks list logic
const getCachedInitialWeeks = unstable_cache(
    async (season: string) => {
        const firestore = getAdminDb();
        const matchesSnap = await firestore
            .collection('matches')
            .where('competition', '==', 'league')
            .get();

        const docs = matchesSnap.docs.filter(d => (d.data().season || '2025-2026') === season);
        // Sort descending by week
        docs.sort((a, b) => (b.data().week || 0) - (a.data().week || 0));

        let maxWeek = 1;
        if (docs.length > 0) {
            maxWeek = docs[0].data().week || 1;
        }

        const weeks = Array.from(new Set(docs.map(d => d.data().week))).filter(Boolean) as number[];
        // Sort descending
        weeks.sort((a, b) => b - a);

        return { weeks, maxWeek };
    },
    ['matches-initial-weeks'],
    { revalidate: 1800 }
);

// 2. Cache the actual matches list query
const getCachedMatches = unstable_cache(
    async (season: string, competition: string, week: number | null) => {
        const firestore = getAdminDb();
        let query: any = firestore.collection('matches').where('competition', '==', competition);

        if (competition === 'league' && week !== null) {
            query = query.where('week', '==', week);
        }

        const snap = await query.get();
        // In-memory filter by season
        const filteredDocs = snap.docs.filter((doc: any) => (doc.data().season || '2025-2026') === season);

        // Sort by date or week
        if (competition === 'league') {
            filteredDocs.sort((a: any, b: any) => (a.data().date || '').localeCompare(b.data().date || ''));
        } else {
            filteredDocs.sort((a: any, b: any) => (b.data().date || '').localeCompare(a.data().date || ''));
        }

        const matchesData = await Promise.all(filteredDocs.map(async (mDoc: any) => {
            const mData = mDoc.data() as Match;
            const matchId = mDoc.id;

            // Fetch Opinions: in firestore-admin, collectionGroup queries are very fast
            const opinionsSnap = await firestore.collectionGroup('opinions').where('matchId', '==', matchId).get();
            const opinions = opinionsSnap.docs.map(d => d.data() as Opinion);

            // Fetch Incidents to calculate againstCount
            const incSnap = await firestore.collection('matches').doc(matchId).collection('incidents').get();
            let againstCount = 0;
            for (const incDoc of incSnap.docs) {
                const opsSnap = await firestore.collection('matches').doc(matchId).collection('incidents').doc(incDoc.id).collection('opinions').get();
                const hasIncorrect = opsSnap.docs.some(o => o.data().judgment === 'incorrect');
                if (hasIncorrect) againstCount++;
            }

            const hScore = mData.homeScore !== undefined ? mData.homeScore : '-';
            const aScore = mData.awayScore !== undefined ? mData.awayScore : '-';
            const displayScore = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (mData.score && mData.score !== 'v' ? mData.score : 'vs');

            return {
                matchId,
                matchName: mData.homeTeamName && mData.awayTeamName ? `${mData.homeTeamName} - ${mData.awayTeamName}` : mData.id,
                week: mData.week,
                homeTeam: mData.homeTeamName,
                awayTeam: mData.awayTeamName,
                score: displayScore,
                opinions,
                againstCount,
                date: mData.date as string
            } as MatchGroupedOpinions;
        }));

        return matchesData;
    },
    ['matches-grouped-list'],
    { revalidate: 1800 }
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const season = searchParams.get('season') || '2025-2026';
        const init = searchParams.get('init') === 'true';

        if (init) {
            const data = await getCachedInitialWeeks(season);
            return NextResponse.json(data);
        }

        const competition = searchParams.get('competition') || 'league';
        const weekParam = searchParams.get('week');
        const week = weekParam ? parseInt(weekParam) : null;

        const data = await getCachedMatches(season, competition, week);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Public Matches API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch matches data',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

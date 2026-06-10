import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Opinion, Match } from '@/types';
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
}

const getCachedCritics = unstable_cache(
    async (season: string) => {
        const firestore = getAdminDb();
        const genQ = firestore.collectionGroup('opinions').where('type', '==', 'general');
        const querySnapshot = await genQ.get();

        const groups: { [key: string]: MatchGroupedOpinions } = {};
        for (const d of querySnapshot.docs) {
            const parts = d.ref.path.split('/');
            const matchId = parts[1];
            if (!matchId) continue;

            if (!groups[matchId]) {
                groups[matchId] = { matchId, matchName: 'Yükleniyor...', opinions: [], againstCount: 0 };
            }
            const opinionData = d.data() as Opinion;
            groups[matchId].opinions.push(opinionData);
        }

        const matchIds = Object.keys(groups);
        const filteredGroups: MatchGroupedOpinions[] = [];

        if (matchIds.length > 0) {
            await Promise.all(matchIds.map(async (mid) => {
                try {
                    const mSnap = await firestore.collection('matches').doc(mid).get();
                    if (mSnap.exists) {
                        const mData = mSnap.data() as Match;
                        // Season filter
                        if ((mData.season || '2025-2026') !== season) return;

                        groups[mid].matchName = `${mData.week}. Hafta: ${mData.homeTeamName} - ${mData.awayTeamName}`;
                        groups[mid].week = mData.week;
                        groups[mid].homeTeam = mData.homeTeamName;
                        groups[mid].awayTeam = mData.awayTeamName;

                        const hScore = mData.homeScore !== undefined ? mData.homeScore : '-';
                        const aScore = mData.awayScore !== undefined ? mData.awayScore : '-';
                        groups[mid].score = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (mData.score || 'v');

                        const incSnap = await firestore.collection('matches').doc(mid).collection('incidents').get();
                        let againstCount = 0;
                        for (const incDoc of incSnap.docs) {
                            const opsSnap = await firestore.collection('matches').doc(mid).collection('incidents').doc(incDoc.id).collection('opinions').get();
                            const hasIncorrect = opsSnap.docs.some(o => o.data().judgment === 'incorrect');
                            if (hasIncorrect) againstCount++;
                        }
                        groups[mid].againstCount = againstCount;
                        filteredGroups.push(groups[mid]);
                    }
                } catch (e) {
                    console.error(`Error processing critics match ${mid}:`, e);
                }
            }));
        }

        return filteredGroups.sort((a, b) => (b.week || 0) - (a.week || 0));
    },
    ['critics-opinions'],
    { revalidate: 1800 } // Cache for 30 minutes
);

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const season = searchParams.get('season') || '2025-2026';

        const data = await getCachedCritics(season);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Public Critics API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch critics data',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

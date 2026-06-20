import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, Opinion } from '@/types';
import { unstable_cache } from 'next/cache';
import { getCachedMatches as getCachedMatchesLocal, getCachedDisciplinaryActions as getCachedDisciplinaryActionsLocal } from '@/lib/cache';

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
        const id = searchParams.get('id');
        const raw = searchParams.get('raw') === 'true';

        if (raw) {
            const season = searchParams.get('season') || '2025-2026';
            const weekParam = searchParams.get('week');
            const week = weekParam ? parseInt(weekParam) : null;
            const competition = searchParams.get('competition') || 'league';

            if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
                const localMatches = await getCachedMatchesLocal();
                let filtered = localMatches.filter(m => (m.season || '2025-2026') === season && (m.competition || 'league') === competition);
                if (competition === 'league' && week !== null) {
                    filtered = filtered.filter(m => m.week === week);
                }
                const list = filtered.map(m => ({
                    ...m,
                    hasIncidents: !!((m as any).incidents && (m as any).incidents.length > 0)
                }));
                return NextResponse.json(list);
            } else {
                const firestore = getAdminDb();
                let query: any = firestore.collection('matches').where('competition', '==', competition);
                if (competition === 'league' && week !== null) {
                    query = query.where('week', '==', week);
                }
                const snap = await query.get();
                const filteredDocs = snap.docs.filter((doc: any) => (doc.data().season || '2025-2026') === season);
                const list = await Promise.all(filteredDocs.map(async (d: any) => {
                    const matchData = { id: d.id, ...d.data() } as any;
                    const incSnap = await firestore.collection('matches').doc(d.id).collection('incidents').limit(1).get();
                    matchData.hasIncidents = !incSnap.empty;
                    return matchData;
                }));
                return NextResponse.json(list);
            }
        }

        if (id) {
            // Fetch single match details
            if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
                const matches = await getCachedMatchesLocal();
                const match = matches.find(m => m.id === id);
                if (!match) {
                    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
                }
                const incidents = (match as any).incidents || [];
                const allDisciplinary = await getCachedDisciplinaryActionsLocal();
                const disciplinaryActions = allDisciplinary.filter(a => a.matchId === id || a.matchId === `d-${id}`);

                return NextResponse.json({
                    match,
                    incidents,
                    disciplinaryActions
                });
            } else {
                const firestore = getAdminDb();
                const matchSnap = await firestore.collection('matches').doc(id).get();
                if (!matchSnap.exists) {
                    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
                }
                const matchData = { id: matchSnap.id, ...matchSnap.data() } as Match;

                // Fetch incidents and opinions
                const incSnap = await firestore.collection('matches').doc(id).collection('incidents').get();
                const incidents = await Promise.all(incSnap.docs.map(async (incDoc) => {
                    const incData = { id: incDoc.id, ...incDoc.data() } as any;
                    const opSnap = await firestore.collection('matches').doc(id).collection('incidents').doc(incDoc.id).collection('opinions').get();
                    incData.opinions = opSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    return incData;
                }));

                // Sort incidents by minute
                incidents.sort((a, b) => {
                    const parse = (m: string | number) => {
                        if (typeof m === 'number') return m;
                        if (typeof m === 'string' && m.includes('+')) {
                            const [base, ext] = m.split('+').map(Number);
                            return base + (ext / 100);
                        }
                        return parseFloat(m as string) || 0;
                    };
                    return parse(a.minute) - parse(b.minute);
                });

                // Fetch disciplinary
                const pfdkSnap = await firestore.collection('disciplinary_actions').where('matchId', 'in', [id, `d-${id}`]).get();
                const disciplinaryActions = pfdkSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                return NextResponse.json({
                    match: matchData,
                    incidents,
                    disciplinaryActions
                });
            }
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const season = searchParams.get('season') || '2025-2026';
            const init = searchParams.get('init') === 'true';

            const localMatches = await getCachedMatchesLocal();

            if (init) {
                const docs = localMatches.filter(d => (d.season || '2025-2026') === season);
                docs.sort((a, b) => (b.week || 0) - (a.week || 0));

                let maxWeek = 1;
                if (docs.length > 0) {
                    maxWeek = docs[0].week || 1;
                }

                const weeks = Array.from(new Set(docs.map(d => d.week))).filter(Boolean) as number[];
                weeks.sort((a, b) => b - a);

                return NextResponse.json({ weeks, maxWeek });
            }

            const competition = searchParams.get('competition') || 'league';
            const weekParam = searchParams.get('week');
            const week = weekParam ? parseInt(weekParam) : null;

            let filtered = localMatches.filter(m => (m.season || '2025-2026') === season && (m.competition || 'league') === competition);
            if (competition === 'league' && week !== null) {
                filtered = filtered.filter(m => m.week === week);
            }

            if (competition === 'league') {
                filtered.sort((a, b) => (a.date as string || '').localeCompare(b.date as string || ''));
            } else {
                filtered.sort((a, b) => (b.date as string || '').localeCompare(a.date as string || ''));
            }

            const matchesData = filtered.map(m => {
                const incidents = (m as any).incidents || [];
                const opinions: Opinion[] = [];
                let againstCount = 0;

                for (const inc of incidents) {
                    opinions.push(...(inc.opinions || []));
                    const hasIncorrect = (inc.opinions || []).some((o: any) => o.judgment === 'incorrect');
                    if (hasIncorrect) againstCount++;
                }

                const hScore = m.homeScore !== undefined ? m.homeScore : '-';
                const aScore = m.awayScore !== undefined ? m.awayScore : '-';
                const displayScore = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (m.score && m.score !== 'v' ? m.score : 'vs');

                return {
                    matchId: m.id,
                    matchName: m.homeTeamName && m.awayTeamName ? `${m.homeTeamName} - ${m.awayTeamName}` : m.id,
                    week: m.week,
                    homeTeam: m.homeTeamName,
                    awayTeam: m.awayTeamName,
                    score: displayScore,
                    opinions,
                    againstCount,
                    date: m.date
                };
            });

            return NextResponse.json(matchesData);
        }

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

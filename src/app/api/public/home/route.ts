import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Opinion, Match, DisciplinaryAction, Statement, Standing } from '@/types';
import { getCachedMatches, getCachedDisciplinaryActions, getCachedStatements, getCachedStandings } from '@/lib/cache';

export const revalidate = 1800; // Cache for 30 minutes

interface GroupedOpinion {
  matchId: string;
  matchName: string;
  week?: number;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;
  opinions: Opinion[];
  againstCount?: number;
}

export async function GET() {
    try {
        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const allMatches = await getCachedMatches();
            
            const getLocalGroupedOpinions = (matchesList: Match[], type: 'trio' | 'general') => {
                const groups: { [key: string]: GroupedOpinion } = {};
                for (const m of matchesList) {
                    const incidents = (m as any).incidents || [];
                    const matchOpinions: Opinion[] = [];
                    let againstCount = 0;

                    for (const inc of incidents) {
                        const opinions = inc.opinions || [];
                        const typeOpinions = opinions.filter((o: any) => (o.type || 'trio') === type);
                        matchOpinions.push(...typeOpinions);

                        const hasIncorrect = opinions.some((o: any) => o.judgment === 'incorrect');
                        if (hasIncorrect) againstCount++;
                    }

                    if (matchOpinions.length > 0) {
                        const hScore = m.homeScore !== undefined ? m.homeScore : '-';
                        const aScore = m.awayScore !== undefined ? m.awayScore : '-';
                        const displayScore = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (m.score || 'v');

                        groups[m.id] = {
                            matchId: m.id,
                            matchName: `${m.week}. Hafta: ${m.homeTeamName} - ${m.awayTeamName}`,
                            week: m.week,
                            homeTeam: m.homeTeamName,
                            awayTeam: m.awayTeamName,
                            score: displayScore,
                            opinions: matchOpinions,
                            againstCount
                        };
                    }
                }
                return Object.values(groups).sort((a, b) => (b.week || 0) - (a.week || 0));
            };

            const trioGrouped = getLocalGroupedOpinions(allMatches, 'trio');
            const generalGrouped = getLocalGroupedOpinions(allMatches, 'general');
            const pfdkActions = await getCachedDisciplinaryActions();
            const statements = await getCachedStatements();
            const standings = await getCachedStandings();

            return NextResponse.json({
                trioGrouped,
                generalGrouped,
                pfdkActions,
                statements,
                standings
            });
        }

        const firestore = getAdminDb();

        const groupOpinions = async (docs: Array<FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>>) => {
            const groups: { [key: string]: GroupedOpinion } = {};
            for (const d of docs) {
                // Path format: matches/{matchId}/incidents/{incidentId}/opinions/{opinionId}
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
            if (matchIds.length > 0) {
                await Promise.all(matchIds.map(async (mid) => {
                    try {
                        // 1. Fetch Match Basic Info
                        const mSnap = await firestore.collection('matches').doc(mid).get();
                        if (mSnap.exists) {
                            const mData = mSnap.data() as Match;
                            groups[mid].matchName = `${mData.week}. Hafta: ${mData.homeTeamName} - ${mData.awayTeamName}`;
                            groups[mid].week = mData.week;
                            groups[mid].homeTeam = mData.homeTeamName;
                            groups[mid].awayTeam = mData.awayTeamName;

                            const hScore = mData.homeScore !== undefined ? mData.homeScore : '-';
                            const aScore = mData.awayScore !== undefined ? mData.awayScore : '-';
                            groups[mid].score = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (mData.score || 'v');
                        }

                        // 2. Fetch Incidents to count "Aleyhe" (Incorrect judgments)
                        const incSnap = await firestore.collection('matches').doc(mid).collection('incidents').get();
                        let againstCount = 0;
                        for (const incDoc of incSnap.docs) {
                            const opsSnap = await firestore.collection('matches').doc(mid).collection('incidents').doc(incDoc.id).collection('opinions').get();
                            const hasIncorrect = opsSnap.docs.some(o => o.data().judgment === 'incorrect');
                            if (hasIncorrect) againstCount++;
                        }
                        groups[mid].againstCount = againstCount;

                    } catch (e) {
                        console.error(`Error processing match ${mid} on server:`, e);
                    }
                }));
            }
            return Object.values(groups).sort((a, b) => (b.week || 0) - (a.week || 0));
        };

        // Fetch everything in parallel
        const [trioSnap, genSnap, pfdkSnap, stmtSnap, standSnap] = await Promise.all([
            firestore.collectionGroup('opinions').where('type', '==', 'trio').limit(20).get(),
            firestore.collectionGroup('opinions').where('type', '==', 'general').limit(20).get(),
            firestore.collection('disciplinary_actions').get(),
            firestore.collection('statements').get(),
            firestore.collection('standings').get()
        ]);

        const trioGrouped = await groupOpinions(trioSnap.docs);
        const generalGrouped = await groupOpinions(genSnap.docs);
        const pfdkActions = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));
        const statements = stmtSnap.docs.map(d => ({ ...d.data(), id: d.id } as Statement));
        const standings = standSnap.docs.map(d => ({ ...d.data(), id: d.id } as Standing));

        return NextResponse.json({
            trioGrouped,
            generalGrouped,
            pfdkActions,
            statements,
            standings
        });

    } catch (error: any) {
        console.error('Public Home API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch public home data',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, Opinion } from '@/types';
import { getTeamName } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const firestore = getAdminDb();
        const matchesSnap = await firestore.collection('matches').get();
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));

        const refereeStats: Record<string, {
            name: string;
            matches: number;
            roles: { referee: number; assistant: number; fourth: number; var: number; avar: number; };
            errors: number;
            controversial: number;
            correct: number;
            teamCounts: Record<string, number>;
        }> = {};

        const representativeStats: Record<string, { name: string; matches: number; teamCounts: Record<string, number>; }> = {};
        const observerStats: Record<string, { name: string; matches: number; teamCounts: Record<string, number>; }> = {};

        // Optimize opinions fetch: Collection Group is much faster
        const opinionsByMatch: Record<string, Opinion[]> = {};
        try {
            const allOpinionsSnap = await firestore.collectionGroup('opinions').get();
            allOpinionsSnap.forEach(doc => {
                const op = doc.data() as Opinion;
                const matchId = doc.ref.parent.parent?.id;
                if (matchId) {
                    if (!opinionsByMatch[matchId]) opinionsByMatch[matchId] = [];
                    opinionsByMatch[matchId].push(op);
                }
            });
        } catch (e) {
            console.log("Collection group 'opinions' failed (index needed?), falling back to per-match fetch");
        }

        const getStatObj = (name: string) => {
            if (!name) return null;
            const cleanName = name.trim();
            if (!cleanName) return null;

            if (!refereeStats[cleanName]) {
                refereeStats[cleanName] = {
                    name: cleanName,
                    matches: 0,
                    roles: { referee: 0, assistant: 0, fourth: 0, var: 0, avar: 0 },
                    errors: 0, controversial: 0, correct: 0,
                    teamCounts: {}
                };
            }
            return refereeStats[cleanName];
        };

        const getGenericStat = (name: string, record: Record<string, { name: string; matches: number; teamCounts: Record<string, number>; }>) => {
            if (!name) return null;
            const cleanName = name.trim();
            if (!cleanName) return null;
            if (!record[cleanName]) record[cleanName] = { name: cleanName, matches: 0, teamCounts: {} };
            return record[cleanName];
        };

        // Aggregation Process
        for (const match of matches) {
            const visitedRef = new Set<string>();
            const visitedRep = new Set<string>();
            const visitedObs = new Set<string>();

            // Team Name Fallbacks & Dedup
            const hTeam = match.homeTeamName || (match.homeTeamId ? getTeamName(match.homeTeamId) : '') || 'Bilinmeyen';
            const aTeam = match.awayTeamName || (match.awayTeamId ? getTeamName(match.awayTeamId) : '') || 'Bilinmeyen';
            // Use Set to ensure each team counts only once per match encounter
            const teamSet = new Set([hTeam, aTeam].filter(t => t && t !== 'Bilinmeyen'));
            const teams = Array.from(teamSet);

            const incrementRole = (name: string, role: keyof typeof refereeStats[string]['roles']) => {
                const stat = getStatObj(name);
                if (stat) {
                    stat.roles[role]++;
                    if (!visitedRef.has(stat.name)) {
                        stat.matches++;
                        visitedRef.add(stat.name);
                        teams.forEach(t => {
                            stat.teamCounts[t] = (stat.teamCounts[t] || 0) + 1;
                        });
                    }
                }
            };

            const incrementGeneric = (name: string, record: Record<string, any>, visitedSet: Set<string>) => {
                const stat = getGenericStat(name, record);
                if (stat) {
                    if (!visitedSet.has(stat.name)) {
                        stat.matches++;
                        visitedSet.add(stat.name);
                        teams.forEach(t => {
                            stat.teamCounts[t] = (stat.teamCounts[t] || 0) + 1;
                        });
                    }
                }
            };

            // 1. Process Main Referee
            if (match.referee) incrementRole(match.referee, 'referee');

            // 2. Process Officials Data
            if (match.officials) {
                const mRefs = match.officials.referees || [];
                if (mRefs[1]) incrementRole(mRefs[1], 'assistant');
                if (mRefs[2]) incrementRole(mRefs[2], 'assistant');
                if (mRefs[3]) incrementRole(mRefs[3], 'fourth');

                const mVars = match.officials.varReferees || [];
                if (mVars[0]) incrementRole(mVars[0], 'var');
                mVars.slice(1).forEach(avar => { if (avar) incrementRole(avar, 'avar'); });

                if (match.officials.representatives) {
                    match.officials.representatives.forEach(r => incrementGeneric(r, representativeStats, visitedRep));
                }
                if (match.officials.observers) {
                    match.officials.observers.forEach(o => incrementGeneric(o, observerStats, visitedObs));
                }
            } else {
                if (match.varReferee) incrementRole(match.varReferee, 'var');
            }

            // 3. Process Opinions for Main Referee
            if (match.referee) {
                const mainRefStat = getStatObj(match.referee);
                if (mainRefStat) {
                    let ops = opinionsByMatch[match.id];

                    // Fallback if collectionGroup failed or was empty for this match
                    if (!ops) {
                        const snap = await firestore.collection('matches').doc(match.id).collection('opinions').get();
                        ops = snap.docs.map(d => d.data() as Opinion);
                    }

                    ops.forEach(op => {
                        if (op.judgment === 'incorrect') mainRefStat.errors += 1;
                        else if (op.judgment === 'controversial') mainRefStat.controversial += 1;
                        else if (op.judgment === 'correct') mainRefStat.correct += 1;
                    });
                }
            }
        }

        // Metadata handling
        const officialsSnap = await firestore.collection('officials').get();
        const officialMetadata: Record<string, { region: string, rating: number }> = {};
        officialsSnap.forEach(doc => {
            const data = doc.data();
            officialMetadata[data.name] = {
                region: data.region || '',
                rating: data.rating || 0
            };
        });

        const mergeMetadata = (stat: any) => {
            const topTeams = Object.entries(stat.teamCounts || {})
                .filter(([, count]) => (count as number) > 1) // Only show if assigned more than once
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 3)
                .map(([name, count]) => ({ name, count }));

            return {
                ...stat,
                region: officialMetadata[stat.name]?.region || '',
                rating: officialMetadata[stat.name]?.rating || 0,
                topTeams
            };
        };

        const sortByName = (a: any, b: any) => a.name.localeCompare(b.name, 'tr');

        const allReferees = Object.values(refereeStats).map(mergeMetadata);
        const allReps = Object.values(representativeStats).map(mergeMetadata);
        const allObs = Object.values(observerStats).map(mergeMetadata);

        const getTop10 = (list: any[], role: string) => {
            return [...list]
                .sort((a, b) => {
                    const countA = role === 'rep' || role === 'obs' ? a.matches : (a.roles[role] || 0);
                    const countB = role === 'rep' || role === 'obs' ? b.matches : (b.roles[role] || 0);
                    return countB - countA;
                })
                .slice(0, 10)
                .map(i => ({ name: i.name, count: role === 'rep' || role === 'obs' ? i.matches : i.roles[role] }))
                .filter(i => i.count > 0);
        };

        return NextResponse.json({
            referees: allReferees.sort(sortByName),
            representatives: allReps.sort(sortByName),
            observers: allObs.sort(sortByName),
            rankings: {
                referee: getTop10(allReferees, 'referee'),
                assistant: getTop10(allReferees, 'assistant'),
                fourth: getTop10(allReferees, 'fourth'),
                var: getTop10(allReferees, 'var'),
                avar: getTop10(allReferees, 'avar'),
                representative: getTop10(allReps, 'rep'),
                observer: getTop10(allObs, 'obs')
            }
        });

    } catch (error: any) {
        console.error('Referee Stats Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

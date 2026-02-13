import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, Opinion } from '@/types';
import { getTeamName } from '@/lib/teams';

export const dynamic = 'force-dynamic';

// --- Type Definitions ---

interface TeamCount {
    [teamName: string]: number;
}

interface StatRecord {
    name: string;
    matches: number;
    roles: {
        referee: number;
        assistant: number;
        fourth: number;
        var: number;
        avar: number;
    };
    errors: number;
    controversial: number;
    correct: number;
    teamCounts: TeamCount;
    // Metadata
    region?: string;
    rating?: number;
    topTeams?: { name: string; count: number }[];
}

interface GenericStatRecord {
    name: string;
    matches: number;
    teamCounts: TeamCount;
    // Metadata
    region?: string;
    rating?: number;
    topTeams?: { name: string; count: number }[];
}

// --- Helper Functions ---

/**
 * Creates or retrieves a referee stat object.
 * Hakem istatistik nesnesini oluşturur veya getirir.
 */
const getStatObj = (stats: Record<string, StatRecord>, name: string): StatRecord | null => {
    if (!name?.trim()) return null;
    const cleanName = name.trim();

    if (!stats[cleanName]) {
        stats[cleanName] = {
            name: cleanName,
            matches: 0,
            roles: { referee: 0, assistant: 0, fourth: 0, var: 0, avar: 0 },
            errors: 0, controversial: 0, correct: 0,
            teamCounts: {}
        };
    }
    return stats[cleanName];
};

/**
 * Creates or retrieves a generic official (rep/obs) stat object.
 * Genel görevli (temsilci/gözlemci) istatistik nesnesini oluşturur veya getirir.
 */
const getGenericStat = (stats: Record<string, GenericStatRecord>, name: string): GenericStatRecord | null => {
    if (!name?.trim()) return null;
    const cleanName = name.trim();
    if (!stats[cleanName]) {
        stats[cleanName] = { name: cleanName, matches: 0, teamCounts: {} };
    }
    return stats[cleanName];
};

/**
 * Resolves team names for a match.
 * Bir maç için takım isimlerini çözümler.
 */
const getMatchTeams = (match: Match): string[] => {
    const hTeam = match.homeTeamName || (match.homeTeamId ? getTeamName(match.homeTeamId) : '') || 'Bilinmeyen';
    const aTeam = match.awayTeamName || (match.awayTeamId ? getTeamName(match.awayTeamId) : '') || 'Bilinmeyen';
    return Array.from(new Set([hTeam, aTeam].filter(t => t && t !== 'Bilinmeyen')));
};

export async function GET() {
    try {
        const firestore = getAdminDb();

        // 1. Fetch Matches (Maçları Getir)
        const matchesSnap = await firestore.collection('matches').get();
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));

        // 2. Fetch Opinions (Optimize edilmiş sorgu)
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
            console.warn("Collection group 'opinions' fetch failed, possibly missing index:", e);
        }

        // 3. Initialize Stat Containers (İstatistik Kaplarını Başlat)
        const refereeStats: Record<string, StatRecord> = {};
        const representativeStats: Record<string, GenericStatRecord> = {};
        const observerStats: Record<string, GenericStatRecord> = {};

        // 4. Aggregation Loop (Toplama Döngüsü)
        for (const match of matches) {
            const teams = getMatchTeams(match);
            const visitedRef = new Set<string>();
            const visitedRep = new Set<string>();
            const visitedObs = new Set<string>();

            // --- Helper to increment stats safely ---
            const incrementRole = (name: string, role: keyof StatRecord['roles']) => {
                const stat = getStatObj(refereeStats, name);
                if (stat) {
                    stat.roles[role]++;
                    if (!visitedRef.has(stat.name)) {
                        stat.matches++;
                        visitedRef.add(stat.name);
                        teams.forEach(t => stat.teamCounts[t] = (stat.teamCounts[t] || 0) + 1);
                    }
                }
            };

            const incrementGeneric = (name: string, record: Record<string, GenericStatRecord>, visitedSet: Set<string>) => {
                const stat = getGenericStat(record, name);
                if (stat) {
                    if (!visitedSet.has(stat.name)) {
                        stat.matches++;
                        visitedSet.add(stat.name);
                        teams.forEach(t => stat.teamCounts[t] = (stat.teamCounts[t] || 0) + 1);
                    }
                }
            };

            // --- Process Officials ---
            const { officials, referee, varReferee } = match;

            if (referee) incrementRole(referee, 'referee');

            if (officials) {
                const mRefs = officials.referees || [];
                if (mRefs[1]) incrementRole(mRefs[1], 'assistant');
                if (mRefs[2]) incrementRole(mRefs[2], 'assistant');
                if (mRefs[3]) incrementRole(mRefs[3], 'fourth');

                const mVars = officials.varReferees || [];
                if (mVars[0]) incrementRole(mVars[0], 'var');
                mVars.slice(1).forEach(avar => { if (avar) incrementRole(avar, 'avar'); });

                officials.representatives?.forEach(r => incrementGeneric(r, representativeStats, visitedRep));
                officials.observers?.forEach(o => incrementGeneric(o, observerStats, visitedObs));
            } else {
                // Legacy support
                if (varReferee) incrementRole(varReferee, 'var');
            }

            // --- Process Opinions ---
            if (referee) {
                const mainRefStat = getStatObj(refereeStats, referee);
                if (mainRefStat) {
                    let ops = opinionsByMatch[match.id];
                    // Fallback mechanism
                    if (!ops) {
                        try {
                            const snap = await firestore.collection('matches').doc(match.id).collection('opinions').get();
                            ops = snap.docs.map(d => d.data() as Opinion);
                        } catch (e) {
                            // ignore individual match fetch error
                            ops = [];
                        }
                    }

                    if (ops) {
                        ops.forEach(op => {
                            if (op.judgment === 'incorrect') mainRefStat.errors += 1;
                            else if (op.judgment === 'controversial') mainRefStat.controversial += 1;
                            else if (op.judgment === 'correct') mainRefStat.correct += 1;
                        });
                    }
                }
            }
        }

        // 5. Enhance with Metadata (Metadata ile Zenginleştirme)
        const officialsSnap = await firestore.collection('officials').get();
        const officialMetadata: Record<string, { region: string, rating: number }> = {};
        officialsSnap.forEach(doc => {
            const d = doc.data();
            officialMetadata[d.name] = { region: d.region || '', rating: d.rating || 0 };
        });

        const enhanceStat = <T extends StatRecord | GenericStatRecord>(stat: T): T => {
            const meta = officialMetadata[stat.name] || { region: '', rating: 0 };
            const topTeams = Object.entries(stat.teamCounts || {})
                .filter(([, count]) => count > 1)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, count]) => ({ name, count }));

            return { ...stat, ...meta, topTeams };
        };

        const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'tr');

        const allReferees = Object.values(refereeStats).map(enhanceStat).sort(sortByName);
        const allReps = Object.values(representativeStats).map(enhanceStat).sort(sortByName);
        const allObs = Object.values(observerStats).map(enhanceStat).sort(sortByName);

        // 6. Calculate Top 10 Lists (Top 10 Listelerini Hesapla)
        const getTop10 = (list: any[], role: string) => { // Keeping 'any' here for simplicity in dynamic sort key, or define specific union type
            /* 
               Refine 'any': list is (StatRecord | GenericStatRecord)[]
               Role needs to be mapped to property access
            */
            return [...list]
                .sort((a, b) => {
                    const countA = (role === 'rep' || role === 'obs') ? a.matches : (a.roles?.[role] || 0);
                    const countB = (role === 'rep' || role === 'obs') ? b.matches : (b.roles?.[role] || 0);
                    return countB - countA;
                })
                .slice(0, 20)
                .map(i => ({ name: i.name, count: (role === 'rep' || role === 'obs') ? i.matches : (i.roles?.[role] || 0) }))
                .filter(i => i.count > 0);
        };

        return NextResponse.json({
            referees: allReferees,
            representatives: allReps,
            observers: allObs,
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

    } catch (error) {
        console.error('Referee Stats Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

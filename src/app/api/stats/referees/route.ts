import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match } from '@/types';
import { getTeamName } from '@/lib/teams';
import { getCachedMatches, getCachedOfficials } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// --- Type Definitions ---

interface TeamCount {
    [teamName: string]: number;
}

/** Raw accumulator for referee match stats (only from matches where they are main referee) */
interface RawMatchAccumulator {
    totalYellowCards: number;
    totalRedCards: number;
    totalFouls: number;
    totalGoals: number;
    totalHomeGoals: number;
    totalAwayGoals: number;
    totalHomeFouls: number;
    totalAwayFouls: number;
    totalHomeYellow: number;
    totalAwayYellow: number;
    totalHomeRed: number;
    totalAwayRed: number;
    ballInPlaySeconds: number;
    ballInPlayMatchCount: number;
    matchesWithYellow: number;
    matchesWithRed: number;
    matchesWithGoals: number;
    refMatchCount: number;
    weeklyGoals: { week: number; goals: number }[];
    totalPenalties: number;
    totalVarInterventions: number;
    varConfirmedCount: number;
    varReversedCount: number;
    varByType: { penalty: number; red_card: number; goal_cancelled: number; other: number };
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
    acc: RawMatchAccumulator;
    // Computed averages
    avgYellowPerMatch?: number;
    avgRedPerMatch?: number;
    avgFoulsPerMatch?: number;
    avgGoalsPerMatch?: number;
    avgHomeGoalsPerMatch?: number;
    avgAwayGoalsPerMatch?: number;
    homeFoulRatio?: number;
    homeCardRatio?: number;
    avgBallInPlayMin?: number;
    totalYellowCards?: number;
    totalRedCards?: number;
    totalPenalties?: number;
    avgPenaltiesPerMatch?: number;
    totalVarInterventions?: number;
    varConfirmedCount?: number;
    varReversedCount?: number;
    varByType?: { penalty: number; red_card: number; goal_cancelled: number; other: number };
    // Metadata
    region?: string;
    rating?: number;
    classification?: string;
    dbRoles?: string[];
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

const makeAcc = (): RawMatchAccumulator => ({
    totalYellowCards: 0,
    totalRedCards: 0,
    totalFouls: 0,
    totalGoals: 0,
    totalHomeGoals: 0,
    totalAwayGoals: 0,
    totalHomeFouls: 0,
    totalAwayFouls: 0,
    totalHomeYellow: 0,
    totalAwayYellow: 0,
    totalHomeRed: 0,
    totalAwayRed: 0,
    ballInPlaySeconds: 0,
    ballInPlayMatchCount: 0,
    matchesWithYellow: 0,
    matchesWithRed: 0,
    matchesWithGoals: 0,
    refMatchCount: 0,
    weeklyGoals: [],
    totalPenalties: 0,
    totalVarInterventions: 0,
    varConfirmedCount: 0,
    varReversedCount: 0,
    varByType: { penalty: 0, red_card: 0, goal_cancelled: 0, other: 0 },
});

/**
 * Creates or retrieves a referee stat object.
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
            teamCounts: {},
            acc: makeAcc(),
        };
    }
    return stats[cleanName];
};

/**
 * Creates or retrieves a generic official (rep/obs) stat object.
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
 */
const getMatchTeams = (match: Match): string[] => {
    const hTeam = match.homeTeamName || (match.homeTeamId ? getTeamName(match.homeTeamId) : '') || 'Bilinmeyen';
    const aTeam = match.awayTeamName || (match.awayTeamId ? getTeamName(match.awayTeamId) : '') || 'Bilinmeyen';
    return Array.from(new Set([hTeam, aTeam].filter(t => t && t !== 'Bilinmeyen')));
};

/** Parse "MM:SS" (or "MM:SS / MM:SS") ball-in-play string to total seconds */
const parseBallInPlay = (value?: string): number | null => {
    if (!value) return null;
    const mainPart = value.includes('/') ? value.split('/')[0].trim() : value;
    const parts = mainPart.split(':');
    if (parts.length !== 2) return null;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs)) return null;
    return mins * 60 + secs;
};

/**
 * Accumulates per-match stats for a referee (only when acting as main referee).
 */
const accumulateMatchStats = (stat: StatRecord, match: Match) => {
    const acc = stat.acc;
    acc.refMatchCount++;

    const ms = match.stats;
    const rs = match.refereeStats;

    // --- Goals ---
    const hGoals = match.homeScore ?? 0;
    const aGoals = match.awayScore ?? 0;
    const totalGoals = hGoals + aGoals;
    acc.totalGoals += totalGoals;
    acc.totalHomeGoals += hGoals;
    acc.totalAwayGoals += aGoals;
    if (totalGoals > 0) acc.matchesWithGoals++;
    if (match.week) acc.weeklyGoals.push({ week: match.week, goals: totalGoals });

    // --- Cards ---
    // Prefer match.stats breakdown, fall back to refereeStats totals
    const hYellow = ms?.homeYellowCards ?? 0;
    const aYellow = ms?.awayYellowCards ?? 0;
    const hRed = ms?.homeRedCards ?? 0;
    const aRed = ms?.awayRedCards ?? 0;

    const totalYellow = (hYellow + aYellow) > 0
        ? hYellow + aYellow
        : (rs?.yellowCards ?? 0);
    const totalRed = (hRed + aRed) > 0
        ? hRed + aRed
        : (rs?.redCards ?? 0);

    acc.totalYellowCards += totalYellow;
    acc.totalRedCards += totalRed;
    acc.totalHomeYellow += hYellow;
    acc.totalAwayYellow += aYellow;
    acc.totalHomeRed += hRed;
    acc.totalAwayRed += aRed;

    if (totalYellow > 0) acc.matchesWithYellow++;
    if (totalRed > 0) acc.matchesWithRed++;

    // --- Fouls ---
    const hFouls = ms?.homeFouls ?? 0;
    const aFouls = ms?.awayFouls ?? 0;
    const totalFouls = (hFouls + aFouls) > 0
        ? hFouls + aFouls
        : (rs?.fouls ?? 0);

    acc.totalFouls += totalFouls;
    acc.totalHomeFouls += hFouls;
    acc.totalAwayFouls += aFouls;

    // --- Ball in play ---
    const bip = parseBallInPlay(rs?.ballInPlayTime);
    if (bip !== null) {
        acc.ballInPlaySeconds += bip;
        acc.ballInPlayMatchCount++;
    }

    // --- Penalties ---
    if (rs?.penalties) {
        acc.totalPenalties += rs.penalties;
    }

    // --- VAR Interventions ---
    if (rs?.varInterventions && rs.varInterventions.length > 0) {
        rs.varInterventions.forEach(v => {
            acc.totalVarInterventions++;
            if (v.decision === 'confirmed') acc.varConfirmedCount++;
            else if (v.decision === 'reversed') acc.varReversedCount++;
            const t = v.type as keyof typeof acc.varByType;
            if (t in acc.varByType) acc.varByType[t]++;
        });
    }
};

/**
 * Computes derived averages from accumulated raw data.
 */
const computeAverages = (stat: StatRecord): void => {
    const acc = stat.acc;
    const n = acc.refMatchCount;
    if (n === 0) return;

    stat.avgGoalsPerMatch = parseFloat((acc.totalGoals / n).toFixed(2));
    stat.avgHomeGoalsPerMatch = parseFloat((acc.totalHomeGoals / n).toFixed(2));
    stat.avgAwayGoalsPerMatch = parseFloat((acc.totalAwayGoals / n).toFixed(2));
    stat.avgYellowPerMatch = parseFloat((acc.totalYellowCards / n).toFixed(2));
    stat.avgRedPerMatch = parseFloat((acc.totalRedCards / n).toFixed(2));
    stat.avgFoulsPerMatch = parseFloat((acc.totalFouls / n).toFixed(2));

    stat.totalYellowCards = acc.totalYellowCards;
    stat.totalRedCards = acc.totalRedCards;
    stat.totalPenalties = acc.totalPenalties;
    stat.avgPenaltiesPerMatch = parseFloat((acc.totalPenalties / n).toFixed(2));
    stat.totalVarInterventions = acc.totalVarInterventions;
    stat.varConfirmedCount = acc.varConfirmedCount;
    stat.varReversedCount = acc.varReversedCount;
    stat.varByType = { ...acc.varByType };

    if (acc.totalFouls > 0) {
        stat.homeFoulRatio = parseFloat((acc.totalHomeFouls / acc.totalFouls).toFixed(3));
    }
    const totalCards = acc.totalYellowCards + acc.totalRedCards;
    if (totalCards > 0) {
        stat.homeCardRatio = parseFloat(((acc.totalHomeYellow + acc.totalHomeRed) / totalCards).toFixed(3));
    }
    if (acc.ballInPlayMatchCount > 0) {
        const avgSecs = acc.ballInPlaySeconds / acc.ballInPlayMatchCount;
        stat.avgBallInPlayMin = parseFloat((avgSecs / 60).toFixed(1));
    }
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const season = searchParams.get('season') || '2025-2026';

        // 1. Fetch Matches (using Cache)
        let matches = await getCachedMatches();
        matches = matches.filter(m => (m.season || '2025-2026') === season);

        // 2. Fetch all registered officials (using Cache)
        const allOfficials = await getCachedOfficials();
        const officialMetadata: Record<string, { region: string; rating: number; classification?: string; seasons?: string[]; dbRoles?: string[] }> = {};

        allOfficials.forEach(d => {
            if (d.name) {
                officialMetadata[d.name] = {
                    region: d.region || '',
                    rating: d.rating || 0,
                    classification: d.classification || '',
                    seasons: d.seasons || [],
                    dbRoles: d.roles || []
                };
            }
        });

        // 3. Initialize Stat Containers
        const refereeStats: Record<string, StatRecord> = {};
        const representativeStats: Record<string, GenericStatRecord> = {};
        const observerStats: Record<string, GenericStatRecord> = {};

        // Pre-populate with officials registered for the selected season
        for (const d of allOfficials) {
            const name = d.name;
            const roles = d.roles || [];
            const seasons = d.seasons || [];

            if (name && seasons.includes(season)) {
                const isRefereeRelated = roles.some((r: string) => ['referee', 'assistant', 'fourth', 'var', 'avar'].includes(r));
                if (isRefereeRelated) getStatObj(refereeStats, name);
                if (roles.includes('representative')) getGenericStat(representativeStats, name);
                if (roles.includes('observer')) getGenericStat(observerStats, name);
            }
        }

        // 4. Aggregation Loop
        for (const match of matches) {
            const teams = getMatchTeams(match);
            const visitedRef = new Set<string>();
            const visitedRep = new Set<string>();
            const visitedObs = new Set<string>();

            const incrementRole = (name: string, role: keyof StatRecord['roles'], isMainReferee = false) => {
                const stat = getStatObj(refereeStats, name);
                if (stat) {
                    stat.roles[role]++;
                    if (!visitedRef.has(stat.name)) {
                        stat.matches++;
                        visitedRef.add(stat.name);
                        teams.forEach(t => stat.teamCounts[t] = (stat.teamCounts[t] || 0) + 1);
                    }
                    // Accumulate match stats only for main referee role
                    if (isMainReferee) {
                        accumulateMatchStats(stat, match);
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

            const { officials, referee, varReferee } = match;

            if (referee) incrementRole(referee, 'referee', true);

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
                if (varReferee) incrementRole(varReferee, 'var');
            }
        }

        // 5. Compute averages for all referees
        Object.values(refereeStats).forEach(computeAverages);

        // 6. Enhance with Metadata
        const enhanceStat = <T extends StatRecord | GenericStatRecord>(stat: T): T => {
            const meta = officialMetadata[stat.name] || { region: '', rating: 0, classification: '' };
            const topTeams = Object.entries(stat.teamCounts || {})
                .filter(([, count]) => count > 1)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, count]) => ({ name, count }));
            return { ...stat, ...meta, topTeams };
        };

        const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'tr');

        // Strip heavy accumulator from output
        const allReferees = Object.values(refereeStats)
            .map(s => {
                const enhanced = enhanceStat(s);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { acc, ...rest } = enhanced as StatRecord & { acc?: unknown };
                return rest;
            })
            .sort(sortByName);

        const allReps = Object.values(representativeStats).map(enhanceStat).sort(sortByName);
        const allObs = Object.values(observerStats).map(enhanceStat).sort(sortByName);

        // 7. Top 10 Lists
        const getTop10 = (list: StatRecord[], role: string) =>
            [...list]
                .sort((a, b) => {
                    const cA = (role === 'rep' || role === 'obs') ? a.matches : (a.roles?.[role as keyof typeof a.roles] || 0);
                    const cB = (role === 'rep' || role === 'obs') ? b.matches : (b.roles?.[role as keyof typeof b.roles] || 0);
                    return cB - cA;
                })
                .slice(0, 20)
                .map(i => ({ name: i.name, count: (role === 'rep' || role === 'obs') ? i.matches : (i.roles?.[role as keyof typeof i.roles] || 0) }))
                .filter(i => i.count > 0);

        return NextResponse.json({
            referees: allReferees,
            representatives: allReps,
            observers: allObs,
            rankings: {
                referee: getTop10(Object.values(refereeStats), 'referee'),
                assistant: getTop10(Object.values(refereeStats), 'assistant'),
                fourth: getTop10(Object.values(refereeStats), 'fourth'),
                var: getTop10(Object.values(refereeStats), 'var'),
                avar: getTop10(Object.values(refereeStats), 'avar'),
                representative: getTop10(allReps as unknown as StatRecord[], 'rep'),
                observer: getTop10(allObs as unknown as StatRecord[], 'obs'),
            }
        }, {
            headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' }
        });

    } catch (error) {
        console.error('Referee Stats Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

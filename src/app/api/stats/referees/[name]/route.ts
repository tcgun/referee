import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, VarIntervention } from '@/types';
import { getTeamName } from '@/lib/teams';
import { getCachedMatches, getCachedOfficials } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/** Convert Turkish name to URL slug */
export const nameToSlug = (name: string) => {
    if (!name) return '';
    return name
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'c')
        .replace(/ç/g, 'c')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    try {
        const resolvedParams = await params;
        const slug = resolvedParams.name;
        const firestore = getAdminDb();

        // 1. Find official by slug-matching name (using Cache)
        const allOfficials = await getCachedOfficials();
        let officialDoc = null;

        for (const off of allOfficials) {
            if (off.name && nameToSlug(off.name) === slug) {
                officialDoc = off;
                break;
            }
        }

        if (!officialDoc) {
            return NextResponse.json({ error: 'Official not found' }, { status: 404 });
        }

        const official = officialDoc;

        // 2. Fetch all matches (using Cache)
        const allMatches = await getCachedMatches();

        const refName = official.name;

        // Matches as main referee
        const asReferee = allMatches
            .filter(m => m.referee?.trim() === refName)
            .sort((a, b) => {
                const dateA = a.date ? new Date(a.date as string).getTime() : 0;
                const dateB = b.date ? new Date(b.date as string).getTime() : 0;
                return dateB - dateA;
            });

        // Matches in other roles (assistant, 4th, VAR, AVAR, observer, representative)
        const otherRoles: { matchId: string; role: string; week: number; season: string; homeTeam: string; awayTeam: string; date: string }[] = [];
        allMatches.forEach(m => {
            const offs = m.officials;
            const reps = m.representatives;
            let role = '';
            
            if (offs) {
                const refs = offs.referees || [];
                const vars = offs.varReferees || [];
                const obs = offs.observers || [];
                const rp = offs.representatives || [];
                
                if (refs[1]?.trim() === refName || refs[2]?.trim() === refName) role = 'assistant';
                else if (refs[3]?.trim() === refName) role = 'fourth';
                else if (vars[0]?.trim() === refName) role = 'var';
                else if (vars.slice(1).some((v: string) => v?.trim() === refName)) role = 'avar';
                else if (obs.some(o => o?.trim() === refName)) role = 'observer';
                else if (rp.some(r => r?.trim() === refName)) role = 'representative';
            }
            
            if (!role && reps) {
                if (reps.observer?.trim() === refName) role = 'observer';
                else if (reps.rep1?.trim() === refName || reps.rep2?.trim() === refName || reps.rep3?.trim() === refName) role = 'representative';
            }

            if (role) {
                otherRoles.push({
                    matchId: m.id,
                    role,
                    week: m.week,
                    season: m.season || '2025-2026',
                    homeTeam: m.homeTeamName || getTeamName(m.homeTeamId) || m.homeTeamId,
                    awayTeam: m.awayTeamName || getTeamName(m.awayTeamId) || m.awayTeamId,
                    date: m.date as string,
                });
            }
        });

        // 3. Build per-match details for referee matches
        const matchDetails = asReferee.map(m => {
            const rs = m.refereeStats;
            const ms = m.stats;
            const totalYellow = (ms?.homeYellowCards || 0) + (ms?.awayYellowCards || 0) || rs?.yellowCards || 0;
            const totalRed = (ms?.homeRedCards || 0) + (ms?.awayRedCards || 0) || rs?.redCards || 0;
            const totalFouls = (ms?.homeFouls || 0) + (ms?.awayFouls || 0) || rs?.fouls || 0;
            const homeTeam = m.homeTeamName || getTeamName(m.homeTeamId) || m.homeTeamId;
            const awayTeam = m.awayTeamName || getTeamName(m.awayTeamId) || m.awayTeamId;
            return {
                id: m.id,
                week: m.week,
                season: m.season || '2025-2026',
                competition: m.competition || 'league',
                date: m.date,
                homeTeam,
                awayTeam,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                yellowCards: totalYellow,
                redCards: totalRed,
                fouls: totalFouls,
                penalties: rs?.penalties ?? null,
                ballInPlayTime: rs?.ballInPlayTime ?? null,
                varInterventions: (rs?.varInterventions || []) as VarIntervention[],
                varCount: (rs?.varInterventions || []).length,
            };
        });

        // 4. Aggregate career stats from referee matches
        const seasons: Record<string, {
            matches: number;
            yellowCards: number;
            redCards: number;
            fouls: number;
            penalties: number;
            varTotal: number;
            varConfirmed: number;
            varReversed: number;
            goals: number;
        }> = {};

        let totalMatches = 0, totalYellow = 0, totalRed = 0, totalFouls = 0;
        let totalPenalties = 0, totalVar = 0, varConfirmed = 0, varReversed = 0, totalGoals = 0;
        const varByType = { penalty: 0, red_card: 0, goal_cancelled: 0, other: 0 };

        for (const md of matchDetails) {
            const s = md.season;
            if (!seasons[s]) seasons[s] = { matches: 0, yellowCards: 0, redCards: 0, fouls: 0, penalties: 0, varTotal: 0, varConfirmed: 0, varReversed: 0, goals: 0 };
            seasons[s].matches++;
            seasons[s].yellowCards += md.yellowCards;
            seasons[s].redCards += md.redCards;
            seasons[s].fouls += md.fouls;
            seasons[s].penalties += md.penalties ?? 0;
            seasons[s].varTotal += md.varCount;
            seasons[s].goals += (md.homeScore ?? 0) + (md.awayScore ?? 0);

            md.varInterventions.forEach(v => {
                if (v.decision === 'confirmed') { seasons[s].varConfirmed++; varConfirmed++; }
                else { seasons[s].varReversed++; varReversed++; }
                if (v.type in varByType) varByType[v.type as keyof typeof varByType]++;
            });

            totalMatches++;
            totalYellow += md.yellowCards;
            totalRed += md.redCards;
            totalFouls += md.fouls;
            totalPenalties += md.penalties ?? 0;
            totalVar += md.varCount;
            totalGoals += (md.homeScore ?? 0) + (md.awayScore ?? 0);
        }

        return NextResponse.json({
            official: {
                name: official.name,
                region: official.region || '',
                rating: official.rating || 0,
                classification: official.classification || '',
                roles: official.roles || [],
                seasons: official.seasons || [],
            },
            career: {
                totalMatches,
                totalYellow,
                totalRed,
                totalFouls,
                totalPenalties,
                totalVar,
                varConfirmed,
                varReversed,
                varByType,
                totalGoals,
                avgYellowPerMatch: totalMatches > 0 ? parseFloat((totalYellow / totalMatches).toFixed(2)) : 0,
                avgRedPerMatch: totalMatches > 0 ? parseFloat((totalRed / totalMatches).toFixed(2)) : 0,
                avgFoulsPerMatch: totalMatches > 0 ? parseFloat((totalFouls / totalMatches).toFixed(1)) : 0,
                avgGoalsPerMatch: totalMatches > 0 ? parseFloat((totalGoals / totalMatches).toFixed(2)) : 0,
                avgPenaltiesPerMatch: totalMatches > 0 ? parseFloat((totalPenalties / totalMatches).toFixed(2)) : 0,
            },
            seasons,
            matchDetails,
            otherRoles,
        }, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });

    } catch (error) {
        console.error('Referee Profile Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

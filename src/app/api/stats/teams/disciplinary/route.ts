import { NextResponse } from 'next/server';
import { getCachedMatches, getCachedDisciplinaryActions } from '@/lib/cache';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const season = searchParams.get('season') || '2025-2026';

        let actions = await getCachedDisciplinaryActions();

        // Helper to resolve season YYYY-YYYY from date
        const getSeasonFromDate = (dateStr: string): string => {
            if (!dateStr) return '2025-2026';
            const d = new Date(dateStr);
            const year = d.getFullYear();
            const month = d.getMonth() + 1; // 1-indexed
            return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        };

        // Filter actions by season
        actions = actions.filter((act: any) => getSeasonFromDate(act.date) === season);

        const teamStats: Record<string, any> = {};
        const weeklyGlobalStats: Record<number, number> = {};
        const subjectBreakdown: Record<string, number> = {
            'KULÜP': 0,
            'FUTBOLCU': 0,
            'İDARECİ': 0,
            'TEKNİK SORUMLU': 0,
            'DİĞER': 0
        };

        const parsePenalty = (text: string) => {
            if (!text) return 0;
            const matches = text.match(/(\d{1,3}(\.\d{3})*)\s*TL/i);
            if (matches && matches[1]) {
                return parseInt(matches[1].replace(/\./g, ''));
            }
            return 0;
        };

        const competitionStats: Record<string, { totalFine: number, referralCount: number, penaltyCount: number }> = {
            'league': { totalFine: 0, referralCount: 0, penaltyCount: 0 },
            'cup': { totalFine: 0, referralCount: 0, penaltyCount: 0 }
        };

        const detectSubjectType = (subject: string): string => {
            const s = (subject || '').toUpperCase();
            if (s.includes('KULÜBÜ') || s.includes('A.Ş.')) return 'KULÜP';
            if (s.includes('İDARECİSİ') || s.includes('BAŞKANI')) return 'İDARECİ';
            if (s.includes('TEKNİK') || s.includes('ANTRENÖR')) return 'TEKNİK SORUMLU';
            if (s.length > 3) return 'FUTBOLCU'; // Likely a player name
            return 'DİĞER';
        };

        actions.forEach((act: any) => {
            const team = act.teamName || 'DİĞER';
            const week = act.week || 0;
            const comp = act.competition || 'league';
            const penaltyVal = parsePenalty(act.penalty);
            const subType = detectSubjectType(act.subject || '');

            // Global Competition Stats
            if (competitionStats[comp]) {
                competitionStats[comp].totalFine += penaltyVal;
                competitionStats[comp].referralCount++;
                if (act.penalty) competitionStats[comp].penaltyCount++;
            }

            // Global Weekly Trend (League Only usually, or combined)
            if (comp === 'league' && week > 0) {
                weeklyGlobalStats[week] = (weeklyGlobalStats[week] || 0) + penaltyVal;
            }

            // Global Subject Breakdown
            subjectBreakdown[subType] = (subjectBreakdown[subType] || 0) + 1;

            // Team Specific Stats
            if (!teamStats[team]) {
                teamStats[team] = {
                    teamName: team,
                    referralCount: 0,
                    penaltyCount: 0,
                    totalFine: 0,
                    leagueFine: 0,
                    cupFine: 0,
                    reasons: {} as Record<string, number>,
                    subTypes: {} as Record<string, number>
                };
            }

            teamStats[team].referralCount++;
            if (act.penalty) {
                teamStats[team].penaltyCount++;
                teamStats[team].totalFine += penaltyVal;
                if (comp === 'cup') teamStats[team].cupFine += penaltyVal;
                else teamStats[team].leagueFine += penaltyVal;
            }

            teamStats[team].subTypes[subType] = (teamStats[team].subTypes[subType] || 0) + 1;

            const reason = (act.subject || act.reason || 'DİĞER').split('(')[0].trim().toUpperCase();
            teamStats[team].reasons[reason] = (teamStats[team].reasons[reason] || 0) + 1;
        });

        const leagueTotalFine = competitionStats['league'].totalFine;
        const cupTotalFine = competitionStats['cup'].totalFine;

        const finalizedTeams = Object.values(teamStats).map(stats => {
            const sortedReasons = Object.entries(stats.reasons).sort((a: any, b: any) => b[1] - a[1]);
            return {
                ...stats,
                mostCommonReason: sortedReasons[0]?.[0] || 'YOK',
                topReasons: sortedReasons.slice(0, 3)
            };
        }).sort((a, b) => b.totalFine - a.totalFine);

        // Query matches to calculate foul and card stats
        let matches = await getCachedMatches();
        matches = matches.filter((m: any) => (m.season || '2025-2026') === season);

        const teamFouls: Record<string, number> = {};
        const teamYellows: Record<string, number> = {};
        const teamReds: Record<string, number> = {};
        const refereeFouls: Record<string, number> = {};
        const refereeCards: Record<string, number> = {};

        matches.forEach((m: any) => {
            const hTeam = m.homeTeamName;
            const aTeam = m.awayTeamName;
            const ref = m.referee;

            if (m.stats) {
                const hF = Number(m.stats.homeFouls || 0);
                const aF = Number(m.stats.awayFouls || 0);
                const hY = Number(m.stats.homeYellowCards || 0);
                const aY = Number(m.stats.awayYellowCards || 0);
                const hR = Number(m.stats.homeRedCards || 0);
                const aR = Number(m.stats.awayRedCards || 0);

                if (hTeam) {
                    teamFouls[hTeam] = (teamFouls[hTeam] || 0) + hF;
                    teamYellows[hTeam] = (teamYellows[hTeam] || 0) + hY;
                    teamReds[hTeam] = (teamReds[hTeam] || 0) + hR;
                }
                if (aTeam) {
                    teamFouls[aTeam] = (teamFouls[aTeam] || 0) + aF;
                    teamYellows[aTeam] = (teamYellows[aTeam] || 0) + aY;
                    teamReds[aTeam] = (teamReds[aTeam] || 0) + aR;
                }
                if (ref) {
                    refereeFouls[ref] = (refereeFouls[ref] || 0) + (hF + aF);
                    refereeCards[ref] = (refereeCards[ref] || 0) + (hY + aY + hR + aR);
                }
            }
        });

        const getTop = (records: Record<string, number>) => {
            const sorted = Object.entries(records).sort((a, b) => b[1] - a[1]);
            return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null;
        };

        const mostFouledTeam = getTop(teamFouls);
        const mostFoulBlowingReferee = getTop(refereeFouls);
        const mostYellowCardedTeam = getTop(teamYellows);
        const mostRedCardedTeam = getTop(teamReds);
        const mostCardGivingReferee = getTop(refereeCards);

        return NextResponse.json({
            teams: finalizedTeams,
            weeklyTrend: Object.entries(weeklyGlobalStats)
                .map(([week, total]) => ({ week: parseInt(week), total }))
                .sort((a, b) => a.week - b.week),
            subjectBreakdown,
            leagueTotalFine,
            cupTotalFine,
            competitionStats,
            matchStats: {
                mostFouledTeam,
                mostFoulBlowingReferee,
                mostYellowCardedTeam,
                mostRedCardedTeam,
                mostCardGivingReferee
            }
        });
    } catch (error) {
        console.error('Enhanced team stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch enhanced stats' }, { status: 500 });
    }
}

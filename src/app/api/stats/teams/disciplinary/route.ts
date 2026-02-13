import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';

export async function GET() {
    try {
        const db = getAdminDb();
        const snap = await db.collection('disciplinary_actions').get();
        const actions = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

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

        return NextResponse.json({
            teams: finalizedTeams,
            weeklyTrend: Object.entries(weeklyGlobalStats)
                .map(([week, total]) => ({ week: parseInt(week), total }))
                .sort((a, b) => a.week - b.week),
            subjectBreakdown,
            leagueTotalFine,
            cupTotalFine,
            competitionStats
        });
    } catch (error) {
        console.error('Enhanced team stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch enhanced stats' }, { status: 500 });
    }
}

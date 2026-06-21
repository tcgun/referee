import { NextResponse } from 'next/server';
import { getCachedMatches, getCachedDisciplinaryActions } from '@/lib/cache';
import { DisciplinaryAction, Match } from '@/types';

// Season format: "2024-2025", "2025-2026" vb.
const SEASON_REGEX = /^\d{4}-\d{4}$/;

interface TeamDisciplinaryStats {
    teamName: string;
    referralCount: number;
    penaltyCount: number;
    totalFine: number;
    leagueFine: number;
    cupFine: number;
    reasons: Record<string, number>;
    subTypes: Record<string, number>;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const seasonParam = searchParams.get('season') || '2025-2026';

        // Input validation — kötü niyetli değerleri engelle
        if (!SEASON_REGEX.test(seasonParam)) {
            return NextResponse.json(
                { error: 'Geçersiz sezon formatı. Beklenen: YYYY-YYYY' },
                { status: 400 }
            );
        }
        const season = seasonParam;

        // Paralel veri çekme — sıralı yerine eşzamanlı
        const [allActions, allMatches] = await Promise.all([
            getCachedDisciplinaryActions(),
            getCachedMatches()
        ]);

        // Helper to resolve season YYYY-YYYY from date
        const getSeasonFromDate = (dateStr: string): string => {
            if (!dateStr) return '2025-2026';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '2025-2026'; // Geçersiz tarih koruması
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
        };

        // Filter actions by season
        const actions = (allActions as DisciplinaryAction[]).filter(
            (act) => getSeasonFromDate(act.date) === season
        );

        const teamStats: Record<string, TeamDisciplinaryStats> = {};
        const weeklyGlobalStats: Record<number, number> = {};
        const subjectBreakdown: Record<string, number> = {
            'KULÜP': 0,
            'FUTBOLCU': 0,
            'İDARECİ': 0,
            'TEKNİK SORUMLU': 0,
            'KULÜP ÇALIŞANI': 0
        };

        const parsePenalty = (text: string): number => {
            if (!text) return 0;
            const matches = text.match(/(\d{1,3}(\.\d{3})*)\s*TL/i);
            if (matches?.[1]) {
                return parseInt(matches[1].replace(/\./g, ''));
            }
            return 0;
        };

        const competitionStats: Record<string, { totalFine: number; referralCount: number; penaltyCount: number }> = {
            'league': { totalFine: 0, referralCount: 0, penaltyCount: 0 },
            'cup': { totalFine: 0, referralCount: 0, penaltyCount: 0 }
        };

        const normalizeCategory = (role: string): string => {
            const r = role.toLowerCase().trim();
            if (r.includes('idareci') || r.includes('yönetici') || r.includes('başkan')) {
                return 'İDARECİ';
            }
            if (r.includes('futbolcu') || r.includes('sporcu')) {
                return 'FUTBOLCU';
            }
            if (r.includes('teknik') || r.includes('antrenör')) {
                return 'TEKNİK SORUMLU';
            }
            if (r.includes('görevli') || r.includes('masör') || r.includes('fizyoterapist') || r.includes('doktor') || r.includes('çalışan') || r.includes('temsilci') || r.includes('personel')) {
                return 'KULÜP ÇALIŞANI';
            }
            return r.toUpperCase()
                .replace(/i/g, 'İ')
                .replace(/ı/g, 'I')
                .replace(/ğ/g, 'Ğ')
                .replace(/ü/g, 'Ü')
                .replace(/ş/g, 'Ş')
                .replace(/ö/g, 'Ö')
                .replace(/ç/g, 'Ç');
        };

        const detectSubjectType = (subject: string, note?: string): string => {
            const s = (subject || '').toUpperCase();
            if (s === 'KULÜP' || s.includes('KULÜBÜ') || s.includes('A.Ş.')) return 'KULÜP';

            if (note && subject) {
                const normNote = note.toLowerCase();
                const normSubject = subject.toLowerCase();
                const escapedSubject = normSubject.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`(?:\\b([a-zçğıöşüıİ]+(?:\\s+[a-zçğıöşüıİ]+){0,2})\\s+)?${escapedSubject}`, 'i');
                const match = normNote.match(regex);
                if (match && match[1]) {
                    const role = match[1].trim();
                    const cleanRole = role.replace(/^(?:ve|veya|ile|aynı|müsabakada|müsabakasında|sonrasında|tarihinde|tarihli)\s+/, '').trim();
                    if (cleanRole && cleanRole.length > 2) {
                        return normalizeCategory(cleanRole);
                    }
                }
            }

            if (s.includes('İDARECİSİ') || s.includes('BAŞKANI') || s.includes('YÖNETİCİSİ')) return 'İDARECİ';
            if (s.includes('TEKNİK') || s.includes('ANTRENÖR')) return 'TEKNİK SORUMLU';
            if (s.includes('GÖREVLİSİ') || s.includes('MASÖRÜ') || s.includes('FİZYOTERAPİSTİ') || s.includes('DOKTORU') || s.includes('ÇALIŞANI') || s.includes('TEMSİLCİSİ')) return 'KULÜP ÇALIŞANI';

            return 'FUTBOLCU';
        };

        const categoryActions: Record<string, Array<{ id: string; subject: string; teamName: string; penalty: string; date: string; reason: string; appealStatus?: string; appealedPenalty?: string }>> = {};

        actions.forEach((act) => {
            const team = act.teamName || 'DİĞER';
            const week = act.week || 0;
            const comp = act.competition || 'league';
            
            // Tahkim itiraz durumuna göre efektif ceza hesabı
            let effectivePenaltyText = act.penalty || '';
            if (act.appealStatus === 'accepted') {
                effectivePenaltyText = '';
            } else if (act.appealStatus === 'partially_accepted' && act.appealedPenalty) {
                effectivePenaltyText = act.appealedPenalty;
            }
            
            const penaltyVal = parsePenalty(effectivePenaltyText);
            const subType = act.category ? act.category.toUpperCase() : detectSubjectType(act.subject || '', act.note || '');

            // Global Competition Stats
            if (competitionStats[comp]) {
                competitionStats[comp].totalFine += penaltyVal;
                competitionStats[comp].referralCount++;
                if (act.penalty) competitionStats[comp].penaltyCount++;
            }

            // Global Weekly Trend
            if (comp === 'league' && week > 0) {
                weeklyGlobalStats[week] = (weeklyGlobalStats[week] || 0) + penaltyVal;
            }

            // Global Subject Breakdown
            subjectBreakdown[subType] = (subjectBreakdown[subType] || 0) + 1;

            // Group by category action
            if (!categoryActions[subType]) {
                categoryActions[subType] = [];
            }
            categoryActions[subType].push({
                id: act.id,
                subject: act.subject || 'Bilinmiyor',
                teamName: team,
                penalty: effectivePenaltyText || 'Ceza Yok',
                date: act.date,
                reason: act.reason || '',
                appealStatus: act.appealStatus,
                appealedPenalty: act.appealedPenalty
            });

            // Team Specific Stats
            if (!teamStats[team]) {
                teamStats[team] = {
                    teamName: team,
                    referralCount: 0,
                    penaltyCount: 0,
                    totalFine: 0,
                    leagueFine: 0,
                    cupFine: 0,
                    reasons: {},
                    subTypes: {}
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
            const sortedReasons = Object.entries(stats.reasons).sort(
                (a, b) => (b[1] as number) - (a[1] as number)
            );
            return {
                ...stats,
                mostCommonReason: sortedReasons[0]?.[0] || 'YOK',
                topReasons: sortedReasons.slice(0, 3)
            };
        }).sort((a, b) => b.totalFine - a.totalFine);

        // Maç istatistiklerini hesapla
        const matches = (allMatches as Match[]).filter(
            (m) => (m.season || '2025-2026') === season
        );

        const teamFouls: Record<string, number> = {};
        const teamYellows: Record<string, number> = {};
        const teamReds: Record<string, number> = {};
        const refereeFouls: Record<string, number> = {};
        const refereeCards: Record<string, number> = {};

        matches.forEach((m) => {
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
            categoryActions,
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

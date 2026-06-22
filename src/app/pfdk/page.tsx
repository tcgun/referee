"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { DisciplinaryAction, Match } from '@/types';
import { getTeamName, resolveTeamId, cleanSponsorsInText } from '@/lib/teams';

// Helper: Resolve season YYYY-YYYY from date
const getSeasonFromDate = (dateStr: string): string => {
    if (!dateStr) return '2025-2026';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed
    return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

interface TeamStats {
    teamName: string;
    referralCount: number;
    penaltyCount: number;
    totalFine: number;
    mostCommonReason: string;
    topReasons: [string, number][];
}

interface WeeklyTrend {
    week: number;
    total: number;
}

export default function DisciplinaryAnalysisPage() {
    const [activeTab, setActiveTab] = useState<'weekly' | 'teams'>('weekly');
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');

    // ==========================================
    // STATE & LOGIC: Tab 1 - Weekly Decisions
    // ==========================================
    const [competition, setCompetition] = useState<'league' | 'cup'>('league');
    const [maxWeek, setMaxWeek] = useState(34);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [loadingWeeklyInit, setLoadingWeeklyInit] = useState(true);
    const [weekLoading, setWeekLoading] = useState(false);
    const [actions, setActions] = useState<DisciplinaryAction[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);

    // Load max week on season change
    useEffect(() => {
        if (activeTab !== 'weekly') return;
        async function fetchInitial() {
            try {
                setLoadingWeeklyInit(true);
                const q = query(
                    collection(db, 'disciplinary_actions'),
                    where('competition', '==', 'league'),
                    orderBy('week', 'desc')
                );
                const docSnap = await getDocs(q);

                const seasonDocs = docSnap.docs.filter(d => getSeasonFromDate(d.data().date) === selectedSeason);

                let mWeek = 1;
                if (seasonDocs.length > 0) {
                    mWeek = seasonDocs[0].data().week || 1;
                }
                setMaxWeek(mWeek);
                setSelectedWeek(mWeek);
            } catch (err) {
                console.error("PFDK Max Week Error:", err);
            } finally {
                setLoadingWeeklyInit(false);
            }
        }
        fetchInitial();
    }, [selectedSeason, activeTab]);

    // Load decisions for selected week/competition
    useEffect(() => {
        if (activeTab !== 'weekly') return;
        if (competition === 'league' && !selectedWeek) return;

        async function fetchWeekData() {
            try {
                setWeekLoading(true);
                const pfdkQ = competition === 'league'
                    ? query(collection(db, 'disciplinary_actions'), where('competition', '==', 'league'), where('week', '==', selectedWeek))
                    : query(collection(db, 'disciplinary_actions'), where('competition', '==', 'cup'), orderBy('date', 'desc'), limit(150));

                const pfdkSnap = await getDocs(pfdkQ);
                const allActions = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));
                const filteredActions = allActions
                    .filter(act => getSeasonFromDate(act.date) === selectedSeason)
                    .filter(act => act.teamId && act.matchId);
                setActions(filteredActions);

                const matchQ = competition === 'league'
                    ? query(collection(db, 'matches'), where('competition', '==', 'league'), where('week', '==', selectedWeek))
                    : query(collection(db, 'matches'), where('competition', '==', 'cup'), orderBy('date', 'desc'), limit(150));

                const matchSnap = await getDocs(matchQ);
                const allMatches = matchSnap.docs.map(d => ({ ...d.data(), id: d.id } as Match));
                const filteredMatches = allMatches.filter(m => (m.season || getSeasonFromDate(m.date as string)) === selectedSeason);
                setMatches(filteredMatches);
            } catch (err) {
                console.error("PFDK Fetch Data Error:", err);
            } finally {
                setWeekLoading(false);
            }
        }
        fetchWeekData();
    }, [selectedWeek, competition, selectedSeason, activeTab]);

    const cleanTeamName = (rawName: string) => {
        const id = resolveTeamId(rawName);
        return id ? getTeamName(id) : rawName;
    };

    // Grouping Logic for Weekly decisions
    const groupMap: Record<string, DisciplinaryAction[]> = {};
    actions.forEach(act => {
        let groupTitle = cleanTeamName(act.teamName || 'DİĞER');
        if (act.matchId) {
            const mId = act.matchId.replace(/^d-/, '');
            const match = matches.find(m => m.id === mId || m.id === `d-${mId}`);
            if (match) {
                groupTitle = `${cleanTeamName(match.homeTeamName)} - ${cleanTeamName(match.awayTeamName)}`;
            }
        }
        if (!groupMap[groupTitle]) groupMap[groupTitle] = [];
        groupMap[groupTitle].push(act);
    });
    const sortedGroups = Object.keys(groupMap).sort((a, b) => a.localeCompare(b, 'tr'));

    // ==========================================
    // STATE & LOGIC: Tab 2 - Team Analysis
    // ==========================================
    const [teamsData, setTeamsData] = useState<{
        teams: TeamStats[],
        weeklyTrend: WeeklyTrend[],
        subjectBreakdown: Record<string, number>,
        categoryActions?: Record<string, Array<{ id: string; subject: string; teamName: string; penalty: string; date: string; reason: string; appealStatus?: string; appealedPenalty?: string }>>,
        leagueTotalFine: number,
        matchStats?: {
            mostFouledTeam: { name: string, count: number } | null;
            mostFoulBlowingReferee: { name: string, count: number } | null;
            mostYellowCardedTeam: { name: string, count: number } | null;
            mostRedCardedTeam: { name: string, count: number } | null;
            mostCardGivingReferee: { name: string, count: number } | null;
        }
    } | null>(null);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [search, setSearch] = useState('');
    const [currentStatIndex, setCurrentStatIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab !== 'teams') return;
        setSelectedCategory(null);
        async function fetchStats() {
            try {
                setLoadingTeams(true);
                const res = await fetch(`/api/stats/teams/disciplinary?season=${selectedSeason}`);
                const json = await res.json();
                setTeamsData(json);
            } catch (e) {
                console.error("Stats load error", e);
            } finally {
                setLoadingTeams(false);
            }
        }
        fetchStats();
    }, [selectedSeason, activeTab]);

    useEffect(() => {
        if (activeTab !== 'teams' || !teamsData || !teamsData.matchStats) return;
        const interval = setInterval(() => {
            setCurrentStatIndex((prev) => (prev + 1) % 5);
        }, 4000);
        return () => clearInterval(interval);
    }, [teamsData, activeTab]);

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('tr-TR').format(val) + " TL";
    };

    const filteredTeams = teamsData?.teams.filter(t =>
        t.teamName.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <main className="min-h-screen bg-[#0d1117] text-white pb-20 pt-8">
            <div className="max-w-7xl mx-auto px-4 space-y-8">
                {/* Header Title */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic bg-clip-text text-transparent bg-linear-to-r from-primary to-orange-500 leading-none">
                        DİSİPLİN ANALİZİ <span className="text-white">MERKEZİ</span>
                    </h1>
                    <p className="text-muted-foreground text-[10px] font-bold tracking-[0.3em] uppercase opacity-90">
                        SÜPER LİG PFDK SEVKLERİ, CEZALARI VE TAKIM ANALİZ RAPORLARI
                    </p>
                </div>

                {/* Main Tab Switcher */}
                <div className="flex bg-[#161b22] p-1.5 rounded-xl border border-white/10 shadow-neo-sm overflow-hidden">
                    <button
                        onClick={() => setActiveTab('weekly')}
                        className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                            activeTab === 'weekly' ? 'bg-primary text-black shadow-lg scale-102' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                        }`}
                    >
                        📅 Haftalık Kararlar
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                            activeTab === 'teams' ? 'bg-primary text-black shadow-lg scale-102' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                        }`}
                    >
                        📊 Takım Analiz Raporu
                    </button>
                </div>

                {/* Season Selector */}
                <div className="flex items-center justify-between gap-4 bg-[#161b22] p-3 rounded-2xl border border-white/10 shadow-2xl flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Aktif Sezon:</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5">{selectedSeason}</span>
                    </div>
                    <div className="flex bg-slate-950 p-1.5 rounded-xl border border-white/5 gap-1">
                        {['2025-2026', '2026-2027'].map((season) => (
                            <button
                                key={season}
                                onClick={() => setSelectedSeason(season)}
                                className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${selectedSeason === season
                                    ? 'bg-primary text-black shadow-md scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                    }`}
                            >
                                {season}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ==========================================
                    TAB 1: WEEKLY DECISIONS PANEL
                   ========================================== */}
                {activeTab === 'weekly' && (
                    <div className="space-y-6">
                        {/* Competition Switcher */}
                        <div className="flex bg-[#161b22] p-1 rounded-xl border border-white/10 shadow-neo-sm overflow-hidden">
                            <button
                                onClick={() => setCompetition('league')}
                                className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${competition === 'league' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                            >
                                SÜPER LİG
                            </button>
                            <button
                                onClick={() => setCompetition('cup')}
                                className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${competition === 'cup' ? 'bg-red-600 text-white shadow-lg' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                            >
                                TÜRKİYE KUPASI
                            </button>
                        </div>

                        {/* Week Selector (Only for League) */}
                        {competition === 'league' && !loadingWeeklyInit && (
                            <div className="flex flex-col items-center space-y-4 max-w-4xl mx-auto p-4 bg-[#161b22] rounded-xl border border-white/10 shadow-neo-sm text-white">
                                {/* Title: « 33.HAFTA » */}
                                <div className="flex items-center justify-center gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const current = Number(selectedWeek || 1);
                                            setSelectedWeek(current > 1 ? current - 1 : 34);
                                        }}
                                        className="text-white hover:text-primary font-black text-xl px-2 transition-colors cursor-pointer"
                                    >
                                        &laquo;
                                    </button>
                                    <span className="text-white font-extrabold text-sm uppercase tracking-wider">
                                        {selectedWeek ? `${selectedWeek}.HAFTA` : 'Hafta Seçilmedi'}
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const current = Number(selectedWeek || 1);
                                            setSelectedWeek(current < 34 ? current + 1 : 1);
                                        }}
                                        className="text-white hover:text-primary font-black text-xl px-2 transition-colors cursor-pointer"
                                    >
                                        &raquo;
                                    </button>
                                </div>

                                {/* Table Grid */}
                                <div className="w-full overflow-x-auto no-scrollbar rounded-lg border border-white/10">
                                    <table className="min-w-full text-center border-collapse text-xs font-semibold text-gray-300">
                                        <tbody>
                                            <tr className="border-b border-white/10">
                                                <td className="bg-slate-950/40 font-bold text-gray-400 px-3 py-2.5 border-r border-white/10 whitespace-nowrap text-left w-20">1. Devre</td>
                                                {Array.from({ length: 17 }, (_, i) => i + 1).map(week => {
                                                    const isSelected = selectedWeek === week;
                                                    const hasPassed = week <= maxWeek;
                                                    return (
                                                        <td 
                                                            key={week} 
                                                            onClick={() => hasPassed && setSelectedWeek(week)}
                                                            className={`border-r border-white/10 font-bold px-2 py-2.5 min-w-[32px] transition-colors ${
                                                                isSelected 
                                                                    ? 'bg-primary text-black hover:bg-primary/90' 
                                                                    : hasPassed
                                                                        ? 'cursor-pointer bg-[#161b22] text-gray-300 hover:bg-white/5'
                                                                        : 'bg-slate-950/20 text-gray-600 cursor-not-allowed opacity-40'
                                                            }`}
                                                        >
                                                            {week}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            <tr>
                                                <td className="bg-slate-950/40 font-bold text-gray-400 px-3 py-2.5 border-r border-white/10 whitespace-nowrap text-left w-20">2. Devre</td>
                                                {Array.from({ length: 17 }, (_, i) => i + 18).map(week => {
                                                    const isSelected = selectedWeek === week;
                                                    const hasPassed = week <= maxWeek;
                                                    return (
                                                        <td 
                                                            key={week} 
                                                            onClick={() => hasPassed && setSelectedWeek(week)}
                                                            className={`border-r border-white/10 font-bold px-2 py-2.5 min-w-[32px] transition-colors ${
                                                                isSelected 
                                                                    ? 'bg-primary text-black hover:bg-primary/90' 
                                                                    : hasPassed
                                                                        ? 'cursor-pointer bg-[#161b22] text-gray-300 hover:bg-white/5'
                                                                        : 'bg-slate-950/20 text-gray-600 cursor-not-allowed opacity-40'
                                                            }`}
                                                        >
                                                            {week}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 space-y-6">
                            {competition === 'cup' && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                                    <p className="text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                                        TÜRKİYE KUPASI GÜNCEL DOSYALARI LİSTELENİYOR
                                    </p>
                                </div>
                            )}

                            {loadingWeeklyInit || weekLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                                </div>
                            ) : sortedGroups.length === 0 ? (
                                <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm italic">
                                    Seçilen sezonda {competition === 'league' ? `${selectedWeek}. Hafta için` : 'Türkiye Kupası için'} henüz kayıtlı bir sevk veya ceza bulunamadı.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {sortedGroups.map(group => {
                                        const groupActions = groupMap[group];
                                        const referralCount = groupActions.length;
                                        const penaltyCount = groupActions.filter(a => a.penalty).length;
                                        const firstAction = groupActions[0];
                                        const matchId = firstAction?.matchId?.replace(/^d-/, '');
                                        const matchExists = matchId && matches.some(m => m.id === matchId || m.id === `d-${matchId}`);

                                        return (
                                            <div key={group} className="bg-card border-2 border-border rounded-2xl p-6 shadow-neo overflow-hidden relative group hover:border-primary transition-colors">
                                                <div className="absolute top-0 left-0 right-0 h-1 flex">
                                                    <div className="bg-blue-500" style={{ width: `${(referralCount / groupActions.length) * 100}%` }} />
                                                    <div className="bg-red-500" style={{ width: `${(penaltyCount / groupActions.length) * 100}%` }} />
                                                </div>
                                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                                    <div className="flex-1 text-center md:text-left">
                                                         <h3 className="font-black text-xl text-white uppercase tracking-tight leading-none mb-3 flex items-center gap-1.5 flex-wrap justify-center md:justify-start animate-pulse hover:animate-none">
                                                             {group.includes(' - ') ? (
                                                                 (() => {
                                                                     const parts = group.split(' - ');
                                                                     const team1Id = resolveTeamId(parts[0]);
                                                                     const team2Id = resolveTeamId(parts[1]);
                                                                     return (
                                                                         <>
                                                                             {team1Id ? (
                                                                                 <Link href={`/teams/${team1Id}`} className="hover:text-primary transition-colors hover:underline">
                                                                                     {parts[0]}
                                                                                 </Link>
                                                                             ) : (
                                                                                 <span>{parts[0]}</span>
                                                                             )}
                                                                             <span className="text-gray-500 font-medium font-mono text-sm select-none mx-1">VS</span>
                                                                             {team2Id ? (
                                                                                 <Link href={`/teams/${team2Id}`} className="hover:text-primary transition-colors hover:underline">
                                                                                     {parts[1]}
                                                                                 </Link>
                                                                             ) : (
                                                                                 <span>{parts[1]}</span>
                                                                             )}
                                                                         </>
                                                                     );
                                                                 })()
                                                             ) : (
                                                                 (() => {
                                                                     const teamId = resolveTeamId(group);
                                                                     return teamId ? (
                                                                         <Link href={`/teams/${teamId}`} className="hover:text-primary transition-colors hover:underline">
                                                                             {group}
                                                                         </Link>
                                                                     ) : (
                                                                         <span>{group}</span>
                                                                     );
                                                                 })()
                                                             )}
                                                         </h3>
                                                        <div className="flex gap-2 justify-center md:justify-start">
                                                            <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20 uppercase">{referralCount} SEVK</span>
                                                            <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20 uppercase">{penaltyCount} CEZA</span>
                                                        </div>
                                                    </div>
                                                    {matchExists && (
                                                        <Link
                                                            href={`/matches/${matchId}?tab=pfdk`}
                                                            className="bg-primary text-black text-[10px] font-black px-6 py-3 rounded-lg hover:scale-105 transition-all uppercase tracking-widest shadow-neo-sm active:scale-95"
                                                        >
                                                            MAÇ DETAYI ➔
                                                        </Link>
                                                    )}
                                                </div>

                                                {!matchExists && (
                                                    <div className="mt-6 border-t border-white/10 pt-4 space-y-4">
                                                        {groupActions.map((action) => (
                                                            <div key={action.id} className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
                                                                <div className="flex flex-wrap justify-between items-start gap-2">
                                                                    <div>
                                                                        <span className="text-xs font-black text-white">👤 {action.subject}</span>
                                                                        {!action.matchId && (
                                                                            (() => {
                                                                                const tId = resolveTeamId(action.teamName || '');
                                                                                return tId ? (
                                                                                    <Link href={`/teams/${tId}`} className="block mt-1 text-[9px] font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-1.5 py-0.5 rounded border border-primary/20 w-fit">
                                                                                        Bağlı Kulüp: {cleanTeamName(action.teamName || '')} (Maçsız Sevk)
                                                                                    </Link>
                                                                                ) : (
                                                                                    <span className="block mt-1 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 w-fit">
                                                                                        Bağlı Kulüp: {cleanTeamName(action.teamName || '')} (Maçsız Sevk)
                                                                                    </span>
                                                                                );
                                                                            })()
                                                                        )}
                                                                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{action.reason}</span>
                                                                    </div>
                                                                    <div className="flex gap-1.5 shrink-0">
                                                                        <span className="bg-slate-900 border border-white/5 text-gray-400 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                                            {action.date}
                                                                        </span>
                                                                        {action.category && (
                                                                            <span className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                                                {action.category}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {action.penalty && (
                                                                    <div className="bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-lg flex flex-col gap-1.5">
                                                                        <span className={`text-red-500 text-xs font-black uppercase tracking-wider ${action.appealStatus === 'accepted' || action.appealStatus === 'partially_accepted' ? 'line-through opacity-60' : ''}`}>
                                                                            ⚠️ Ceza: {action.penalty}
                                                                        </span>
                                                                        {action.appealStatus && action.appealStatus !== 'none' && (
                                                                            <span className={`w-fit text-[9px] font-black px-2 py-1 rounded border uppercase tracking-wider ${
                                                                                action.appealStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                                action.appealStatus === 'partially_accepted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                                action.appealStatus === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                            }`}>
                                                                                {action.appealStatus === 'accepted' ? 'Tahkim: İptal' :
                                                                                 action.appealStatus === 'partially_accepted' ? `Tahkim: İndirildi (${action.appealedPenalty})` :
                                                                                 action.appealStatus === 'rejected' ? 'Tahkim: Red' : 'Tahkim: Karar Bekleniyor'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {action.appealStatus && action.appealStatus !== 'none' && action.appealNote && (
                                                                    <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-lg p-3 text-[11px] text-gray-400 leading-relaxed font-medium">
                                                                        <div className="font-bold text-indigo-400 mb-1 flex items-center justify-between">
                                                                            <span>⚖️ Tahkim Kurulu Kararı</span>
                                                                            {action.appealDate && <span className="text-[9px] text-zinc-500 font-mono">{action.appealDate}</span>}
                                                                        </div>
                                                                        {action.appealNote}
                                                                    </div>
                                                                )}

                                                                {action.note && (
                                                                    <div className="bg-black/30 border border-white/5 rounded-lg p-3 text-[11px] text-gray-400 leading-relaxed font-medium">
                                                                        {action.note}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==========================================
                    TAB 2: TEAM ANALYSIS REPORT PANEL
                   ========================================== */}
                {activeTab === 'teams' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {loadingTeams ? (
                            <div className="space-y-4">
                                <Skeleton className="h-40 w-full rounded-2xl" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
                                </div>
                            </div>
                        ) : !teamsData || teamsData.teams.length === 0 ? (
                            <div className="text-center py-20 bg-[#161b22] border-2 border-white/20 rounded-2xl text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] shadow-xl">
                                Seçilen sezona ait takım disiplin analizi verisi bulunmamaktadır.
                            </div>
                        ) : (
                            <>
                                {/* Match Stats Banner */}
                                <div className="flex flex-col md:flex-row justify-between items-end gap-8 bg-[#161b22] border border-white/10 p-6 rounded-2xl shadow-neo">
                                    <div>
                                        <span className="bg-primary text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border-2 border-black inline-block mb-3 shadow-neo-sm">
                                            PFDK İSTATİSTİK ROTASYONU
                                        </span>
                                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none">
                                            LİG DİSİPLİN RAPORLARI
                                        </h2>

                                        <div className="mt-4 min-h-[46px] flex items-center">
                                            {teamsData.matchStats && (
                                                <div key={currentStatIndex} className="animate-in fade-in slide-in-from-left-4 duration-500 bg-black/40 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                                    <div className="text-[10px] font-bold text-gray-300 tracking-wider">
                                                        {currentStatIndex === 0 && teamsData.matchStats.mostFouledTeam && (
                                                            <span>EN ÇOK FAUL YAPAN TAKIM: <span className="text-primary font-black uppercase">{cleanSponsorsInText(teamsData.matchStats.mostFouledTeam.name)}</span> ({teamsData.matchStats.mostFouledTeam.count} FAUL)</span>
                                                        )}
                                                        {currentStatIndex === 1 && teamsData.matchStats.mostFoulBlowingReferee && (
                                                            <span>EN ÇOK FAUL ÇALAN HAKEM: <span className="text-primary font-black uppercase">{teamsData.matchStats.mostFoulBlowingReferee.name}</span> ({teamsData.matchStats.mostFoulBlowingReferee.count} FAUL)</span>
                                                        )}
                                                        {currentStatIndex === 2 && teamsData.matchStats.mostYellowCardedTeam && (
                                                            <span>EN ÇOK SARI KART GÖREN TAKIM: <span className="text-primary font-black uppercase">{cleanSponsorsInText(teamsData.matchStats.mostYellowCardedTeam.name)}</span> ({teamsData.matchStats.mostYellowCardedTeam.count} SARI KART)</span>
                                                        )}
                                                        {currentStatIndex === 3 && teamsData.matchStats.mostRedCardedTeam && (
                                                            <span>EN ÇOK KIRMIZI KART GÖREN TAKIM: <span className="text-primary font-black uppercase">{cleanSponsorsInText(teamsData.matchStats.mostRedCardedTeam.name)}</span> ({teamsData.matchStats.mostRedCardedTeam.count} KIRMIZI KART)</span>
                                                        )}
                                                        {currentStatIndex === 4 && teamsData.matchStats.mostCardGivingReferee && (
                                                            <span>EN ÇOK KART GÖSTEREN HAKEM: <span className="text-primary font-black uppercase">{teamsData.matchStats.mostCardGivingReferee.name}</span> ({teamsData.matchStats.mostCardGivingReferee.count} KART)</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl shadow-neo flex flex-col items-center md:items-end shrink-0">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">TOPLAM LİG CEZASI</span>
                                        <span className="text-2xl md:text-3xl font-black text-primary font-mono">{formatMoney(teamsData.leagueTotalFine)}</span>
                                    </div>
                                </div>

                                {/* Top 3 Quick Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {teamsData.teams.slice(0, 3).map((team, idx) => {
                                        const resolvedTeamId = resolveTeamId(team.teamName) || '';
                                        return (
                                            <div key={team.teamName} className="bg-white border-2 border-black rounded-2xl p-6 shadow-neo transform transition-transform hover:-translate-y-2 relative overflow-hidden group">
                                                <div className={`absolute top-0 right-0 p-4 text-4xl font-black ${idx === 0 ? 'text-primary/20' : 'text-gray-100'}`}>#{idx + 1}</div>
                                                <h3 className="text-black font-black text-xl uppercase tracking-tight mb-2 truncate pr-10">
                                                    {cleanSponsorsInText(team.teamName)}
                                                </h3>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">TOPLAM PARA CEZASI</span>
                                                    <span className="text-2xl font-black text-red-600 font-mono">{formatMoney(team.totalFine)}</span>
                                                </div>
                                                <div className="mt-4 flex justify-between items-end border-t border-gray-100 pt-4">
                                                    <div className="flex gap-4">
                                                        <div>
                                                            <div className="text-[8px] font-black text-gray-400 uppercase">SEVK</div>
                                                            <div className="text-md font-black text-black">{team.referralCount}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[8px] font-black text-gray-400 uppercase">CEZA</div>
                                                            <div className="text-md font-black text-black">{team.penaltyCount}</div>
                                                        </div>
                                                    </div>
                                                    {resolvedTeamId && (
                                                        <Link 
                                                            href={`/teams/${resolvedTeamId}`}
                                                            className="text-[9px] font-black text-primary hover:underline uppercase tracking-wider"
                                                        >
                                                            KULÜP DETAYI ➔
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Main Content Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left: Charts & Small Stats */}
                                    <div className="lg:col-span-1 space-y-6">
                                        {/* Subject Breakdown */}
                                        <div className="bg-[#161b22] border-2 border-white/20 rounded-2xl p-6 shadow-neo-sm">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-primary"></span> SEVK KATEGORİLERİ
                                            </h3>
                                            <div className="space-y-2">
                                                {Object.entries(teamsData.subjectBreakdown).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                                                    const total = Object.values(teamsData.subjectBreakdown).reduce((a, b) => a + b, 0);
                                                    const perc = total > 0 ? (count / total) * 100 : 0;
                                                    const isSelected = selectedCategory === label;
                                                    return (
                                                        <div 
                                                            key={label}
                                                            onClick={() => setSelectedCategory(isSelected ? null : label)}
                                                            className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                                                isSelected 
                                                                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(255,255,0,0.1)]' 
                                                                    : 'bg-transparent hover:bg-white/5 border-white/5'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase tracking-tighter">
                                                                <span className={isSelected ? 'text-primary' : 'text-white'}>{label}</span>
                                                                <span className="text-gray-500">{count} ADET</span>
                                                            </div>
                                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                <div className="h-full bg-primary shadow-[0_0_10px_rgba(255,255,0,0.3)]" style={{ width: `${perc}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Category Details Card */}
                                        {selectedCategory && teamsData?.categoryActions?.[selectedCategory] && (
                                            <div className="bg-[#161b22] border-2 border-primary/40 rounded-2xl p-6 shadow-[0_0_20px_rgba(255,255,0,0.05)] animate-in fade-in slide-in-from-top-4 duration-300">
                                                <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> {selectedCategory} SEVK DETAYI
                                                    </h3>
                                                    <button 
                                                        onClick={() => setSelectedCategory(null)}
                                                        className="text-[9px] font-black text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/10 transition-colors uppercase"
                                                    >
                                                        KAPAT
                                                     </button>
                                                </div>
                                                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1 no-scrollbar">
                                                    {teamsData.categoryActions[selectedCategory].length === 0 ? (
                                                        <p className="text-center text-[10px] font-bold text-gray-500 py-4 uppercase">BU KATEGORİDE SEVK BULUNMUYOR.</p>
                                                    ) : (
                                                        teamsData.categoryActions[selectedCategory].map((item, idx) => (
                                                            <div key={idx} className="bg-black/40 border border-white/5 p-3.5 rounded-xl flex flex-col gap-1.5 hover:border-white/10 transition-colors">
                                                                 <div className="flex justify-between items-start gap-2">
                                                                     <span className="text-xs font-black text-white uppercase tracking-tight">{item.subject}</span>
                                                                     <span className="text-[8px] font-black px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary uppercase shrink-0">{cleanSponsorsInText(item.teamName)}</span>
                                                                 </div>
                                                                 <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{item.reason}</p>
                                                                 <div className="flex items-center justify-between mt-1 text-[10px] font-black text-red-500 border-t border-white/5 pt-1.5">
                                                                     <span className="truncate pr-2">{item.penalty}</span>
                                                                     <span className="text-gray-500 text-[8px] font-mono shrink-0">{item.date}</span>
                                                                 </div>
                                                             </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Weekly Trend */}
                                        <div className="bg-[#161b22] border-2 border-white/20 rounded-2xl p-6 shadow-neo-sm">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6">HAFTALIK CEZA TRENDİ</h3>
                                            <div className="h-40 flex items-end gap-1.5 pt-4">
                                                {teamsData.weeklyTrend.map((w, i) => {
                                                    const max = Math.max(...teamsData.weeklyTrend.map(t => t.total), 1);
                                                    const h = (w.total / max) * 100;
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col items-center group relative">
                                                            <div className="absolute bottom-full mb-2 bg-black text-white text-[8px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-white/20">
                                                                {formatMoney(w.total)}
                                                            </div>
                                                            <div className="w-full bg-primary/20 rounded-t-sm group-hover:bg-primary transition-all cursor-crosshair border-b border-white/10" style={{ height: `${Math.max(5, h)}%` }}></div>
                                                            <span className="text-[7px] font-bold text-gray-500 mt-2">{w.week}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Full Interactive Table */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-[#161b22] border-2 border-white/20 rounded-2xl md:overflow-visible shadow-neo-sm h-full flex flex-col">
                                            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">SIRALAMALI ANALİZ TABLOSU</h3>
                                                <div className="relative w-full md:w-64">
                                                    <input
                                                        type="text"
                                                        placeholder="TAKIM ARA..."
                                                        value={search}
                                                        onChange={(e) => setSearch(e.target.value)}
                                                        className="w-full bg-black/30 border-2 border-white/10 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:border-primary focus:outline-none placeholder:text-gray-600 transition-all text-white"
                                                    />
                                                    <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto md:overflow-visible flex-1 no-scrollbar">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-16 md:top-0 z-10 bg-[#161b22] text-gray-500 shadow-sm border-b border-white/5">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] rounded-tl-2xl">TAKIM</th>
                                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-center">SEVK</th>
                                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-center">CEZA</th>
                                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-right rounded-tr-2xl">TOPLAM CEZA</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {filteredTeams.map((team) => {
                                                            const resolvedTeamId = resolveTeamId(team.teamName) || '';
                                                            return (
                                                                <tr key={team.teamName} className="hover:bg-white/2 transition-colors group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-black uppercase tracking-tighter group-hover:text-primary transition-colors">
                                                                                {resolvedTeamId ? (
                                                                                    <Link href={`/teams/${resolvedTeamId}`} className="hover:underline">
                                                                                        {cleanSponsorsInText(team.teamName)}
                                                                                    </Link>
                                                                                ) : (
                                                                                    cleanSponsorsInText(team.teamName)
                                                                                )}
                                                                            </span>
                                                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{team.mostCommonReason}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-2 py-1 rounded border border-blue-500/20">{team.referralCount}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-1 rounded border border-red-500/20">{team.penaltyCount}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-sm font-black font-mono text-primary">{formatMoney(team.totalFine)}</span>
                                                                            <div className="flex gap-1 mt-1">
                                                                                {team.topReasons.map(([r], i) => (
                                                                                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/10" title={r}></span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { MatchItem, MatchGroupedOpinions } from '@/components/matches/MatchItem';

// Helper: Group matches by week
const groupByWeek = (matches: MatchGroupedOpinions[]) => {
    const groups: { [key: number]: MatchGroupedOpinions[] } = {};
    matches.forEach(m => {
        const week = m.week || 0;
        if (!groups[week]) groups[week] = [];
        groups[week].push(m);
    });
    // Sort weeks descending
    return Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([week, matches]) => ({ week: Number(week), matches }));
};

export default function MatchesListingPage() {
    const [competition, setCompetition] = useState<'league' | 'cup'>('league');
    const [matches, setMatches] = useState<MatchGroupedOpinions[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekLoading, setWeekLoading] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
    const [maxWeek, setMaxWeek] = useState(34);
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');

    // 1. Initial Load: Read stored filters on client-side mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const querySeason = params.get('season');
            const storedSeason = sessionStorage.getItem('matches_selected_season');
            if (querySeason) {
                setSelectedSeason(querySeason);
            } else if (storedSeason) {
                setSelectedSeason(storedSeason);
            }

            const queryComp = params.get('competition');
            const storedComp = sessionStorage.getItem('matches_competition');
            if (queryComp === 'league' || queryComp === 'cup') {
                setCompetition(queryComp);
            } else if (storedComp === 'league' || storedComp === 'cup') {
                setCompetition(storedComp as 'league' | 'cup');
            }
        }
    }, []);

    // 2. Fetch Initial Weeks data when selectedSeason changes
    useEffect(() => {
        async function fetchInitial() {
            try {
                setLoading(true);
                const res = await fetch(`/api/public/matches?init=true&season=${selectedSeason}`);
                if (!res.ok) throw new Error('Failed to fetch initial matches data');
                const data = await res.json();
                
                const weeks = data.weeks || [];
                const mWeek = data.maxWeek || 1;

                setAvailableWeeks(weeks);
                setMaxWeek(mWeek);

                if (typeof window !== 'undefined') {
                    const params = new URLSearchParams(window.location.search);
                    const queryWeek = params.get('week');
                    const storedWeek = sessionStorage.getItem('matches_selected_week');
                    
                    if (queryWeek && !isNaN(Number(queryWeek))) {
                        setSelectedWeek(Number(queryWeek));
                    } else if (storedWeek && !isNaN(Number(storedWeek))) {
                        setSelectedWeek(Number(storedWeek));
                    } else {
                        setSelectedWeek(mWeek);
                    }
                } else {
                    setSelectedWeek(mWeek);
                }
            } catch (err) {
                console.error("Matches Initial Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchInitial();
    }, [selectedSeason]);

    // 3. Sync active filters to URL and sessionStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('matches_selected_season', selectedSeason);
            sessionStorage.setItem('matches_competition', competition);
            if (selectedWeek) {
                sessionStorage.setItem('matches_selected_week', selectedWeek.toString());
            }

            const url = new URL(window.location.href);
            url.searchParams.set('season', selectedSeason);
            url.searchParams.set('competition', competition);
            if (competition === 'league' && selectedWeek) {
                url.searchParams.set('week', selectedWeek.toString());
            } else {
                url.searchParams.delete('week');
            }
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }, [selectedWeek, competition, selectedSeason]);

    // 4. Fetch Matches when selectedWeek OR competition OR selectedSeason changes
    useEffect(() => {
        if (competition === 'league' && !selectedWeek) return;

        async function fetchMatches() {
            try {
                setWeekLoading(true);
                const url = `/api/public/matches?season=${selectedSeason}&competition=${competition}` + 
                            (competition === 'league' && selectedWeek ? `&week=${selectedWeek}` : '');
                
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch matches data');
                const data = await res.json();
                setMatches(data || []);
            } catch (err) {
                console.error("Matches Fetch Error:", err);
            } finally {
                setWeekLoading(false);
            }
        }
        fetchMatches();
    }, [selectedWeek, competition, selectedSeason]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium uppercase tracking-tighter">Yükleniyor...</span>
            </div>
        </div>
    );

    const halfSplit = 17;
    const currentHalf = (selectedWeek || 1) <= halfSplit ? 1 : 2;

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">

                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic bg-clip-text text-transparent bg-linear-to-r from-primary to-orange-500 leading-none">MAÇLAR</h1>
                    <p className="text-muted-foreground text-[10px] font-bold tracking-[0.3em] uppercase opacity-90">HAKEM VE GÖZLEMCİ PERFORMANS ANALİZLERİ</p>
                </div>

                {/* Sezon Seçici */}
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
                {competition === 'league' && (
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
                                            return (
                                                <td 
                                                    key={week} 
                                                    onClick={() => setSelectedWeek(week)}
                                                    className={`cursor-pointer border-r border-white/10 hover:bg-white/5 transition-colors font-bold px-2 py-2.5 min-w-[32px] ${
                                                        isSelected 
                                                            ? 'bg-primary text-black hover:bg-primary/90' 
                                                            : 'bg-[#161b22] text-gray-300 hover:bg-white/5'
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
                                            return (
                                                <td 
                                                    key={week} 
                                                    onClick={() => setSelectedWeek(week)}
                                                    className={`cursor-pointer border-r border-white/10 hover:bg-white/5 transition-colors font-bold px-2 py-2.5 min-w-[32px] ${
                                                        isSelected 
                                                            ? 'bg-primary text-black hover:bg-primary/90' 
                                                            : 'bg-[#161b22] text-gray-300 hover:bg-white/5'
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

                <div className="space-y-6">
                    {competition === 'cup' && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                                TÜRKİYE KUPASI GÜNCEL MAÇLARI LİSTELENİYOR
                            </p>
                        </div>
                    )}

                    {weekLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-card animate-pulse rounded-xl border border-border" />
                            ))}
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                            <span className="text-muted-foreground font-medium">
                                {competition === 'league' ? `${selectedWeek}. Hafta için` : 'Türkiye Kupası için'} henüz maç verisi bulunamadı.
                            </span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {matches.map((match) => (
                                <div key={match.matchId} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <MatchItem match={match} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}

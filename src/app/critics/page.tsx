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

export default function CriticsPage() {
    const [matches, setMatches] = useState<MatchGroupedOpinions[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const res = await fetch(`/api/public/critics?season=${selectedSeason}`);
                if (!res.ok) throw new Error('Failed to fetch critics data');
                const data = await res.json();
                setMatches(data || []);
            } catch (err) {
                console.error("Critics Page Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [selectedSeason]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Veriler Yükleniyor...</span>
            </div>
        </div>
    );

    const grouped = groupByWeek(matches);

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-12">
                <div className="flex flex-col gap-1 pb-6 border-b border-white/5">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
                        YORUMCULAR & <span className="text-primary">UZMANLAR</span>
                    </h1>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-90">
                        BAĞIMSIZ HAKEM ANALİZLERİ VE GÖRÜŞLERİ
                    </p>
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

                <div className="space-y-12">
                    {grouped.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-dashed border-white/10 rounded-2xl">
                            <span className="text-muted-foreground font-medium italic">Seçilen sezona ait yorumcu verisi bulunmamaktadır.</span>
                        </div>
                    ) : grouped.map((group) => (
                        <section key={group.week} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-secondary text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-neo-sm">
                                    {group.week}. HAFTA
                                </div>
                                <div className="h-px bg-white/10 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {group.matches.map((match) => (
                                    <div key={match.matchId} className="bg-card border-2 border-white/20 rounded-xl overflow-hidden shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                                        <MatchItem match={match} headerColor="text-primary" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </main>
    );
}

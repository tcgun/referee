"use client";

import { useEffect, useState } from 'react';
import { Statement } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

// Helper: Resolve season YYYY-YYYY from date
const getSeasonFromDate = (dateStr: string): string => {
    if (!dateStr) return '2025-2026';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed
    return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export default function StatementsPage() {
    const [statements, setStatements] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const res = await fetch('/api/public/statements');
                if (!res.ok) throw new Error('Failed to fetch statements');
                const data = await res.json();
                setStatements(data || []);
            } catch (err) {
                console.error("Statements Page Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-64 mb-1" />
                    <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <div className="grid grid-cols-1 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-6 w-24 rounded-md" />
                                <Skeleton className="h-5 w-20 rounded" />
                            </div>
                            <Skeleton className="h-8 w-3/4 mb-3" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );

    // Sezona göre filtrele
    const filtered = statements.filter(st => {
        const season = st.season || getSeasonFromDate(st.date || '');
        return season === selectedSeason;
    });

    const sorted = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-12">
                <div className="flex flex-col gap-1 pb-6 border-b border-white/5">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
                        RESMİ <span className="text-primary">AÇIKLAMALAR</span>
                    </h1>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-90">
                        TFF, MHK VE KULÜPLERDEN GÜNCEL DUYURULAR
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

                <div className="grid grid-cols-1 gap-6">
                    {sorted.length === 0 ? (
                        <div className="p-20 text-center bg-[#161b22] border border-white/10 rounded-2xl text-muted-foreground font-medium italic">
                            Seçilen sezona ait açıklama bulunmamaktadır.
                        </div>
                    ) : sorted.map((st, i) => {
                        const isLong = st.content.length > 200;
                        const displayContent = isLong ? st.content.substring(0, 200).trim() + '...' : st.content;

                        return (
                            <div key={st.id || i} className="bg-[#161b22] border-2 border-white/20 rounded-xl p-6 shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all group">
                                <Link href={`/statements/${st.id}`} className="block h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="bg-secondary text-black text-[9px] font-black px-2 py-0.5 rounded border border-black uppercase tracking-widest shadow-sm">
                                            {st.entity}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-500 font-mono">
                                            {st.date}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-black text-white mb-3 tracking-tighter group-hover:text-secondary transition-colors uppercase">{st.title}</h2>
                                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-4 line-clamp-3">
                                        {displayContent}
                                    </div>
                                    {isLong && (
                                        <div className="flex items-center gap-1 text-[10px] font-black text-secondary uppercase tracking-widest hover:gap-2 transition-all">
                                            DEVAMINI OKU
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}

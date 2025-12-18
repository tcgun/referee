"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/client";
import { Match } from "@/types";
import Link from "next/link";

/**
 * RefereeLig Matches List Page
 * High-tech "VAR Room" aesthetic listing all matches.
 */

export default function MatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMatches() {
            try {
                const q = query(collection(db, "matches"), orderBy("week", "desc"), orderBy("date", "desc"));
                const snap = await getDocs(q);
                const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Match));
                setMatches(list);
            } catch (err) {
                console.error("Match Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMatches();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    <span className="text-cyan-500 font-mono text-xs animate-pulse tracking-widest uppercase">Initializing Terminal...</span>
                </div>
            </div>
        );
    }

    // Group by week
    const groupedByWeek = matches.reduce((acc, m) => {
        const week = m.week || 0;
        if (!acc[week]) acc[week] = [];
        acc[week].push(m);
        return acc;
    }, {} as Record<number, Match[]>);

    const weeks = Object.keys(groupedByWeek).map(Number).sort((a, b) => b - a);

    return (
        <main className="min-h-screen bg-[#02040a] text-zinc-100 py-12 px-4 selection:bg-cyan-500/30">
            <div className="max-w-5xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-8">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-500 font-mono text-[10px] uppercase tracking-[0.3em] mb-2">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                            Database_Live_Feed
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter">FIKSTÜR & <span className="text-cyan-500">SONUÇLAR</span></h1>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">Total_Entries: {matches.length}</div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">Last_Update: {new Date().toLocaleTimeString()}</div>
                    </div>
                </header>

                {weeks.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">
                        <span className="text-zinc-500 font-mono text-sm">Henüz maç verisi bulunamadı.</span>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {weeks.map((week) => (
                            <section key={week}>
                                <div className="flex items-center gap-4 mb-6">
                                    <h2 className="text-xl font-bold text-cyan-500 uppercase tracking-widest">{week}. HAFTA</h2>
                                    <div className="flex-1 h-px bg-zinc-800" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {groupedByWeek[week].map((match) => (
                                        <MatchCard key={match.id} match={match} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function MatchCard({ match }: { match: Match }) {
    return (
        <Link
            href={`/matches/${match.id}`}
            className="group p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-cyan-500/50 transition-all hover:bg-zinc-900/60 relative overflow-hidden"
        >
            {/* Visual Glitch/Terminal Effect on Hover */}
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-[8px] text-cyan-500 font-mono leading-none">ANALYSIS_REQ<br />[00:1A:4F]</div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        {match.date ? new Date(match.date).toLocaleDateString('tr-TR') : 'Tarih Belirsiz'}
                    </span>
                    {match.status === 'draft' && (
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold rounded uppercase">Draft</span>
                    )}
                </div>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 text-right text-sm md:text-base font-bold truncate">
                        {match.homeTeamName}
                    </div>

                    <div className="shrink-0 px-3 py-1 bg-zinc-800/80 rounded font-mono tabular-nums font-black text-xl md:text-2xl tracking-tighter shadow-inner group-hover:text-cyan-400 transition-colors">
                        {match.score || "0 - 0"}
                    </div>

                    <div className="flex-1 text-left text-sm md:text-base font-bold truncate">
                        {match.awayTeamName}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-zinc-800 rounded flex items-center justify-center text-[10px]">👤</div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase truncate">{match.referee || "Belirlenmedi"}</span>
                    </div>
                    <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        İNCELE <span className="text-xs">→</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

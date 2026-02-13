"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cleanSponsorsInText, getTeamName, resolveTeamId } from '@/lib/teams';

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

export default function TeamDisciplinaryAnalysis() {
    const [data, setData] = useState<{
        teams: TeamStats[],
        weeklyTrend: WeeklyTrend[],
        subjectBreakdown: Record<string, number>,
        leagueTotalFine: number
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/stats/teams/disciplinary');
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error("Stats load error", e);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
    );

    if (!data) return null;

    const filteredTeams = data.teams.filter(t =>
        t.teamName.toLowerCase().includes(search.toLowerCase())
    );

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('tr-TR').format(val) + " TL";
    };

    return (
        <main className="min-h-screen bg-[#0d1117] text-white pb-20">
            {/* Header Section */}
            <div className="bg-[#161b22] border-b border-white/10 pt-12 pb-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                        <div>
                            <span className="bg-primary text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border-2 border-black inline-block mb-4 shadow-neo-sm">
                                PFDK ANALİZ MERKEZİ
                            </span>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase">
                                TAKIM DİSİPLİN <br /> <span className="text-primary italic">RAPORU</span>
                            </h1>
                        </div>
                        <div className="bg-white/5 border-2 border-white/10 p-6 rounded-2xl shadow-neo flex flex-col items-center md:items-end">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TOPLAM LİG CEZASI</span>
                            <span className="text-3xl md:text-4xl font-black text-primary font-mono">{formatMoney(data.leagueTotalFine)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-8">
                {/* Top 3 Quick Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {data.teams.slice(0, 3).map((team, idx) => (
                        <div key={team.teamName} className="bg-white border-2 border-black rounded-2xl p-6 shadow-neo transform transition-transform hover:-translate-y-2 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-4 text-4xl font-black ${idx === 0 ? 'text-primary/20' : 'text-gray-100'}`}>#{idx + 1}</div>
                            <h3 className="text-black font-black text-xl uppercase tracking-tight mb-2 truncate pr-10">{cleanSponsorsInText(team.teamName)}</h3>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TOPLAM PARA CEZASI</span>
                                <span className="text-2xl font-black text-red-600 font-mono">{formatMoney(team.totalFine)}</span>
                            </div>
                            <div className="mt-4 flex gap-4 border-t-2 border-gray-50 pt-4">
                                <div>
                                    <div className="text-[8px] font-black text-gray-400 uppercase">SEVK</div>
                                    <div className="text-lg font-black text-black">{team.referralCount}</div>
                                </div>
                                <div>
                                    <div className="text-[8px] font-black text-gray-400 uppercase">CEZA</div>
                                    <div className="text-lg font-black text-black">{team.penaltyCount}</div>
                                </div>
                            </div>
                        </div>
                    ))}
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
                            <div className="space-y-4">
                                {Object.entries(data.subjectBreakdown).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                                    const total = Object.values(data.subjectBreakdown).reduce((a, b) => a + b, 0);
                                    const perc = (count / total) * 100;
                                    return (
                                        <div key={label}>
                                            <div className="flex justify-between text-[10px] font-black mb-1.5 uppercase tracking-tighter">
                                                <span>{label}</span>
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

                        {/* Weekly Trend (Minimal SVG Sparkline) */}
                        <div className="bg-[#161b22] border-2 border-white/20 rounded-2xl p-6 shadow-neo-sm">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6">HAFTALIK CEZA TRENDİ</h3>
                            <div className="h-40 flex items-end gap-1.5 pt-4">
                                {data.weeklyTrend.map((w, i) => {
                                    const max = Math.max(...data.weeklyTrend.map(t => t.total));
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
                        <div className="bg-[#161b22] border-2 border-white/20 rounded-2xl overflow-hidden shadow-neo-sm h-full flex flex-col">
                            <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">SIRALAMALI ANALİZ TABLOSU</h3>
                                <div className="relative w-full md:w-64">
                                    <input
                                        type="text"
                                        placeholder="TAKIM ARA..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-black/30 border-2 border-white/10 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:border-primary focus:outline-none placeholder:text-gray-600 transition-all"
                                    />
                                    <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            </div>

                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-black/20 text-gray-500">
                                        <tr>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em]">TAKIM</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-center">SEVK</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-center">CEZA</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-right">TOPLAM CEZA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredTeams.map((team, idx) => (
                                            <tr key={team.teamName} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black uppercase tracking-tighter group-hover:text-primary transition-colors">{cleanSponsorsInText(team.teamName)}</span>
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
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

const getSlug = (name: string) => {
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
import {
    ShieldCheck, TrendingUp, TrendingDown, Minus,
    Clock, Target, Users, Award, ChevronUp, ChevronDown,
    ChevronsUpDown, BarChart3, Zap, Circle
} from 'lucide-react';

interface RefereeMatchStat {
    name: string;
    region?: string;
    rating?: number;
    classification?: string;
    matches: number;
    roles: {
        referee: number;
        assistant: number;
        fourth: number;
        var: number;
        avar: number;
    };
    // Match-based computed averages
    avgYellowPerMatch?: number;
    avgRedPerMatch?: number;
    avgFoulsPerMatch?: number;
    avgGoalsPerMatch?: number;
    avgHomeGoalsPerMatch?: number;
    avgAwayGoalsPerMatch?: number;
    homeFoulRatio?: number;
    homeCardRatio?: number;
    avgBallInPlayMin?: number;
    totalYellowCards?: number;
    totalRedCards?: number;
    topTeams?: { name: string; count: number }[];
    dbRoles?: string[];
}

type SortKey =
    | 'name' | 'matches' | 'roles.referee'
    | 'avgYellowPerMatch' | 'avgRedPerMatch' | 'avgFoulsPerMatch'
    | 'avgGoalsPerMatch' | 'homeFoulRatio' | 'avgBallInPlayMin'
    | 'totalYellowCards' | 'totalRedCards';

type SortDir = 'asc' | 'desc';

const fmt = (v?: number, decimals = 2) =>
    v === undefined || v === null ? '—' : v.toFixed(decimals);

const pct = (v?: number) =>
    v === undefined || v === null ? '—' : `%${v.toFixed(1)}`;

/** Bias label: how much ev sahibi vs deplasman favored */
const biasLabel = (ratio?: number) => {
    if (ratio === undefined || ratio === null) return null;
    const dev = ratio - 0.5; // 0 = perfectly balanced
    if (Math.abs(dev) < 0.03) return { label: 'Dengeli', color: 'text-green-400' };
    if (dev > 0.12) return { label: 'Ev Yanlısı', color: 'text-rose-400' };
    if (dev > 0.05) return { label: 'Hafif Ev', color: 'text-orange-400' };
    if (dev < -0.12) return { label: 'Dep Yanlısı', color: 'text-blue-400' };
    if (dev < -0.05) return { label: 'Hafif Dep', color: 'text-sky-400' };
    return { label: 'Dengeli', color: 'text-green-400' };
};

const BiasBar = ({ ratio }: { ratio?: number }) => {
    if (ratio === undefined || ratio === null) return <span className="text-muted-foreground/30 text-xs">—</span>;
    const info = biasLabel(ratio);
    const pctHome = Math.round(ratio * 100);
    return (
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                    className="h-full bg-orange-500/70 rounded-l-full transition-all"
                    style={{ width: `${pctHome}%` }}
                />
                <div
                    className="h-full bg-sky-500/70 rounded-r-full transition-all"
                    style={{ width: `${100 - pctHome}%` }}
                />
            </div>
            <span className={`text-[9px] font-black uppercase ${info?.color}`}>{info?.label}</span>
        </div>
    );
};

const StatBadge = ({ value, label, color = 'slate' }: { value: string; label: string; color?: string }) => (
    <div className={`flex flex-col items-center px-2 py-1.5 rounded-lg bg-${color}-900/30 border border-${color}-800/40 min-w-[52px]`}>
        <span className={`text-sm font-black font-mono text-${color}-300`}>{value}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
    </div>
);

const SortHeader = ({
    label, sortKey, currentSort, currentDir, onSort, className = ''
}: {
    label: string; sortKey: SortKey; currentSort: SortKey; currentDir: SortDir;
    onSort: (k: SortKey) => void; className?: string;
}) => {
    const active = currentSort === sortKey;
    return (
        <th
            className={`p-3 text-center cursor-pointer select-none group transition-colors hover:bg-white/5 ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center justify-center gap-1">
                <span className={active ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
                <span className="text-muted-foreground/40 group-hover:text-muted-foreground/80">
                    {active
                        ? (currentDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                        : <ChevronsUpDown className="w-3 h-3" />}
                </span>
            </div>
        </th>
    );
};

export default function RefereesPage() {
    const [referees, setReferees] = useState<RefereeMatchStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState('2025-2026');
    const [sortKey, setSortKey] = useState<SortKey>('roles.referee');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [search, setSearch] = useState('');
    const [minMatches, setMinMatches] = useState(0);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/stats/referees?season=${selectedSeason}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(data => {
                if (data?.referees) setReferees(data.referees);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedSeason]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const getValue = (r: RefereeMatchStat, key: SortKey): number => {
        if (key === 'name') return 0;
        if (key === 'matches') return r.matches;
        if (key === 'roles.referee') return r.roles.referee;
        if (key === 'avgYellowPerMatch') return r.avgYellowPerMatch ?? -1;
        if (key === 'avgRedPerMatch') return r.avgRedPerMatch ?? -1;
        if (key === 'avgFoulsPerMatch') return r.avgFoulsPerMatch ?? -1;
        if (key === 'avgGoalsPerMatch') return r.avgGoalsPerMatch ?? -1;
        if (key === 'homeFoulRatio') return r.homeFoulRatio ?? -1;
        if (key === 'avgBallInPlayMin') return r.avgBallInPlayMin ?? -1;
        if (key === 'totalYellowCards') return r.totalYellowCards ?? -1;
        if (key === 'totalRedCards') return r.totalRedCards ?? -1;
        return 0;
    };

    const filtered = referees
        .filter(r => r.roles.referee > 0) // Only show main referees
        .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
        .filter(r => r.roles.referee >= minMatches)
        .sort((a, b) => {
            if (sortKey === 'name') {
                const cmp = a.name.localeCompare(b.name, 'tr');
                return sortDir === 'asc' ? cmp : -cmp;
            }
            const va = getValue(a, sortKey);
            const vb = getValue(b, sortKey);
            return sortDir === 'asc' ? va - vb : vb - va;
        });

    // League-wide averages (for context)
    const withData = filtered.filter(r => r.roles.referee > 0 && r.avgYellowPerMatch !== undefined);
    const leagueAvgYellow = withData.length
        ? withData.reduce((s, r) => s + (r.avgYellowPerMatch ?? 0), 0) / withData.length : 0;
    const leagueAvgGoals = withData.length
        ? withData.reduce((s, r) => s + (r.avgGoalsPerMatch ?? 0), 0) / withData.length : 0;
    const leagueAvgFouls = withData.length
        ? withData.reduce((s, r) => s + (r.avgFoulsPerMatch ?? 0), 0) / withData.length : 0;

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    return (
        <main className="min-h-screen bg-background pb-20 pt-8 text-foreground">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 space-y-6">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                            HAKEM <span className="text-primary">İSTATİSTİKLERİ</span>
                        </h1>
                        <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-70 mt-1">
                            ORTA HAKEM PERFORMANS ANALİZİ · {selectedSeason}
                        </p>
                    </div>
                    {/* Season selector */}
                    <div className="flex bg-[#161b22] p-1.5 rounded-2xl border border-white/10 gap-1">
                        {['2025-2026', '2026-2027'].map(s => (
                            <button
                                key={s}
                                onClick={() => setSelectedSeason(s)}
                                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${selectedSeason === s
                                    ? 'bg-primary text-black shadow-md scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </header>

                {/* League-wide average summary cards */}
                {withData.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { icon: <Award className="w-4 h-4" />, label: 'Lig Ort. Sarı Kart/Maç', value: leagueAvgYellow.toFixed(2), color: 'amber' },
                            { icon: <Target className="w-4 h-4" />, label: 'Lig Ort. Gol/Maç', value: leagueAvgGoals.toFixed(2), color: 'emerald' },
                            { icon: <Zap className="w-4 h-4" />, label: 'Lig Ort. Faul/Maç', value: leagueAvgFouls.toFixed(1), color: 'blue' },
                            { icon: <Users className="w-4 h-4" />, label: 'Orta Hakem Sayısı', value: filtered.length.toString(), color: 'violet' },
                        ].map(card => (
                            <div key={card.label}
                                className={`bg-${card.color}-950/30 border border-${card.color}-900/40 rounded-2xl p-4 flex flex-col gap-2`}
                            >
                                <div className={`text-${card.color}-400 flex items-center gap-1.5`}>
                                    {card.icon}
                                    <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{card.label}</span>
                                </div>
                                <span className={`text-2xl font-black font-mono text-${card.color}-300`}>{card.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-wrap gap-3 items-center bg-[#161b22] p-3 rounded-2xl border border-white/10">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-slate-950 rounded-xl px-3 py-2 border border-white/5 flex-1 min-w-[160px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/50" />
                        <input
                            type="text"
                            placeholder="Hakem ara..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent text-xs font-bold text-foreground placeholder:text-muted-foreground/40 outline-none w-full"
                        />
                    </div>
                    {/* Min matches filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Min Maç:</span>
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 gap-1">
                            {[0, 3, 5, 10].map(n => (
                                <button
                                    key={n}
                                    onClick={() => setMinMatches(n)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all duration-200 ${minMatches === n
                                        ? 'bg-primary text-black'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                                >
                                    {n === 0 ? 'Tümü' : `${n}+`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 font-bold ml-auto">
                        {filtered.length} hakem
                    </span>
                </div>

                {/* Legend for bias bar */}
                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 px-1">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1.5 rounded bg-orange-500/70 inline-block" />
                        Ev sahibi faul
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1.5 rounded bg-sky-500/70 inline-block" />
                        Deplasman faul
                    </div>
                    <Circle className="w-2 h-2" />
                    <span>50/50 = dengeli</span>
                </div>

                {/* Main Table */}
                {filtered.length === 0 ? (
                    <div className="bg-[#161b22] border border-white/10 rounded-2xl p-16 text-center text-muted-foreground text-xs font-bold uppercase tracking-[0.2em]">
                        Seçilen kriterlere uygun hakem bulunamadı.
                    </div>
                ) : (
                    <>
                    {/* Desktop View */}
                    <div className="hidden md:block bg-card border border-border rounded-2xl shadow-2xl overflow-visible">
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-16 md:top-0 z-20 bg-muted text-muted-foreground text-[9px] uppercase font-black tracking-wider border-b border-border shadow-md">
                                <tr>
                                    {/* Fixed info */}
                                    <th className="p-3 pl-5 sticky left-0 z-30 bg-muted min-w-[180px] rounded-tl-2xl">Hakem / Bölge</th>
                                        <SortHeader label="Orta" sortKey="roles.referee" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="min-w-[56px]" />
                                        <th className="p-3 text-center min-w-[60px]">Yrd</th>
                                        <th className="p-3 text-center min-w-[60px]">VAR</th>

                                        {/* Group: Goals */}
                                        <th className="p-3 text-center bg-emerald-950/20 border-l border-emerald-900/30 min-w-[56px] text-emerald-600">
                                            <div>⚽</div>
                                            <div className="text-[7px]">Gol/Maç</div>
                                        </th>
                                        <th className="p-3 text-center bg-emerald-950/10 min-w-[52px] text-emerald-700">
                                            <div>🏠</div>
                                            <div className="text-[7px]">Ev Gol</div>
                                        </th>
                                        <th className="p-3 text-center bg-emerald-950/10 border-r border-emerald-900/30 min-w-[52px] text-emerald-700">
                                            <div>✈️</div>
                                            <div className="text-[7px]">Dep Gol</div>
                                        </th>

                                        {/* Group: Cards */}
                                        <SortHeader label="🟨 /Maç" sortKey="avgYellowPerMatch" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="bg-amber-950/20 border-l border-amber-900/30 min-w-[68px] text-amber-600" />
                                        <SortHeader label="🟥 /Maç" sortKey="avgRedPerMatch" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="bg-amber-950/20 min-w-[68px] text-amber-600" />
                                        <SortHeader label="🟨 Toplam" sortKey="totalYellowCards" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="bg-amber-950/10 min-w-[68px] text-amber-700" />
                                        <SortHeader label="🟥 Toplam" sortKey="totalRedCards" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="bg-amber-950/10 border-r border-amber-900/30 min-w-[68px] text-amber-700" />

                                        {/* Group: Fouls */}
                                        <SortHeader label="Faul/Maç" sortKey="avgFoulsPerMatch" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="bg-blue-950/20 border-l border-blue-900/30 min-w-[80px] text-blue-600" />
                                        <th className="p-3 text-center bg-blue-950/20 border-r border-blue-900/30 min-w-[110px]">
                                            <div className="text-blue-600">Faul Dengesi</div>
                                            <div className="text-[7px] text-muted-foreground/50 normal-case">Ev ↔ Dep</div>
                                        </th>

                                    {/* Ball in play */}
                                    <SortHeader label="⏱️ Top Süresi" sortKey="avgBallInPlayMin" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="min-w-[90px] rounded-tr-2xl" />
                                </tr>
                            </thead>
                                <tbody className="divide-y divide-border">
                                    {filtered.map((r, i) => {
                                        const isElite = (r.classification || '').startsWith('ust-') || (r.dbRoles || []).includes('var');
                                        return (
                                            <tr key={r.name} className="hover:bg-white/5 transition-colors group">
                                                {/* Name */}
                                                <td className="p-3 pl-5 sticky left-0 bg-card group-hover:bg-[#13161d] z-10">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground/20 text-[10px] font-mono w-4">{i + 1}</span>
                                                        <div>
                                                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                                                <Link href={`/officials/${getSlug(r.name)}`} className="hover:text-primary transition-colors">
                                                                    {r.name}
                                                                </Link>
                                                                {isElite && (
                                                                    <span className="text-[7px] font-black bg-primary/20 text-primary px-1 py-0.5 rounded uppercase tracking-wider">ÜST</span>
                                                                )}
                                                            </div>
                                                            <div className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wide">
                                                                {r.region || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role counts */}
                                                <td className="p-3 text-center">
                                                    <span className="font-black text-base font-mono text-white">{r.roles.referee}</span>
                                                </td>
                                                <td className={`p-3 text-center text-xs ${r.roles.assistant > 0 ? 'text-white/70' : 'text-muted-foreground/20'}`}>
                                                    {r.roles.assistant || '—'}
                                                </td>
                                                <td className={`p-3 text-center text-xs ${r.roles.var > 0 ? 'text-primary/80' : 'text-muted-foreground/20'}`}>
                                                    {r.roles.var || '—'}
                                                </td>

                                                {/* Goals */}
                                                <td className="p-3 text-center bg-emerald-950/10 border-l border-emerald-900/20">
                                                    {r.roles.referee > 0 && r.avgGoalsPerMatch !== undefined ? (
                                                        <span className={`font-bold text-sm font-mono ${(r.avgGoalsPerMatch || 0) > leagueAvgGoals ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                            {fmt(r.avgGoalsPerMatch)}
                                                        </span>
                                                    ) : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center bg-emerald-950/5 text-xs text-emerald-800">
                                                    {fmt(r.avgHomeGoalsPerMatch)}
                                                </td>
                                                <td className="p-3 text-center bg-emerald-950/5 border-r border-emerald-900/20 text-xs text-emerald-800">
                                                    {fmt(r.avgAwayGoalsPerMatch)}
                                                </td>

                                                {/* Cards */}
                                                <td className="p-3 text-center bg-amber-950/10 border-l border-amber-900/20">
                                                    {r.roles.referee > 0 && r.avgYellowPerMatch !== undefined ? (
                                                        <span className={`font-bold text-sm font-mono ${(r.avgYellowPerMatch || 0) > leagueAvgYellow + 0.5 ? 'text-amber-400' : (r.avgYellowPerMatch || 0) < leagueAvgYellow - 0.5 ? 'text-amber-800' : 'text-amber-600'}`}>
                                                            {fmt(r.avgYellowPerMatch)}
                                                        </span>
                                                    ) : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center bg-amber-950/10">
                                                    {r.roles.referee > 0 && r.avgRedPerMatch !== undefined ? (
                                                        <span className={`font-bold text-sm font-mono ${(r.avgRedPerMatch || 0) > 0.15 ? 'text-rose-400' : 'text-rose-800'}`}>
                                                            {fmt(r.avgRedPerMatch)}
                                                        </span>
                                                    ) : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center bg-amber-950/5 text-xs">
                                                    {r.roles.referee > 0 && r.totalYellowCards !== undefined
                                                        ? <span className="text-amber-500 font-black font-mono text-sm">{r.totalYellowCards}</span>
                                                        : <span className="text-muted-foreground/20">—</span>}
                                                </td>
                                                <td className="p-3 text-center bg-amber-950/5 border-r border-amber-900/20 text-xs">
                                                    {r.roles.referee > 0 && r.totalRedCards !== undefined
                                                        ? <span className="text-rose-500 font-black font-mono text-sm">{r.totalRedCards}</span>
                                                        : <span className="text-muted-foreground/20">—</span>}
                                                </td>

                                                {/* Fouls */}
                                                <td className="p-3 text-center bg-blue-950/10 border-l border-blue-900/20">
                                                    {r.roles.referee > 0 && r.avgFoulsPerMatch !== undefined ? (
                                                        <span className={`font-bold text-sm font-mono ${(r.avgFoulsPerMatch || 0) > leagueAvgFouls + 2 ? 'text-blue-400' : (r.avgFoulsPerMatch || 0) < leagueAvgFouls - 2 ? 'text-blue-900' : 'text-blue-600'}`}>
                                                            {fmt(r.avgFoulsPerMatch, 1)}
                                                        </span>
                                                    ) : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 bg-blue-950/10 border-r border-blue-900/20">
                                                    <div className="flex justify-center">
                                                        <BiasBar ratio={r.roles.referee > 0 ? r.homeFoulRatio : undefined} />
                                                    </div>
                                                </td>

                                                {/* Ball in play */}
                                                <td className="p-3 text-center">
                                                    {r.roles.referee > 0 && r.avgBallInPlayMin !== undefined ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Clock className="w-3 h-3 text-muted-foreground/40" />
                                                            <span className="font-bold text-xs font-mono text-white/80">{r.avgBallInPlayMin} dk</span>
                                                        </div>
                                                    ) : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Footer info */}
                            <div className="px-5 py-3 border-t border-border bg-muted/30 flex flex-wrap gap-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                                <span>🟨/Maç · 🟥/Maç = Maç başına ortalama kart sayısı</span>
                                <span>🟨 Toplam · 🟥 Toplam = Sezondaki toplam kart sayısı</span>
                                <span>Faul Dengesi = Ev/Deplasman faul oranı</span>
                                <span className="ml-auto">Sadece orta hakem görevleri hesaba katılır</span>
                            </div>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="block md:hidden space-y-3">
                            {filtered.map((r, i) => {
                                const isElite = (r.classification || '').startsWith('ust-') || (r.dbRoles || []).includes('var');
                                return (
                                    <div key={r.name} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground/35 text-[10px] font-mono w-4">{i + 1}</span>
                                                <div>
                                                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                                        <Link href={`/officials/${getSlug(r.name)}`} className="hover:text-primary transition-colors">
                                                            {r.name}
                                                        </Link>
                                                        {isElite && (
                                                            <span className="text-[7px] font-black bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">ÜST</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wide">
                                                        {r.region || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-white font-mono">{r.roles.referee} Maç</div>
                                                <div className="text-[8px] text-muted-foreground/50 font-bold uppercase tracking-wider">Orta Hakem</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-1.5 text-center pt-2.5 border-t border-white/5">
                                            <div>
                                                <div className="text-[8px] font-black text-amber-500 uppercase">🟨 /Maç</div>
                                                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">{fmt(r.avgYellowPerMatch)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-rose-500 uppercase">🟥 /Maç</div>
                                                <div className="text-xs font-mono font-bold text-rose-400 mt-0.5">{fmt(r.avgRedPerMatch)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-blue-500 uppercase">Faul/Maç</div>
                                                <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">{fmt(r.avgFoulsPerMatch, 1)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-emerald-500 uppercase">Gol/Maç</div>
                                                <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{fmt(r.avgGoalsPerMatch)}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Top 3 Leaders */}
                {filtered.filter(r => r.avgYellowPerMatch !== undefined).length >= 3 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                        {[
                            {
                                title: 'En Az Sarı Kart',
                                icon: <TrendingDown className="w-4 h-4 text-green-400" />,
                                color: 'green',
                                items: [...filtered].filter(r => r.avgYellowPerMatch !== undefined && r.roles.referee >= 3)
                                    .sort((a, b) => (a.avgYellowPerMatch ?? 99) - (b.avgYellowPerMatch ?? 99))
                                    .slice(0, 5),
                                value: (r: RefereeMatchStat) => `${fmt(r.avgYellowPerMatch)} / maç`,
                            },
                            {
                                title: 'En Fazla Sarı Kart',
                                icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
                                color: 'amber',
                                items: [...filtered].filter(r => r.avgYellowPerMatch !== undefined && r.roles.referee >= 3)
                                    .sort((a, b) => (b.avgYellowPerMatch ?? 0) - (a.avgYellowPerMatch ?? 0))
                                    .slice(0, 5),
                                value: (r: RefereeMatchStat) => `${fmt(r.avgYellowPerMatch)} / maç`,
                            },
                            {
                                title: 'En Fazla Gol / Maç',
                                icon: <BarChart3 className="w-4 h-4 text-emerald-400" />,
                                color: 'emerald',
                                items: [...filtered].filter(r => r.avgGoalsPerMatch !== undefined && r.roles.referee >= 3)
                                    .sort((a, b) => (b.avgGoalsPerMatch ?? 0) - (a.avgGoalsPerMatch ?? 0))
                                    .slice(0, 5),
                                value: (r: RefereeMatchStat) => `${fmt(r.avgGoalsPerMatch)} gol / maç`,
                            },
                        ].map(group => (
                            <div key={group.title} className={`bg-${group.color}-950/20 border border-${group.color}-900/30 rounded-2xl p-4 space-y-3`}>
                                <div className={`flex items-center gap-2 text-${group.color}-400 border-b border-${group.color}-900/30 pb-2`}>
                                    {group.icon}
                                    <h3 className="text-[10px] font-black uppercase tracking-widest">{group.title}</h3>
                                    <span className="text-[8px] text-muted-foreground/40 ml-auto">(Min. 3 maç)</span>
                                </div>
                                {group.items.map((r, idx) => (
                                    <div key={r.name} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-black ${idx === 0 ? `bg-${group.color}-900 text-${group.color}-300` : 'bg-muted text-muted-foreground'}`}>
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <div className="text-xs font-bold text-white">{r.name}</div>
                                                <div className="text-[8px] text-muted-foreground/50 uppercase">{r.region || '—'}</div>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-black font-mono text-${group.color}-400 bg-${group.color}-950/30 px-2 py-0.5 rounded`}>
                                            {group.value(r)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

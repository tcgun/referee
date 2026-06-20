"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, ShieldCheck, Clock, Target, Users,
    Award, TrendingUp, Tv2, CheckCircle2, XCircle, Calendar, Trophy
} from 'lucide-react';
import { VarIntervention } from '@/types';

interface MatchDetail {
    id: string;
    week: number;
    season: string;
    competition: 'league' | 'cup';
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore?: number;
    awayScore?: number;
    yellowCards: number;
    redCards: number;
    fouls: number;
    penalties: number | null;
    ballInPlayTime: string | null;
    varInterventions: VarIntervention[];
    varCount: number;
}

interface ProfileData {
    official: {
        name: string;
        region: string;
        rating: number;
        classification: string;
        roles: string[];
        seasons: string[];
    };
    career: {
        totalMatches: number;
        totalYellow: number;
        totalRed: number;
        totalFouls: number;
        totalPenalties: number;
        totalVar: number;
        varConfirmed: number;
        varReversed: number;
        varByType: { penalty: number; red_card: number; goal_cancelled: number; other: number };
        totalGoals: number;
        avgYellowPerMatch: number;
        avgRedPerMatch: number;
        avgFoulsPerMatch: number;
        avgGoalsPerMatch: number;
        avgPenaltiesPerMatch: number;
    };
    seasons: Record<string, {
        matches: number;
        yellowCards: number;
        redCards: number;
        fouls: number;
        penalties: number;
        varTotal: number;
        varConfirmed: number;
        varReversed: number;
        goals: number;
    }>;
    matchDetails: MatchDetail[];
    otherRoles?: OtherRoleMatch[];
}

interface OtherRoleMatch {
    matchId: string;
    role: string;
    week: number;
    season: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
}

const VAR_LABELS: Record<string, string> = {
    penalty: '🔴 Penaltı',
    red_card: '🟥 Kırmızı Kart',
    goal_cancelled: '⚽❌ Gol İptali',
    other: '🔍 Diğer',
};

const OTHER_ROLE_LABELS: Record<string, string> = {
    assistant: 'Yardımcı Hakem',
    fourth: '4. Hakem',
    var: 'VAR Hakemi',
    avar: 'AVAR Hakemi',
    observer: 'Gözlemci',
    representative: 'Temsilci',
};

const fmt = (v: number, d = 2) => v.toFixed(d);

const StatCard = ({ icon, label, value, sub, color = 'slate' }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) => (
    <div className={`bg-${color}-950/30 border border-${color}-900/40 rounded-2xl p-4 flex flex-col gap-1`}>
        <div className={`flex items-center gap-1.5 text-${color}-400 mb-1`}>
            {icon}
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</span>
        </div>
        <span className={`text-2xl font-black font-mono text-${color}-300`}>{value}</span>
        {sub && <span className="text-[9px] text-muted-foreground/50 font-bold uppercase">{sub}</span>}
    </div>
);

export default function RefereeProfilePage() {
    const { name: slug } = useParams<{ name: string }>();
    const [data, setData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedSeason, setSelectedSeason] = useState<string>('all');
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        Promise.resolve().then(() => {
            setLoading(true);
            setData(null);
            setError('');
        });
        fetch(`/api/stats/referees/${slug}`)
            .then(r => {
                if (!r.ok) throw new Error('Bulunamadı');
                return r.json();
            })
            .then(d => {
                setData(d);
            })
            .catch(e => {
                setError(e.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [slug]);

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-4">
            <ShieldCheck className="w-16 h-16 text-muted-foreground/20" />
            <h2 className="text-xl font-black uppercase text-white">Hakem Bulunamadı</h2>
            <p className="text-muted-foreground text-sm">{error || 'Bu isimde bir hakem kaydı yok.'}</p>
            <Link href="/officials" className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Görevliler Listesine Dön
            </Link>
        </div>
    );

    const { official, career, seasons, matchDetails, otherRoles = [] } = data;
    const isElite = official.classification?.startsWith('ust-') || official.roles.includes('var');

    const allSeasons = Object.keys(seasons).sort().reverse();
    const filteredMatches = selectedSeason === 'all'
        ? matchDetails
        : matchDetails.filter(m => m.season === selectedSeason);

    const sortedOtherRoles = [...otherRoles].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
    });

    const filteredOtherRoles = selectedSeason === 'all'
        ? sortedOtherRoles
        : sortedOtherRoles.filter(r => r.season === selectedSeason);

    return (
        <main className="min-h-screen bg-background pb-20 pt-8 text-foreground">
            <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">

                {/* Back link */}
                <Link href="/officials" className="inline-flex items-center gap-2 text-muted-foreground/60 hover:text-foreground text-xs font-bold uppercase tracking-wider transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Görevliler Listesi
                </Link>

                {/* Profile Header */}
                <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-2xl">
                    <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-black tracking-tighter uppercase text-white">
                                {official.name}
                            </h1>
                            {isElite && (
                                <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-1 rounded uppercase tracking-widest border border-primary/20">
                                    ÜST KLASMAN
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                            {official.region && <span>📍 {official.region}</span>}
                            {official.classification && <span>🏅 {official.classification.replace(/-/g, ' ')}</span>}
                            {official.rating > 0 && <span className="text-amber-400">★ {official.rating}</span>}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {official.roles.map(r => (
                                <span key={r} className="text-[8px] font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">
                                    {r === 'referee' ? 'Orta Hakem' : r === 'assistant' ? 'Yrd. Hakem' : r === 'fourth' ? '4. Hakem' : r === 'var' ? 'VAR' : r === 'avar' ? 'AVAR' : r}
                                </span>
                            ))}
                            {official.seasons.map(s => (
                                <span key={s} className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider border border-primary/20">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-5xl font-black font-mono text-white">{career.totalMatches}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Orta Hakem Maçı</div>
                    </div>
                </div>

                {/* Career stat grid */}
                {career.totalMatches > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatCard icon={<Award className="w-4 h-4" />} label="Toplam Sarı" value={career.totalYellow} sub={`${fmt(career.avgYellowPerMatch)} / maç`} color="amber" />
                        <StatCard icon={<Target className="w-4 h-4" />} label="Toplam Kırmızı" value={career.totalRed} sub={`${fmt(career.avgRedPerMatch)} / maç`} color="rose" />
                        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Toplam Faul" value={career.totalFouls} sub={`${fmt(career.avgFoulsPerMatch, 1)} / maç`} color="blue" />
                        <StatCard icon={<Trophy className="w-4 h-4" />} label="Toplam Gol" value={career.totalGoals} sub={`${fmt(career.avgGoalsPerMatch)} / maç`} color="emerald" />
                        <StatCard icon={<Target className="w-4 h-4" />} label="Toplam Penaltı" value={career.totalPenalties} sub={`${fmt(career.avgPenaltiesPerMatch)} / maç`} color="orange" />
                        <StatCard icon={<Tv2 className="w-4 h-4" />} label="VAR Müdahale" value={career.totalVar} sub={`✅${career.varConfirmed} 🔄${career.varReversed}`} color="violet" />
                    </div>
                )}

                {/* VAR breakdown */}
                {career.totalVar > 0 && (
                    <div className="bg-violet-950/20 border border-violet-900/30 rounded-2xl p-5 space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-violet-400 flex items-center gap-2">
                            <Tv2 className="w-4 h-4" /> VAR Müdahale Dağılımı
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(career.varByType).map(([type, count]) => (
                                <div key={type} className="bg-violet-950/30 border border-violet-900/30 rounded-xl p-3 text-center">
                                    <div className="text-sm font-bold">{VAR_LABELS[type]}</div>
                                    <div className="text-2xl font-black font-mono text-violet-300 mt-1">{count}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-4 text-xs font-bold text-muted-foreground/60 pt-1">
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> {career.varConfirmed} Doğrulandı</span>
                            <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-400" /> {career.varReversed} Değiştirildi</span>
                        </div>
                    </div>
                )}

                {/* Season breakdown */}
                {allSeasons.length > 1 && (
                    <div className="bg-[#161b22] border border-white/10 rounded-2xl p-5 space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Sezon Bazlı Özet</h3>
                        
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-visible">
                            <table className="w-full text-xs text-left">
                                <thead className="sticky top-16 md:top-0 z-10 bg-[#161b22] text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">
                                    <tr>
                                        <th className="pb-2 rounded-tl-2xl">Sezon</th>
                                        <th className="pb-2 text-center">Maç</th>
                                        <th className="pb-2 text-center text-amber-500">🟨</th>
                                        <th className="pb-2 text-center text-rose-500">🟥</th>
                                        <th className="pb-2 text-center text-emerald-500">⚽ Gol</th>
                                        <th className="pb-2 text-center text-orange-500">🔴 Penaltı</th>
                                        <th className="pb-2 text-center text-violet-400 rounded-tr-2xl">📺 VAR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allSeasons.map(s => (
                                        <tr key={s} className="hover:bg-white/3">
                                            <td className="py-2 font-black text-primary">{s}</td>
                                            <td className="py-2 text-center font-mono font-black text-white">{seasons[s].matches}</td>
                                            <td className="py-2 text-center text-amber-400 font-mono">{seasons[s].yellowCards}</td>
                                            <td className="py-2 text-center text-rose-400 font-mono">{seasons[s].redCards}</td>
                                            <td className="py-2 text-center text-emerald-400 font-mono">{seasons[s].goals}</td>
                                            <td className="py-2 text-center text-orange-400 font-mono">{seasons[s].penalties || '—'}</td>
                                            <td className="py-2 text-center text-violet-400 font-mono">{seasons[s].varTotal || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="block md:hidden space-y-2">
                            {allSeasons.map(s => (
                                <div key={s} className="bg-slate-950/40 border border-white/5 rounded-xl p-3 space-y-2">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                        <span className="font-black text-primary">{s}</span>
                                        <span className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded">{seasons[s].matches} Maç</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 text-center">
                                        <div>
                                            <div className="text-[8px] font-black text-amber-500 uppercase">🟨</div>
                                            <div className="text-xs font-mono text-amber-400 font-bold mt-0.5">{seasons[s].yellowCards}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-rose-500 uppercase">🟥</div>
                                            <div className="text-xs font-mono text-rose-400 font-bold mt-0.5">{seasons[s].redCards}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-emerald-500 uppercase">⚽ Gol</div>
                                            <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">{seasons[s].goals}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-orange-500 uppercase">🔴 Pen.</div>
                                            <div className="text-xs font-mono text-orange-400 font-bold mt-0.5">{seasons[s].penalties || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-violet-400 uppercase">📺 VAR</div>
                                            <div className="text-xs font-mono text-violet-400 font-bold mt-0.5">{seasons[s].varTotal || '—'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Match list */}
                {matchDetails.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Yönettiği Maçlar ({filteredMatches.length})
                            </h3>
                            {allSeasons.length > 0 && (
                                <div className="flex bg-[#161b22] p-1 rounded-xl border border-white/10 gap-1">
                                    <button
                                        onClick={() => setSelectedSeason('all')}
                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${selectedSeason === 'all' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Tümü
                                    </button>
                                    {allSeasons.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSelectedSeason(s)}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${selectedSeason === s ? 'bg-primary text-black' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block bg-card border border-border rounded-2xl shadow-2xl overflow-visible">
                            <table className="w-full text-sm text-left">
                                <thead className="sticky top-16 md:top-0 z-10 bg-muted text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-border shadow-sm">
                                    <tr>
                                        <th className="p-3 rounded-tl-2xl bg-muted">Hft</th>
                                        <th className="p-3 bg-muted">Maç</th>
                                        <th className="p-3 text-center bg-muted">Skor</th>
                                        <th className="p-3 text-center text-amber-500 bg-muted">🟨</th>
                                        <th className="p-3 text-center text-rose-500 bg-muted">🟥</th>
                                        <th className="p-3 text-center text-blue-500 bg-muted">Faul</th>
                                        <th className="p-3 text-center text-orange-500 bg-muted">⚽ Pen.</th>
                                        <th className="p-3 text-center text-slate-400 bg-muted">⏱️ Top</th>
                                        <th className="p-3 text-center text-violet-400 rounded-tr-2xl bg-muted">📺 VAR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredMatches.map(m => (
                                        <>
                                            <tr
                                                key={m.id}
                                                className={`hover:bg-white/3 transition-colors cursor-pointer ${m.varCount > 0 ? 'bg-violet-950/4' : ''}`}
                                                onClick={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)}
                                            >
                                                <td className="p-3 text-muted-foreground/60 text-xs font-mono">
                                                    {m.competition === 'cup' ? '🏆' : ''}{m.week}
                                                </td>
                                                <td className="p-3">
                                                    <div className="text-xs font-bold text-white whitespace-nowrap">
                                                        {m.homeTeam} <span className="text-muted-foreground/40 font-normal mx-1.5">-</span> <span className="text-muted-foreground/80">{m.awayTeam}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {m.homeScore !== undefined && m.awayScore !== undefined ? (
                                                        <span className="font-black font-mono text-sm text-white">
                                                            {m.homeScore}-{m.awayScore}
                                                        </span>
                                                    ) : <span className="text-muted-foreground/30 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {m.yellowCards > 0
                                                        ? <span className="text-amber-400 font-black font-mono">{m.yellowCards}</span>
                                                        : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {m.redCards > 0
                                                        ? <span className="text-rose-400 font-black font-mono">{m.redCards}</span>
                                                        : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {m.fouls > 0
                                                        ? <span className="text-blue-400 font-mono text-xs">{m.fouls}</span>
                                                        : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {m.penalties !== null
                                                        ? <span className="text-orange-400 font-black font-mono">{m.penalties}</span>
                                                        : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {m.ballInPlayTime
                                                        ? <span className="text-slate-400 font-mono text-xs flex items-center justify-center gap-1"><Clock className="w-3 h-3" />{m.ballInPlayTime}</span>
                                                        : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {m.varCount > 0 ? (
                                                        <span className="text-violet-400 font-black font-mono bg-violet-950/30 px-2 py-0.5 rounded">
                                                            {m.varCount} ▼
                                                        </span>
                                                    ) : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                </td>
                                            </tr>
                                            {expandedMatch === m.id && m.varInterventions.length > 0 && (
                                                <tr key={`${m.id}-var`} className="bg-violet-950/10">
                                                    <td colSpan={9} className="px-6 py-3">
                                                        <div className="space-y-1.5">
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-2">VAR Müdahale Detayları</div>
                                                            {m.varInterventions.map((v, i) => (
                                                                <div key={i} className="flex items-center gap-3 text-xs">
                                                                    {v.minute && <span className="text-muted-foreground/60 font-mono w-8">{v.minute}&apos;</span>}
                                                                    <span className="font-bold">{VAR_LABELS[v.type]}</span>
                                                                    <span className={`flex items-center gap-1 font-black text-[10px] px-2 py-0.5 rounded ${v.decision === 'confirmed' ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'}`}>
                                                                        {v.decision === 'confirmed' ? <><CheckCircle2 className="w-3 h-3" /> Doğrulandı</> : <><XCircle className="w-3 h-3" /> Değiştirildi</>}
                                                                    </span>
                                                                    {v.description && <span className="text-muted-foreground/60 italic">{v.description}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="block md:hidden space-y-3">
                            {filteredMatches.map(m => (
                                <div
                                    key={m.id}
                                    className={`bg-card border border-border rounded-2xl p-4 space-y-3 cursor-pointer hover:bg-white/2 transition-colors ${m.varCount > 0 ? 'border-violet-500/20 bg-violet-950/5' : ''}`}
                                    onClick={() => setExpandedMatch(expandedMatch === m.id ? null : m.id)}
                                >
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">
                                        <span className="font-mono">{m.competition === 'cup' ? '🏆 Türkiye Kupası' : `Hafta ${m.week}`}</span>
                                        <span className="font-mono">{m.season}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-white text-xs">
                                            {m.homeTeam} <span className="text-muted-foreground/45 mx-1">-</span> <span className="text-muted-foreground/80">{m.awayTeam}</span>
                                        </span>
                                        {m.homeScore !== undefined && m.awayScore !== undefined ? (
                                            <span className="font-black font-mono text-xs bg-slate-900/60 text-white px-2 py-0.5 rounded border border-white/5">
                                                {m.homeScore}-{m.awayScore}
                                            </span>
                                        ) : <span className="text-muted-foreground/30 text-xs">—</span>}
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 text-center pt-2 border-t border-white/5">
                                        <div>
                                            <div className="text-[8px] font-black text-amber-500 uppercase">🟨</div>
                                            <div className="text-xs font-mono text-amber-400 font-bold mt-0.5">{m.yellowCards || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-rose-500 uppercase">🟥</div>
                                            <div className="text-xs font-mono text-rose-400 font-bold mt-0.5">{m.redCards || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-blue-500 uppercase">Faul</div>
                                            <div className="text-xs font-mono text-blue-400 mt-0.5">{m.fouls || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-orange-500 uppercase">Pen.</div>
                                            <div className="text-xs font-mono text-orange-400 mt-0.5">{m.penalties !== null ? m.penalties : '—'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] font-black text-violet-400 uppercase">📺 VAR</div>
                                            <div className="text-xs font-mono text-violet-400 font-bold mt-0.5">
                                                {m.varCount > 0 ? `${m.varCount} ▼` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                    {m.ballInPlayTime && (
                                        <div className="text-[9px] font-bold text-slate-500 flex items-center justify-end gap-1 font-mono pt-1">
                                            <Clock className="w-2.5 h-2.5" /> Top Oyunda: {m.ballInPlayTime}
                                        </div>
                                    )}
                                    {expandedMatch === m.id && m.varInterventions.length > 0 && (
                                        <div className="bg-violet-950/20 border border-violet-900/30 rounded-lg p-3 space-y-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                            <div className="text-[8px] font-black uppercase tracking-widest text-violet-400 mb-1">VAR Müdahale Detayları</div>
                                            {m.varInterventions.map((v, i) => (
                                                <div key={i} className="flex flex-col gap-1 text-[11px] border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-white">{VAR_LABELS[v.type]}</span>
                                                        <span className={`px-1.5 py-0.5 rounded font-black text-[8px] ${v.decision === 'confirmed' ? 'bg-green-950/40 text-green-400' : 'bg-red-950/40 text-red-400'}`}>
                                                            {v.decision === 'confirmed' ? 'Doğrulandı' : 'Değiştirildi'}
                                                        </span>
                                                    </div>
                                                    {v.description && <span className="text-muted-foreground/60 italic text-[10px]">{v.description}</span>}
                                                    {v.minute && <span className="text-muted-foreground/40 font-mono text-[9px]">{v.minute}&apos;. Dakika</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Other roles list */}
                {filteredOtherRoles.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Users className="w-4 h-4" /> Diğer Görev Aldığı Maçlar ({filteredOtherRoles.length})
                        </h3>
                        {/* Desktop View */}
                        <div className="hidden md:block bg-card border border-border rounded-2xl shadow-2xl overflow-visible">
                            <table className="w-full text-sm text-left">
                                <thead className="sticky top-16 md:top-0 z-10 bg-muted text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-border shadow-sm">
                                    <tr>
                                        <th className="p-3 rounded-tl-2xl bg-muted">Hft</th>
                                        <th className="p-3 bg-muted">Maç</th>
                                        <th className="p-3 bg-muted">Sezon</th>
                                        <th className="p-3 rounded-tr-2xl bg-muted">Görev</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredOtherRoles.map((r, idx) => (
                                        <tr key={idx} className="hover:bg-white/3 transition-colors">
                                            <td className="p-3 text-muted-foreground/60 text-xs font-mono">
                                                {r.week}
                                            </td>
                                            <td className="p-3">
                                                <div className="text-xs font-bold text-white whitespace-nowrap">
                                                    {r.homeTeam} <span className="text-muted-foreground/40 font-normal mx-1.5">-</span> <span className="text-muted-foreground/80">{r.awayTeam}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-xs text-muted-foreground/80 font-mono">
                                                {r.season}
                                            </td>
                                            <td className="p-3 text-xs font-black text-primary uppercase">
                                                {OTHER_ROLE_LABELS[r.role] || r.role}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="block md:hidden space-y-2">
                            {filteredOtherRoles.map((r, idx) => (
                                <div key={idx} className="bg-card border border-border rounded-xl p-3.5 space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/60">
                                        <span className="font-mono">Hafta {r.week}</span>
                                        <span className="font-mono">{r.season}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-white text-xs">
                                            {r.homeTeam} <span className="text-muted-foreground/45 mx-1">-</span> <span className="text-muted-foreground/80">{r.awayTeam}</span>
                                        </span>
                                        <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 uppercase tracking-wider">
                                            {OTHER_ROLE_LABELS[r.role] || r.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {career.totalMatches === 0 && otherRoles.length === 0 && (
                    <div className="bg-[#161b22] border border-white/10 rounded-2xl p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">
                        Bu görevli için herhangi bir maç kaydı bulunamadı.
                    </div>
                )}
            </div>
        </main>
    );
}

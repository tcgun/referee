"use client";

import { useState, useMemo } from 'react';
import { Match, DisciplinaryAction } from '@/types';
import { useParams } from 'next/navigation';
import { cleanSponsorsInText, getTeamStadium } from '@/lib/teams';
import Link from 'next/link';

// Custom Hooks — MatchClient'tan çıkarıldı
import { useMatchData } from '@/hooks/useMatchData';
import { useSeasonMatches } from '@/hooks/useSeasonMatches';
import { useRefereeCareer } from '@/hooks/useRefereeCareer';
import { useFixtures } from '@/hooks/useFixtures';

// ─── Sabitler & Tipler ─────────────────────────────────────────────

type TabKey = 'analiz' | 'hakem' | 'istatistik' | 'gorevliler' | 'pfdk';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'analiz', label: 'POZİSYON ANALİZİ' },
    { key: 'hakem', label: 'HAKEM İSTATİSTİKLERİ' },
    { key: 'istatistik', label: 'İSTATİSTİK' },
    { key: 'gorevliler', label: 'GÖREVLİLER' },
    { key: 'pfdk', label: 'PFDK' },
];

const TEAM_SHORT_NAMES: Record<string, string> = {
    'bes': 'BJK', 'gal': 'GS', 'fen': 'FB', 'tra': 'TS',
    'bas': 'IBFK', 'ant': 'ANT', 'kon': 'KON', 'goz': 'GÖZ',
    'sam': 'SAM', 'ala': 'ALA', 'kas': 'KAS', 'koc': 'KOC',
    'fat': 'FGM', 'eyu': 'EYÜP', 'riz': 'ÇAYR', 'gaz': 'GFK',
    'kay': 'KAY', 'ist': 'İST', 'bol': 'BOL', 'fet': 'FET',
    'bod': 'BOD', 'igd': 'IĞD', 'ali': 'ALİ', 'erz': 'ERZ',
    'kec': 'KEÇ', 'bey': 'BYÇ'
};

const getTeamShortName = (teamId: string): string => {
    const cleanId = teamId?.toLowerCase().trim() || '';
    return TEAM_SHORT_NAMES[cleanId] || cleanId.substring(0, 3).toUpperCase();
};

// ─── Yardımcı Mikro-Componentler ───────────────────────────────────

/** Görevli satırı — Orta Hakem, Yardımcı vb. için tekrar eden pattern */
function OfficialRow({ label, name, renderStats }: {
    label: string;
    name: string | undefined;
    renderStats: (name: string) => React.ReactNode;
}) {
    if (!name || name === '-') return null;
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0 gap-1">
            <span className="text-zinc-400 font-bold">{label}</span>
            <div className="text-right">
                <span className="text-white font-extrabold block">{name}</span>
                {renderStats(name)}
            </div>
        </div>
    );
}

/** İstatistik kartı — Fauller, Sarı Kart vb. için tekrar eden pattern */
function StatCard({ label, value, color, avgLabel }: {
    label: string;
    value: number;
    color: string;
    avgLabel?: string;
}) {
    return (
        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
                <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">{label}</span>
                <span className={`text-xl font-mono font-black ${color}`}>{value}</span>
            </div>
            {avgLabel && (
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase mt-2 block border-t border-white/5 pt-1.5">
                    Ort: {avgLabel}
                </span>
            )}
        </div>
    );
}

/** Hata listesi — Ev/Deplasman lehine hatalar için tekrar eden pattern */
function ErrorList({ title, errors, color, emptyText }: {
    title: string;
    errors?: string[];
    color: string;
    emptyText: string;
}) {
    return (
        <div>
            <h4 className={`text-[10px] font-black ${color} uppercase tracking-widest mb-2`}>{title}</h4>
            {errors && errors.length > 0 ? (
                <ul className="space-y-2">
                    {errors.map((err, i) => (
                        <li key={i} className="text-xs text-zinc-300 font-semibold bg-zinc-900/30 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                            <span className={`${color} shrink-0 font-bold`}>•</span>
                            <span>{err}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-zinc-500 italic font-semibold pl-1">{emptyText}</p>
            )}
        </div>
    );
}

// ─── Ana Component ─────────────────────────────────────────────────

export default function MatchClient() {
    const params = useParams();
    const matchId = params.id as string;

    // Custom Hooks
    const {
        match, incidents, disciplinaryActions, loading,
        selectedSeason, selectedWeek, setSelectedSeason, setSelectedWeek
    } = useMatchData(matchId);

    const { getOfficialCountForTeam } = useSeasonMatches(match?.season);
    const { refereeCareerStats, refereeCareerLoading } = useRefereeCareer(match?.referee);
    const { fixtures, fixturesLoading } = useFixtures(selectedSeason, selectedWeek);

    // Tab state
    const [activeTab, setActiveTab] = useState<TabKey>('analiz');

    // Görevli istatistik render helper'ı
    const renderOfficialStats = (officialName?: string) => {
        if (!officialName || officialName === '-' || !match) return null;
        const homeCount = getOfficialCountForTeam(officialName, match.homeTeamId);
        const awayCount = getOfficialCountForTeam(officialName, match.awayTeamId);

        if (homeCount === 0 && awayCount === 0) return null;

        const homeShort = getTeamShortName(match.homeTeamId);
        const awayShort = getTeamShortName(match.awayTeamId);

        return (
            <span className="text-[9px] text-[#FF5DAD] font-extrabold uppercase tracking-wider block mt-0.5 select-none">
                ({homeShort}: {homeCount} Maç | {awayShort}: {awayCount} Maç)
            </span>
        );
    };

    // Ball-in-play kariyer ortalaması hesabı — useMemo ile cache'li
    const careerBallInPlayAvg = useMemo(() => {
        if (!refereeCareerStats?.matchDetails) return null;
        const mDetails = refereeCareerStats.matchDetails;
        let activeSecs = 0, activeCount = 0, totalSecs = 0, totalCount = 0;

        const parseTimePart = (part: string): number | null => {
            const segments = part.trim().split(':');
            if (segments.length !== 2) return null;
            const mins = parseInt(segments[0], 10);
            const secs = parseInt(segments[1], 10);
            if (isNaN(mins) || isNaN(secs)) return null;
            return mins * 60 + secs;
        };

        mDetails.forEach((m) => {
            const timeStr = m.ballInPlayTime;
            if (!timeStr) return;

            if (timeStr.includes('/')) {
                const parts = timeStr.split('/');
                const actVal = parseTimePart(parts[0]);
                if (actVal !== null) { activeSecs += actVal; activeCount++; }
                const totVal = parseTimePart(parts[1]);
                if (totVal !== null) { totalSecs += totVal; totalCount++; }
            } else {
                const val = parseTimePart(timeStr);
                if (val !== null) { activeSecs += val; activeCount++; }
            }
        });

        const formatSeconds = (sec: number) => {
            const mins = Math.floor(sec / 60);
            const secs = Math.round(sec % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        const avgActive = activeCount > 0 ? formatSeconds(activeSecs / activeCount) : 'Belirtilmedi';
        const avgTotal = totalCount > 0 ? formatSeconds(totalSecs / totalCount) : 'Belirtilmedi';

        if (activeCount === 0 && totalCount === 0) return 'Belirtilmedi';
        if (totalCount === 0) return avgActive;
        return `${avgActive} / ${avgTotal}`;
    }, [refereeCareerStats?.matchDetails]);

    // Maç istatistikleri — useMemo ile cache'li
    const matchStatValues = useMemo(() => {
        if (!match) return null;
        const matchFouls = match.refereeStats?.fouls || (match.stats ? (Number(match.stats.homeFouls || 0) + Number(match.stats.awayFouls || 0)) : 0);
        const matchYellow = match.refereeStats?.yellowCards || (match.stats ? (Number(match.stats.homeYellowCards || 0) + Number(match.stats.awayYellowCards || 0)) : 0);
        const matchRed = match.refereeStats?.redCards || (match.stats ? (Number(match.stats.homeRedCards || 0) + Number(match.stats.awayRedCards || 0)) : 0);
        const matchPenalties = match.refereeStats?.penalties || 0;
        const ballInPlay = match.refereeStats?.ballInPlayTime;
        return { matchFouls, matchYellow, matchRed, matchPenalties, ballInPlay };
    }, [match]);

    // İstatistik bar verileri
    const statsBarData = useMemo(() => {
        if (!match?.stats) return [];
        return [
            { label: 'Topla Oynama', homeVal: match.stats.homePossession, awayVal: match.stats.awayPossession, isPercentage: true },
            { label: 'Şut', homeVal: match.stats.homeShots, awayVal: match.stats.awayShots },
            { label: 'İsabetli Şut', homeVal: match.stats.homeShotsOnTarget, awayVal: match.stats.awayShotsOnTarget },
            { label: 'Engellenen Şut', homeVal: match.stats.homeBlockedShots, awayVal: match.stats.awayBlockedShots },
            { label: 'Toplam Pas', homeVal: match.stats.homePasses, awayVal: match.stats.awayPasses },
            { label: 'Pas İsabeti', homeVal: match.stats.homePassAccuracy, awayVal: match.stats.awayPassAccuracy, isPercentage: true },
            { label: 'Büyük Fırsat', homeVal: match.stats.homeBigChances, awayVal: match.stats.awayBigChances },
            { label: 'Korner', homeVal: match.stats.homeCorners, awayVal: match.stats.awayCorners },
            { label: 'Ofsayt', homeVal: match.stats.homeOffsides, awayVal: match.stats.awayOffsides },
            { label: 'Kurtarış', homeVal: match.stats.homeSaves, awayVal: match.stats.awaySaves },
            { label: 'Faul', homeVal: match.stats.homeFouls, awayVal: match.stats.awayFouls },
            { label: 'Sarı Kart', homeVal: match.stats.homeYellowCards, awayVal: match.stats.awayYellowCards },
            { label: 'Kırmızı Kart', homeVal: match.stats.homeRedCards, awayVal: match.stats.awayRedCards }
        ].filter(s => s.homeVal !== undefined && s.awayVal !== undefined);
    }, [match?.stats]);

    // ─── Loading & Not Found ───────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] text-white p-6 md:p-8 flex items-center justify-center">
                <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-8 animate-pulse">
                        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-black/5 flex flex-col justify-between h-52">
                            <div className="flex items-center justify-between">
                                <div className="h-6 w-24 bg-slate-200 rounded" />
                                <div className="flex gap-2">
                                    <div className="h-16 w-16 bg-slate-200 rounded-xl" />
                                    <div className="h-16 w-16 bg-slate-200 rounded-xl" />
                                </div>
                                <div className="h-6 w-24 bg-slate-200 rounded" />
                            </div>
                            <div className="h-4 w-48 bg-slate-200 rounded mx-auto" />
                        </div>
                        <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 h-80" />
                    </div>
                    <div className="lg:col-span-1 space-y-4 animate-pulse">
                        <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 h-96" />
                    </div>
                </div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-4">
                <h2 className="text-xl font-bold uppercase mb-2">Maç Bulunamadı</h2>
                <p className="text-zinc-500 text-xs mb-4">Ulaşmaya çalıştığınız maç kaydı veritabanında mevcut değil.</p>
                <Link href="/matches" className="bg-primary text-black px-4 py-2 rounded-xl text-xs font-black shadow-neo">
                    MAÇ LİSTESİNE DÖN
                </Link>
            </div>
        );
    }

    const resolvedStadium = match.stadium || getTeamStadium(match.homeTeamId);

    // ─── Render ────────────────────────────────────────────────────

    return (
        <main className="min-h-screen bg-[#0d1117] text-white py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Back link */}
                <div className="flex items-center justify-between">
                    <Link href="/matches" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        &larr; TÜM MAÇLAR
                    </Link>
                </div>

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* ─── Sol Kolon (75%) ─── */}
                    <div className="lg:col-span-3 space-y-8">

                        {/* Scoreboard */}
                        <div className="bg-white rounded-3xl shadow-neo-sm p-4 md:p-6 border-2 border-black/5 text-slate-900 relative overflow-hidden">
                            <div className="flex flex-row items-center justify-between gap-4">
                                <div className="flex-1 text-right min-w-0">
                                    <h2 className="text-base md:text-xl font-black uppercase tracking-tight text-slate-900 whitespace-nowrap truncate">
                                        {cleanSponsorsInText(match.homeTeamName)}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2 select-none shrink-0">
                                    <div className="w-12 h-16 md:w-16 md:h-20 flex items-center justify-center bg-[#00a89d] text-white text-3xl md:text-4xl font-mono font-black rounded-xl shadow-md border border-black/10">
                                        {match.homeScore !== undefined ? match.homeScore : '-'}
                                    </div>
                                    <div className="text-xl font-black text-slate-400">-</div>
                                    <div className="w-12 h-16 md:w-16 md:h-20 flex items-center justify-center bg-[#1a433f] text-white text-3xl md:text-4xl font-mono font-black rounded-xl shadow-md border border-black/10">
                                        {match.awayScore !== undefined ? match.awayScore : '-'}
                                    </div>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <h2 className="text-base md:text-xl font-black uppercase tracking-tight text-slate-900 whitespace-nowrap truncate">
                                        {cleanSponsorsInText(match.awayTeamName)}
                                    </h2>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs tracking-tight text-slate-900">
                                    <div className="text-right pr-4 font-black">
                                        {match.competition === 'cup' ? 'Türkiye Kupası' : 'Süper Lig'}
                                    </div>
                                    <div className="text-slate-400 select-none font-bold">•</div>
                                    <div className="text-left pl-4 font-bold">
                                        {match.date ? new Date(match.date).toLocaleString('tr-TR', {
                                            day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : '-'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs tracking-tight text-slate-900">
                                    <div className="text-right pr-4 font-black truncate">{resolvedStadium}</div>
                                    <div className="text-slate-400 select-none font-bold">•</div>
                                    <div className="text-left pl-4 truncate font-bold">
                                        <span className="text-slate-500 uppercase tracking-widest text-[9px] font-black mr-1">Hakem:</span>
                                        {match.referee || '-'}
                                    </div>
                                </div>
                                {match.varReferee && (
                                    <div className="text-center text-xs font-bold text-slate-900">
                                        <span className="text-slate-500 uppercase tracking-widest text-[9px] font-black mr-1">VAR Hakemi:</span>
                                        <span className="font-extrabold">{match.varReferee}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="space-y-6">
                            {/* Tab Switchers — data-driven */}
                            <div className="flex bg-[#161b22] p-1 rounded-2xl border border-white/10 shadow-neo-sm overflow-x-auto scrollbar-none">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                            activeTab === tab.key ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Active Tab Panel */}
                            <div>
                                {/* ─── ANALİZ TAB ─── */}
                                {activeTab === 'analiz' && (
                                    <div className="space-y-6">
                                        {incidents.length === 0 ? (
                                            <div className="text-center py-12 bg-[#161b22] border border-white/10 rounded-3xl">
                                                <p className="text-zinc-500 text-xs font-bold italic">Bu maç için henüz tartışmalı pozisyon analizi eklenmemiştir.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {incidents.map((inc) => (
                                                    <div key={inc.id} className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 hover:border-zinc-700/80 transition-colors">
                                                        <div className="flex items-start gap-4">
                                                            <div className="bg-[#FF5DAD] text-black font-black text-xs px-3 py-1.5 rounded-xl shadow-neo-sm shrink-0">
                                                                {inc.minute}. Dk
                                                            </div>
                                                            <div className="text-sm font-bold text-white leading-relaxed">{inc.description}</div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                                            <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 space-y-1">
                                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Hakem Kararı</span>
                                                                <p className="text-xs font-extrabold text-zinc-300">{inc.refereeDecision || 'Belirtilmedi'}</p>
                                                            </div>
                                                            {inc.varDecision && (
                                                                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 space-y-1">
                                                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">VAR Kararı</span>
                                                                    <p className="text-xs font-extrabold text-zinc-300">{inc.varDecision}</p>
                                                                </div>
                                                            )}
                                                            <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 space-y-1">
                                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Final / Doğru Karar</span>
                                                                <p className="text-xs font-extrabold text-emerald-400">{inc.finalDecision || inc.correctDecision || 'Belirtilmedi'}</p>
                                                            </div>
                                                        </div>
                                                        {inc.opinions && inc.opinions.length > 0 && (
                                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Yorumcu Değerlendirmeleri</h4>
                                                                <div className="space-y-3">
                                                                    {inc.opinions.map((op) => (
                                                                        <div key={op.id} className="bg-zinc-950/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                                                            <div className="flex items-center justify-between gap-4">
                                                                                <span className="text-xs font-black text-primary">{op.criticName}</span>
                                                                                <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider ${
                                                                                    op.judgment === 'correct' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                                    : op.judgment === 'incorrect' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                                                    : op.judgment === 'controversial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                                    : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                                                                }`}>
                                                                                    {op.judgment === 'correct' ? 'Doğru'
                                                                                     : op.judgment === 'incorrect' ? 'Yanlış'
                                                                                     : op.judgment === 'controversial' ? 'Tartışmalı'
                                                                                     : 'Kart Gerekirdi'}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-zinc-300 leading-relaxed italic">&quot;{op.opinion}&quot;</p>
                                                                            {op.reasoning && (
                                                                                <p className="text-[10px] text-zinc-500 leading-relaxed">
                                                                                    <span className="font-extrabold text-zinc-400 uppercase mr-1">Gerekçe:</span> {op.reasoning}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── HAKEM TAB ─── */}
                                {activeTab === 'hakem' && (
                                    <div className="space-y-6">
                                        {/* Hakem Profil Kartı */}
                                        <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div>
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">Müsabaka Hakemi</span>
                                                    <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                                                        {match.referee || 'Belirtilmedi'}
                                                    </h2>
                                                    {refereeCareerStats?.official && (
                                                        <p className="text-xs text-zinc-400 font-semibold mt-1">
                                                            {refereeCareerStats.official.classification && `${refereeCareerStats.official.classification} | `}
                                                            {refereeCareerStats.official.region && `${refereeCareerStats.official.region}`}
                                                        </p>
                                                    )}
                                                </div>
                                                {refereeCareerStats?.career && (
                                                    <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 flex items-center gap-4 shrink-0 w-full md:w-auto">
                                                        <div className="text-center md:text-right">
                                                            <span className="text-[10px] font-black text-zinc-500 uppercase block mb-0.5">Toplam Kariyer Maçı</span>
                                                            <span className="text-xl font-mono font-black text-white">{refereeCareerStats.career.totalMatches || 0}</span>
                                                        </div>
                                                        {refereeCareerStats.official?.rating && refereeCareerStats.official.rating > 0 && (
                                                            <>
                                                                <div className="h-10 w-px bg-white/10" />
                                                                <div className="text-center md:text-left">
                                                                    <span className="text-[10px] font-black text-zinc-500 uppercase block mb-0.5">Değerlendirme Notu</span>
                                                                    <span className="text-xl font-mono font-black text-emerald-400">{refereeCareerStats.official.rating.toFixed(1)}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Karşılaştırmalı İstatistikler */}
                                        <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                                            <div className="space-y-1 border-b border-white/5 pb-4">
                                                <h3 className="text-xs font-black tracking-widest text-[#00a89d] uppercase">KARŞILAŞTIRMALI MAÇ / KARİYER İSTATİSTİKLERİ</h3>
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Bu Maçtaki Performans vs Hakemin Kariyer Ortalaması</p>
                                            </div>

                                            {refereeCareerLoading ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                                                    {Array.from({ length: 4 }).map((_, idx) => (
                                                        <div key={idx} className="h-20 bg-zinc-900/50 rounded-2xl border border-white/5" />
                                                    ))}
                                                </div>
                                            ) : matchStatValues && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <StatCard
                                                        label="Fauller" value={matchStatValues.matchFouls} color="text-white"
                                                        avgLabel={refereeCareerStats?.career?.avgFoulsPerMatch?.toString()}
                                                    />
                                                    <StatCard
                                                        label="Sarı Kartlar" value={matchStatValues.matchYellow} color="text-amber-400"
                                                        avgLabel={refereeCareerStats?.career?.avgYellowPerMatch?.toString()}
                                                    />
                                                    <StatCard
                                                        label="Kırmızı Kartlar" value={matchStatValues.matchRed} color="text-rose-500"
                                                        avgLabel={refereeCareerStats?.career?.avgRedPerMatch?.toString()}
                                                    />
                                                    <StatCard
                                                        label="Penaltılar" value={matchStatValues.matchPenalties} color="text-[#00a89d]"
                                                        avgLabel={refereeCareerStats?.career?.avgPenaltiesPerMatch?.toString()}
                                                    />

                                                    {/* Topun Oyunda Kalma Süresi */}
                                                    <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 col-span-2 md:col-span-4 mt-2">
                                                        <div>
                                                            <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Topun Oyunda Kaldığı Süre / Maçın Süresi</span>
                                                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mt-1">
                                                                <span className="text-xl font-mono font-black text-white">{matchStatValues.ballInPlay || 'Belirtilmedi'}</span>
                                                                {careerBallInPlayAvg && (
                                                                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase">
                                                                        Kariyer Ortalaması: {careerBallInPlayAvg}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-extrabold text-zinc-500 uppercase">
                                                            Topun Oyunda Kaldığı Süre / Maçın Süresi
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Hakem Hataları ve Faktörleri */}
                                        {match.refereeStats && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                                                    <div className="space-y-1 border-b border-white/5 pb-4">
                                                        <h3 className="text-xs font-black tracking-widest text-[#FF5DAD] uppercase">HAKEM HATA ANALİZİ</h3>
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Maçtaki Hakem Faktörü Özet İstatistikleri</p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                                            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Toplam Yanlış Karar</span>
                                                            <span className="text-xl font-mono font-black text-rose-500">{match.refereeStats.incorrectDecisions || 0}</span>
                                                        </div>
                                                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                                            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Ev Sahibi Lehine Hata</span>
                                                            <span className="text-xl font-mono font-black text-amber-500">{match.refereeStats.errorsFavoringHome || 0}</span>
                                                        </div>
                                                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                                            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Deplasman Lehine Hata</span>
                                                            <span className="text-xl font-mono font-black text-blue-400">{match.refereeStats.errorsFavoringAway || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                                                    <div className="space-y-1 border-b border-white/5 pb-4">
                                                        <h3 className="text-xs font-black tracking-widest text-primary uppercase">HATA DETAYLARI VE NOTLAR</h3>
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Pozisyon Bazlı Hakem Hataları ve Değerlendirmeler</p>
                                                    </div>
                                                    <div className="space-y-6">
                                                        <ErrorList title="EV SAHİBİ LEHİNE HATALAR" errors={match.refereeStats.homeErrors} color="text-amber-500" emptyText="Ev sahibi lehine tespit edilmiş hata bulunmamaktadır." />
                                                        <ErrorList title="DEPLASMAN LEHİNE HATALAR" errors={match.refereeStats.awayErrors} color="text-blue-400" emptyText="Deplasman lehine tespit edilmiş hata bulunmamaktadır." />
                                                        <ErrorList title="HAKEM PERFORMANS NOTLARI" errors={match.refereeStats.performanceNotes} color="text-zinc-400" emptyText="Performans notu eklenmemiştir." />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* VAR Müdahaleleri */}
                                        {match.refereeStats?.varInterventions && match.refereeStats.varInterventions.length > 0 && (
                                            <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                                                <div className="space-y-1 border-b border-white/5 pb-4">
                                                    <h3 className="text-xs font-black tracking-widest text-[#FF5DAD] uppercase">VAR MÜDAHALELERİ</h3>
                                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Maçtaki VAR İncelemeleri ve Sonuçları</p>
                                                </div>
                                                <div className="space-y-4">
                                                    {match.refereeStats.varInterventions.map((vi, idx) => {
                                                        const typeLabels: Record<string, string> = {
                                                            penalty: 'Penaltı İncelemesi', red_card: 'Kırmızı Kart İncelemesi',
                                                            goal_cancelled: 'Gol İptali İncelemesi', other: 'Diğer İnceleme'
                                                        };
                                                        const decisionLabels: Record<string, string> = {
                                                            confirmed: 'Karar Onaylandı', reversed: 'Karar Değiştirildi'
                                                        };
                                                        return (
                                                            <div key={idx} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 space-y-3">
                                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        {vi.minute !== undefined && (
                                                                            <span className="bg-[#FF5DAD] text-black font-black text-[10px] px-2 py-1 rounded">{vi.minute}. Dk</span>
                                                                        )}
                                                                        <span className="text-xs font-black text-white uppercase tracking-wider">{typeLabels[vi.type] || vi.type}</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider border ${
                                                                        vi.decision === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                                    }`}>{decisionLabels[vi.decision] || vi.decision}</span>
                                                                </div>
                                                                {vi.description && (
                                                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-white/5">{vi.description}</p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── İSTATİSTİK TAB ─── */}
                                {activeTab === 'istatistik' && (
                                    <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <h3 className="text-sm font-black tracking-widest text-primary uppercase">MAÇ İSTATİSTİKLERİ</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Takım Karşılaştırma Analizi</p>
                                        </div>

                                        {statsBarData.length === 0 ? (
                                            <div className="text-center py-12">
                                                <p className="text-zinc-500 text-xs font-bold italic">Bu maç için henüz istatistik verisi girilmemiştir.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center text-xs font-black tracking-widest uppercase pb-2">
                                                    <span className="text-[#00a89d]">{cleanSponsorsInText(match.homeTeamName)}</span>
                                                    <span className="text-[#1a433f]">{cleanSponsorsInText(match.awayTeamName)}</span>
                                                </div>
                                                <div className="space-y-4">
                                                    {statsBarData.map((s, idx) => {
                                                        const hVal = Number(s.homeVal ?? 0);
                                                        const aVal = Number(s.awayVal ?? 0);
                                                        const total = hVal + aVal;
                                                        const homePct = total > 0 ? (hVal / total) * 100 : 50;
                                                        const awayPct = total > 0 ? (aVal / total) * 100 : 50;
                                                        return (
                                                            <div key={idx} className="space-y-2">
                                                                <div className="flex justify-between items-center text-xs font-bold">
                                                                    <span className="text-[#00a89d] font-mono text-sm">{hVal}{s.isPercentage ? '%' : ''}</span>
                                                                    <span className="text-zinc-400 uppercase tracking-wider text-[10px]">{s.label}</span>
                                                                    <span className="text-[#1a433f] font-mono text-sm">{aVal}{s.isPercentage ? '%' : ''}</span>
                                                                </div>
                                                                <div className="h-2 w-full bg-zinc-800 rounded-full flex overflow-hidden border border-black/10">
                                                                    <div style={{ width: `${homePct}%` }} className="bg-[#00a89d] transition-all duration-500" />
                                                                    <div style={{ width: `${awayPct}%` }} className="bg-[#1a433f] transition-all duration-500" />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── GÖREVLİLER TAB ─── */}
                                {activeTab === 'gorevliler' && (
                                    <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 animate-fadeIn">
                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <h3 className="text-sm font-black tracking-widest text-primary uppercase">MAÇ GÖREVLİLERİ</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">TFF Atamaları ve Görevli Kadrosu</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Hakem Heyeti */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-[#00a89d] uppercase tracking-wider border-b border-white/5 pb-2">HAKEM HEYETİ</h4>
                                                <div className="space-y-3">
                                                    <OfficialRow label="Orta Hakem" name={match.referee || match.officials?.referees?.[0]} renderStats={renderOfficialStats} />
                                                    <OfficialRow label="1. Yardımcı Hakem" name={match.officials?.assistants?.[0] || match.officials?.referees?.[1]} renderStats={renderOfficialStats} />
                                                    <OfficialRow label="2. Yardımcı Hakem" name={match.officials?.assistants?.[1] || match.officials?.referees?.[2]} renderStats={renderOfficialStats} />
                                                    <OfficialRow label="Dördüncü Hakem" name={match.officials?.fourthOfficial || match.officials?.referees?.[3]} renderStats={renderOfficialStats} />
                                                </div>
                                            </div>

                                            {/* VAR Ekibi */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-[#FF5DAD] uppercase tracking-wider border-b border-white/5 pb-2">VAR EKİBİ</h4>
                                                <div className="space-y-3">
                                                    <OfficialRow label="VAR Hakemi" name={match.varReferee || match.officials?.varReferees?.[0]} renderStats={renderOfficialStats} />
                                                    <OfficialRow label="AVAR Hakemi" name={match.officials?.avarReferees?.[0] || match.officials?.varReferees?.[1]} renderStats={renderOfficialStats} />
                                                </div>
                                            </div>

                                            {/* Gözlemciler */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider border-b border-white/5 pb-2">GÖZLEMCİLER</h4>
                                                <div className="space-y-3">
                                                    {match.officials?.observers && match.officials.observers.length > 0 ? (
                                                        match.officials.observers.map((obs, idx) => (
                                                            <OfficialRow
                                                                key={idx}
                                                                label={match.officials!.observers.length === 1 ? 'Gözlemci' : `${idx + 1}. Gözlemci`}
                                                                name={obs}
                                                                renderStats={renderOfficialStats}
                                                            />
                                                        ))
                                                    ) : match.representatives?.observer ? (
                                                        <OfficialRow label="Hakem Gözlemcisi" name={match.representatives.observer} renderStats={renderOfficialStats} />
                                                    ) : (
                                                        <p className="text-zinc-500 text-[10px] font-bold italic">Gözlemci bilgisi girilmemiştir.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Temsilciler */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider border-b border-white/5 pb-2">TEMSİLCİLER</h4>
                                                <div className="space-y-3">
                                                    {match.officials?.representatives && match.officials.representatives.length > 0 ? (
                                                        match.officials.representatives.map((rep, idx) => (
                                                            <OfficialRow
                                                                key={idx}
                                                                label={match.officials!.representatives.length === 1 ? 'Temsilci' : `${idx + 1}. Temsilci`}
                                                                name={rep}
                                                                renderStats={renderOfficialStats}
                                                            />
                                                        ))
                                                    ) : (match.representatives?.rep1 || match.representatives?.rep2 || match.representatives?.rep3) ? (
                                                        [match.representatives.rep1, match.representatives.rep2, match.representatives.rep3]
                                                            .filter(Boolean)
                                                            .map((rep, idx, arr) => (
                                                                <OfficialRow
                                                                    key={idx}
                                                                    label={arr.length === 1 ? 'Temsilci' : `${idx + 1}. Temsilci`}
                                                                    name={rep}
                                                                    renderStats={renderOfficialStats}
                                                                />
                                                            ))
                                                    ) : (
                                                        <p className="text-zinc-500 text-[10px] font-bold italic">Temsilci bilgisi girilmemiştir.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ─── PFDK TAB ─── */}
                                {activeTab === 'pfdk' && (
                                    <PfdkTabContent disciplinaryActions={disciplinaryActions} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ─── Sağ Sidebar (25%) ─── */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-black tracking-widest text-primary uppercase">HAFTANIN FİKSTÜRÜ</h3>
                                <div className="grid grid-cols-2 gap-2 select-none">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Sezon</label>
                                        <select
                                            value={selectedSeason}
                                            onChange={(e) => setSelectedSeason(e.target.value)}
                                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white font-extrabold focus:outline-none focus:border-primary cursor-pointer w-full"
                                        >
                                            <option value="2025-2026">2025-2026</option>
                                            <option value="2026-2027">2026-2027</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Hafta</label>
                                        <select
                                            value={selectedWeek}
                                            onChange={(e) => setSelectedWeek(Number(e.target.value))}
                                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white font-extrabold focus:outline-none focus:border-primary cursor-pointer w-full"
                                        >
                                            {Array.from({ length: 38 }, (_, i) => i + 1).map(w => (
                                                <option key={w} value={w}>{w}. Hafta</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {fixturesLoading ? (
                                    Array.from({ length: 8 }).map((_, idx) => (
                                        <div key={idx} className="h-14 bg-zinc-900/50 animate-pulse rounded-2xl border border-white/5" />
                                    ))
                                ) : fixtures.length === 0 ? (
                                    <div className="text-center py-6 text-zinc-500 text-xs font-semibold italic">Maç bulunamadı.</div>
                                ) : (
                                    fixtures.map(f => {
                                        const isActive = f.id === matchId;
                                        const isFinished = f.homeScore !== undefined && f.awayScore !== undefined;
                                        const displayScore = isFinished ? `${f.homeScore} - ${f.awayScore}` : 'vs';

                                        return (
                                            <Link key={f.id} href={`/matches/${f.id}`} className="block">
                                                <div className={`p-3 rounded-2xl border transition-all ${
                                                    isActive
                                                        ? 'bg-white text-slate-900 border-primary shadow-lg scale-102'
                                                        : 'bg-zinc-900/60 hover:bg-zinc-900 text-white border-white/5'
                                                }`}>
                                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px] font-bold">
                                                        <div className={`text-right truncate ${isActive ? 'text-slate-800 font-extrabold' : 'text-zinc-300'}`}>
                                                            {cleanSponsorsInText(f.homeTeamName)}
                                                        </div>
                                                        <div className="flex flex-col items-center min-w-[55px]">
                                                            <div className={`px-2 py-0.5 rounded font-mono text-[10px] font-black text-center ${
                                                                isActive ? 'bg-[#00a89d] text-white shadow-xs' : 'bg-black text-white'
                                                            }`}>
                                                                {displayScore}
                                                            </div>
                                                            {isFinished && (
                                                                <span className={`text-[8px] font-black tracking-widest mt-0.5 uppercase ${
                                                                    isActive ? 'text-[#00a89d]' : 'text-zinc-500'
                                                                }`}>FT</span>
                                                            )}
                                                        </div>
                                                        <div className={`text-left truncate ${isActive ? 'text-slate-800 font-extrabold' : 'text-zinc-300'}`}>
                                                            {cleanSponsorsInText(f.awayTeamName)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

// ─── PFDK Tab Ayrı Component ───────────────────────────────────────

function PfdkTabContent({ disciplinaryActions }: { disciplinaryActions: DisciplinaryAction[] }) {
    if (disciplinaryActions.length === 0) {
        return (
            <div className="text-center py-12 bg-[#161b22] border border-white/10 rounded-3xl">
                <p className="text-zinc-500 text-xs font-bold italic">Bu maç için henüz TFF PFDK disiplin sevk/ceza kararı eklenmemiştir.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {disciplinaryActions.map((act) => (
                <div key={act.id} className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <div className="space-y-0.5">
                            <span className="text-xs font-black text-primary block">{act.subject}</span>
                            {act.teamName && (
                                <span className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-wider block">{act.teamName}</span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                            {act.penalty && (
                                <span className={`bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${act.appealStatus === 'accepted' || act.appealStatus === 'partially_accepted' ? 'line-through opacity-60' : ''}`}>
                                    {act.penalty}
                                </span>
                            )}
                            {act.appealStatus && act.appealStatus !== 'none' && (
                                <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-wider ${
                                    act.appealStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    act.appealStatus === 'partially_accepted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    act.appealStatus === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                    {act.appealStatus === 'accepted' ? 'Tahkim: İptal' :
                                     act.appealStatus === 'partially_accepted' ? `Tahkim: İndirildi (${act.appealedPenalty})` :
                                     act.appealStatus === 'rejected' ? 'Tahkim: Red' : 'Tahkim: Karar Bekleniyor'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Sevk Nedeni / İhlal</span>
                        <p className="text-xs text-zinc-300 font-semibold leading-relaxed">{act.reason}</p>
                    </div>
                    {act.note && (
                        <div className="bg-zinc-950/40 p-4 rounded-2xl border border-white/5 space-y-1.5">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Resmi Açıklama Detayı</span>
                            <p className="text-xs text-zinc-400 leading-relaxed font-medium">{act.note}</p>
                        </div>
                    )}
                    {act.appealStatus && act.appealStatus !== 'none' && act.appealNote && (
                        <div className="bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/10 space-y-1.5">
                            <div className="flex items-center gap-1.5 justify-between">
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">⚖️ Tahkim Kurulu Resmi Kararı</span>
                                {act.appealDate && (
                                    <span className="text-[8px] font-extrabold text-zinc-500">{act.appealDate}</span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed font-medium">{act.appealNote}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
"use client";

import { useEffect, useState } from 'react';
import { Match, Incident, Opinion, DisciplinaryAction } from '@/types';
import { useParams } from 'next/navigation';
import { cleanSponsorsInText, getTeamStadium } from '@/lib/teams';
import Link from 'next/link';

interface IncidentWithOpinions extends Incident {
    opinions: Opinion[];
}

export default function MatchClient() {
    const params = useParams();
    const matchId = params.id as string;

    const [match, setMatch] = useState<Match | null>(null);
    const [incidents, setIncidents] = useState<IncidentWithOpinions[]>([]);
    const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([]);
    
    // Sidebar selected state
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [fixtures, setFixtures] = useState<Match[]>([]);
    
    // UI Tab state
    const [activeTab, setActiveTab] = useState<'analiz' | 'hakem' | 'istatistik' | 'gorevliler' | 'pfdk'>('analiz');

    // Referee Career stats
    const [refereeCareerStats, setRefereeCareerStats] = useState<{
        official?: {
            name: string;
            region?: string;
            rating?: number;
            classification?: string;
        };
        career?: {
            totalMatches: number;
            avgYellowPerMatch: number;
            avgRedPerMatch: number;
            avgFoulsPerMatch: number;
            avgPenaltiesPerMatch: number;
        };
        matchDetails?: {
            ballInPlayTime: string | null;
        }[];
    } | null>(null);
    const [refereeCareerLoading, setRefereeCareerLoading] = useState<boolean>(false);
    
    // Load state
    const [loading, setLoading] = useState<boolean>(true);
    const [fixturesLoading, setFixturesLoading] = useState<boolean>(false);

    const [allSeasonMatches, setAllSeasonMatches] = useState<Match[]>([]);

    // Helper functions for official stats
    const normalizeOfficialName = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, '')
            .trim();
    };

    const getOfficialCountForTeam = (officialName: string, teamId: string, matchesList: Match[]): number => {
        if (!officialName || !teamId) return 0;
        const normName = normalizeOfficialName(officialName);
        
        return matchesList.filter(m => {
            const involvesTeam = m.homeTeamId === teamId || m.awayTeamId === teamId;
            if (!involvesTeam) return false;
            
            const matchOfficials: string[] = [];
            if (m.referee) matchOfficials.push(m.referee);
            if (m.varReferee) matchOfficials.push(m.varReferee);
            
            if (m.officials) {
                if (m.officials.referees) matchOfficials.push(...m.officials.referees);
                if (m.officials.varReferees) matchOfficials.push(...m.officials.varReferees);
                if (m.officials.assistants) matchOfficials.push(...m.officials.assistants);
                if (m.officials.fourthOfficial) matchOfficials.push(m.officials.fourthOfficial);
                if (m.officials.avarReferees) matchOfficials.push(...m.officials.avarReferees);
                if (m.officials.observers) matchOfficials.push(...m.officials.observers);
                if (m.officials.representatives) matchOfficials.push(...m.officials.representatives);
            }
            if (m.representatives) {
                if (m.representatives.observer) matchOfficials.push(m.representatives.observer);
                if (m.representatives.rep1) matchOfficials.push(m.representatives.rep1);
                if (m.representatives.rep2) matchOfficials.push(m.representatives.rep2);
                if (m.representatives.rep3) matchOfficials.push(m.representatives.rep3);
            }
            
            return matchOfficials.some(name => name && normalizeOfficialName(name) === normName);
        }).length;
    };

    const getTeamShortName = (teamId: string): string => {
        const cleanId = teamId?.toLowerCase().trim() || '';
        const mapping: Record<string, string> = {
            'bes': 'BJK',
            'gal': 'GS',
            'fen': 'FB',
            'tra': 'TS',
            'bas': 'IBFK',
            'ant': 'ANT',
            'kon': 'KON',
            'goz': 'GÖZ',
            'sam': 'SAM',
            'ala': 'ALA',
            'kas': 'KAS',
            'koc': 'KOC',
            'fat': 'FGM',
            'eyu': 'EYÜP',
            'riz': 'ÇAYR',
            'gaz': 'GFK',
            'kay': 'KAY',
            'ist': 'İST',
            'bol': 'BOL',
            'fet': 'FET',
            'bod': 'BOD',
            'igd': 'IĞD',
            'ali': 'ALİ',
            'erz': 'ERZ',
            'kec': 'KEÇ',
            'bey': 'BYÇ'
        };
        return mapping[cleanId] || cleanId.substring(0, 3).toUpperCase();
    };

    const renderOfficialStats = (officialName?: string) => {
        if (!officialName || officialName === '-' || !match) return null;
        const homeCount = getOfficialCountForTeam(officialName, match.homeTeamId, allSeasonMatches);
        const awayCount = getOfficialCountForTeam(officialName, match.awayTeamId, allSeasonMatches);
        
        if (homeCount === 0 && awayCount === 0) return null;
        
        const homeShort = getTeamShortName(match.homeTeamId);
        const awayShort = getTeamShortName(match.awayTeamId);
        
        return (
            <span className="text-[9px] text-[#FF5DAD] font-extrabold uppercase tracking-wider block mt-0.5 select-none">
                ({homeShort}: {homeCount} Maç | {awayShort}: {awayCount} Maç)
            </span>
        );
    };

    // 1. Initial Match Fetch
    useEffect(() => {
        async function fetchMatchData() {
            if (!matchId) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/public/matches?id=${matchId}`);
                if (!res.ok) throw new Error("Match not found");
                const data = await res.json();
                
                setMatch(data.match);
                setIncidents(data.incidents || []);
                setDisciplinaryActions(data.disciplinaryActions || []);

                const seasonVal = data.match.season || '2025-2026';
                setSelectedWeek(data.match.week || 1);
                setSelectedSeason(seasonVal);
            } catch (err) {
                console.error("Match fetch details error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMatchData();
    }, [matchId]);

    // We will update the allMatches fetch below to use `raw=true` so we have full official stats.
    useEffect(() => {
        if (!match) return;
        async function fetchAllSeasonMatches() {
            try {
                const res = await fetch(`/api/public/matches?season=${match?.season || '2025-2026'}&raw=true`);
                if (res.ok) {
                    const data = await res.json();
                    setAllSeasonMatches(data);
                }
            } catch (e) {
                console.error("Error fetching season matches:", e);
            }
        }
        fetchAllSeasonMatches();
    }, [match]);

    // Helper to generate name slug
    const nameToSlug = (name: string): string => {
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

    // Fetch Referee Career Stats
    const refereeName = match?.referee;
    useEffect(() => {
        if (!refereeName) {
            setRefereeCareerStats(null);
            return;
        }
        async function fetchRefereeCareer() {
            setRefereeCareerLoading(true);
            try {
                const slug = nameToSlug(refereeName || '');
                const res = await fetch(`/api/stats/referees/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setRefereeCareerStats(data);
                } else {
                    setRefereeCareerStats(null);
                }
            } catch (e) {
                console.error("Error fetching referee career stats:", e);
                setRefereeCareerStats(null);
            } finally {
                setRefereeCareerLoading(false);
            }
        }
        fetchRefereeCareer();
    }, [refereeName]);

    // 2. Dynamic Fixtures Fetch
    useEffect(() => {
        async function fetchFixtures() {
            if (!selectedSeason || !selectedWeek) return;
            setFixturesLoading(true);
            try {
                const res = await fetch(`/api/public/matches?season=${selectedSeason}&week=${selectedWeek}&raw=true`);
                if (res.ok) {
                    const list = await res.json();
                    // Sort by date ascending
                    list.sort((a: Match, b: Match) => {
                        const dA = a.date ? new Date(a.date as string).getTime() : 0;
                        const dB = b.date ? new Date(b.date as string).getTime() : 0;
                        return dA - dB;
                    });
                    setFixtures(list);
                }
            } catch (err) {
                console.error("Fixtures fetch error:", err);
            } finally {
                setFixturesLoading(false);
            }
        }
        fetchFixtures();
    }, [selectedWeek, selectedSeason]);

    // Loading skeleton matching scoreboard card layout and dark page background
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] text-white p-6 md:p-8 flex items-center justify-center">
                <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 space-y-8 animate-pulse">
                        {/* Scoreboard Card Skeleton */}
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
                        {/* Main Tabs Skeleton */}
                        <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 h-80" />
                    </div>
                    {/* Sidebar Skeleton */}
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

    return (
        <main className="min-h-screen bg-[#0d1117] text-white py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Back to matches link */}
                <div className="flex items-center justify-between">
                    <Link href="/matches" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        &larr; TÜM MAÇLAR
                    </Link>
                </div>

                {/* Main 75/25 Layout grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    
                    {/* Left Column (75%) */}
                    <div className="lg:col-span-3 space-y-8">
                        
                        {/* Score Board Header White Card */}
                        <div className="bg-white rounded-3xl shadow-neo-sm p-4 md:p-6 border-2 border-black/5 text-slate-900 relative overflow-hidden">
                            <div className="flex flex-row items-center justify-between gap-4">
                                
                                {/* Home Team Info */}
                                <div className="flex-1 text-right min-w-0">
                                    <h2 className="text-base md:text-xl font-black uppercase tracking-tight text-slate-900 whitespace-nowrap truncate">
                                        {cleanSponsorsInText(match.homeTeamName)}
                                    </h2>
                                </div>

                                {/* Score blocks */}
                                <div className="flex items-center gap-2 select-none shrink-0">
                                    <div className="w-12 h-16 md:w-16 md:h-20 flex items-center justify-center bg-[#00a89d] text-white text-3xl md:text-4xl font-mono font-black rounded-xl shadow-md border border-black/10">
                                        {match.homeScore !== undefined ? match.homeScore : '-'}
                                    </div>
                                    <div className="text-xl font-black text-slate-400">-</div>
                                    <div className="w-12 h-16 md:w-16 md:h-20 flex items-center justify-center bg-[#1a433f] text-white text-3xl md:text-4xl font-mono font-black rounded-xl shadow-md border border-black/10">
                                        {match.awayScore !== undefined ? match.awayScore : '-'}
                                    </div>
                                </div>

                                {/* Away Team Info */}
                                <div className="flex-1 text-left min-w-0">
                                    <h2 className="text-base md:text-xl font-black uppercase tracking-tight text-slate-900 whitespace-nowrap truncate">
                                        {cleanSponsorsInText(match.awayTeamName)}
                                    </h2>
                                </div>
                            </div>

                            {/* Centered Metadata Section using grid for mathematical centering */}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                                {/* Row 1: Competition and Date */}
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs tracking-tight text-slate-900">
                                    <div className="text-right pr-4 font-black">
                                        {match.competition === 'cup' ? 'Türkiye Kupası' : 'Süper Lig'}
                                    </div>
                                    <div className="text-slate-400 select-none font-bold">•</div>
                                    <div className="text-left pl-4 font-bold">
                                        {match.date ? new Date(match.date).toLocaleString('tr-TR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : '-'}
                                    </div>
                                </div>

                                {/* Row 2: Stadium and Referee */}
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs tracking-tight text-slate-900">
                                    <div className="text-right pr-4 font-black truncate">
                                        {resolvedStadium}
                                    </div>
                                    <div className="text-slate-400 select-none font-bold">•</div>
                                    <div className="text-left pl-4 truncate font-bold">
                                        <span className="text-slate-500 uppercase tracking-widest text-[9px] font-black mr-1">Hakem:</span>
                                        {match.referee || '-'}
                                    </div>
                                </div>

                                {/* Row 3: VAR Referee on a new line centered */}
                                {match.varReferee && (
                                    <div className="text-center text-xs font-bold text-slate-900">
                                        <span className="text-slate-500 uppercase tracking-widest text-[9px] font-black mr-1">VAR Hakemi:</span>
                                        <span className="font-extrabold">{match.varReferee}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs Container */}
                        <div className="space-y-6">
                            
                            {/* Tab Switchers */}
                            <div className="flex bg-[#161b22] p-1 rounded-2xl border border-white/10 shadow-neo-sm overflow-x-auto scrollbar-none">
                                <button
                                    onClick={() => setActiveTab('analiz')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                        activeTab === 'analiz' ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    POZİSYON ANALİZİ
                                </button>
                                <button
                                    onClick={() => setActiveTab('hakem')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                        activeTab === 'hakem' ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    HAKEM İSTATİSTİKLERİ
                                </button>
                                <button
                                    onClick={() => setActiveTab('istatistik')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                        activeTab === 'istatistik' ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    İSTATİSTİK
                                </button>
                                <button
                                    onClick={() => setActiveTab('gorevliler')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                        activeTab === 'gorevliler' ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    GÖREVLİLER
                                </button>
                                <button
                                    onClick={() => setActiveTab('pfdk')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                        activeTab === 'pfdk' ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    PFDK
                                </button>
                            </div>

                            {/* Active Tab Panel */}
                            <div>
                                {activeTab === 'analiz' && (
                                    <div className="space-y-6">
                                        
                                        {/* List of Incidents */}
                                        {incidents.length === 0 ? (
                                            <div className="text-center py-12 bg-[#161b22] border border-white/10 rounded-3xl">
                                                <p className="text-zinc-500 text-xs font-bold italic">Bu maç için henüz tartışmalı pozisyon analizi eklenmemiştir.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {incidents.map((inc) => (
                                                    <div key={inc.id} className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 hover:border-zinc-700/80 transition-colors">
                                                        
                                                        {/* Header */}
                                                        <div className="flex items-start gap-4">
                                                            <div className="bg-[#FF5DAD] text-black font-black text-xs px-3 py-1.5 rounded-xl shadow-neo-sm shrink-0">
                                                                {inc.minute}. Dk
                                                            </div>
                                                            <div className="text-sm font-bold text-white leading-relaxed">
                                                                {inc.description}
                                                            </div>
                                                        </div>

                                                        {/* Decisions Grid */}
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

                                                        {/* Opinions */}
                                                        {inc.opinions && inc.opinions.length > 0 && (
                                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                                                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Yorumcu Değerlendirmeleri</h4>
                                                                <div className="space-y-3">
                                                                    {inc.opinions.map((op) => (
                                                                        <div key={op.id} className="bg-zinc-950/40 p-4 rounded-2xl border border-white/5 space-y-2">
                                                                            <div className="flex items-center justify-between gap-4">
                                                                                <span className="text-xs font-black text-primary">{op.criticName}</span>
                                                                                <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-wider ${
                                                                                    op.judgment === 'correct' 
                                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                                        : op.judgment === 'incorrect'
                                                                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                                                        : op.judgment === 'controversial'
                                                                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
                                                            <div className="h-10 w-px bg-white/10" />
                                                        )}
                                                        {refereeCareerStats.official?.rating && refereeCareerStats.official.rating > 0 && (
                                                            <div className="text-center md:text-left">
                                                                <span className="text-[10px] font-black text-zinc-500 uppercase block mb-0.5">Değerlendirme Notu</span>
                                                                <span className="text-xl font-mono font-black text-emerald-400">{refereeCareerStats.official.rating.toFixed(1)}</span>
                                                            </div>
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
                                            ) : (() => {
                                                const matchFouls = match.refereeStats?.fouls || (match.stats ? (Number(match.stats.homeFouls || 0) + Number(match.stats.awayFouls || 0)) : 0);
                                                const matchYellow = match.refereeStats?.yellowCards || (match.stats ? (Number(match.stats.homeYellowCards || 0) + Number(match.stats.awayYellowCards || 0)) : 0);
                                                const matchRed = match.refereeStats?.redCards || (match.stats ? (Number(match.stats.homeRedCards || 0) + Number(match.stats.awayRedCards || 0)) : 0);
                                                const matchPenalties = match.refereeStats?.penalties || 0;
                                                const ballInPlay = match.refereeStats?.ballInPlayTime;

                                                return (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {/* Fauller */}
                                                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Fauller</span>
                                                                <span className="text-xl font-mono font-black text-white">{matchFouls}</span>
                                                            </div>
                                                            {refereeCareerStats?.career && (
                                                                <span className="text-[9px] font-extrabold text-zinc-400 uppercase mt-2 block border-t border-white/5 pt-1.5">
                                                                    Ort: {refereeCareerStats.career.avgFoulsPerMatch}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Sarı Kartlar */}
                                                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Sarı Kartlar</span>
                                                                <span className="text-xl font-mono font-black text-amber-400">{matchYellow}</span>
                                                            </div>
                                                            {refereeCareerStats?.career && (
                                                                <span className="text-[9px] font-extrabold text-zinc-400 uppercase mt-2 block border-t border-white/5 pt-1.5">
                                                                    Ort: {refereeCareerStats.career.avgYellowPerMatch}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Kırmızı Kartlar */}
                                                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Kırmızı Kartlar</span>
                                                                <span className="text-xl font-mono font-black text-rose-500">{matchRed}</span>
                                                            </div>
                                                            {refereeCareerStats?.career && (
                                                                <span className="text-[9px] font-extrabold text-zinc-400 uppercase mt-2 block border-t border-white/5 pt-1.5">
                                                                    Ort: {refereeCareerStats.career.avgRedPerMatch}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Penaltılar */}
                                                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                                                            <div>
                                                                <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Penaltılar</span>
                                                                <span className="text-xl font-mono font-black text-[#00a89d]">{matchPenalties}</span>
                                                            </div>
                                                            {refereeCareerStats?.career && (
                                                                <span className="text-[9px] font-extrabold text-zinc-400 uppercase mt-2 block border-t border-white/5 pt-1.5">
                                                                    Ort: {refereeCareerStats.career.avgPenaltiesPerMatch}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Topun Oyunda Kalma Süresi - Alt Kısımda Tam Genişlik */}
                                                        <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 col-span-2 md:col-span-4 mt-2">
                                                            <div>
                                                                <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Topun Oyunda Kaldığı Süre / Maçın Süresi</span>
                                                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 mt-1">
                                                                    <span className="text-xl font-mono font-black text-white">{ballInPlay || 'Belirtilmedi'}</span>
                                                                    {refereeCareerStats?.matchDetails && (
                                                                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase">
                                                                            Kariyer Ortalaması: {(() => {
                                                                                 const mDetails = refereeCareerStats.matchDetails || [];
                                                                                 let activeSecs = 0;
                                                                                 let activeCount = 0;
                                                                                 let totalSecs = 0;
                                                                                 let totalCount = 0;

                                                                                 mDetails.forEach((m: { ballInPlayTime: string | null }) => {
                                                                                     const timeStr = m.ballInPlayTime;
                                                                                     if (timeStr) {
                                                                                         if (timeStr.includes('/')) {
                                                                                             const parts = timeStr.split('/');
                                                                                             // Active
                                                                                             const actPart = parts[0].trim().split(':');
                                                                                             if (actPart.length === 2) {
                                                                                                 const mins = parseInt(actPart[0], 10);
                                                                                                 const secs = parseInt(actPart[1], 10);
                                                                                                 if (!isNaN(mins) && !isNaN(secs)) {
                                                                                                     activeSecs += mins * 60 + secs;
                                                                                                     activeCount++;
                                                                                                 }
                                                                                             }
                                                                                             // Total
                                                                                             const totPart = parts[1].trim().split(':');
                                                                                             if (totPart.length === 2) {
                                                                                                 const mins = parseInt(totPart[0], 10);
                                                                                                 const secs = parseInt(totPart[1], 10);
                                                                                                 if (!isNaN(mins) && !isNaN(secs)) {
                                                                                                     totalSecs += mins * 60 + secs;
                                                                                                     totalCount++;
                                                                                                 }
                                                                                             }
                                                                                         } else {
                                                                                             const parts = timeStr.trim().split(':');
                                                                                             if (parts.length === 2) {
                                                                                                 const mins = parseInt(parts[0], 10);
                                                                                                 const secs = parseInt(parts[1], 10);
                                                                                                 if (!isNaN(mins) && !isNaN(secs)) {
                                                                                                     activeSecs += mins * 60 + secs;
                                                                                                     activeCount++;
                                                                                                 }
                                                                                             }
                                                                                         }
                                                                                     }
                                                                                 });

                                                                                 const formatSeconds = (totalSeconds: number) => {
                                                                                     const mins = Math.floor(totalSeconds / 60);
                                                                                     const secs = Math.round(totalSeconds % 60);
                                                                                     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                                                                 };

                                                                                 const avgActive = activeCount > 0 ? formatSeconds(activeSecs / activeCount) : 'Belirtilmedi';
                                                                                 const avgTotal = totalCount > 0 ? formatSeconds(totalSecs / totalCount) : 'Belirtilmedi';

                                                                                 if (activeCount === 0 && totalCount === 0) return 'Belirtilmedi';
                                                                                 if (totalCount === 0) return avgActive;
                                                                                 return `${avgActive} / ${avgTotal}`;
                                                                            })()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-extrabold text-zinc-500 uppercase">
                                                                Topun Oyunda Kaldığı Süre / Maçın Süresi
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Hakem Hataları ve Faktörleri */}
                                        {match.refereeStats && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* Sol Panel: Hata İstatistik Özetleri */}
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

                                                {/* Sağ Panel: Ev Sahibi / Deplasman Lehine Hata Listeleri ve Performans Notları */}
                                                <div className="md:col-span-2 bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                                                    <div className="space-y-1 border-b border-white/5 pb-4">
                                                        <h3 className="text-xs font-black tracking-widest text-primary uppercase">HATA DETAYLARI VE NOTLAR</h3>
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Pozisyon Bazlı Hakem Hataları ve Değerlendirmeler</p>
                                                    </div>

                                                    <div className="space-y-6">
                                                        {/* Ev Sahibi Lehine Yapılan Hatalar Listesi */}
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">EV SAHİBİ LEHİNE HATALAR</h4>
                                                            {match.refereeStats.homeErrors && match.refereeStats.homeErrors.length > 0 ? (
                                                                <ul className="space-y-2">
                                                                    {match.refereeStats.homeErrors.map((err, i) => (
                                                                        <li key={i} className="text-xs text-zinc-300 font-semibold bg-zinc-900/30 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                                                                            <span className="text-amber-500 shrink-0 font-bold">•</span>
                                                                            <span>{err}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-xs text-zinc-500 italic font-semibold pl-1">Ev sahibi lehine tespit edilmiş hata bulunmamaktadır.</p>
                                                            )}
                                                        </div>

                                                        {/* Deplasman Lehine Yapılan Hatalar Listesi */}
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">DEPLASMAN LEHİNE HATALAR</h4>
                                                            {match.refereeStats.awayErrors && match.refereeStats.awayErrors.length > 0 ? (
                                                                <ul className="space-y-2">
                                                                    {match.refereeStats.awayErrors.map((err, i) => (
                                                                        <li key={i} className="text-xs text-zinc-300 font-semibold bg-zinc-900/30 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                                                                            <span className="text-blue-400 shrink-0 font-bold">•</span>
                                                                            <span>{err}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-xs text-zinc-500 italic font-semibold pl-1">Deplasman lehine tespit edilmiş hata bulunmamaktadır.</p>
                                                            )}
                                                        </div>

                                                        {/* Performans Notları */}
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">HAKEM PERFORMANS NOTLARI</h4>
                                                            {match.refereeStats.performanceNotes && match.refereeStats.performanceNotes.length > 0 ? (
                                                                <ul className="space-y-2">
                                                                    {match.refereeStats.performanceNotes.map((note, i) => (
                                                                        <li key={i} className="text-xs text-zinc-300 font-semibold bg-zinc-900/30 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
                                                                            <span className="text-zinc-400 shrink-0 font-bold">•</span>
                                                                            <span>{note}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="text-xs text-zinc-500 italic font-semibold pl-1">Performans notu eklenmemiştir.</p>
                                                            )}
                                                        </div>
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
                                                            penalty: 'Penaltı İncelemesi',
                                                            red_card: 'Kırmızı Kart İncelemesi',
                                                            goal_cancelled: 'Gol İptali İncelemesi',
                                                            other: 'Diğer İnceleme'
                                                        };
                                                        const decisionLabels: Record<string, string> = {
                                                            confirmed: 'Karar Onaylandı',
                                                            reversed: 'Karar Değiştirildi'
                                                        };
                                                        
                                                        return (
                                                            <div key={idx} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 space-y-3">
                                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                                    <div className="flex items-center gap-3">
                                                                        {vi.minute !== undefined && (
                                                                            <span className="bg-[#FF5DAD] text-black font-black text-[10px] px-2 py-1 rounded">
                                                                                {vi.minute}. Dk
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs font-black text-white uppercase tracking-wider">
                                                                            {typeLabels[vi.type] || vi.type}
                                                                        </span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider border ${
                                                                        vi.decision === 'confirmed' 
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                                    }`}>
                                                                        {decisionLabels[vi.decision] || vi.decision}
                                                                    </span>
                                                                </div>
                                                                {vi.description && (
                                                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                                                                        {vi.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'istatistik' && (
                                    <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <h3 className="text-sm font-black tracking-widest text-primary uppercase">MAÇ İSTATİSTİKLERİ</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Takım Karşılaştırma Analizi</p>
                                        </div>

                                        {(!match.stats || Object.keys(match.stats).length === 0) ? (
                                            <div className="text-center py-12">
                                                <p className="text-zinc-500 text-xs font-bold italic">Bu maç için henüz istatistik verisi girilmemiştir.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Team Headers */}
                                                <div className="flex justify-between items-center text-xs font-black tracking-widest uppercase pb-2">
                                                    <span className="text-[#00a89d]">{cleanSponsorsInText(match.homeTeamName)}</span>
                                                    <span className="text-[#1a433f]">{cleanSponsorsInText(match.awayTeamName)}</span>
                                                </div>

                                                {/* Stats list */}
                                                <div className="space-y-4">
                                                    {[
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
                                                    ]
                                                    .filter(s => s.homeVal !== undefined && s.awayVal !== undefined)
                                                    .map((s, idx) => {
                                                        const hVal = Number(s.homeVal ?? 0);
                                                        const aVal = Number(s.awayVal ?? 0);
                                                        const total = hVal + aVal;
                                                        const homePct = total > 0 ? (hVal / total) * 100 : 50;
                                                        const awayPct = total > 0 ? (aVal / total) * 100 : 50;

                                                        return (
                                                            <div key={idx} className="space-y-2">
                                                                <div className="flex justify-between items-center text-xs font-bold">
                                                                    {/* Home Value */}
                                                                    <span className="text-[#00a89d] font-mono text-sm">{hVal}{s.isPercentage ? '%' : ''}</span>
                                                                    
                                                                    {/* Label */}
                                                                    <span className="text-zinc-400 uppercase tracking-wider text-[10px]">{s.label}</span>
                                                                    
                                                                    {/* Away Value */}
                                                                    <span className="text-[#1a433f] font-mono text-sm">{aVal}{s.isPercentage ? '%' : ''}</span>
                                                                </div>
                                                                
                                                                {/* Comparison bar */}
                                                                <div className="h-2 w-full bg-zinc-800 rounded-full flex overflow-hidden border border-black/10">
                                                                    <div 
                                                                        style={{ width: `${homePct}%` }}
                                                                        className="bg-[#00a89d] transition-all duration-500"
                                                                    />
                                                                    <div 
                                                                        style={{ width: `${awayPct}%` }}
                                                                        className="bg-[#1a433f] transition-all duration-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'gorevliler' && (
                                    <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 animate-fadeIn">
                                        <div className="space-y-1 border-b border-white/5 pb-4">
                                            <h3 className="text-sm font-black tracking-widest text-primary uppercase">MAÇ GÖREVLİLERİ</h3>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">TFF Atamaları ve Görevli Kadrosu</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            
                                            {/* Hakem Heyeti Card */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-[#00a89d] uppercase tracking-wider border-b border-white/5 pb-2">HAKEM HEYETİ</h4>
                                                <div className="space-y-3">
                                                    {(() => {
                                                        const mainRef = match.referee || match.officials?.referees?.[0];
                                                        return mainRef && mainRef !== '-' ? (
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 gap-1">
                                                                <span className="text-zinc-400 font-bold">Orta Hakem</span>
                                                                <div className="text-right">
                                                                    <span className="text-white font-extrabold block">{mainRef}</span>
                                                                    {renderOfficialStats(mainRef)}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {(() => {
                                                        const asst1 = match.officials?.assistants?.[0] || match.officials?.referees?.[1];
                                                        return asst1 && asst1 !== '-' ? (
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 gap-1">
                                                                <span className="text-zinc-400 font-bold">1. Yardımcı Hakem</span>
                                                                <div className="text-right">
                                                                    <span className="text-white font-extrabold block">{asst1}</span>
                                                                    {renderOfficialStats(asst1)}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {(() => {
                                                        const asst2 = match.officials?.assistants?.[1] || match.officials?.referees?.[2];
                                                        return asst2 && asst2 !== '-' ? (
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 gap-1">
                                                                <span className="text-zinc-400 font-bold">2. Yardımcı Hakem</span>
                                                                <div className="text-right">
                                                                    <span className="text-white font-extrabold block">{asst2}</span>
                                                                    {renderOfficialStats(asst2)}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {(() => {
                                                        const fourth = match.officials?.fourthOfficial || match.officials?.referees?.[3];
                                                        return fourth && fourth !== '-' ? (
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-1">
                                                                <span className="text-zinc-400 font-bold">Dördüncü Hakem</span>
                                                                <div className="text-right">
                                                                    <span className="text-white font-extrabold block">{fourth}</span>
                                                                    {renderOfficialStats(fourth)}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* VAR Ekibi Card */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-[#FF5DAD] uppercase tracking-wider border-b border-white/5 pb-2">VAR EKİBİ</h4>
                                                <div className="space-y-3">
                                                    {(() => {
                                                        const varRef = match.varReferee || match.officials?.varReferees?.[0];
                                                        return varRef && varRef !== '-' ? (
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 gap-1">
                                                                <span className="text-zinc-400 font-bold">VAR Hakemi</span>
                                                                <div className="text-right">
                                                                    <span className="text-white font-extrabold block">{varRef}</span>
                                                                    {renderOfficialStats(varRef)}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                    {(() => {
                                                        const avarRef = match.officials?.avarReferees?.[0] || match.officials?.varReferees?.[1];
                                                        return avarRef && avarRef !== '-' ? (
                                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-1">
                                                                <span className="text-zinc-400 font-bold">AVAR Hakemi</span>
                                                                <div className="text-right">
                                                                    <span className="text-white font-extrabold block">{avarRef}</span>
                                                                    {renderOfficialStats(avarRef)}
                                                                </div>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Gözlemciler Card */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider border-b border-white/5 pb-2">GÖZLEMCİLER</h4>
                                                <div className="space-y-3">
                                                    {match.officials?.observers && match.officials.observers.length > 0 ? (
                                                        match.officials.observers.map((obs, idx) => {
                                                            const label = match.officials!.observers.length === 1 
                                                                ? 'Gözlemci' 
                                                                : `${idx + 1}. Gözlemci`;
                                                            return (
                                                                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0 gap-1">
                                                                    <span className="text-zinc-400 font-bold">{label}</span>
                                                                    <div className="text-right">
                                                                        <span className="text-white font-extrabold block">{obs}</span>
                                                                        {renderOfficialStats(obs)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : match.representatives?.observer ? (
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-1">
                                                            <span className="text-zinc-400 font-bold">Hakem Gözlemcisi</span>
                                                            <div className="text-right">
                                                                <span className="text-white font-extrabold block">{match.representatives.observer}</span>
                                                                {renderOfficialStats(match.representatives.observer)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-zinc-500 text-[10px] font-bold italic">Gözlemci bilgisi girilmemiştir.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Temsilciler Card */}
                                            <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 space-y-4">
                                                <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider border-b border-white/5 pb-2">TEMSİLCİLER</h4>
                                                <div className="space-y-3">
                                                    {match.officials?.representatives && match.officials.representatives.length > 0 ? (
                                                        match.officials.representatives.map((rep, idx) => {
                                                            const label = match.officials!.representatives.length === 1 
                                                                ? 'Temsilci' 
                                                                : `${idx + 1}. Temsilci`;
                                                            return (
                                                                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0 gap-1">
                                                                    <span className="text-zinc-400 font-bold">{label}</span>
                                                                    <div className="text-right">
                                                                        <span className="text-white font-extrabold block">{rep}</span>
                                                                        {renderOfficialStats(rep)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (match.representatives?.rep1 || match.representatives?.rep2 || match.representatives?.rep3) ? (
                                                        (() => {
                                                            const reps = [match.representatives.rep1, match.representatives.rep2, match.representatives.rep3].filter(Boolean) as string[];
                                                            return reps.map((rep, idx) => {
                                                                const label = reps.length === 1 ? 'Temsilci' : `${idx + 1}. Temsilci`;
                                                                return (
                                                                    <div key={idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0 gap-1">
                                                                        <span className="text-zinc-400 font-bold">{label}</span>
                                                                        <div className="text-right">
                                                                            <span className="text-white font-extrabold block">{rep}</span>
                                                                            {renderOfficialStats(rep)}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()
                                                    ) : (
                                                        <p className="text-zinc-500 text-[10px] font-bold italic">Temsilci bilgisi girilmemiştir.</p>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}

                                {activeTab === 'pfdk' && (
                                    <div className="space-y-6">
                                        {disciplinaryActions.length === 0 ? (
                                            <div className="text-center py-12 bg-[#161b22] border border-white/10 rounded-3xl">
                                                <p className="text-zinc-500 text-xs font-bold italic">Bu maç için henüz TFF PFDK disiplin sevk/ceza kararı eklenmemiştir.</p>
                                            </div>
                                        ) : (
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
                                                            {act.penalty && (
                                                                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
                                                                    {act.penalty}
                                                                </span>
                                                            )}
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
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar Column (25%) */}
                    <div className="lg:col-span-1">
                        <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
                            
                            {/* Sidebar Header & Selectors */}
                            <div className="flex flex-col gap-3">
                                <h3 className="text-sm font-black tracking-widest text-primary uppercase">HAFTANIN FİKSTÜRÜ</h3>
                                
                                {/* Interactive Dropdown Selectors */}
                                <div className="grid grid-cols-2 gap-2 select-none">
                                    {/* Season Select */}
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
                                    
                                    {/* Week Select */}
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

                            {/* Fixtures List */}
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
                                        const hScore = f.homeScore !== undefined ? f.homeScore : '-';
                                        const aScore = f.awayScore !== undefined ? f.awayScore : '-';
                                        const isFinished = f.homeScore !== undefined && f.awayScore !== undefined;
                                        const displayScore = isFinished ? `${hScore} - ${aScore}` : 'vs';

                                        return (
                                            <Link key={f.id} href={`/matches/${f.id}`} className="block">
                                                <div className={`p-3 rounded-2xl border transition-all ${
                                                    isActive 
                                                        ? 'bg-white text-slate-900 border-primary shadow-lg scale-102' 
                                                        : 'bg-zinc-900/60 hover:bg-zinc-900 text-white border-white/5'
                                                }`}>
                                                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px] font-bold">
                                                        
                                                        {/* Home Team Name */}
                                                        <div className={`text-right truncate ${isActive ? 'text-slate-800 font-extrabold' : 'text-zinc-300'}`}>
                                                            {cleanSponsorsInText(f.homeTeamName)}
                                                        </div>
                                                        
                                                        {/* Score Badge */}
                                                        <div className="flex flex-col items-center min-w-[55px]">
                                                            <div className={`px-2 py-0.5 rounded font-mono text-[10px] font-black text-center ${
                                                                isActive ? 'bg-[#00a89d] text-white shadow-xs' : 'bg-black text-white'
                                                            }`}>
                                                                {displayScore}
                                                            </div>
                                                            {isFinished && (
                                                                <span className={`text-[8px] font-black tracking-widest mt-0.5 uppercase ${
                                                                    isActive ? 'text-[#00a89d]' : 'text-zinc-500'
                                                                }`}>
                                                                    FT
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Away Team Name */}
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
"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Match, Incident, Opinion, DisciplinaryAction, Team } from '@/types';
import { useParams } from 'next/navigation';
import { cleanSponsorsInText, getTeamStadium } from '@/lib/teams';
import Link from 'next/link';

interface IncidentWithOpinions extends Incident {
    opinions: Opinion[];
}

const normalizeName = (name: string) => {
    return name.replace(/i/g, 'İ').toLocaleUpperCase('tr-TR').trim().replace(/\s+/g, ' ');
};

const parseMinute = (minStr: string | number): number => {
    const minStrClean = minStr.toString().replace('.dk', '').replace(/\s+/g, '');
    if (minStrClean.includes('+')) {
        const parts = minStrClean.split('+');
        return (parseInt(parts[0]) || 90) + (parseInt(parts[1]) || 0);
    }
    return parseInt(minStrClean) || 0;
};

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
    const [activeTab, setActiveTab] = useState<'analiz' | 'istatistik' | 'pfdk'>('analiz');
    
    // Load state
    const [loading, setLoading] = useState<boolean>(true);
    const [fixturesLoading, setFixturesLoading] = useState<boolean>(false);

    // 1. Initial Match Fetch
    useEffect(() => {
        async function fetchMatchData() {
            if (!matchId) return;
            setLoading(true);
            try {
                const matchRef = doc(db, 'matches', matchId);
                const matchSnap = await getDoc(matchRef);

                if (matchSnap.exists()) {
                    const matchData = matchSnap.data() as Match;
                    setMatch(matchData);

                    // Fetch Incidents subcollection
                    const incQ = collection(db, 'matches', matchId, 'incidents');
                    const incSnap = await getDocs(incQ);

                    const incidentsWithOpinionsList = await Promise.all(incSnap.docs.map(async (incDoc) => {
                        const incData = incDoc.data() as Incident;
                        incData.id = incDoc.id;
                        
                        const opQ = collection(db, 'matches', matchId, 'incidents', incDoc.id, 'opinions');
                        const opSnap = await getDocs(opQ);
                        const opinions = opSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Opinion[];
                        
                        return { ...incData, opinions } as IncidentWithOpinions;
                    }));

                    // Sort incidents by minute
                    incidentsWithOpinionsList.sort((a, b) => {
                        return parseMinute(a.minute) - parseMinute(b.minute);
                    });

                    setIncidents(incidentsWithOpinionsList);

                    // Fetch Disciplinary actions for this match
                    const pfdkQ = query(collection(db, 'disciplinary_actions'), where('matchId', '==', matchId));
                    const pfdkSnap = await getDocs(pfdkQ);
                    const pfdkList = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));
                    setDisciplinaryActions(pfdkList);

                    // Set initial selectors
                    setSelectedWeek(matchData.week || 1);
                    setSelectedSeason(matchData.season || '2025-2026');
                }
            } catch (err) {
                console.error("Match fetch details error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMatchData();
    }, [matchId]);

    // 2. Dynamic Fixtures Fetch
    useEffect(() => {
        async function fetchFixtures() {
            if (!selectedSeason || !selectedWeek) return;
            setFixturesLoading(true);
            try {
                const fixturesQ = query(
                    collection(db, 'matches'),
                    where('season', '==', selectedSeason),
                    where('week', '==', selectedWeek)
                );
                const snap = await getDocs(fixturesQ);
                const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Match));
                
                // Sort by date ascending
                list.sort((a, b) => {
                    const dA = a.date ? new Date(a.date).getTime() : 0;
                    const dB = b.date ? new Date(b.date).getTime() : 0;
                    return dA - dB;
                });
                
                setFixtures(list);
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
                            <div className="flex bg-[#161b22] p-1 rounded-2xl border border-white/10 shadow-neo-sm">
                                <button
                                    onClick={() => setActiveTab('analiz')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                        activeTab === 'analiz' ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    POZİSYON ANALİZİ
                                </button>
                                <button
                                    onClick={() => setActiveTab('istatistik')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                        activeTab === 'istatistik' ? 'bg-primary text-black shadow-lg font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    İSTATİSTİK
                                </button>
                                <button
                                    onClick={() => setActiveTab('pfdk')}
                                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
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
                                        
                                        {/* Referee stats summary card if exists */}
                                        {match.refereeStats && (
                                            <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                                                <h3 className="text-xs font-black tracking-widest text-[#00a89d] uppercase">HAKEM MAÇ İSTATİSTİKLERİ</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 text-center">
                                                        <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Toplam Faul</span>
                                                        <span className="text-xl font-mono font-black text-white">{match.refereeStats.fouls || 0}</span>
                                                    </div>
                                                    <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 text-center">
                                                        <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Top Oynama Süresi</span>
                                                        <span className="text-xl font-mono font-black text-white">{match.refereeStats.ballInPlayTime || '50:00'}</span>
                                                    </div>
                                                    <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 text-center">
                                                        <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Sarı Kartlar</span>
                                                        <span className="text-xl font-mono font-black text-amber-400">{match.refereeStats.yellowCards || 0}</span>
                                                    </div>
                                                    <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5 text-center">
                                                        <span className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Kırmızı Kartlar</span>
                                                        <span className="text-xl font-mono font-black text-rose-500">{match.refereeStats.redCards || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

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
                                                                            <p className="text-xs text-zinc-300 leading-relaxed italic">"{op.opinion}"</p>
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
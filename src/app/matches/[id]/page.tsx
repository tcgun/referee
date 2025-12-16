"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Match, Incident, Opinion, DisciplinaryAction, Player } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTeamColors } from '@/lib/teams';

interface IncidentWithOpinions extends Incident {
    opinions: Opinion[];
}

const STAT_LABELS = [
    { key: 'Possession', label: 'Topla Oynama (%)', suffix: '%' },
    { key: 'Shots', label: 'Toplam Şut' },
    { key: 'ShotsOnTarget', label: 'İsabetli Şut' },
    { key: 'BlockedShots', label: 'Engellenen Şut' },
    { key: 'Passes', label: 'Toplam Pas' },
    { key: 'PassAccuracy', label: 'Pas İsabeti (%)', suffix: '%' },
    { key: 'Fouls', label: 'Faul' },
    { key: 'Offsides', label: 'Ofsayt' },
    { key: 'Corners', label: 'Korner' },
    { key: 'YellowCards', label: 'Sarı Kart', isCard: true, color: 'text-yellow-500' },
    { key: 'RedCards', label: 'Kırmızı Kart', isCard: true, color: 'text-red-500' },
    { key: 'Saves', label: 'Kurtarış' },
];

export default function MatchPage() {
    const params = useParams();
    const matchId = params.id as string;
    const [match, setMatch] = useState<Match | null>(null);
    const [incidents, setIncidents] = useState<IncidentWithOpinions[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'summary' | 'lineups' | 'pfdk'>('summary');
    const [disciplinary, setDisciplinary] = useState<DisciplinaryAction[]>([]);

    useEffect(() => {
        async function fetchData() {
            if (!matchId) return;
            try {
                const matchSnap = await getDoc(doc(db, 'matches', matchId));
                if (!matchSnap.exists()) {
                    setLoading(false);
                    return;
                }
                const matchData = matchSnap.data() as Match;
                setMatch(matchData);

                const incidentsQ = query(collection(db, 'matches', matchId, 'incidents'), orderBy('minute'));
                const incidentsSnap = await getDocs(incidentsQ);
                const incidentsList: IncidentWithOpinions[] = [];

                await Promise.all(incidentsSnap.docs.map(async (docSnap) => {
                    const incData = docSnap.data() as Incident;
                    incData.id = docSnap.id;
                    const opsQ = collection(db, 'matches', matchId, 'incidents', incData.id, 'opinions');
                    const opsSnap = await getDocs(opsQ);
                    const opinions = opsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Opinion));
                    incidentsList.push({ ...incData, opinions });
                }));

                incidentsList.sort((a, b) => a.minute - b.minute);
                setIncidents(incidentsList);

                // Fetch PFDK
                const pfdkQ = collection(db, 'disciplinary');
                const pfdkSnap = await getDocs(pfdkQ);
                const pfdkList = pfdkSnap.docs
                    .map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction))
                    .filter(d => matchData && (
                        (d.teamName && matchData.homeTeamName && d.teamName.toLowerCase().includes(matchData.homeTeamName.toLowerCase())) ||
                        (d.teamName && matchData.awayTeamName && d.teamName.toLowerCase().includes(matchData.awayTeamName.toLowerCase()))
                    ));
                setDisciplinary(pfdkList);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [matchId]);

    const getTeamName = (id?: string) => {
        if (!id || !match) return id;
        const cleanId = id.toLowerCase().replace(/\s/g, '');
        if (match.homeTeamId.includes(cleanId) || cleanId === 'home') return match.homeTeamName;
        if (match.awayTeamId.includes(cleanId) || cleanId === 'away') return match.awayTeamName;
        // If exact ID match fails, simpler checks
        if (match.homeTeamName.toLowerCase().includes(cleanId)) return match.homeTeamName;
        if (match.awayTeamName.toLowerCase().includes(cleanId)) return match.awayTeamName;
        return id.toUpperCase();
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <span className="text-sm font-medium animate-pulse">Maç Verileri Yükleniyor...</span>
        </div>
    );
    if (!match) return <div className="p-8 text-center text-red-500 font-bold">Maç bulunamadı.</div>;

    const homeColors = getTeamColors(match.homeTeamId);
    const awayColors = getTeamColors(match.awayTeamId);

    const getStatValue = (type: 'home' | 'away', key: string) => {
        if (!match.stats) return 0;
        const fullKey = `${type}${key}`;
        // @ts-ignore
        return match.stats[fullKey] || 0;
    };

    return (
        <div className="min-h-screen bg-background pb-12">

            {/* SIMPLIFIED HEADER (No Logos, Names Only) */}
            <div className="bg-card border-b border-border shadow-sm mb-6 pt-4 pb-6">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex items-center justify-between gap-4">
                        {/* Home Team */}
                        <div className="flex-1 text-right">
                            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground leading-none">
                                {match.homeTeamName}
                            </h1>
                        </div>

                        {/* Score & Date */}
                        <div className="flex flex-col items-center shrink-0 mx-2">
                            <div className="text-4xl md:text-6xl font-black font-mono tracking-tighter text-foreground px-4 py-1">
                                {match.score || '0-0'}
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded">
                                {match.date ? new Date(match.date).toLocaleDateString('tr-TR') : '-'}
                            </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 text-left">
                            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground leading-none">
                                {match.awayTeamName}
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COL: Stats & Info (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    {/* TABS */}
                    <div className="bg-card border border-border rounded-xl p-1 flex gap-1 shadow-sm">
                        {['summary', 'lineups', 'pfdk'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'
                                    }`}
                            >
                                {tab === 'summary' ? 'İSTATİSTİK' : tab === 'lineups' ? 'KADRO' : 'PFDK'}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'summary' && (
                        <>
                            {/* OFFICIALS (Full List) */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="p-3 bg-muted/30 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <span>🏁</span> Hakem Kadrosu
                                </div>
                                <div className="p-3 grid grid-cols-2 gap-y-3 gap-x-2">
                                    <OfficialItem label="Orta Hakem" name={match?.referee || match?.officials?.referees?.[0]} />
                                    <OfficialItem label="VAR" name={match?.officials?.varReferees?.[0]} highlight />
                                    <OfficialItem label="AVAR" name={match?.officials?.avarReferees?.[0]} />

                                    {match?.officials?.assistants?.map((ast, i) => (
                                        <OfficialItem key={`ast-${i}`} label={`${i + 1}. Yrd.`} name={ast} />
                                    ))}

                                    {match?.officials?.fourthOfficial && <OfficialItem label="4. Hakem" name={match.officials.fourthOfficial} />}

                                    {match?.officials?.observers?.map((obs, i) => (
                                        <OfficialItem key={`obs-${i}`} label="Gözlemci" name={obs} />
                                    ))}
                                    {match?.officials?.representatives?.map((rep, i) => (
                                        <OfficialItem key={`rep-${i}`} label="Temsilci" name={rep} />
                                    ))}
                                </div>
                            </div>

                            {/* STATS */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="p-3 bg-muted/30 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                                    <span>📊 Maç İstatistikleri</span>
                                    <div className='flex gap-1'>
                                        <div title={match.homeTeamName} className='w-2 h-2 rounded-full' style={{ background: homeColors.primary }}></div>
                                        <div title={match.awayTeamName} className='w-2 h-2 rounded-full' style={{ background: awayColors.primary }}></div>
                                    </div>
                                </div>
                                <div className="p-4 space-y-4">
                                    {STAT_LABELS.map((stat) => {
                                        const hVal = getStatValue('home', stat.key);
                                        const aVal = getStatValue('away', stat.key);
                                        const total = hVal + aVal;
                                        // Fix: If total is 0, show 50-50 empty. 
                                        const hPercent = total > 0 ? (hVal / total) * 100 : 50;

                                        if (hVal === 0 && aVal === 0) return null;

                                        return (
                                            <div key={stat.key} className="text-xs">
                                                <div className="flex justify-between items-end mb-1 font-mono font-bold">
                                                    <span className="text-foreground">{hVal}{stat.suffix}</span>
                                                    <span className="text-[9px] text-muted-foreground font-sans uppercase tracking-tight">{stat.label}</span>
                                                    <span className="text-foreground">{aVal}{stat.suffix}</span>
                                                </div>
                                                {/* Bar Visual - Colored by Team Color regardless of valid */}
                                                <div className="w-full bg-muted/50 rounded-full h-1.5 flex overflow-hidden">
                                                    <div className="h-full" style={{ width: `${hPercent}%`, backgroundColor: homeColors.primary }}></div>
                                                    <div className="h-full" style={{ width: `${100 - hPercent}%`, backgroundColor: awayColors.primary }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'lineups' && match?.lineups && (
                        <div className="grid grid-cols-2 gap-2">
                            {/* Home Team Lineup Compact */}
                            <div className="bg-card border border-border rounded-xl p-3">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 text-center border-b border-border pb-1">{match.homeTeamName}</h4>
                                <ul className="space-y-1">
                                    {match.lineups.home?.map(p => (
                                        <li key={p.number} className="text-[10px] flex gap-2">
                                            <span className="font-mono text-muted-foreground w-4 text-right">{p.number}</span>
                                            <span className="font-bold text-foreground truncate">{p.name}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-3 pt-2 border-t border-border">
                                    <span className="block text-[9px] font-black uppercase text-muted-foreground mb-1">Yedekler</span>
                                    <div className="text-[9px] text-muted-foreground leading-relaxed">
                                        {match.lineups.homeSubs?.map(s => s.name).join(', ')}
                                    </div>
                                </div>
                            </div>

                            {/* Away Team Lineup Compact */}
                            <div className="bg-card border border-border rounded-xl p-3">
                                <h4 className="text-[10px] font-black uppercase text-muted-foreground mb-3 text-center border-b border-border pb-1">{match.awayTeamName}</h4>
                                <ul className="space-y-1">
                                    {match.lineups.away?.map(p => (
                                        <li key={p.number} className="text-[10px] flex gap-2">
                                            <span className="font-mono text-muted-foreground w-4 text-right">{p.number}</span>
                                            <span className="font-bold text-foreground truncate">{p.name}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-3 pt-2 border-t border-border">
                                    <span className="block text-[9px] font-black uppercase text-muted-foreground mb-1">Yedekler</span>
                                    <div className="text-[9px] text-muted-foreground leading-relaxed">
                                        {match.lineups.awaySubs?.map(s => s.name).join(', ')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pfdk' && (
                        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                            <h4 className='text-[10px] font-black uppercase text-muted-foreground mb-2'>PFDK Kararları</h4>
                            {disciplinary.length === 0 ? <p className='text-xs italic text-muted-foreground'>Kayıt yok.</p> : disciplinary.map(d => (
                                <div key={d.id} className='bg-muted/10 p-2 rounded border border-border text-xs'>
                                    <div className='font-bold text-foreground mb-1'>{d.subject} <span className='text-[9px] text-muted-foreground font-medium'>({d.teamName})</span></div>
                                    <div className='text-muted-foreground italic'>"{d.reason}"</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COL: INCIDENTS (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                    {incidents.length === 0 ? (
                        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground font-bold text-sm">
                            Henüz pozisyon girişi yapılmamış.
                        </div>
                    ) : (
                        incidents.map((inc) => (
                            <div key={inc.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">

                                {/* HEADER: Lehe/Aleyhe */}
                                {(inc.favorOf || inc.against) && (
                                    <div className="flex text-[10px] font-black uppercase tracking-widest text-white">
                                        {inc.favorOf && (
                                            <div className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 p-1.5 text-center">
                                                LEHE: {getTeamName(inc.favorOf)}
                                            </div>
                                        )}
                                        {inc.against && (
                                            <div className="flex-1 bg-gradient-to-r from-red-600 to-red-500 p-1.5 text-center">
                                                ALEYHE: {getTeamName(inc.against)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="p-4 flex gap-4">
                                    {/* Minute */}
                                    <div className="shrink-0">
                                        <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center font-black text-sm shadow-md">
                                            {inc.minute}'
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        {/* Description & Tags */}
                                        <div>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getImpactColor(inc.impact)}`}>{inc.impact}</span>
                                                {inc.videoUrl && <a href={inc.videoUrl} target="_blank" className="text-[9px] font-black uppercase px-2 py-0.5 rounded border bg-muted text-foreground hover:bg-primary hover:text-primary-foreground">Video</a>}
                                            </div>
                                            <h3 className="text-sm font-bold text-foreground leading-snug">{inc.description}</h3>
                                        </div>

                                        {/* Decisions */}
                                        <div className="flex gap-4 text-xs bg-muted/20 p-2 rounded-lg border border-border">
                                            <div className="flex-1">
                                                <span className="block text-[9px] font-bold text-muted-foreground uppercase">Hakem</span>
                                                <span className="font-bold text-foreground">{inc.refereeDecision}</span>
                                            </div>
                                            {inc.varDecision && (
                                                <div className="flex-1 border-l border-border pl-4">
                                                    <span className="block text-[9px] font-bold text-blue-500 uppercase">VAR</span>
                                                    <span className="font-bold text-blue-700 dark:text-blue-400">{inc.varDecision}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Comments Grid */}
                                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                                            {/* Trio */}
                                            <div className="space-y-2">
                                                <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-widest border-b border-border pb-1">Trio</h4>
                                                {inc.opinions.filter(o => o.type === 'trio' || !o.type).length === 0 ? <span className='text-[10px] text-muted-foreground italic'>Yorum yok.</span> :
                                                    inc.opinions.filter(o => o.type === 'trio' || !o.type).map(op => (
                                                        <div key={op.id} className="text-xs">
                                                            <div className="flex justify-between items-baseline mb-0.5">
                                                                <span className="font-bold text-foreground">{op.criticName}</span>
                                                                <Badge judgment={op.judgment} />
                                                            </div>
                                                            <p className="text-muted-foreground line-clamp-2">"{op.opinion}"</p>
                                                        </div>
                                                    ))}
                                            </div>

                                            {/* General */}
                                            <div className="space-y-2">
                                                <h4 className="text-[9px] font-black text-purple-500 uppercase tracking-widest border-b border-border pb-1">Diğer</h4>
                                                {inc.opinions.filter(o => o.type === 'general').length === 0 ? <span className='text-[10px] text-muted-foreground italic'>Yorum yok.</span> :
                                                    inc.opinions.filter(o => o.type === 'general').map(op => (
                                                        <div key={op.id} className="text-xs">
                                                            <span className="font-bold text-foreground mr-1">{op.criticName}:</span>
                                                            <span className="text-muted-foreground">"{op.opinion}"</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>

        </div>
    );
}

// Compact Components
function OfficialItem({ label, name, highlight }: { label: string, name?: string, highlight?: boolean }) {
    if (!name) return null;
    return (
        <div className="flex flex-col">
            <span className={`text-[9px] font-bold uppercase ${highlight ? 'text-blue-500' : 'text-muted-foreground'}`}>{label}</span>
            <span className="text-xs font-bold text-foreground truncate" title={name}>{name}</span>
        </div>
    )
}

function Badge({ judgment }: { judgment: string }) {
    let classes = 'bg-muted text-muted-foreground';
    if (judgment === 'correct') classes = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (judgment === 'incorrect') classes = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (judgment === 'controversial') classes = 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';

    const label = judgment === 'correct' ? 'DOĞRU' : judgment === 'incorrect' ? 'YANLIŞ' : judgment === 'controversial' ? 'TARTIŞMALI' : judgment;
    return <span className={`text-[9px] font-black px-1.5 rounded uppercase ${classes}`}>{label}</span>;
}

function getImpactColor(impact: string) {
    if (impact === 'penalty') return 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20';
    if (impact === 'red_card') return 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20';
    if (impact === 'goal') return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20';
    return 'text-muted-foreground border-border bg-muted/30';
}

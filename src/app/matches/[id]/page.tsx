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
    const [activeTab, setActiveTab] = useState<'summary' | 'lineups' | 'pfdk' | null>(null);
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

            {/* SIMPLIFIED HEADER (No Logos, Names Only) + TABS */}
            <div className="bg-card border-b border-border shadow-sm mb-6 pt-4">
                <div className="max-w-7xl mx-auto px-4 pb-6">
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
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded mb-4">
                                {match.date ? new Date(match.date).toLocaleDateString('tr-TR') : '-'}
                            </div>

                            {/* TABS (Moved Here) */}
                            <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
                                {['summary', 'lineups', 'pfdk'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(activeTab === tab ? null : tab as any)}
                                        className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'
                                            }`}
                                    >
                                        {tab === 'summary' ? 'İSTATİSTİK' : tab === 'lineups' ? 'KADRO' : 'PFDK'}
                                    </button>
                                ))}
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

            {/* CONTENT STACK (Full Width) */}
            <div className="max-w-7xl mx-auto px-4 space-y-6">

                {/* ACTIVE TAB CONTENT */}
                <div className="w-full">
                    {activeTab === 'summary' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* OFFICIALS (Categorized List) */}
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="p-3 bg-muted/30 border-b border-border text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <span>🏁</span> Hakem Kadrosu
                                </div>
                                <div className="p-4 space-y-6">

                                    {/* 1. HAKEMLER */}
                                    <div>
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 border-b border-border/50 pb-1">Hakemler</h4>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                            {/* Main Referee */}
                                            {(match?.referee || match?.officials?.referees?.[0]) && (
                                                <OfficialItem label="Orta Hakem" name={match.referee || match.officials?.referees?.[0]} />
                                            )}

                                            {/* Assistants */}
                                            {match?.officials?.referees && match.officials.referees.length > 1 ? (
                                                <>
                                                    {match.officials.referees[1] && <OfficialItem label="1. Yrd. Hakem" name={match.officials.referees[1]} />}
                                                    {match.officials.referees[2] && <OfficialItem label="2. Yrd. Hakem" name={match.officials.referees[2]} />}
                                                </>
                                            ) : (
                                                match?.officials?.assistants?.map((ast, i) => (
                                                    <OfficialItem key={`ast-${i}`} label={`${i + 1}. Yrd. Hakem`} name={ast} />
                                                ))
                                            )}

                                            {/* 4th Official */}
                                            {(match?.officials?.referees?.[3] || match?.officials?.fourthOfficial) && (
                                                <OfficialItem label="4. Hakem" name={match.officials?.referees?.[3] || match.officials?.fourthOfficial} />
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. VAR EKİBİ */}
                                    {(match?.officials?.varReferees?.[0] || match?.officials?.avarReferees?.length) && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 border-b border-border/50 pb-1">VAR Ekibi</h4>
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                                {/* VAR */}
                                                {(match?.officials?.varReferees?.[0] || match?.varReferee) && (
                                                    <OfficialItem label="VAR" name={match.officials?.varReferees?.[0] || match.varReferee} highlight />
                                                )}

                                                {/* AVARs */}
                                                {match?.officials?.varReferees && match.officials.varReferees.length > 1 ? (
                                                    match.officials.varReferees.slice(1).map((avar, i) => (
                                                        <OfficialItem key={`avar-${i}`} label={match.officials!.varReferees.length > 2 ? `AVAR ${i + 1}` : "AVAR"} name={avar} />
                                                    ))
                                                ) : (
                                                    match?.officials?.avarReferees?.map((avar, i) => (
                                                        <OfficialItem key={`avar-${i}`} label={match.officials!.avarReferees!.length > 1 ? `AVAR ${i + 1}` : "AVAR"} name={avar} />
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. GÖZLEMCİLER */}
                                    {match?.officials?.observers && match.officials.observers.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2 border-b border-border/50 pb-1">Gözlemciler</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {match.officials.observers.map((obs, i) => (
                                                    <OfficialItem key={`obs-${i}`} label={`Gözlemci ${match.officials!.observers.length > 1 ? i + 1 : ''}`} name={obs} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. TEMSİLCİLER */}
                                    {match?.officials?.representatives && match.officials.representatives.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 border-b border-border/50 pb-1">Temsilciler</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {match.officials.representatives.map((rep, i) => (
                                                    <OfficialItem key={`rep-${i}`} label={`Temsilci ${match.officials!.representatives.length > 1 ? i + 1 : ''}`} name={rep} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

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
                                        const hPercent = total > 0 ? (hVal / total) * 100 : 50;

                                        if (hVal === 0 && aVal === 0) return null;

                                        return (
                                            <div key={stat.key} className="text-xs">
                                                <div className="flex justify-between items-end mb-1 font-mono font-bold">
                                                    <span className="text-lg text-gray-600 dark:text-gray-300">{hVal}{stat.suffix}</span>
                                                    <span className="text-[9px] text-muted-foreground font-sans uppercase tracking-tight mb-1">{stat.label}</span>
                                                    <span className="text-lg text-gray-600 dark:text-gray-300">{aVal}{stat.suffix}</span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-1.5 flex overflow-hidden">
                                                    <div className="h-full transition-all duration-500 bg-gray-500 dark:bg-gray-400" style={{ width: `${hPercent}%` }}></div>
                                                    <div className="h-full transition-all duration-500 bg-gray-300 dark:bg-gray-600" style={{ width: `${100 - hPercent}%` }}></div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'lineups' && match?.lineups && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Home Team Lineup */}
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

                            {/* Away Team Lineup */}
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

                {/* INCIDENTS (Full Width - Always Visible) */}
                <div className="space-y-4">
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

                                <div className="flex gap-2 p-1">
                                    {/* Minute */}
                                    <div className="shrink-0 flex items-center pl-2">
                                        <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center font-black text-sm shadow-md">
                                            {inc.minute}'
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <TrioGrid
                                            opinions={inc.opinions.filter(o => o.type === 'trio' || !o.type)}
                                            description={inc.description}
                                            minute={inc.minute}
                                            videoUrl={inc.videoUrl}
                                            refereeDecision={inc.refereeDecision}
                                            varDecision={inc.varDecision}
                                            finalDecision={inc.finalDecision}
                                        />
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
    if (impact === 'cancelled_goal') return 'text-slate-600 border-slate-200 bg-slate-100 dark:bg-slate-800';
    return 'text-muted-foreground border-border bg-muted/30';
}

function getImpactLabel(impact: string) {
    const map: Record<string, string> = {
        'penalty': 'Penaltı',
        'red_card': 'Kırmızı Kart',
        'goal': 'Gol',
        'cancelled_goal': 'İptal Gol',
        'none': 'Diğer',
        'unknown': 'Belirsiz'
    };
    return map[impact] || impact;
}

function CommentItem({ opinion, shortOpinion, criticName, judgment }: { opinion: string, shortOpinion?: string, criticName: string, judgment: string }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = opinion.length > 180;

    return (
        <div className="text-xs">
            <div className="flex justify-between items-baseline mb-0.5">
                <span className="font-bold text-foreground">{criticName}</span>
                <Badge judgment={judgment} />
            </div>

            {/* Short Opinion (Summary) */}
            {shortOpinion && (
                <div className="font-bold text-foreground/90 mb-1 border-l-2 border-primary/50 pl-2">
                    {shortOpinion}
                </div>
            )}

            {/* Long Opinion */}
            <p className="text-muted-foreground">
                {expanded ? opinion : isLong ? opinion.slice(0, 180) + '...' : opinion}
            </p>
            {isLong && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-600 mt-1 focus:outline-none"
                >
                    {expanded ? 'Daha Az Gör' : 'Devamını Gör'}
                </button>
            )}
        </div>
    );
}

function TrioGrid({ opinions, description, minute, videoUrl, refereeDecision, varDecision, finalDecision }: {
    opinions: Opinion[],
    description: string,
    minute: number,
    videoUrl?: string,
    refereeDecision?: string,
    varDecision?: string,
    finalDecision?: string
}) {
    // Expected Critics Order
    const critics = ['Bülent Yıldırım', 'Deniz Çoban', 'Bahattin Duran'];

    return (
        <div className="rounded-xl overflow-hidden shadow-sm flex bg-[#1e1e1e] border border-border/20">
            {/* Left Sidebar (Branding + Video) */}
            <div className="bg-[#C2040E] w-14 md:w-20 shrink-0 flex flex-col items-center justify-center p-2 text-white relative">
                <span className="font-black text-[10px] md:text-sm tracking-tighter">TRIO</span>

                {videoUrl && (
                    <>
                        {/* Separator Line */}
                        <div className="w-6 h-px bg-white/30 my-2 rounded-full"></div>

                        {/* Video Button */}
                        <a
                            href={videoUrl}
                            target="_blank"
                            className="flex flex-col items-center group cursor-pointer text-white/80 hover:text-white transition-all transform hover:scale-105"
                            title="Pozisyonu İzle"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-8 md:h-8 mb-0.5">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.113A1.125 1.125 0 0 1 9 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113Z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[7px] md:text-[8px] font-bold uppercase">İzle</span>
                        </a>
                    </>
                )}
            </div>

            {/* Right Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Red Header Bar (Description) */}
                <div className="bg-[#E30613] text-white flex items-center h-10 px-3 overflow-hidden">
                    <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-[10px] md:text-xs font-bold truncate mr-2 leading-tight py-1">{description || 'Pozisyon Değerlendirmesi'}</span>
                        <span className="text-xs font-black opacity-90">{minute}'</span>
                    </div>
                </div>

                {/* Info Bar (Referee & VAR) */}
                <div className="bg-[#2a2a2a] border-b border-gray-700 px-3 py-1.5 flex justify-between gap-4">
                    <div className="flex-1 text-center border-r border-gray-600 last:border-0 pr-2">
                        <span className="block text-[8px] text-gray-400 font-bold uppercase mb-0.5">HAKEM</span>
                        <span className="block text-[10px] text-gray-100 font-bold leading-none truncate">{refereeDecision || '-'}</span>
                    </div>
                    {varDecision && (
                        <div className="flex-1 text-center pl-2">
                            <span className="block text-[8px] text-blue-400 font-bold uppercase mb-0.5">VAR</span>
                            <span className="block text-[10px] text-blue-100 font-bold leading-none truncate">{varDecision}</span>
                        </div>
                    )}
                </div>

                {/* Dark Body Bar (Trio Critics) */}
                <div className="bg-[#1e1e1e] p-2 flex-1 flex flex-col justify-center">
                    <div className="grid grid-cols-3 divide-x divide-gray-700">
                        {critics.map(name => {
                            // Find opinion for this critic (loose match)
                            const op = opinions.find(o => o.criticName.toLowerCase().includes(name.toLowerCase().split(' ')[0].toLowerCase()));

                            return (
                                <TrioOpinion key={name} name={name} op={op} />
                            );
                        })}
                    </div>
                </div>

                {/* Footer (Final Decision) */}
                {finalDecision && (
                    <div className="bg-[#121212] border-t border-gray-700 px-3 py-2">
                        <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[9px] font-black text-[#8CC63F] uppercase tracking-wide">NİHAİ KARAR:</span>
                            <span className="text-[10px] font-bold text-gray-200 uppercase truncate leading-tight">{finalDecision}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TrioOpinion({ name, op }: { name: string, op?: Opinion }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = op?.opinion && op.opinion.length > 120;

    return (
        <div className="flex flex-col items-center justify-start text-center px-2 py-1 min-h-[80px]">
            <span className="text-[9px] text-gray-400 font-bold mb-2 uppercase tracking-wider truncate w-full">
                {name.split(' ')[0]} <span className="hidden md:inline">{name.split(' ')[1]}</span>
            </span>
            {op ? (
                <>
                    <TrioIcon judgment={op.judgment} />

                    {/* Short Summary (Top) */}
                    {op.shortOpinion && (
                        <div className="mt-2 mb-1 text-[10px] text-white font-bold leading-tight">
                            {op.shortOpinion}
                        </div>
                    )}

                    {/* Long Opinion (Bottom) */}
                    {op.opinion && (
                        <div className="w-full relative">
                            <div className={`text-[9px] text-gray-400 leading-snug font-medium opacity-90 transition-all ${expanded ? '' : 'line-clamp-4'} ${!op.shortOpinion ? 'mt-2' : ''}`}>
                                "{op.opinion}"
                            </div>
                            {isLong && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setExpanded(!expanded);
                                    }}
                                    className="text-[9px] font-bold text-blue-400 hover:text-blue-300 mt-1 focus:outline-none flex items-center justify-center mx-auto w-full pt-1"
                                >
                                    {expanded ? 'Kapat' : 'Devamını Gör'}
                                </button>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <span className="text-gray-600 text-[10px]">-</span>
            )}
        </div>
    );
}

function TrioIcon({ judgment }: { judgment: string }) {
    if (judgment === 'correct') {
        return (
            <svg className="w-6 h-6 text-[#8CC63F]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    if (judgment === 'incorrect') {
        return (
            <svg className="w-6 h-6 text-[#E30613]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    // Controversial / Other
    return (
        <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 17.01L12.01 16.9989" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

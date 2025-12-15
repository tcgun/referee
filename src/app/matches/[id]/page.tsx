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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Maç Verileri Yükleniyor...</span>
            </div>
        </div>
    );
    if (!match) return <div className="p-12 text-center text-red-500 font-bold bg-red-50 rounded-xl m-8 border border-red-100">Maç bulunamadı.</div>;

    const homeColors = getTeamColors(match.homeTeamId);
    const awayColors = getTeamColors(match.awayTeamId);

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* New Premium Header */}
            <div className="relative bg-slate-900 text-white overflow-hidden pb-8 pt-6 shadow-xl">
                {/* Decorative background elements */}
                <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-slate-800 to-transparent opacity-50 pointer-events-none"></div>
                <div className="absolute -left-20 top-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-4xl mx-auto px-4 relative z-10">
                    <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-6 transition-colors group">
                        <span className="group-hover:-translate-x-1 transition-transform mr-1">&larr;</span> Ana Sayfa
                    </Link>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                        {/* Home Team */}
                        <div className="flex-1 text-center md:text-right order-2 md:order-1">
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-1" style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}>{match.homeTeamName}</h2>
                            {/* Placeholder for visuals if needed */}
                        </div>

                        {/* Scoreboard */}
                        <div className="shrink-0 flex flex-col items-center order-1 md:order-2 bg-slate-800/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                            <div className="text-4xl md:text-5xl font-black text-white px-6 py-2 tracking-widest leading-none font-mono">
                                {match.score || '0-0'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-3 py-1 bg-slate-900/50 rounded-full border border-white/5">
                                {match.stadium}
                            </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 text-center md:text-left order-3">
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-1">{match.awayTeamName}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border mb-8">
                <div className="max-w-4xl mx-auto px-4 flex justify-center">
                    <div className="flex gap-2 p-2">
                        {['summary', 'lineups', 'pfdk'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${activeTab === tab
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                                        : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
                                    }`}
                            >
                                {tab === 'summary' ? 'Maç Merkezi' : tab === 'lineups' ? 'Kadrolar' : 'PFDK'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-5xl mx-auto px-4 md:px-8">

                {/* SUMMARY TAB */}
                {activeTab === 'summary' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Left Column: Stats & Info (4 cols) */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Simple Stats Card */}
                            {match.stats && (
                                <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
                                    <div className="bg-slate-50/50 px-4 py-3 border-b border-border">
                                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">İstatistikler</h3>
                                    </div>
                                    <div className="p-5 space-y-5">
                                        {/* Possession Bar */}
                                        <div>
                                            <div className="flex justify-between items-end mb-2 text-sm font-bold">
                                                <span style={{ color: homeColors.primary }}>%{match.stats.homePossession}</span>
                                                <span className="text-[10px] text-muted-foreground font-normal uppercase">Topla Oynama</span>
                                                <span style={{ color: awayColors.primary }}>%{match.stats.awayPossession}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
                                                <div className="h-full" style={{ width: `${match.stats.homePossession}%`, backgroundColor: homeColors.primary }}></div>
                                                <div className="h-full" style={{ width: `${match.stats.awayPossession}%`, backgroundColor: awayColors.primary }}></div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <StatRow label="Şut" home={match.stats.homeShots} away={match.stats.awayShots} />
                                            <StatRow label="İsabetli Şut" home={match.stats.homeShotsOnTarget} away={match.stats.awayShotsOnTarget} />
                                            <StatRow label="Faul" home={match.stats.homeFouls} away={match.stats.awayFouls} />
                                            <StatRow label="Sarı Kart" home={match.stats.homeYellowCards} away={match.stats.awayYellowCards} isCard />
                                            <StatRow label="Kırmızı Kart" home={match.stats.homeRedCards} away={match.stats.awayRedCards} isCard />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Officials Card */}
                            {match.officials && (
                                <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border overflow-hidden">
                                    <div className="bg-slate-50/50 px-4 py-3 border-b border-border">
                                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Hakem Ekibi</h3>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shadow-sm">🏁</div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">Orta Hakem</p>
                                                <p className="font-bold text-sm">{match.referee || match.officials.referees[0]}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-lg shadow-sm">📺</div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-600/70 uppercase">VAR Hakemi</p>
                                                <p className="font-bold text-sm text-foreground">{match.varReferee || match.officials.varReferees[0]}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Timeline (8 cols) */}
                        <div className="lg:col-span-8 space-y-8">
                            {incidents.length === 0 && (
                                <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
                                    <p className="text-muted-foreground">Henüz kritik pozisyon girilmemiş.</p>
                                </div>
                            )}

                            {incidents.map((inc, index) => (
                                <div key={inc.id} className="relative pl-8 md:pl-0 group">
                                    {/* Center Line for Desktop */}
                                    <div className="hidden md:block absolute left-10 top-0 bottom-0 w-px bg-slate-200 group-last:bottom-auto group-last:h-full"></div>

                                    <div className="flex flex-col md:flex-row gap-6 relative">
                                        {/* Minute Badge */}
                                        <div className="absolute -left-3 md:static md:w-20 md:shrink-0 flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-lg border-4 border-white z-10 relative">
                                                {inc.minute}'
                                            </div>
                                        </div>

                                        {/* Content Card */}
                                        <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                            {/* Header */}
                                            <div className="p-5 border-b border-border bg-slate-50/30">
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider ${getImpactColor(inc.impact)}`}>
                                                        {inc.impact.replace('_', ' ')}
                                                    </span>
                                                    {inc.videoUrl && (
                                                        <a href={inc.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                                                            <span>▶</span> Video
                                                        </a>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-bold text-foreground leading-tight">{inc.description}</h3>

                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    <div className="px-3 py-2 rounded bg-white border border-border shadow-sm">
                                                        <span className="block text-[10px] font-bold text-muted-foreground uppercase">Hakem</span>
                                                        <span className="font-semibold text-sm">{inc.refereeDecision}</span>
                                                    </div>
                                                    {inc.varDecision && (
                                                        <div className="px-3 py-2 rounded bg-blue-50 border border-blue-100 shadow-sm">
                                                            <span className="block text-[10px] font-bold text-blue-600/70 uppercase">VAR</span>
                                                            <span className="font-semibold text-sm text-blue-900">{inc.varDecision}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Opinions */}
                                            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                                                <div className="p-5 bg-gradient-to-b from-white to-slate-50/50">
                                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Trio Yorumları
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {inc.opinions.filter(o => o.type === 'trio' || !o.type).map(op => (
                                                            <div key={op.id} className="text-sm">
                                                                <div className="flex justify-between items-baseline mb-1">
                                                                    <span className="font-bold text-slate-800">{op.criticName}</span>
                                                                    <Badge judgment={op.judgment} />
                                                                </div>
                                                                <p className="text-muted-foreground leading-relaxed">"{op.opinion}"</p>
                                                            </div>
                                                        ))}
                                                        {inc.opinions.filter(o => o.type === 'trio' || !o.type).length === 0 && <span className="text-xs text-muted-foreground italic">Yorum yok.</span>}
                                                    </div>
                                                </div>
                                                <div className="p-5 bg-gradient-to-b from-white to-slate-50/50">
                                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Diğer
                                                    </h4>
                                                    <div className="space-y-4">
                                                        {inc.opinions.filter(o => o.type === 'general').map(op => (
                                                            <div key={op.id} className="text-sm">
                                                                <div className="font-bold text-slate-800 mb-1">{op.criticName}</div>
                                                                <p className="text-muted-foreground leading-relaxed">"{op.opinion}"</p>
                                                            </div>
                                                        ))}
                                                        {inc.opinions.filter(o => o.type === 'general').length === 0 && <span className="text-xs text-muted-foreground italic">Yorum yok.</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* LINEUPS TAB */}
                {activeTab === 'lineups' && match.lineups && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid md:grid-cols-2 gap-8">
                            <TeamLineupCard teamName={match.homeTeamName} color={homeColors.primary} players={match.lineups.home} subs={match.lineups.homeSubs} coach={match.lineups.homeCoach} />
                            <TeamLineupCard teamName={match.awayTeamName} color={awayColors.primary} players={match.lineups.away} subs={match.lineups.awaySubs} coach={match.lineups.awayCoach} isAway />
                        </div>
                    </div>
                )}

                {/* PFDK TAB */}
                {activeTab === 'pfdk' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl mx-auto">
                        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                            {disciplinary.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground">Bu maça ait PFDK sevki bulunmamaktadır.</div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {disciplinary.map(act => (
                                        <div key={act.id} className="p-6 hover:bg-slate-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-foreground">{act.subject}</h4>
                                                <span className="text-xs font-mono text-muted-foreground">{act.date}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 bg-slate-100 inline-block px-2 py-1 rounded">{act.teamName}</div>
                                            <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-lg border border-border shadow-sm italic">
                                                "{act.reason}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Sub-components
function Badge({ judgment }: { judgment: string }) {
    const colors = {
        correct: 'bg-green-100 text-green-700',
        incorrect: 'bg-red-100 text-red-700',
        controversial: 'bg-orange-100 text-orange-700',
        default: 'bg-slate-100 text-slate-700'
    };
    const c = (colors as any)[judgment] || colors.default;
    return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${c}`}>{judgment}</span>;
}

function StatRow({ label, home, away, isCard }: { label: string, home: number, away: number, isCard?: boolean }) {
    if (home === undefined || away === undefined) return null;
    return (
        <div className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0 hover:bg-slate-50 transition-colors px-2 rounded-sm group">
            <span className={`font-bold w-6 text-center group-hover:scale-110 transition-transform ${isCard && label.includes('Kırmızı') ? 'text-red-500' : isCard && label.includes('Sarı') ? 'text-yellow-500' : 'text-foreground'}`}>{home}</span>
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <span className={`font-bold w-6 text-center group-hover:scale-110 transition-transform ${isCard && label.includes('Kırmızı') ? 'text-red-500' : isCard && label.includes('Sarı') ? 'text-yellow-500' : 'text-foreground'}`}>{away}</span>
        </div>
    );
}

function getImpactColor(impact: string) {
    switch (impact) {
        case 'penalty': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        case 'red_card': return 'bg-red-100 text-red-800 border border-red-200';
        case 'goal': return 'bg-green-100 text-green-800 border border-green-200';
        default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
}

interface TeamLineupCardProps {
    teamName: string;
    color: string;
    players: Player[];
    subs: Player[];
    coach: string;
    isAway: boolean;
}

const TeamLineupCard = ({ teamName, color, players, subs, coach, isAway }: TeamLineupCardProps) => (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className={`p-4 border-b border-border bg-slate-50/50 flex items-center gap-3 ${isAway ? 'justify-end' : ''}`}>
            {!isAway && <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color }}></div>}
            <h3 className="font-bold text-lg text-foreground">{teamName}</h3>
            {isAway && <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color }}></div>}
        </div>
        <div className="p-6">
            <div className="mb-6">
                <h4 className={`text-xs font-bold text-muted-foreground uppercase mb-3 tracking-wider ${isAway ? 'text-right' : ''}`}>İlk 11</h4>
                <div className="space-y-2">
                    {players.map((p: Player, i: number) => (
                        <div key={i} className={`flex items-center gap-4 p-2 hover:bg-slate-50 rounded transition-colors border-b border-border last:border-0 ${isAway ? 'flex-row-reverse' : ''}`}>
                            <span className="font-mono font-bold text-slate-400 w-6 text-lg text-center">{p.number}</span>
                            <span className="font-bold text-foreground text-sm">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            {subs.length > 0 && (
                <div>
                    <h4 className={`text-xs font-bold text-muted-foreground uppercase mb-3 tracking-wider ${isAway ? 'text-right' : ''}`}>Yedekler</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {subs.map((p: Player, i: number) => (
                            <div key={i} className={`flex items-center gap-2 p-1 ${isAway ? 'flex-row-reverse' : ''}`}>
                                <span className="font-mono font-bold text-slate-300 text-xs w-5 text-center">{p.number}</span>
                                <span className={`text-xs text-slate-500 truncate ${isAway ? 'text-right' : ''}`}>{p.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {coach && (
                <div className={`mt-6 pt-4 border-t border-border flex justify-between items-center ${isAway ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Teknik Direktör</span>
                    <span className="font-bold text-sm text-foreground">{coach}</span>
                </div>
            )}
        </div>
    </div>
);

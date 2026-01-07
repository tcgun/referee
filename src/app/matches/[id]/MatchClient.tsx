"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Match, Incident, Opinion, DisciplinaryAction } from '@/types';
import { useSearchParams, useParams } from 'next/navigation';
import { getTeamColors } from '@/lib/teams';
import { Skeleton } from '@/components/ui/Skeleton';

interface IncidentWithOpinions extends Incident {
    opinions: Opinion[];
}

export default function MatchClient() {
    const params = useParams();
    const searchParams = useSearchParams();
    const matchId = params.id as string;
    const [match, setMatch] = useState<Match | null>(null);
    const [incidents, setIncidents] = useState<IncidentWithOpinions[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'summary' | 'lineups' | 'pfdk' | 'performance' | null>(() => {
        const tab = searchParams.get('tab');
        return (tab === 'pfdk' || tab === 'performance' || tab === 'lineups' || tab === 'summary') ? tab : null;
    });

    const homeTeam = match ? { colors: getTeamColors(match.homeTeamId) } : null;
    const awayTeam = match ? { colors: getTeamColors(match.awayTeamId) } : null;

    const [disciplinary, setDisciplinary] = useState<DisciplinaryAction[]>([]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab]);

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

                const parseMinute = (min: number | string): number => {
                    if (typeof min === 'number') return min;
                    if (typeof min === 'string' && min.includes('+')) {
                        const [base, extra] = min.split('+').map(Number);
                        return base + (extra / 100);
                    }
                    return parseFloat(min as string) || 0;
                };

                incidentsList.sort((a, b) => parseMinute(a.minute) - parseMinute(b.minute));
                setIncidents(incidentsList);

                const pfdkQ = query(collection(db, 'disciplinary_actions'), where('matchId', '==', matchId));
                const pfdkSnap = await getDocs(pfdkQ);
                const relevantActions = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));
                setDisciplinary(relevantActions.filter(d => d.type !== 'performance'));

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [matchId]);

    if (loading) return (
        <div className="min-h-screen bg-background pb-12">
            <div className="bg-card border-b border-border shadow-sm mb-6 pt-4">
                <div className="max-w-7xl mx-auto px-4 pb-6">
                    <div className="flex items-center justify-between gap-4">
                        <Skeleton className="h-10 flex-1" />
                        <div className="flex flex-col items-center gap-2">
                            <Skeleton className="h-12 w-24" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-10 flex-1" />
                    </div>
                    <div className="flex gap-1 mt-6">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 flex-1 rounded-lg" />)}
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-card border border-border rounded-xl p-4 flex gap-4">
                        <Skeleton className="w-20 h-full" />
                        <div className="flex-1 space-y-4">
                            <Skeleton className="h-6 w-1/4" />
                            <div className="grid grid-cols-3 gap-4">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    if (!match) return <div className="p-8 text-center text-red-500 font-bold">Maç bulunamadı.</div>;

    const homeColors = getTeamColors(match.homeTeamId);
    const awayColors = getTeamColors(match.awayTeamId);

    return (
        <div className="min-h-screen bg-background pb-12">
            <div className="bg-card border-b border-border shadow-sm mb-6 pt-4">
                <div className="max-w-7xl mx-auto px-4 pb-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-4">
                        <div className="w-full md:flex-1 text-center md:text-right order-1 md:order-1">
                            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground leading-none break-words">
                                {match.homeTeamName}
                            </h1>
                        </div>
                        <div className="flex flex-col items-center shrink-0 mx-0 md:mx-2 order-2 md:order-2 my-2 md:my-0">
                            <div className="text-4xl md:text-6xl font-black font-mono tracking-tighter text-foreground px-4 py-1">
                                {match.score || '0-0'}
                            </div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded mb-1">
                                {match.date ? new Date(match.date).toLocaleString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }) : '-'}
                            </div>
                            {match.stadium && (
                                <div className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-muted-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4 8 4v14" /></svg>
                                    {match.stadium}
                                </div>
                            )}
                        </div>
                        <div className="w-full md:flex-1 text-center md:text-left order-3 md:order-3">
                            <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground leading-none break-words">
                                {match.awayTeamName}
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-0.5 bg-muted/30 p-0.5 rounded-lg w-full mt-4 md:mt-6 justify-between md:justify-center">
                        {['summary', 'lineups', 'pfdk', 'performance'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(activeTab === tab ? null : tab as any)}
                                className={`flex-1 py-1.5 rounded text-[7px] md:text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap text-center ${activeTab === tab ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
                            >
                                {tab === 'summary' ? 'İSTATİSTİK' : tab === 'lineups' ? 'KADRO' : tab === 'pfdk' ? 'PFDK' : 'HAKEM PERFORMANSI'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 space-y-6">
                <div className="w-full">
                    {activeTab === 'summary' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm h-fit">
                                <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">HAKEM KADROSU</h3>
                                    <div className="text-[9px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">OFFICIALS</div>
                                </div>
                                <div className="divide-y divide-border/50">
                                    <OfficialItem role="HAKEM" name={match.referee || match.officials?.referees?.[0]} />
                                    {(match.officials?.assistants?.length ? match.officials.assistants : match.officials?.referees?.slice(1, 3))?.map((asst, i) => (
                                        <OfficialItem key={`asst-${i}`} role={`YARDIMCI ${i + 1}`} name={asst} />
                                    ))}
                                    <OfficialItem role="4. HAKEM" name={match.officials?.fourthOfficial || match.officials?.referees?.[3]} />
                                    <OfficialItem role="VAR" name={match.varReferee || match.officials?.varReferees?.[0]} />
                                    {(match.officials?.avarReferees?.length ? match.officials.avarReferees : match.officials?.varReferees?.slice(1))?.map((avar, i) => (
                                        <OfficialItem key={`avar-${i}`} role="AVAR" name={avar} />
                                    ))}
                                    {match.officials?.observers?.map((obs, i) => (
                                        <OfficialItem key={`obs-${i}`} role="GÖZLEMCİ" name={obs} />
                                    ))}
                                    {match.officials?.representatives?.map((rep, i) => (
                                        <OfficialItem key={`rep-${i}`} role="TEMSİLCİ" name={rep} />
                                    ))}
                                </div>
                            </div>

                            {match.stats && (
                                <div className="space-y-4">
                                    <div className="bg-card border border-border rounded-xl p-4">
                                        <h3 className="text-xs font-bold text-center mb-4 uppercase text-foreground">Maç İstatistikleri</h3>
                                        <div className="space-y-3">
                                            <StatBar label="Topla Oynama" home={match.stats.homePossession || 50} away={match.stats.awayPossession || 50} homeColor={homeColors?.primary} awayColor={awayColors?.primary} suffix="%" />
                                            <StatBar label="Toplam Şut" home={match.stats.homeShots || 0} away={match.stats.awayShots || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="İsabetli Şut" home={match.stats.homeShotsOnTarget || 0} away={match.stats.awayShotsOnTarget || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="Net Gol Şansı" home={match.stats.homeBigChances || 0} away={match.stats.awayBigChances || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="Köşe Vuruşu" home={match.stats.homeCorners || 0} away={match.stats.awayCorners || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="Ofsayt" home={match.stats.homeOffsides || 0} away={match.stats.awayOffsides || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="Kurtarış" home={match.stats.homeSaves || 0} away={match.stats.awaySaves || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="Faul" home={match.stats.homeFouls || 0} away={match.stats.awayFouls || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="Sarı Kart" home={match.stats.homeYellowCards || 0} away={match.stats.awayYellowCards || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                            <StatBar label="Kırmızı Kart" home={match.stats.homeRedCards || 0} away={match.stats.awayRedCards || 0} homeColor={homeColors?.primary} awayColor={awayColors?.primary} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'lineups' && match?.lineups && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-card border border-border rounded-xl p-4">
                                <h3 className="text-sm font-bold text-center mb-4 uppercase text-foreground">Ev Sahibi</h3>
                                <div className="space-y-1">
                                    {match.lineups.home?.map((player, i) => (
                                        <div key={i} className="flex gap-2 text-xs py-1 border-b border-border/50">
                                            <span className="font-mono text-muted-foreground px-1">{player.number}</span>
                                            <span className="font-bold">{player.name}</span>
                                        </div>
                                    ))}
                                    {match.lineups.homeSubs && match.lineups.homeSubs.length > 0 && (
                                        <>
                                            <div className="mt-4 mb-2 text-xs font-black text-muted-foreground uppercase text-center border-b border-border/30 pb-1">Yedekler</div>
                                            {match.lineups.homeSubs.map((player, i) => (
                                                <div key={`sub-${i}`} className="flex gap-2 text-xs py-1 border-b border-border/50 text-muted-foreground">
                                                    <span className="font-mono px-1">{player.number}</span>
                                                    <span>{player.name}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {match.lineups.homeCoach && (
                                        <div className="mt-4 pt-4 border-t border-border/20 text-center">
                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TEKNİK DİREKTÖR</div>
                                            <div className="text-sm font-bold text-foreground uppercase">{match.lineups.homeCoach}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-card border border-border rounded-xl p-4">
                                <h3 className="text-sm font-bold text-center mb-4 uppercase text-foreground">Deplasman</h3>
                                <div className="space-y-1">
                                    {match.lineups.away?.map((player, i) => (
                                        <div key={i} className="flex gap-2 text-xs py-1 border-b border-border/50">
                                            <span className="font-mono text-muted-foreground px-1">{player.number}</span>
                                            <span className="font-bold">{player.name}</span>
                                        </div>
                                    ))}
                                    {match.lineups.awaySubs && match.lineups.awaySubs.length > 0 && (
                                        <>
                                            <div className="mt-4 mb-2 text-xs font-black text-muted-foreground uppercase text-center border-b border-border/30 pb-1">Yedekler</div>
                                            {match.lineups.awaySubs.map((player, i) => (
                                                <div key={`sub-${i}`} className="flex gap-2 text-xs py-1 border-b border-border/50 text-muted-foreground">
                                                    <span className="font-mono px-1">{player.number}</span>
                                                    <span>{player.name}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {match.lineups.awayCoach && (
                                        <div className="mt-4 pt-4 border-t border-border/20 text-center">
                                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TEKNİK DİREKTÖR</div>
                                            <div className="text-sm font-bold text-foreground uppercase">{match.lineups.awayCoach}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pfdk' && (
                        <div className="space-y-4">
                            {disciplinary.length === 0 ? (
                                <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border">
                                    <span className="text-muted-foreground text-sm font-medium">Bu maç için PFDK kararı bulunmuyor.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {disciplinary.map((action) => (
                                        <div key={action.id} className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col gap-4 items-start">
                                            <div className="w-full">
                                                <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${action.teamName ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700'}`}>
                                                        {action.teamName || 'Genel'}
                                                    </span>
                                                    <h4 className="font-bold text-sm text-foreground">{action.subject}</h4>
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">"{action.reason}"</p>
                                                {action.penalty && (
                                                    <div className="bg-red-50/50 dark:bg-red-900/10 border-l-4 border-red-500 pl-4 py-2 rounded-r-lg">
                                                        <ul className="space-y-2">
                                                            {action.penalty.replace(/ - /g, '\n').split('\n').map((item, idx) => {
                                                                let cleanItem = item.trim().replace(/^- /, '').replace(/^((PARA )?CEZA(SI)?:\s*)/i, '').replace(/(\d{1,3}(\.\d{3})*)(\.|.-)\s*TL/gi, '$1 TL').replace(/\s+PARA CEZASI/gi, '');
                                                                if (!cleanItem) return null;
                                                                return (
                                                                    <li key={idx} className="text-xs font-bold text-red-700 dark:text-red-400 flex items-start gap-2">
                                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                                                        <span className="uppercase leading-normal">{cleanItem}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="space-y-6">
                            {match.refereeStats && (
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-lg overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                        <svg className="w-24 h-24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
                                    </div>
                                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                                        <div>
                                            <h3 className="font-black text-lg tracking-tight">HAKEM PERFORMANS KARTI</h3>
                                            <div className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">MATCH REFEREE REPORT</div>
                                        </div>
                                        <div className="text-3xl font-black font-mono tracking-tighter bg-white/10 px-3 py-1 rounded">
                                            {(10 - (match.refereeStats.incorrectDecisions * 0.5)).toFixed(1)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-white/5 rounded p-3 text-center border border-white/10">
                                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">OYUN SÜRESİ</div>
                                            <div className="text-xl font-mono font-bold">{match.refereeStats.ballInPlayTime}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-3 text-center border border-white/10">
                                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">FAUL</div>
                                            <div className="text-xl font-mono font-bold">{match.refereeStats.fouls}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-3 text-center border border-white/10">
                                            <div className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-1">SARI KART</div>
                                            <div className="text-xl font-mono font-bold text-yellow-400">{match.refereeStats.yellowCards}</div>
                                        </div>
                                        <div className="bg-white/5 rounded p-3 text-center border border-white/10">
                                            <div className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">KIRMIZI KART</div>
                                            <div className="text-xl font-mono font-bold text-red-500">{match.refereeStats.redCards}</div>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                                        <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">HATA ANALİZİ</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase">EV SAHİBİ LEHİNE</span>
                                                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">{match.refereeStats.errorsFavoringHome} HATA</span>
                                                </div>
                                                {match.refereeStats.homeErrors?.length ? (
                                                    <ul className="space-y-1.5">
                                                        {match.refereeStats.homeErrors.map((err, i) => (
                                                            <li key={i} className="text-[10px] text-gray-300 bg-white/5 px-2 py-1.5 rounded border-l-2 border-red-500/50 flex items-start gap-2">
                                                                <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                                                                <span>{err.toLocaleUpperCase('tr-TR')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <div className="text-[10px] text-gray-600 italic">Kayıt bulunmuyor.</div>}
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase">DEPLASMAN LEHİNE</span>
                                                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">{match.refereeStats.errorsFavoringAway} HATA</span>
                                                </div>
                                                {match.refereeStats.awayErrors?.length ? (
                                                    <ul className="space-y-1.5">
                                                        {match.refereeStats.awayErrors.map((err, i) => (
                                                            <li key={i} className="text-[10px] text-gray-300 bg-white/5 px-2 py-1.5 rounded border-l-2 border-red-500/50 flex items-start gap-2">
                                                                <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                                                                <span>{err.toLocaleUpperCase('tr-TR')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <div className="text-[10px] text-gray-600 italic">Kayıt bulunmuyor.</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {match.refereeStats?.performanceNotes?.map((note, i) => (
                                <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                    <h4 className="font-black text-sm text-foreground uppercase tracking-tight mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>MAÇ NOTLARI
                                    </h4>
                                    <p className="text-xs text-foreground/90 font-medium leading-relaxed">{note.toLocaleUpperCase('tr-TR')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {incidents.map((incident) => (
                        <TrioGrid
                            key={incident.id}
                            minute={incident.minute}
                            description={incident.description}
                            videoUrl={incident.videoUrl}
                            opinions={incident.opinions || []}
                            refereeDecision={incident.refereeDecision}
                            varDecision={incident.varDecision}
                            varRecommendation={incident.varRecommendation}
                            finalDecision={incident.finalDecision}
                            correctDecision={incident.correctDecision}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function OfficialItem({ role, name, highlight }: { role: string, name?: string, highlight?: boolean }) {
    if (!name) return null;
    return (
        <div className="flex flex-col p-2">
            <span className={`text-[9px] font-bold uppercase ${highlight ? 'text-blue-500' : 'text-muted-foreground'}`}>{role}</span>
            <span className="text-xs font-bold text-foreground truncate">{name}</span>
        </div>
    )
}

function TrioGrid({ opinions, description, minute, videoUrl, refereeDecision, varDecision, varRecommendation, finalDecision, correctDecision }: {
    opinions: Opinion[], description: string, minute: number | string, videoUrl?: string, refereeDecision?: string, varDecision?: string, varRecommendation?: string, finalDecision?: string, correctDecision?: string
}) {
    const critics = ['Bülent Yıldırım', 'Deniz Çoban', 'Bahattin Duran'];
    const varRecMap: Record<string, string> = { 'review': 'İNCELEME ÖNERİSİ', 'none': 'İNCELEME ÖNERİSİ YOK', 'monitor_only': 'SADECE TAKİP' };

    return (
        <div className="rounded-xl overflow-hidden shadow-sm flex bg-card border border-border">
            <div className="bg-neutral-100 dark:bg-neutral-900/50 border-r border-border w-14 md:w-20 shrink-0 flex flex-col items-center justify-center p-2 relative">
                {varRecommendation === 'review' && <span className="font-black text-[8px] md:text-[9px] tracking-tight text-red-600 text-center leading-tight mb-1 border-b border-red-200 pb-1">VAR<br />MÜDAHALESİ</span>}
                <span className="font-black text-[10px] md:text-sm tracking-tighter text-neutral-400">TRIO</span>
                {videoUrl && (
                    <a href={videoUrl} target="_blank" className="mt-2 flex flex-col items-center text-red-600 hover:text-red-700 transition-all transform hover:scale-105">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-8 md:h-8 mb-0.5"><path d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm14.024-.983a1.125 1.125 0 0 1 0 1.966l-5.603 3.113A1.125 1.125 0 0 1 9 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113Z" /></svg>
                        <span className="text-[7px] md:text-[8px] font-bold uppercase">İzle</span>
                    </a>
                )}
            </div>
            <div className="flex-1 flex flex-col min-w-0">
                <div className="bg-transparent border-b border-border text-foreground flex items-center h-10 px-3 overflow-hidden">
                    <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-[10px] md:text-xs font-bold truncate mr-2">{description || 'Pozisyon Değerlendirmesi'}</span>
                        <span className="text-xs font-black opacity-50">{minute}'</span>
                    </div>
                </div>
                <div className="bg-muted/30 border-b border-border px-2 md:px-3 py-1.5 flex justify-between gap-1 md:gap-4">
                    <div className="flex-1 text-center border-r border-border pr-2">
                        <span className="block text-[7px] md:text-[8px] text-muted-foreground font-bold uppercase">HAKEM</span>
                        <span className="block text-[9px] md:text-[10px] text-foreground font-bold truncate">{refereeDecision || '-'}</span>
                    </div>
                    <div className="flex-1 text-center border-r border-border px-2">
                        <span className="block text-[7px] md:text-[8px] text-blue-600 font-bold uppercase">VAR</span>
                        <span className="block text-[9px] md:text-[10px] text-blue-700 font-bold truncate">{varRecommendation ? (varRecMap[varRecommendation] || varRecommendation) : '-'}</span>
                    </div>
                    <div className="flex-1 text-center pl-2">
                        <span className="block text-[7px] md:text-[8px] text-purple-600 font-bold uppercase">VAR SONUCU</span>
                        <span className="block text-[9px] md:text-[10px] text-purple-700 font-bold truncate">{varDecision || '-'}</span>
                    </div>
                </div>
                <div className="bg-card p-2 flex-1 grid grid-cols-1 md:grid-cols-3 divide-y divide-border md:divide-y-0 md:divide-x">
                    {critics.map(name => (
                        <TrioOpinion key={name} name={name} op={opinions.find(o => o.criticName.toLowerCase().includes(name.toLowerCase().split(' ')[0]))} />
                    ))}
                </div>
                {(finalDecision || correctDecision) && (
                    <div className="bg-muted/30 border-t border-border px-3 py-2 flex flex-col gap-1">
                        {finalDecision && <div className="flex items-center gap-2"><span className="text-[9px] font-black text-green-600 uppercase">NİHAİ:</span><span className="text-[10px] font-bold truncate">{finalDecision}</span></div>}
                        {correctDecision && <div className="flex items-center gap-2"><span className="text-[9px] font-black text-emerald-600 uppercase">OLMASI GEREKEN:</span><span className="text-[10px] font-bold truncate">{correctDecision}</span></div>}
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
        <div className="flex flex-col items-center text-center px-2 py-1 min-h-[80px]">
            <span className="text-[9px] text-muted-foreground font-bold mb-2 uppercase">{name}</span>
            {op ? (
                <>
                    <TrioIcon judgment={op.judgment} />
                    {op.shortOpinion && <div className="mt-2 mb-1 text-[10px] font-bold">{op.shortOpinion}</div>}
                    {op.opinion && (
                        <div className="w-full">
                            <div className={`text-[9px] text-muted-foreground leading-snug font-medium ${expanded ? '' : 'line-clamp-4'}`}>"{op.opinion}"</div>
                            {isLong && <button onClick={() => setExpanded(!expanded)} className="text-[9px] font-bold text-blue-400 mt-1">{expanded ? 'Kapat' : 'Devamını Gör'}</button>}
                        </div>
                    )}
                </>
            ) : <span className="text-muted-foreground text-[10px]">-</span>}
        </div>
    );
}

function TrioIcon({ judgment }: { judgment: string }) {
    if (judgment === 'correct') return <svg className="w-6 h-6 text-[#8CC63F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17L4 12" /></svg>;
    if (judgment === 'incorrect') return <svg className="w-6 h-6 text-[#E30613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6L18 18" /></svg>;
    return <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9V14M12 17.01L12.01 16.9989" /></svg>;
}

function StatBar({ label, home, away, homeColor, awayColor, suffix = '' }: { label: string, home: number | string, away: number | string, homeColor?: string, awayColor?: string, suffix?: string }) {
    const total = Number(home) + Number(away);
    const hPercent = total > 0 ? (Number(home) / total) * 100 : 50;
    const aPercent = total > 0 ? (Number(away) / total) * 100 : 50;
    return (
        <div className="text-xs">
            <div className="flex justify-between mb-1 font-bold"><span>{home}{suffix}</span><span className="text-muted-foreground uppercase text-[10px] tracking-widest">{label}</span><span>{away}{suffix}</span></div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted"><div style={{ width: `${hPercent}%`, backgroundColor: homeColor || '#3b82f6' }} /><div style={{ width: `${aPercent}%`, backgroundColor: awayColor || '#ef4444' }} /></div>
        </div>
    );
}

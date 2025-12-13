"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Match, Incident, Opinion, DisciplinaryAction } from '@/types';
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

    if (loading) return <div className="p-8 text-center text-gray-500">Maç verileri yükleniyor...</div>;
    if (!match) return <div className="p-8 text-center text-red-500">Maç bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Match Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link href="/" className="text-gray-400 hover:text-gray-600 text-[10px] mb-2 block">&larr; Geri</Link>

                    <div className="flex justify-center items-center gap-6 pb-2">
                        <div className="flex-1 text-right">
                            <h2 className="text-lg md:text-2xl font-bold truncate leading-none" style={{ color: getTeamColors(match.homeTeamId).primary }}>{match.homeTeamName}</h2>
                        </div>
                        <div className="shrink-0 flex flex-col items-center">
                            <div className="text-3xl font-black bg-gray-900 text-white px-4 py-1 rounded-md shadow-sm tracking-widest leading-none">{match.score || '0-0'}</div>
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">{match.stadium}</div>
                        </div>
                        <div className="flex-1 text-left">
                            <h2 className="text-lg md:text-2xl font-bold truncate leading-none" style={{ color: getTeamColors(match.awayTeamId).primary }}>{match.awayTeamName}</h2>
                        </div>
                    </div>

                    {/* Tabs - More Compact */}
                    <div className="flex gap-6 justify-center mt-1 border-t border-gray-100 pt-1">
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'summary' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Maç Merkezi
                        </button>
                        <button
                            onClick={() => setActiveTab('lineups')}
                            className={`py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'lineups' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            Kadrolar
                        </button>
                        <button
                            onClick={() => setActiveTab('pfdk')}
                            className={`py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'pfdk' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            PFDK Sevkleri
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Content */}
            <div className="max-w-7xl mx-auto mt-6 px-4">

                {/* SUMMARY TAB */}
                {activeTab === 'summary' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Left Column */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Stats */}
                            {match.stats && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wide">Maç İstatistikleri</h3>

                                    </div>
                                    <div className="p-5 space-y-5">
                                        {/* Possession */}
                                        <div>
                                            <div className="flex justify-between items-end mb-2">
                                                <div className="text-center">
                                                    <span className="block text-xl font-black" style={{ color: getTeamColors(match.homeTeamId).primary }}>%{match.stats.homePossession}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Top</span>
                                                </div>
                                                <div className="text-center">
                                                    <span className="block text-xl font-black" style={{ color: getTeamColors(match.awayTeamId).primary }}>%{match.stats.awayPossession}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Top</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 flex overflow-hidden">
                                                <div className="h-full" style={{ width: `${match.stats.homePossession}%`, backgroundColor: getTeamColors(match.homeTeamId).primary }}></div>
                                                <div className="h-full" style={{ width: `${match.stats.awayPossession}%`, backgroundColor: getTeamColors(match.awayTeamId).primary }}></div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <StatRow label="Şut" home={match.stats.homeShots} away={match.stats.awayShots} />
                                            <StatRow label="İsabetli Şut" home={match.stats.homeShotsOnTarget} away={match.stats.awayShotsOnTarget} />
                                            <StatRow label="Net Gol Şansı" home={match.stats.homeBigChances} away={match.stats.awayBigChances} />
                                            <StatRow label="Köşe Vuruşu" home={match.stats.homeCorners} away={match.stats.awayCorners} />
                                            <StatRow label="Ofsayt" home={match.stats.homeOffsides} away={match.stats.awayOffsides} />
                                            <StatRow label="Kurtarış" home={match.stats.homeSaves} away={match.stats.awaySaves} />
                                            <StatRow label="Faul" home={match.stats.homeFouls} away={match.stats.awayFouls} />
                                            <StatRow label="Sarı Kart" home={match.stats.homeYellowCards} away={match.stats.awayYellowCards} isCard />
                                            <StatRow label="Kırmızı Kart" home={match.stats.homeRedCards} away={match.stats.awayRedCards} isCard />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Officials Redesigned: Show ALL visible */}
                            {match.officials && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 text-center">
                                        <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wide">Maç Yetkilileri</h3>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {/* Main Referees */}
                                        <div className="p-3 grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">H</div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Hakem</p>
                                                    <p className="font-bold text-gray-800 text-xs truncate">{match.referee || match.officials.referees[0]}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-500">V</div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">VAR</p>
                                                    <p className="font-bold text-gray-800 text-xs truncate">{match.varReferee || match.officials.varReferees[0]}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Assistants */}
                                        {match.officials.referees.length > 1 && (
                                            <div className="p-3">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Yardımcı Hakemler</p>
                                                <div className="space-y-1">
                                                    {match.officials.referees.slice(1).map((r, i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500">{i === 2 ? '4. Hakem' : `${i + 1}. Yrd`}</span>
                                                            <span className="font-medium text-gray-700">{r}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* AVAR */}
                                        {match.officials.varReferees.length > 1 && (
                                            <div className="p-3">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">VAR Ekibi (AVAR)</p>
                                                <div className="space-y-1">
                                                    {match.officials.varReferees.slice(1).map((r, i) => (
                                                        <div key={`avar-${i}`} className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500">AVAR</span>
                                                            <span className="font-medium text-gray-700">{r}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Observers */}
                                        {match.officials.observers.length > 0 && (
                                            <div className="p-3">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Gözlemciler</p>
                                                <div className="space-y-1">
                                                    {match.officials.observers.map((r, i) => (
                                                        <div key={`obs-${i}`} className="text-right text-xs font-medium text-gray-700">{r}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Representatives */}
                                        {match.officials.representatives.length > 0 && (
                                            <div className="p-3">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Temsilciler</p>
                                                <div className="space-y-1">
                                                    {match.officials.representatives.map((r, i) => (
                                                        <div key={`rep-${i}`} className="text-right text-xs font-medium text-gray-700">{r}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column (Timeline) */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Incidents Loop */}
                            {incidents.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                                    <p className="text-gray-500">Henüz kritik pozisyon girilmemiş.</p>
                                </div>
                            )}

                            {incidents.map((inc) => (
                                <div key={inc.id} className="relative">
                                    {/* Timeline Connector */}
                                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200 -z-10 hidden md:block"></div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                                        <div className="bg-gray-50 p-4 border-b flex items-start gap-4">
                                            <div className="bg-gray-900 text-white w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-lg shadow-md border-4 border-white">
                                                {inc.minute}'
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded shadow-sm tracking-wide ${getImpactColor(inc.impact)}`}>
                                                        {inc.impact.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-gray-900 font-bold text-lg mb-1 leading-tight">{inc.description}</p>

                                                <div className="mt-3 flex flex-wrap gap-4 text-sm bg-white p-2 rounded-lg border border-gray-100 inline-flex">
                                                    <div><span className="font-bold text-gray-500 uppercase text-[10px] block">Hakem Kararı</span> <span className="font-semibold text-gray-900">{inc.refereeDecision}</span></div>
                                                    {inc.varDecision && (
                                                        <div className="border-l pl-4"><span className="font-bold text-blue-500 uppercase text-[10px] block">VAR Müdahalesi</span> <span className="font-semibold text-blue-900">{inc.varDecision}</span></div>
                                                    )}
                                                </div>

                                                {inc.videoUrl && (
                                                    <a href={inc.videoUrl} target="_blank" rel="noreferrer" className="block mt-3 text-xs font-bold text-red-600 hover:underline">
                                                        ▶ Pozisyonu İzle
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Opinions Section */}
                                        <div className="p-5 grid md:grid-cols-2 gap-6 bg-white">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Trio Yorumları
                                                </h4>
                                                <div className="space-y-3">
                                                    {inc.opinions.filter(o => o.type === 'trio' || !o.type).map(op => (
                                                        <div key={op.id} className="relative pl-3 border-l-2 border-gray-100 hover:border-blue-500 transition-colors">
                                                            <div className="flex justify-between items-baseline mb-1">
                                                                <span className="font-bold text-sm text-gray-900">{op.criticName}</span>
                                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${getJudgmentColor(op.judgment).replace('text-', 'bg-').replace('600', '100')} ${getJudgmentColor(op.judgment)}`}>
                                                                    {op.judgment}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 leading-relaxed">"{op.opinion}"</p>
                                                        </div>
                                                    ))}
                                                    {inc.opinions.filter(o => o.type === 'trio' || !o.type).length === 0 && <span className="text-xs text-gray-300 italic">Yorum yok.</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Diğer Yorumlar
                                                </h4>
                                                <div className="space-y-3">
                                                    {inc.opinions.filter(o => o.type === 'general').map(op => (
                                                        <div key={op.id} className="relative pl-3 border-l-2 border-gray-100 hover:border-purple-500 transition-colors">
                                                            <div className="font-bold text-sm text-gray-900 mb-1">{op.criticName}</div>
                                                            <p className="text-sm text-gray-600">"{op.opinion}"</p>
                                                        </div>
                                                    ))}
                                                    {inc.opinions.filter(o => o.type === 'general').length === 0 && <span className="text-xs text-gray-300 italic">Yorum yok.</span>}
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
                            {/* Home Team */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
                                    <div className="w-3 h-8 rounded-full" style={{ backgroundColor: getTeamColors(match.homeTeamId).primary }}></div>
                                    <h3 className="font-bold text-lg text-gray-800">{match.homeTeamName}</h3>
                                </div>
                                <div className="p-6">
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">İlk 11</h4>
                                        <div className="space-y-2">
                                            {match.lineups.home.map((p, i) => (
                                                <div key={i} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded transition-colors border-b border-gray-50 last:border-0">
                                                    <span className="font-mono font-bold text-gray-400 w-6 text-right text-lg">{p.number}</span>
                                                    <span className="font-bold text-gray-800">{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {match.lineups.homeSubs.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Yedekler</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {match.lineups.homeSubs.map((p, i) => (
                                                    <div key={i} className="flex items-center gap-2 p-1">
                                                        <span className="font-mono font-bold text-gray-300 text-xs w-5 text-right">{p.number}</span>
                                                        <span className="text-sm text-gray-600 truncate">{p.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {match.lineups.homeCoach && (
                                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Teknik Direktör</span>
                                            <span className="font-bold text-gray-900">{match.lineups.homeCoach}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Away Team */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b bg-gray-50 flex items-center gap-3 justify-end">
                                    <h3 className="font-bold text-lg text-gray-800">{match.awayTeamName}</h3>
                                    <div className="w-3 h-8 rounded-full" style={{ backgroundColor: getTeamColors(match.awayTeamId).primary }}></div>
                                </div>
                                <div className="p-6">
                                    <div className="mb-6">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider text-right">İlk 11</h4>
                                        <div className="space-y-2">
                                            {match.lineups.away.map((p, i) => (
                                                <div key={i} className="flex flex-row-reverse items-center gap-4 p-2 hover:bg-gray-50 rounded transition-colors border-b border-gray-50 last:border-0">
                                                    <span className="font-mono font-bold text-gray-400 w-6 text-lg">{p.number}</span>
                                                    <span className="font-bold text-gray-800">{p.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {match.lineups.awaySubs.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider text-right">Yedekler</h4>
                                            <div className="grid grid-cols-2 gap-2 direction-rtl">
                                                {match.lineups.awaySubs.map((p, i) => (
                                                    <div key={i} className="flex flex-row-reverse items-center gap-2 p-1">
                                                        <span className="font-mono font-bold text-gray-300 text-xs w-5">{p.number}</span>
                                                        <span className="text-sm text-gray-600 truncate text-right">{p.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {match.lineups.awayCoach && (
                                        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-row-reverse justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase">Teknik Direktör</span>
                                            <span className="font-bold text-gray-900">{match.lineups.awayCoach}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PFDK TAB */}
                {activeTab === 'pfdk' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {disciplinary.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">Bu maça ait PFDK sevki bulunmamaktadır.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {disciplinary.map(act => (
                                        <div key={act.id} className="p-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900">{act.subject}</h4>
                                                <span className="text-xs font-mono text-gray-400">{act.date}</span>
                                            </div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{act.teamName}</div>
                                            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
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


function getJudgmentColor(judgment: string) {
    switch (judgment) {
        case 'correct': return 'text-green-600';
        case 'incorrect': return 'text-red-600';
        case 'controversial': return 'text-orange-600';
        default: return 'text-gray-600';
    }
}

function StatRow({ label, home, away, isCard }: { label: string, home: number, away: number, isCard?: boolean }) {
    if (home === undefined || away === undefined) return null;
    return (
        <div className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors px-2 rounded">
            <span className={`font-bold w-8 text-center ${isCard && label.includes('Kırmızı') ? 'text-red-600' : isCard && label.includes('Sarı') ? 'text-yellow-600' : 'text-gray-800'}`}>{home}</span>
            <span className="text-xs text-gray-500 font-medium">{label}</span>
            <span className={`font-bold w-8 text-center ${isCard && label.includes('Kırmızı') ? 'text-red-600' : isCard && label.includes('Sarı') ? 'text-yellow-600' : 'text-gray-800'}`}>{away}</span>
        </div>
    );
}

function getImpactColor(impact: string) {
    switch (impact) {
        case 'penalty': return 'bg-yellow-200 text-yellow-800';
        case 'red_card': return 'bg-red-200 text-red-800';
        case 'goal': return 'bg-green-200 text-green-800';
        default: return 'bg-gray-200 text-gray-800';
    }
}

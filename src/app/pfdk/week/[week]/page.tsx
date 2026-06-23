"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { DisciplinaryAction, Match } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTeamName, resolveTeamId } from '@/lib/teams';
import { Skeleton } from '@/components/ui/Skeleton';

export default function PfdkWeekPage() {
    const params = useParams();
    const weekNumber = Number(params.week);

    const [actions, setActions] = useState<DisciplinaryAction[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ... (fetch logic preserved)
        async function fetchData() {
            try {
                setLoading(true);
                const pfdkSnap = await getDocs(query(collection(db, 'disciplinary_actions'), where('week', '==', weekNumber)));
                const weekActions = pfdkSnap.docs
                    .map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction))
                    .filter(act => act.teamId && act.matchId);
                setActions(weekActions);

                const matchSnap = await getDocs(query(collection(db, 'matches'), where('week', '==', weekNumber)));
                const weekMatches = matchSnap.docs.map(d => ({ ...d.data(), id: d.id } as Match));
                setMatches(weekMatches);
            } catch (err) {
                console.error("PFDK Week Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [weekNumber]);

    const cleanTeamName = (rawName: string) => {
        const id = resolveTeamId(rawName);
        return id ? getTeamName(id) : rawName;
    };

    if (loading) return (
        // ... (skeleton preserved)
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-4 w-24" />
                    <div>
                        <Skeleton className="h-10 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border-2 border-border rounded-xl p-6 shadow-neo">
                            <Skeleton className="h-8 w-64 mb-4" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );

    // Grouping Logic: Group by Match Title
    const groupMap: Record<string, DisciplinaryAction[]> = {};
    actions.forEach(act => {
        let groupTitle = cleanTeamName(act.teamName || 'DİĞER');

        if (act.matchId) {
            const mId = act.matchId.startsWith('d-') ? act.matchId.slice(2) : act.matchId;
            const match = matches.find(m => m.id === mId || m.id === `d-${mId}`);
            if (match) {
                groupTitle = `${cleanTeamName(match.homeTeamName)} - ${cleanTeamName(match.awayTeamName)}`;
            }
        }

        if (!groupMap[groupTitle]) groupMap[groupTitle] = [];
        groupMap[groupTitle].push(act);
    });

    const sortedGroups = Object.keys(groupMap).sort((a, b) => a.localeCompare(b, 'tr'));

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-4">
                    <Link href="/pfdk" className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors w-fit">
                        ← TÜM HAFTALAR
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase text-primary">{weekNumber}. HAFTA</h1>
                        <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
                            PFDK KARARLARI VE SEVKLERİ
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <section className="space-y-6">
                        {sortedGroups.length === 0 ? (
                            <div className="p-12 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm">
                                {weekNumber}. Hafta için disiplin sevki veya cezası bulunamadı.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-8">
                                {sortedGroups.map(group => {
                                    const groupActions = groupMap[group];
                                    const referralCount = groupActions.length;
                                    const penaltyCount = groupActions.filter(a => a.penalty).length;
                                    const firstAction = groupActions[0];
                                    const matchId = firstAction?.matchId?.replace(/^d-/, '');
                                    const matchExists = matchId && matches.some(m => m.id === matchId || m.id === `d-${matchId}`);

                                    return (
                                        <div key={group} className="bg-white border-2 border-border rounded-xl p-6 md:p-8 shadow-neo overflow-hidden relative">
                                            {/* Top Status Bar */}
                                            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                                                <div className="bg-blue-500 transition-all" style={{ width: `${(referralCount / groupActions.length) * 100}%` }} />
                                                <div className="bg-red-500 transition-all" style={{ width: `${(penaltyCount / groupActions.length) * 100}%` }} />
                                            </div>

                                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="font-black text-xl md:text-2xl text-gray-900 uppercase tracking-tight leading-none mb-3 flex items-center gap-1.5 flex-wrap justify-center md:justify-start">
                                                        {group.includes(' - ') ? (
                                                            (() => {
                                                                const parts = group.split(' - ');
                                                                const team1Id = resolveTeamId(parts[0]);
                                                                const team2Id = resolveTeamId(parts[1]);
                                                                return (
                                                                    <>
                                                                        {team1Id ? (
                                                                            <Link href={`/teams/${team1Id}`} className="hover:text-red-600 transition-colors hover:underline">
                                                                                {parts[0]}
                                                                            </Link>
                                                                        ) : (
                                                                            <span>{parts[0]}</span>
                                                                        )}
                                                                        <span className="text-gray-400 font-medium font-mono text-sm select-none mx-1">VS</span>
                                                                        {team2Id ? (
                                                                            <Link href={`/teams/${team2Id}`} className="hover:text-red-600 transition-colors hover:underline">
                                                                                {parts[1]}
                                                                            </Link>
                                                                        ) : (
                                                                            <span>{parts[1]}</span>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()
                                                        ) : (
                                                            (() => {
                                                                const teamId = resolveTeamId(group);
                                                                return teamId ? (
                                                                    <Link href={`/teams/${teamId}`} className="hover:text-red-600 transition-colors hover:underline">
                                                                        {group}
                                                                    </Link>
                                                                ) : (
                                                                    <span>{group}</span>
                                                                );
                                                            })()
                                                        )}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
                                                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-100 uppercase tracking-widest shadow-sm">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                                                            {referralCount} SEVK
                                                        </span>
                                                        <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black border border-red-100 uppercase tracking-widest shadow-sm">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                                                            {penaltyCount} CEZA
                                                        </span>
                                                    </div>
                                                </div>
                                                {matchExists && (
                                                    <Link
                                                        href={`/matches/${matchId}?tab=pfdk`}
                                                        className="w-full md:w-auto bg-gray-900 text-white text-[10px] font-black px-8 py-4 rounded-xl hover:bg-primary hover:text-black transition-all uppercase tracking-widest text-center shadow-neo-sm active:scale-95 shrink-0"
                                                    >
                                                        DETAYLARI GÖR ➔
                                                    </Link>
                                                )}
                                            </div>

                                            {!matchExists && (
                                                <div className="mt-6 border-t border-slate-100 pt-4 space-y-4">
                                                    {groupActions.map((action) => (
                                                        <div key={action.id} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3">
                                                            <div className="flex flex-wrap justify-between items-start gap-2">
                                                                <div>
                                                                    <span className="text-xs font-black text-slate-800">👤 {action.subject}</span>
                                                                    <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{action.reason}</span>
                                                                    {action.matchId ? (
                                                                        (() => {
                                                                            const mId = action.matchId.replace(/^d-/, '');
                                                                            const match = matches.find(m => m.id === mId || m.id === `d-${mId}`);
                                                                            const matchName = match ? `${cleanTeamName(match.homeTeamName)} - ${cleanTeamName(match.awayTeamName)}` : 'Maç Detayı';
                                                                            return (
                                                                                <Link href={`/matches/${mId}?tab=pfdk`} className="inline-block mt-1 text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors px-1.5 py-0.5 rounded border border-blue-100">
                                                                                    Maç: {matchName}
                                                                                </Link>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        (() => {
                                                                            const tId = resolveTeamId(action.teamName || '');
                                                                            return tId ? (
                                                                                <Link href={`/teams/${tId}`} className="inline-block mt-1 text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors px-1.5 py-0.5 rounded border border-blue-100">
                                                                                    {cleanTeamName(action.teamName || '')}
                                                                                </Link>
                                                                            ) : (
                                                                                <span className="inline-block mt-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                                                    {cleanTeamName(action.teamName || '')}
                                                                                </span>
                                                                            );
                                                                        })()
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-1.5 shrink-0">
                                                                    <span className="bg-white border border-slate-200 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                                        {action.date}
                                                                    </span>
                                                                    {action.category && (
                                                                        <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                                            {action.category}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {action.penalty && (
                                                                <div className="bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-lg flex flex-col gap-1.5">
                                                                    <span className={`text-red-700 text-xs font-black uppercase tracking-wider ${action.appealStatus === 'accepted' || action.appealStatus === 'partially_accepted' ? 'line-through opacity-60' : ''}`}>
                                                                        ⚠️ Ceza: {action.penalty}
                                                                    </span>
                                                                    {action.appealStatus && action.appealStatus !== 'none' && (
                                                                        <span className={`w-fit text-[9px] font-black px-2 py-1 rounded border uppercase tracking-wider ${
                                                                            action.appealStatus === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                            action.appealStatus === 'partially_accepted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                            action.appealStatus === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                            'bg-blue-50 text-blue-700 border-blue-200'
                                                                        }`}>
                                                                            {action.appealStatus === 'accepted' ? (action.appealNote?.includes('İkinci İtiraz') ? 'Tahkim: İptal (İkinci İtiraz)' : 'Tahkim: İptal') :
                                                                             action.appealStatus === 'partially_accepted' ? `Tahkim: İndirildi (${action.appealedPenalty})${action.appealNote?.includes('İkinci İtiraz') ? ' (İkinci İtiraz)' : ''}` :
                                                                             action.appealStatus === 'rejected' ? (action.appealNote?.includes('İkinci İtiraz') ? 'Tahkim: Red (İkinci İtiraz)' : 'Tahkim: Red') : 'Tahkim: Karar Bekleniyor'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {action.appealStatus && action.appealStatus !== 'none' && action.appealNote && (
                                                                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-[11px] text-indigo-950/80 leading-relaxed font-medium">
                                                                    <div className="font-bold text-indigo-700 mb-1 flex items-center justify-between">
                                                                        <span>⚖️ Tahkim Kurulu Kararı</span>
                                                                        {action.appealDate && <span className="text-[9px] text-indigo-400 font-mono">{action.appealDate}</span>}
                                                                    </div>
                                                                    {action.appealNote}
                                                                </div>
                                                            )}

                                                            {action.note && (
                                                                <div className="bg-slate-100/50 border border-slate-200 text-slate-600 rounded-lg p-3 text-[11px] leading-relaxed font-medium">
                                                                    {action.note}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}

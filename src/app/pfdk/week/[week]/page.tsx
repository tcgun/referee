"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { DisciplinaryAction, Statement, Match } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTeamName, resolveTeamId, cleanSponsorsInText } from '@/lib/teams';
import { Skeleton } from '@/components/ui/Skeleton';

export default function PfdkWeekPage() {
    // ... existing state ...
    const params = useParams();
    const weekNumber = Number(params.week);

    const [actions, setActions] = useState<DisciplinaryAction[]>([]);
    const [statements, setStatements] = useState<Statement[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ... (fetch logic preserved)
        async function fetchData() {
            try {
                setLoading(true);
                const pfdkSnap = await getDocs(query(collection(db, 'disciplinary_actions'), where('week', '==', weekNumber)));
                const weekActions = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));
                setActions(weekActions);

                const matchSnap = await getDocs(query(collection(db, 'matches'), where('week', '==', weekNumber)));
                const weekMatches = matchSnap.docs.map(d => ({ ...d.data(), id: d.id } as Match));
                setMatches(weekMatches);

                const stmtSnap = await getDocs(collection(db, 'statements'));
                const allStmts = stmtSnap.docs.map(d => ({ ...d.data(), id: d.id } as Statement));
                const matchDates = new Set(weekMatches.map(m => m.date));
                setStatements(allStmts.filter(s => s.title.toLowerCase().includes('pfdk') && matchDates.has(s.date)));
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

    // Helper: Clean Penalty String
    const cleanPenalty = (p: string) => {
        if (!p) return '';
        return p.replace(/(\d+)\.-TL/g, '$1 TL');
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
                        <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase text-primary">{weekNumber}. HAFTA</h1>
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
                                    const referralCount = groupActions.filter(a => !a.penalty).length;
                                    const penaltyCount = groupActions.filter(a => a.penalty).length;
                                    const firstAction = groupActions[0];
                                    const matchId = firstAction?.matchId?.replace(/^d-/, '');

                                    return (
                                        <div key={group} className="bg-white border-2 border-border rounded-xl p-6 md:p-8 shadow-neo overflow-hidden relative">
                                            {/* Top Status Bar */}
                                            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                                                <div className="bg-blue-500 transition-all" style={{ width: `${(referralCount / groupActions.length) * 100}%` }} />
                                                <div className="bg-red-500 transition-all" style={{ width: `${(penaltyCount / groupActions.length) * 100}%` }} />
                                            </div>

                                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="font-black text-xl md:text-2xl text-gray-900 uppercase tracking-tight leading-none mb-3">{group}</h3>
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
                                                {matchId && (
                                                    <Link
                                                        href={`/matches/${matchId}?tab=pfdk`}
                                                        className="w-full md:w-auto bg-gray-900 text-white text-[10px] font-black px-8 py-4 rounded-xl hover:bg-primary hover:text-black transition-all uppercase tracking-widest text-center shadow-neo-sm active:scale-95 shrink-0"
                                                    >
                                                        DETAYLARI GÖR ➔
                                                    </Link>
                                                )}
                                            </div>
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

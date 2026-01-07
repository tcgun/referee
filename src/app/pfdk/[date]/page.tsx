"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { DisciplinaryAction, Statement } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTeamName, resolveTeamId } from '@/lib/teams';

export default function PfdkDatePage() {
    const params = useParams();
    const rawDate = params.date as string;

    // Helper to normalize delimiters to dots
    const normalizeDate = (d: string | undefined) => d ? d.replace(/[-/]/g, '.').trim() : '';

    // We want to compare against the "dot" version of the url param
    const targetDate = rawDate ? normalizeDate(decodeURIComponent(rawDate)) : '';
    const displayDate = targetDate; // For UI consistency

    const [actions, setActions] = useState<DisciplinaryAction[]>([]);
    const [statements, setStatements] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const pfdkSnap = await getDocs(collection(db, 'disciplinary_actions'));
                const allActions = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));

                // Filter by Date (Normalized comparison)
                setActions(allActions.filter(a => normalizeDate(a.date) === targetDate));

                const stmtSnap = await getDocs(collection(db, 'statements'));
                const allStmts = stmtSnap.docs.map(d => ({ ...d.data(), id: d.id } as Statement));

                // Filter by Date & Title contains PFDK
                setStatements(allStmts.filter(s => normalizeDate(s.date) === targetDate && s.title.toLowerCase().includes('pfdk')));

            } catch (err) {
                console.error("PFDK Detail Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [targetDate]);

    // Helper: Clean Team Name (Remove Sponsors)
    const cleanTeamName = (rawName: string) => {
        const id = resolveTeamId(rawName);
        return id ? getTeamName(id) : rawName;
    };

    // Helper: Clean Penalty String
    const cleanPenalty = (p: string) => {
        if (!p) return '';
        // 1. Remove ".-" before TL (e.g. 40.000.-TL -> 40.000 TL)
        // 2. Remove "PARA CEZASI" redundancy if implied or format nicely
        return p.replace(/(\d+)\.-TL/g, '$1 TL');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Veriler Yükleniyor...</span>
            </div>
        </div>
    );

    // Grouping Logic: Group by Team (Cleaned Name)
    const teamGroups: Record<string, DisciplinaryAction[]> = {};
    actions.forEach(act => {
        const rawName = act.teamName || 'DİĞER';
        const teamKey = cleanTeamName(rawName);

        if (!teamGroups[teamKey]) teamGroups[teamKey] = [];
        teamGroups[teamKey].push(act);
    });

    // Sort Teams Alphabetically
    const sortedTeams = Object.keys(teamGroups).sort((a, b) => a.localeCompare(b, 'tr'));

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                {/* Header with Back Button */}
                <div className="flex flex-col gap-4">
                    <Link href="/pfdk" className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors w-fit">
                        ← GERİ DÖN
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase text-red-500">{displayDate}</h1>
                        <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">PFDK SEVK VE CEZA RAPORU</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Disciplinary Actions */}
                    <section className="space-y-4">
                        {actions.length === 0 ? (
                            <div className="p-12 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm">
                                "{displayDate}" tarihli kayıt bulunamadı.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedTeams.map(team => {
                                    const teamActions = teamGroups[team];
                                    return (
                                        <div key={team} className="bg-white border border-border rounded-xl p-6 shadow-sm hover:border-red-200 transition-colors">
                                            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-2">
                                                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">{team}</h3>
                                            </div>

                                            <ul className="space-y-4 list-none">
                                                {teamActions.map((act, idx) => (
                                                    <li key={act.id || idx} className="relative pl-6">
                                                        {/* Bullet Point */}
                                                        <span className="absolute left-0 top-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>

                                                        <div className="flex flex-col gap-1">
                                                            {/* Reason / Quote */}
                                                            <p className="text-sm text-gray-600 leading-relaxed italic opacity-80 mb-1">
                                                                "{act.reason}"
                                                            </p>

                                                            {/* Result Line (Penalty) */}
                                                            {act.penalty && (
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-md font-bold text-gray-900">
                                                                        {cleanPenalty(act.penalty)}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        {/* Subject Badge (Small) */}
                                                                        {act.type === 'performance' && <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">HAKEM PERFORMANSI</span>}
                                                                        <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200 uppercase">{act.subject}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {act.matchId && (
                                                                <Link href={`/matches/${act.matchId}?tab=pfdk`} className="text-[10px] font-bold text-blue-400 hover:text-blue-600 hover:underline w-fit">
                                                                    İlgili Maç ➔
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* Related Statements */}
                    {statements.length > 0 && (
                        <section className="space-y-4 pt-8">
                            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">İLGİLİ RESMİ AÇIKLAMALAR</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {statements.map((st, i) => (
                                    <div key={st.id || i} className="bg-gray-50 border border-border rounded-xl p-5 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{st.entity}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground font-mono">{st.date}</span>
                                        </div>
                                        <h4 className="font-bold text-base text-foreground mb-2">{st.title}</h4>
                                        <p className="text-sm text-gray-600 leading-relaxed">{st.content}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}

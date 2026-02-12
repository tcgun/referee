"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { DisciplinaryAction, Statement } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getTeamName, resolveTeamId } from '@/lib/teams';
import { Skeleton } from '@/components/ui/Skeleton';

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
    const [activeTab, setActiveTab] = useState<'penalties' | 'referrals'>('penalties');

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
                        <div key={i} className="bg-white border border-border rounded-xl p-6 shadow-sm">
                            <Skeleton className="h-7 w-48 mb-6 border-b border-gray-100 pb-2" />
                            <div className="space-y-6">
                                {[1, 2].map(j => (
                                    <div key={j} className="flex flex-col gap-2 pl-6 relative">
                                        <div className="absolute left-0 top-2 w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <div className="flex gap-2 mt-2">
                                            <Skeleton className="h-6 w-24" />
                                            <Skeleton className="h-6 w-16" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );

    // Grouping Logic: Group by Team (Cleaned Name)
    const currentList = activeTab === 'penalties'
        ? actions.filter(a => a.penalty)
        : actions.filter(a => !a.penalty);

    const teamGroups: Record<string, DisciplinaryAction[]> = {};
    currentList.forEach(act => {
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
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase text-primary">{displayDate}</h1>
                            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
                                {activeTab === 'penalties' ? 'PFDK CEZA KARARLARI' : 'PFDK DİSİPLİN SEVKLERİ'}
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-[#161b22] p-1.5 rounded-2xl border border-white/10 w-fit gap-1 shadow-2xl">
                            <button
                                onClick={() => setActiveTab('penalties')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'penalties'
                                    ? 'bg-primary text-black shadow-lg shadow-pink-900/20 scale-105'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                            >
                                CEZALAR
                            </button>
                            <button
                                onClick={() => setActiveTab('referrals')}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'referrals'
                                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-900/20 scale-105'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                            >
                                SEVKLER
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Disciplinary Actions */}
                    <section className="space-y-4">
                        {sortedTeams.length === 0 ? (
                            <div className="p-12 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm">
                                "{displayDate}" tarihli {activeTab === 'penalties' ? 'ceza kararı' : 'sevk'} bulunamadı.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedTeams.map(team => {
                                    const teamActions = teamGroups[team];
                                    return (
                                        <div key={team} className="bg-white border border-border rounded-xl p-6 shadow-sm hover:border-border transition-colors">
                                            <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-2">
                                                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">{team}</h3>
                                            </div>

                                            <ul className="space-y-4 list-none">
                                                {teamActions.map((act, idx) => (
                                                    <DisciplinaryItem key={act.id || idx} act={act} activeTab={activeTab} cleanPenalty={cleanPenalty} />
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

function DisciplinaryItem({ act, activeTab, cleanPenalty }: { act: DisciplinaryAction, activeTab: 'penalties' | 'referrals', cleanPenalty: (p: string) => string }) {
    // Default to SHOW FULL TEXT (true) as requested ("bütün yazı gözükecek")
    const [showFull, setShowFull] = useState(true);

    return (
        <li className="relative pl-6">
            <span className={`absolute left-0 top-2 w-1.5 h-1.5 rounded-full ${activeTab === 'penalties' ? 'bg-primary' : 'bg-yellow-400'}`}></span>

            <div className="flex flex-col gap-1">
                {/* Content Container */}
                <div
                    onClick={() => act.note && setShowFull(!showFull)}
                    className={`cursor-pointer group ${act.note ? 'hover:bg-gray-50 -ml-2 p-2 rounded-lg transition-colors' : ''}`}
                >
                    {/* Reason (Summary) - Always Visible as Header */}
                    <div className="mb-1">
                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider block mb-0.5">GEREKÇE (ÖZET)</span>
                        <p className="text-sm font-bold text-gray-900 leading-snug">"{act.reason}"</p>
                    </div>

                    {/* Full List / Note - Below Reason */}
                    {showFull && act.note && (
                        <div className="mt-3 pt-2 border-t border-gray-100/50">
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider block mb-1">KARAR METNİ</span>
                            <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-medium">
                                {act.note}
                            </p>
                        </div>
                    )}

                    {/* Toggle Hint */}
                    {act.note && !showFull && (
                        <span className="text-[9px] text-gray-400 font-bold uppercase block mt-1 group-hover:text-primary transition-colors">
                            TAM METNİ GÖSTER ▼
                        </span>
                    )}
                </div>

                {/* Result Line (Penalty) */}
                {act.penalty && (
                    <div className="flex items-center gap-2 flex-wrap mt-1 pl-2 md:pl-0">
                        <span className="text-md font-bold text-gray-900 border-l-2 border-primary pl-2">
                            {cleanPenalty(act.penalty)}
                        </span>
                        <div className="flex items-center gap-2">
                            {act.type === 'performance' && <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">HAKEM PERFORMANSI</span>}
                            <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200 uppercase">{act.subject}</span>
                        </div>
                    </div>
                )}

                {/* Referral Badge */}
                {!act.penalty && (
                    <div className="flex items-center gap-2 mt-1 pl-2 md:pl-0">
                        <span className="bg-yellow-50 text-yellow-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-yellow-200 uppercase">TEDBİRLİ SEVK</span>
                        <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200 uppercase">{act.subject}</span>
                    </div>
                )}

                {act.matchId && (
                    <Link href={`/matches/${act.matchId.replace(/^d-/, '')}?tab=pfdk`} className="text-[10px] font-bold text-gray-400 hover:text-primary hover:underline w-fit mt-1 pl-2 md:pl-0">
                        İlgili Maç ➔
                    </Link>
                )}
            </div>
        </li>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { DisciplinaryAction, Statement, Match } from '@/types';
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
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'penalties' | 'referrals'>('penalties');

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const pfdkSnap = await getDocs(collection(db, 'disciplinary_actions'));
                const allActions = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));

                // Filter by Date (Normalized comparison)
                const filteredActions = allActions.filter(a => normalizeDate(a.date) === targetDate);
                setActions(filteredActions);

                const stmtSnap = await getDocs(collection(db, 'statements'));
                const allStmts = stmtSnap.docs.map(d => ({ ...d.data(), id: d.id } as Statement));

                // Filter by Date & Title contains PFDK
                setStatements(allStmts.filter(s => normalizeDate(s.date) === targetDate && s.title.toLowerCase().includes('pfdk')));

                // Fetch matches for the date to resolve match names
                const matchSnap = await getDocs(collection(db, 'matches'));
                const allMatches = matchSnap.docs.map(d => ({ ...d.data(), id: d.id } as Match));
                // Match dates might be different from report dates, so we fetch all or filter by week if known.
                // For simplicity and since report date != match date usually, we fetch all relevant for the reports matchIds
                const linkedMatchIds = new Set(filteredActions.map(a => a.matchId).filter(Boolean));
                setMatches(allMatches.filter(m => linkedMatchIds.has(m.id) || linkedMatchIds.has(`d-${m.id}`)));

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

    // Grouping Logic: Group by Match Title or Team Name
    const currentList = activeTab === 'penalties'
        ? actions.filter(a => a.penalty)
        : actions.filter(a => !a.penalty);

    const groupMap: Record<string, DisciplinaryAction[]> = {};
    currentList.forEach(act => {
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

    // Sort Groups (Matches/Teams) Alphabetically
    const sortedGroups = Object.keys(groupMap).sort((a, b) => a.localeCompare(b, 'tr'));

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
                                PFDK KARARLARI VE SEVKLERİ
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Disciplinary Actions Match List */}
                    <section className="space-y-4">
                        {sortedGroups.length === 0 ? (
                            <div className="p-12 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm">
                                "{displayDate}" tarihli disiplin sevki veya cezası bulunamadı.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {sortedGroups.map(group => {
                                    const groupActions = groupMap[group];
                                    const firstAction = groupActions[0];
                                    const matchId = firstAction?.matchId?.replace(/^d-/, '');

                                    return (
                                        <div key={group} className="bg-white border-2 border-border rounded-xl p-6 shadow-neo hover:translate-y-[-2px] transition-all">
                                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                                <div className="text-center md:text-left">
                                                    <h3 className="font-black text-xl md:text-2xl text-gray-900 uppercase tracking-tight mb-1">{group}</h3>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">BU MAÇTA {groupActions.length} SEVK/CEZA BULUNUYOR</p>
                                                </div>

                                                {matchId ? (
                                                    <Link
                                                        href={`/matches/${matchId}?tab=pfdk`}
                                                        className="w-full md:w-auto bg-primary text-black font-black text-sm px-6 py-3 rounded-xl border-2 border-black shadow-neo-sm hover:translate-y-[-2px] active:translate-y-[0px] transition-all text-center"
                                                    >
                                                        SEVKLER VE CEZALAR İÇİN TIKLAYIN ➔
                                                    </Link>
                                                ) : (
                                                    <div className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                                                        MAÇ DETAYI BULUNAMADI
                                                    </div>
                                                )}
                                            </div>
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

    // Helper to extract quoted text (matches "...", '...', “...”, ”...”, «...»)
    const extractQuotedReasons = (text: string) => {
        if (!text) return [];
        // Matches anything between quote marks including the quotes for better UI consistency
        const regex = /["'“”«»][^"'“”«»]+["'“”«»]/g;
        const matches = text.match(regex);

        if (!matches) return [];

        // Return without the outer quotes for processing if needed, 
        // but since we display them with quotes in the UI, we'll keep them or strip and re-add.
        // Let's strip them here so the mapper can handle it cleanly.
        return matches.map(m => m.slice(1, -1).trim()).filter(m => m.length > 2);
    };

    const quotedReasons = extractQuotedReasons(act.reason);

    return (
        <li className="relative pl-6">
            <span className={`absolute left-0 top-2 w-1.5 h-1.5 rounded-full ${activeTab === 'penalties' ? 'bg-primary' : 'bg-yellow-400'}`}></span>

            <div className="flex flex-col gap-1">
                {/* ANA METİN: TFF'den kopyalanan tam metin burada görünür. Hiçbir kısmı silinmez. */}
                <div className="mb-3">
                    <p className="text-[15px] md:text-base text-gray-900 leading-relaxed font-bold whitespace-pre-wrap">
                        {act.note || act.reason}
                    </p>
                </div>

                {/* Result Line (Penalty) */}
                {act.penalty && (
                    <div className="flex items-center gap-2 flex-wrap mt-1 pl-2 md:pl-0">
                        <span className="text-md font-bold text-gray-900 border-l-2 border-primary pl-2">
                            {cleanPenalty(act.penalty)}
                        </span>
                        <div className="flex items-center gap-2">
                            {act.type === 'performance' && <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">HAKEM PERFORMANSI</span>}
                        </div>
                    </div>
                )}

                {/* Badges / Reasons (Shown for both Penalty and Referral) */}
                <div className="flex items-center gap-2 mt-1 pl-2 md:pl-0 flex-wrap">
                    {/* Always show Subject Badge (e.g. KULÜP) */}
                    <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                        {act.subject}
                    </span>

                    {quotedReasons.length > 0 ? (
                        quotedReasons.map((reason, idx) => (
                            <span key={idx} className="bg-white text-gray-900 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded border border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                {reason}
                            </span>
                        ))
                    ) : null}
                </div>

                {act.matchId && (
                    <Link href={`/matches/${act.matchId.replace(/^d-/, '')}?tab=pfdk`} className="text-[10px] font-bold text-gray-400 hover:text-primary hover:underline w-fit mt-1 pl-2 md:pl-0">
                        İlgili Maç ➔
                    </Link>
                )}
            </div>
        </li>
    );
}

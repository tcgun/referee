"use client";

import { useState } from 'react';
import { Opinion, DisciplinaryAction, Statement, Standing } from '@/types';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'; // Ensure lucide-react is installed or use chars
import { MatchItem, MatchGroupedOpinions } from '@/components/matches/MatchItem';
import { getTeamName, resolveTeamId } from '@/lib/teams';

// Helper: Group matches by week
const groupByWeek = (matches: MatchGroupedOpinions[]) => {
    const groups: { [key: number]: MatchGroupedOpinions[] } = {};
    matches.forEach(m => {
        // Extract week from "X. Hafta: ..."
        const weekMatch = m.matchName.match(/^(\d+)\./);
        const week = weekMatch ? parseInt(weekMatch[1]) : 0;
        if (!groups[week]) groups[week] = [];
        groups[week].push(m);
    });
    // Sort weeks descending
    return Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([week, matches]) => ({ week: Number(week), matches }));
};


const WidgetCard = ({ title, icon, children, headerColor = "text-foreground" }: { title: string, icon: string, children: React.ReactNode, headerColor?: string }) => (
    <div className="bg-card backdrop-blur-md text-card-foreground rounded-2xl shadow-lg border border-border h-full flex flex-col overflow-hidden transition-all hover:shadow-xl hover:border-border/50">
        <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <Link href={title === 'Trio Yorumları' ? '/trio' : title === 'Yorumcular' ? '/critics' : title === 'PFDK & Kararlar' ? '/pfdk' : title === 'Açıklamalar' ? '/statements' : '#'} className="flex items-center gap-2 hover:opacity-75 transition-opacity">
                <span className="text-xl">{icon}</span>
                <h3 className={`font-bold text-xs uppercase tracking-wider ${headerColor}`}>
                    {title}
                </h3>
            </Link>
            {(title === 'Trio Yorumları' || title === 'Yorumcular' || title === 'PFDK & Kararlar' || title === 'Açıklamalar') && (
                <Link href={title === 'Trio Yorumları' ? '/trio' : title === 'Yorumcular' ? '/critics' : title === 'PFDK & Kararlar' ? '/pfdk' : '/statements'} className="text-[9px] font-black text-primary hover:underline tracking-tighter">
                    TÜMÜNÜ GÖR
                </Link>
            )}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-card">
            {children}
        </div>
    </div>
);


// Expandable Section Component
const ExpandableListSection = ({ groupedOpinions, headerColor }: { groupedOpinions: MatchGroupedOpinions[], headerColor: string }) => {
    const weeks = groupByWeek(groupedOpinions);

    if (groupedOpinions.length === 0) return <div className="p-8 text-center text-xs text-muted-foreground">Veri bulunamadı.</div>;

    return (
        <div>
            {weeks.map((w) => {
                // Find the match with the highest 'againstCount'
                const mostCriticalMatch = w.matches.reduce((prev, current) => {
                    return (prev.againstCount || 0) > (current.againstCount || 0) ? prev : current;
                });

                // Only show if there is actually a "most critical" one (or just the first one if all are 0)
                // If againstCount is 0, maybe we shouldn't highlight it as "Most Errors"? 
                // But for now, user asked for "most errors against match", assuming simple max.

                return (
                    <div key={w.week} className="border-b border-border last:border-0 pb-2">
                        <div className="bg-muted/20 px-3 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest sticky top-0 backdrop-blur-sm z-10 mx-1 rounded mt-1">
                            {w.week > 0 ? `${w.week}. HAFTA` : 'GENEL'}
                        </div>
                        <div className="pt-2 px-1">
                            {/* Special Header for the featured match */}
                            <div className="text-center mb-1">
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-tight bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                    HAFTANIN EN ÇOK ALEYHE HATA YAPILAN MAÇI
                                </span>
                            </div>

                            {/* Render ONLY the most critical match with extra highlight styling */}
                            <div className="border border-red-500/30 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.1)] bg-gradient-to-b from-red-500/5 to-transparent">
                                <MatchItem match={mostCriticalMatch} headerColor={headerColor} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const TrioSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <WidgetCard title="Trio Yorumları" icon="📺" headerColor="text-blue-500">
        <ExpandableListSection groupedOpinions={groupedOpinions} headerColor="text-blue-500" />
    </WidgetCard>
);

export const GeneralCommentsSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <WidgetCard title="Yorumcular" icon="🎙️" headerColor="text-purple-500">
        <ExpandableListSection groupedOpinions={groupedOpinions} headerColor="text-purple-500" />
    </WidgetCard>
);

export const PfdkSection = ({ actions, statements }: { actions: DisciplinaryAction[], statements?: Statement[] }) => {
    // 1. Group by Date
    const actionsByDate: Record<string, DisciplinaryAction[]> = {};
    actions.forEach(act => {
        const date = act.date || 'Tarihsiz';
        if (!actionsByDate[date]) actionsByDate[date] = [];
        actionsByDate[date].push(act);
    });

    // 2. Sort Dates (Newest First)
    const sortedDates = Object.keys(actionsByDate).sort((a, b) => {
        const [d1, m1, y1] = a.split('.').map(Number);
        const [d2, m2, y2] = b.split('.').map(Number);
        const dateA = new Date(y1, m1 - 1, d1).getTime();
        const dateB = new Date(y2, m2 - 1, d2).getTime();
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    return (
        <WidgetCard title="PFDK & Kararlar" icon="⚖️" headerColor="text-red-500">
            <div className="p-3 grid gap-6">
                {sortedDates.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic text-center">Kayıt yok.</span>
                ) : (
                    sortedDates.map((date, dateIdx) => {
                        // 3. Group by Team within this Date
                        const teamsGroups: Record<string, DisciplinaryAction[]> = {};
                        actionsByDate[date].forEach(act => {
                            const rawName = act.teamName || 'DİĞER';
                            const cleanName = resolveTeamId(rawName) ? getTeamName(resolveTeamId(rawName)!) : rawName;
                            if (!teamsGroups[cleanName]) teamsGroups[cleanName] = [];
                            teamsGroups[cleanName].push(act);
                        });

                        // 4. Sort Teams Alphabetically
                        const sortedTeams = Object.keys(teamsGroups).sort((a, b) => a.localeCompare(b, 'tr'));

                        return (
                            <div key={date} className="space-y-3">
                                {/* Date Header */}
                                <div className="sticky top-0 z-10 bg-card/95 backdrop-blur py-2 border-b border-border">
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        {date}
                                    </h4>
                                </div>

                                <div className="space-y-4 pl-2">
                                    {sortedTeams.map(team => (
                                        <div key={team} className="space-y-2">
                                            {/* Team Header */}
                                            <div className="flex items-center gap-2 opacity-80">
                                                <div className="h-px bg-border flex-1"></div>
                                                <h5 className="text-[10px] font-bold text-foreground uppercase tracking-tight">{team}</h5>
                                                <div className="h-px bg-border flex-1"></div>
                                            </div>

                                            {/* Actions List */}
                                            <div className="space-y-2">
                                                {teamsGroups[team].map((act, i) => {
                                                    const href = act.matchId ? `/matches/${act.matchId}?tab=${act.type === 'performance' ? 'performance' : 'pfdk'}` : null;

                                                    const content = (
                                                        <div className="bg-muted/30 hover:bg-muted/50 rounded-lg p-2.5 transition-colors border border-transparent hover:border-border/50">
                                                            <div className="flex justify-between font-bold text-foreground text-xs mb-1">
                                                                <span>{act.subject}</span>
                                                                {act.type === 'performance' && <span className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 rounded ml-2">PERFORMANS</span>}
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground line-clamp-2 italic leading-relaxed">"{act.reason}"</p>
                                                            {act.penalty && <div className="mt-1.5 text-[10px] font-bold text-red-600 dark:text-red-400 uppercase flex items-center gap-1">
                                                                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                                                                {act.penalty}
                                                            </div>}
                                                        </div>
                                                    );

                                                    if (href) {
                                                        return <Link key={i} href={href} className="block">{content}</Link>;
                                                    }
                                                    return <div key={i}>{content}</div>;
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </WidgetCard>
    );
};

export const StatementsSection = ({ statements }: { statements: Statement[] }) => (
    <WidgetCard title="Açıklamalar" icon="📢" headerColor="text-amber-500">
        <div className="divide-y divide-border">
            {statements.map((st, i) => (
                <Link key={i} href="/statements" className="p-3 hover:bg-muted/50 transition-colors block group">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-primary">{st.entity}</span>
                        <span className="text-[9px] text-muted-foreground">{st.date}</span>
                    </div>
                    <h4 className="font-bold text-xs text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">{st.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{st.content}</p>
                </Link>
            ))}
            {statements.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Açıklama yok.</div>}
        </div>
    </WidgetCard>
);

export const StandingsSection = ({ standings }: { standings: Standing[] }) => (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border h-full flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/40 flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Puan Durumu</h3>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1 bg-card">
            <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="text-[10px] font-black text-muted-foreground bg-muted/50 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        <th className="p-2 text-center w-8">#</th>
                        <th className="p-2">Takım</th>
                        <th className="p-2 text-center w-6" title="Oynanan">O</th>
                        <th className="p-2 text-center w-6" title="Galibiyet">G</th>
                        <th className="p-2 text-center w-6" title="Beraberlik">B</th>
                        <th className="p-2 text-center w-6" title="Mağlubiyet">M</th>
                        <th className="p-2 text-center w-6" title="Averaj">Av</th>
                        <th className="p-2 text-center w-8 font-bold text-foreground" title="Puan">P</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                    {standings.length === 0 ? (
                        <tr><td colSpan={8} className="p-4 text-center text-muted-foreground italic">Veri yok.</td></tr>
                    ) : standings.sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 18).map((team, i) => (
                        <tr key={team.id} className="hover:bg-muted/50 transition-colors group">
                            <td className={`p-2 text-center font-bold ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : i >= 15 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{team.rank || i + 1}</td>
                            <td className="p-2 text-foreground font-bold truncate max-w-[120px]" title={team.teamName}>{team.teamName}</td>
                            <td className="p-2 text-center text-muted-foreground">{team.played}</td>
                            <td className="p-2 text-center text-muted-foreground">{team.won}</td>
                            <td className="p-2 text-center text-muted-foreground">{team.drawn}</td>
                            <td className="p-2 text-center text-muted-foreground">{team.lost}</td>
                            <td className="p-2 text-center text-muted-foreground">{team.goalDiff}</td>
                            <td className="p-2 text-center font-black text-primary bg-primary/5 rounded">{team.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

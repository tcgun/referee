"use client";

import { useMemo, useState } from 'react';
import { Opinion, DisciplinaryAction, Statement, Standing } from '@/types';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { MatchItem, MatchGroupedOpinions } from '@/components/matches/MatchItem';
import { getTeamName, resolveTeamId } from '@/lib/teams';

// Helper: Group matches by week
const groupByWeek = (matches: MatchGroupedOpinions[]) => {
    const groups: { [key: number]: MatchGroupedOpinions[] } = {};
    matches.forEach(m => {
        const weekMatch = m.matchName.match(/^(\d+)\./);
        const week = weekMatch ? parseInt(weekMatch[1]) : 0;
        if (!groups[week]) groups[week] = [];
        groups[week].push(m);
    });
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
        <div className="flex-1 overflow-y-auto no-scrollbar bg-card">
            {children}
        </div>
    </div>
);


// Expandable Section Component
const ExpandableListSection = ({ groupedOpinions, headerColor }: { groupedOpinions: MatchGroupedOpinions[], headerColor: string }) => {
    const weeks = useMemo(() => groupByWeek(groupedOpinions), [groupedOpinions]);

    if (groupedOpinions.length === 0) return <div className="p-8 text-center text-xs text-muted-foreground">Veri bulunamadı.</div>;

    return (
        <div>
            {weeks.map((w) => {
                const mostCriticalMatch = w.matches.reduce((prev, current) => {
                    return (prev.againstCount || 0) > (current.againstCount || 0) ? prev : current;
                });

                return (
                    <div key={w.week} className="border-b border-border last:border-0 pb-2">
                        <div className="bg-muted/20 px-3 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest sticky top-0 backdrop-blur-sm z-10 mx-1 rounded mt-1">
                            {w.week > 0 ? `${w.week}. HAFTA` : 'GENEL'}
                        </div>
                        <div className="pt-2 px-1">
                            <div className="text-center mb-1">
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-tight bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                    HAFTANIN EN ÇOK ALEYHE HATA YAPILAN MAÇI
                                </span>
                            </div>

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
    const groupedData = useMemo(() => {
        const actionsByDate: Record<string, DisciplinaryAction[]> = {};
        actions.forEach(act => {
            const date = act.date || 'Tarihsiz';
            if (!actionsByDate[date]) actionsByDate[date] = [];
            actionsByDate[date].push(act);
        });

        const sortedDates = Object.keys(actionsByDate).sort((a, b) => {
            const [d1, m1, y1] = a.split('.').map(Number);
            const [d2, m2, y2] = b.split('.').map(Number);
            const dateA = new Date(y1, m1 - 1, d1).getTime();
            const dateB = new Date(y2, m2 - 1, d2).getTime();
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;
            return dateB - dateA;
        });

        return sortedDates.map(date => {
            const teamsGroups: Record<string, DisciplinaryAction[]> = {};
            actionsByDate[date].forEach(act => {
                const rawName = act.teamName || 'DİĞER';
                const cleanName = resolveTeamId(rawName) ? getTeamName(resolveTeamId(rawName)!) : rawName;
                if (!teamsGroups[cleanName]) teamsGroups[cleanName] = [];
                teamsGroups[cleanName].push(act);
            });

            const sortedTeamsInDate = Object.keys(teamsGroups).sort((a, b) => a.localeCompare(b, 'tr'));
            return { date, sortedTeams: sortedTeamsInDate, teamsGroups };
        });
    }, [actions]);

    return (
        <WidgetCard title="PFDK & Kararlar" icon="⚖️" headerColor="text-red-500">
            <div className="p-3 grid gap-6">
                {groupedData.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic text-center">Kayıt yok.</span>
                ) : (
                    groupedData.map(({ date, sortedTeams, teamsGroups }) => (
                        <div key={date} className="space-y-3">
                            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur py-2 border-b border-border">
                                <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    {date}
                                </h4>
                            </div>

                            <div className="space-y-4 pl-2">
                                {sortedTeams.map(team => (
                                    <div key={team} className="space-y-2">
                                        <div className="flex items-center gap-2 opacity-80">
                                            <div className="h-px bg-border flex-1"></div>
                                            <h5 className="text-[10px] font-bold text-foreground uppercase tracking-tight">{team}</h5>
                                            <div className="h-px bg-border flex-1"></div>
                                        </div>

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
                                                return href ? <Link key={i} href={href} className="block">{content}</Link> : <div key={i}>{content}</div>;
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}

                {statements && statements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">İLGİLİ AÇIKLAMALAR</span>
                            <div className="h-px bg-amber-500/20 flex-1"></div>
                        </div>
                        <div className="space-y-2">
                            {statements.map((st, i) => (
                                <Link key={i} href="/statements" className="block bg-amber-50/30 hover:bg-amber-50/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20 border border-amber-500/10 rounded-lg p-2.5 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">{st.entity}</span>
                                        <span className="text-[9px] text-muted-foreground font-mono">{st.date}</span>
                                    </div>
                                    <h4 className="font-bold text-[11px] text-foreground mb-1 line-clamp-1">{st.title}</h4>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">{st.content}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
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



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


const WidgetCard = ({ title, icon, subtitle, children, headerColor = "text-white" }: { title: string, icon: string, subtitle?: string, children: React.ReactNode, headerColor?: string }) => (
    <div className="bg-[#161b22] text-white rounded-xl shadow-neo border-2 border-white/20 h-full flex flex-col overflow-hidden transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg">
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-[#1d2129] to-[#161b22] flex items-center justify-between">
            <Link href={title === 'Trio Yorumları' ? '/trio' : title === 'Yorumcular' ? '/critics' : title === 'PFDK & Kararlar' ? '/pfdk' : title === 'Açıklamalar' ? '/statements' : '#'} className="group flex items-center gap-3 hover:opacity-90 transition-opacity">
                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 text-2xl group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div>
                    <h3 className={`font-black text-sm uppercase tracking-tighter leading-none ${headerColor}`}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {subtitle}
                        </p>
                    )}
                </div>
            </Link>
            {(title === 'Trio Yorumları' || title === 'Yorumcular' || title === 'PFDK & Kararlar' || title === 'Açıklamalar') && (
                <Link href={title === 'Trio Yorumları' ? '/trio' : title === 'Yorumcular' ? '/critics' : title === 'PFDK & Kararlar' ? '/pfdk' : '/statements'} className="text-[9px] font-black text-black bg-secondary px-2 py-1 rounded-lg transition-all hover:bg-white hover:scale-105 active:scale-95 shadow-sm">
                    TÜMÜNÜ GÖR
                </Link>
            )}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#161b22]">
            {children}
        </div>
    </div>
);


// Expandable Section Component
const ExpandableListSection = ({ groupedOpinions, headerColor }: { groupedOpinions: MatchGroupedOpinions[], headerColor: string }) => {
    const weeks = useMemo(() => groupByWeek(groupedOpinions), [groupedOpinions]);

    if (groupedOpinions.length === 0) return <div className="p-8 text-center text-xs text-gray-400 italic">Veri bulunamadı.</div>;

    return (
        <div>
            {weeks.map((w) => {
                const mostCriticalMatch = w.matches.reduce((prev, current) => {
                    return (prev.againstCount || 0) > (current.againstCount || 0) ? prev : current;
                });

                return (
                    <div key={w.week} className="border-b border-white/20 last:border-0 pb-2">
                        <div className="bg-secondary px-3 py-1 text-[10px] font-black text-black uppercase tracking-widest sticky top-0 z-10 mx-1 rounded-sm border border-black mt-1 shadow-sm">
                            {w.week > 0 ? `${w.week}. HAFTA` : 'GENEL'}
                        </div>
                        <div className="pt-2 px-1">
                            <div className="text-center mb-1">
                                <span className="text-[9px] font-black text-white bg-[#1d2129] uppercase tracking-tight px-2 py-0.5 rounded-sm border border-white/20">
                                    HAFTANIN EN KRİTİK MAÇI
                                </span>
                            </div>

                            <div className="border border-white/20 rounded-lg overflow-hidden bg-[#1d2129] mt-2">
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
    <WidgetCard
        title="Trio Yorumları"
        icon="📺"
        subtitle="RESMİ YAYINCI ANALİZLERİ"
        headerColor="text-white"
    >
        <ExpandableListSection groupedOpinions={groupedOpinions} headerColor="text-white" />
    </WidgetCard>
);

export const GeneralCommentsSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <WidgetCard
        title="Yorumcular"
        icon="🎙️"
        subtitle="BAĞIMSIZ UZMAN GÖRÜŞLERİ"
        headerColor="text-white"
    >
        <ExpandableListSection groupedOpinions={groupedOpinions} headerColor="text-white" />
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
        <WidgetCard title="PFDK & Kararlar" icon="⚖️" headerColor="text-white">
            <div className="p-3 grid gap-6">
                {groupedData.length === 0 ? (
                    <span className="text-xs text-gray-400 italic text-center">Kayıt yok.</span>
                ) : (
                    groupedData.map(({ date, sortedTeams, teamsGroups }) => (
                        <div key={date} className="space-y-3">
                            <div className="sticky top-0 z-10 bg-[#1d2129] py-2 border-b border-white/20">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-secondary"></span>
                                    {date}
                                </h4>
                            </div>

                            <div className="space-y-4 pl-2">
                                {sortedTeams.map(team => (
                                    <div key={team} className="space-y-2">
                                        <div className="flex items-center gap-2 opacity-80">
                                            <div className="h-px bg-white/20 flex-1"></div>
                                            <h5 className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">{team}</h5>
                                            <div className="h-px bg-white/20 flex-1"></div>
                                        </div>

                                        <div className="space-y-2">
                                            {teamsGroups[team].map((act, i) => {
                                                const href = act.matchId ? `/matches/${act.matchId}?tab=${act.type === 'performance' ? 'performance' : 'pfdk'}` : null;
                                                const content = (
                                                    <div className="bg-[#1d2129] hover:bg-secondary/20 rounded-none border border-white/10 p-2.5 transition-colors">
                                                        <div className="flex justify-between font-black text-white text-xs mb-1">
                                                            <span>{act.subject}</span>
                                                            {act.type === 'performance' && <span className="text-[9px] bg-white text-black px-1.5 border border-black ml-2">PERFORMANS</span>}
                                                        </div>
                                                        <p className="text-[11px] text-gray-300 line-clamp-2 italic leading-relaxed">"{act.reason}"</p>
                                                        {act.penalty && <div className="mt-1.5 text-[10px] font-black text-secondary uppercase flex items-center gap-1">
                                                            <span className="w-1 h-1 bg-secondary"></span>
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
                    <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">İLGİLİ AÇIKLAMALAR</span>
                            <div className="h-0.5 bg-white/20 flex-1"></div>
                        </div>
                        <div className="space-y-2">
                            {statements.map((st, i) => (
                                <Link key={i} href="/statements" className="block bg-[#1d2129] hover:bg-secondary/20 border border-white/10 rounded-none p-2.5 transition-colors hover:translate-x-[-2px] hover:translate-y-[-2px]">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black text-black uppercase tracking-wider bg-secondary px-1">{st.entity}</span>
                                        <span className="text-[9px] text-gray-400 font-mono">{st.date}</span>
                                    </div>
                                    <h4 className="font-black text-[11px] text-white mb-1 line-clamp-1">{st.title}</h4>
                                    <p className="text-[10px] text-gray-300 line-clamp-1 leading-tight">{st.content}</p>
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
    <WidgetCard
        title="Açıklamalar"
        icon="📢"
        subtitle="TFF VE KULÜP DUYURULARI"
        headerColor="text-white"
    >
        <div className="divide-y divide-white/10">
            {statements.map((st, i) => (
                <Link key={i} href="/statements" className="p-3 hover:bg-white/5 transition-colors block group">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-black bg-secondary border border-black px-1">{st.entity}</span>
                        <span className="text-[9px] text-gray-400 font-mono">{st.date}</span>
                    </div>
                    <h4 className="font-bold text-xs text-white mb-1 line-clamp-1">{st.title}</h4>
                    <p className="text-xs text-gray-300 line-clamp-2">{st.content}</p>
                </Link>
            ))}
            {statements.length === 0 && <div className="p-4 text-center text-xs text-gray-500">Açıklama yok.</div>}
        </div>
    </WidgetCard>
);



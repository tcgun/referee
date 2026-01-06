"use client";

import { useState } from 'react';
import { Opinion, DisciplinaryAction, Statement, Standing } from '@/types';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'; // Ensure lucide-react is installed or use chars
import { MatchItem, MatchGroupedOpinions } from '@/components/matches/MatchItem';

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
            {weeks.map((w) => (
                <div key={w.week} className="border-b border-border last:border-0">
                    <div className="bg-muted/20 px-3 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest sticky top-0 backdrop-blur-sm z-10">
                        {w.week > 0 ? `${w.week}. HAFTA` : 'GENEL'}
                    </div>
                    <div>
                        {w.matches.map(m => (
                            <MatchItem key={m.matchId} match={m} headerColor={headerColor} />
                        ))}
                    </div>
                </div>
            ))}
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

export const PfdkSection = ({ actions, statements }: { actions: DisciplinaryAction[], statements?: Statement[] }) => (
    <WidgetCard title="PFDK & Kararlar" icon="⚖️" headerColor="text-red-500">
        <div className="p-3 grid gap-6">
            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Son Sevkler / Performans</h4>
                {actions.slice(0, 8).map((act, i) => {
                    const href = act.matchId ? `/matches/${act.matchId}?tab=${act.type === 'performance' ? 'performance' : 'pfdk'}` : null;

                    const content = (
                        <div className="text-xs py-1">
                            <div className="flex justify-between font-bold text-foreground">
                                <div className='flex items-center gap-1.5'>
                                    {act.type === 'performance' && <span className="text-[10px]" title="Hakem Performansı">👨‍⚖️</span>}
                                    <span>{act.subject}</span>
                                </div>
                                <span className="text-[9px] text-muted-foreground">{act.date}</span>
                            </div>
                            {act.teamName && <div className="text-[10px] text-primary mb-0.5">{act.teamName}</div>}
                            <p className="text-muted-foreground line-clamp-1 italic">"{act.reason}"</p>
                        </div>
                    );

                    if (href) {
                        return (
                            <Link key={i} href={href} className="block hover:bg-muted/50 rounded transition-colors -mx-1 px-1">
                                {content}
                            </Link>
                        );
                    }

                    return <div key={i}>{content}</div>;
                })}
                {actions.length === 0 && <span className="text-xs text-muted-foreground italic">Kayıt yok.</span>}
            </div>
        </div>
    </WidgetCard>
);

export const StatementsSection = ({ statements }: { statements: Statement[] }) => (
    <WidgetCard title="Açıklamalar" icon="📢" headerColor="text-amber-500">
        <div className="divide-y divide-border">
            {statements.map((st, i) => (
                <div key={i} className="p-3 hover:bg-muted/50 transition-colors block">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-primary">{st.entity}</span>
                        <span className="text-[9px] text-muted-foreground">{st.date}</span>
                    </div>
                    <h4 className="font-bold text-xs text-foreground mb-1 line-clamp-1">{st.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{st.content}</p>
                </div>
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
                    ) : standings.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((team, i) => (
                        <tr key={team.id} className="hover:bg-muted/50 transition-colors group">
                            <td className={`p-2 text-center font-bold ${i < 3 ? 'text-emerald-600 dark:text-emerald-400' : i > 16 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{team.rank || i + 1}</td>
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

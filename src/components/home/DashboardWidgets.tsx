"use client";

import { useState } from 'react';
import { Opinion, DisciplinaryAction, Statement, Standing } from '@/types';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'; // Ensure lucide-react is installed or use chars

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

interface MatchGroupedOpinions {
    matchId: string;
    matchName: string;
    week?: number;
    homeTeam?: string;
    awayTeam?: string;
    score?: string;
    opinions: Opinion[];
}

const WidgetCard = ({ title, icon, children, headerColor = "text-foreground" }: { title: string, icon: string, children: React.ReactNode, headerColor?: string }) => (
    <div className="bg-card backdrop-blur-md text-card-foreground rounded-2xl shadow-lg border border-border h-full flex flex-col overflow-hidden transition-all hover:shadow-xl hover:border-border/50">
        <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className={`font-bold text-xs uppercase tracking-wider ${headerColor}`}>
                {title}
            </h3>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-card">
            {children}
        </div>
    </div>
);

// Match Summary Card (Click to Navigate)
const MatchItem = ({ match, headerColor }: { match: MatchGroupedOpinions, headerColor: string }) => {
    // Calculate Stats
    const stats = {
        correct: match.opinions.filter(o => o.judgment === 'correct').length,
        incorrect: match.opinions.filter(o => o.judgment === 'incorrect').length,
        controversial: match.opinions.filter(o => o.judgment === 'controversial').length,
    };

    return (
        <Link href={`/matches/${match.matchId}`} className="block border-b border-border last:border-0 group">
            <div className="p-4 hover:bg-muted/30 transition-all flex flex-col gap-3">

                {/* Header: Teams & Score */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        {/* Home */}
                        <span className="text-sm font-bold text-foreground text-right flex-1 truncate">{match.homeTeam || 'Ev Sahibi'}</span>

                        {/* Score Badge */}
                        <div className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-md text-sm font-black text-white tracking-widest min-w-[60px] text-center shadow-inner">
                            {match.score || 'v'}
                        </div>

                        {/* Away */}
                        <span className="text-sm font-bold text-foreground text-left flex-1 truncate">{match.awayTeam || 'Deplasman'}</span>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex justify-center gap-2">
                    {stats.controversial > 0 && (
                        <div className="flex items-center gap-1 bg-emerald-900/30 border border-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-transform group-hover:scale-105">
                            <span>Tartışmalı</span>
                            <span className="bg-emerald-500 text-emerald-950 px-1 rounded-[2px] text-[9px]">{stats.controversial}</span>
                        </div>
                    )}
                    {stats.incorrect > 0 && (
                        <div className="flex items-center gap-1 bg-red-900/30 border border-red-900/50 text-red-400 px-2 py-1 rounded text-[10px] font-bold uppercase transition-transform group-hover:scale-105">
                            <span>Hatalı</span>
                            <span className="bg-red-500 text-red-950 px-1 rounded-[2px] text-[9px]">{stats.incorrect}</span>
                        </div>
                    )}
                    {stats.correct > 0 && (
                        <div className="flex items-center gap-1 bg-blue-900/30 border border-blue-900/50 text-blue-400 px-2 py-1 rounded text-[10px] font-bold uppercase transition-transform group-hover:scale-105">
                            <span>Doğru</span>
                            <span className="bg-blue-500 text-blue-950 px-1 rounded-[2px] text-[9px]">{stats.correct}</span>
                        </div>
                    )}
                    {match.opinions.length === 0 && (
                        <span className="text-[10px] text-muted-foreground italic">Henüz yorum yok</span>
                    )}
                </div>

            </div>
        </Link>
    );
};

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
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-1">Son Sevkler</h4>
                {actions.slice(0, 5).map((act, i) => (
                    <div key={i} className="text-xs">
                        <div className="flex justify-between font-bold text-foreground">
                            <span>{act.subject}</span>
                            <span className="text-[9px] text-muted-foreground">{act.date}</span>
                        </div>
                        <div className="text-[10px] text-primary mb-0.5">{act.teamName}</div>
                        <p className="text-muted-foreground line-clamp-1 italic">"{act.reason}"</p>
                    </div>
                ))}
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

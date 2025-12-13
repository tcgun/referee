"use client";

import { Opinion, DisciplinaryAction, Statement, Standing } from '@/types';
import Link from 'next/link';

// Helper to color judgment
const getJudgmentColor = (j: string) => {
    switch (j) {
        case 'correct': return 'text-green-600 bg-green-50 border-green-100';
        case 'incorrect': return 'text-red-600 bg-red-50 border-red-100';
        case 'controversial': return 'text-orange-600 bg-orange-50 border-orange-100';
        default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
};

interface MatchGroupedOpinions {
    matchId: string;
    matchName: string;
    opinions: Opinion[];
}

// Reusable Card Component
const WidgetCard = ({ title, icon, children, headerColor = "text-foreground" }: { title: string, icon: string, children: React.ReactNode, headerColor?: string }) => (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border h-full flex flex-col overflow-hidden transition-all hover:shadow-md">
        <div className="p-4 border-b border-border bg-slate-50/50 flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <h3 className={`font-bold text-sm uppercase tracking-wider ${headerColor}`}>
                {title}
            </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {children}
        </div>
    </div>
);

export const TrioSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <WidgetCard title="Trio Yorumları" icon="📺" headerColor="text-blue-600">
        <div className="space-y-6">
            {groupedOpinions.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Henüz yorum yok.</p> : groupedOpinions.map((group) => (
                <div key={group.matchId} className="space-y-3">
                    <Link href={`/matches/${group.matchId}`} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest pl-1">
                        {group.matchName} <span>&rarr;</span>
                    </Link>
                    {group.opinions.map((op, i) => (
                        <div key={i} className={`p-3 rounded-lg border flex flex-col gap-1 ${getJudgmentColor(op.judgment)}`}>
                            <div className="flex justify-between items-center text-xs opacity-80">
                                <span className="font-bold uppercase tracking-wide">{op.criticName}</span>
                                <span className="font-bold capitalize px-1.5 py-0.5 rounded-full bg-white/50">{op.judgment}</span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed">"{op.opinion}"</p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </WidgetCard>
);

export const GeneralCommentsSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <WidgetCard title="Yorumcular Ne Dedi?" icon="🎙️" headerColor="text-purple-600">
        <div className="space-y-6">
            {groupedOpinions.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Henüz yorum yok.</p> : groupedOpinions.map((group) => (
                <div key={group.matchId} className="space-y-3">
                    <Link href={`/matches/${group.matchId}`} className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-widest pl-1">
                        {group.matchName} <span>&rarr;</span>
                    </Link>
                    {group.opinions.map((op, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="text-xs font-bold text-slate-500 mb-1">{op.criticName}</div>
                            <p className="text-sm text-slate-800 leading-relaxed">"{op.opinion}"</p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </WidgetCard>
);

export const PfdkSection = ({ actions, statements }: { actions: DisciplinaryAction[], statements?: Statement[] }) => (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border h-full flex flex-col overflow-hidden hover:shadow-md transition-all">
        <div className="p-4 border-b border-border bg-slate-50/50 flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <h3 className="font-bold text-sm uppercase tracking-wider text-red-600">PFDK Sevk ve Kararları</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Official Statements Column */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase border-b pb-1 mb-2">Resmi Kararlar</h4>
                    {statements && statements.map((st, i) => (
                        <div key={`st-${i}`} className="bg-red-50/50 p-4 rounded-lg border border-red-100 hover:border-red-200 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wide">RESMİ</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{st.date}</span>
                            </div>
                            <h4 className="font-bold text-sm text-foreground leading-snug mb-2">{st.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{st.content}</p>
                        </div>
                    ))}
                    {(!statements || statements.length === 0) && <p className="text-xs text-slate-400 italic">Resmi karar bulunmuyor.</p>}
                </div>

                {/* Individual Actions Column */}
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase border-b pb-1 mb-2">Sevkler</h4>
                    {actions.map((act, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-900 text-sm">{act.subject}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{act.date}</span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium mb-2 uppercase">{act.teamName}</div>
                            <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-100">"{act.reason}"</p>
                        </div>
                    ))}
                    {actions.length === 0 && <p className="text-xs text-slate-400 italic">Sevk bulunmuyor.</p>}
                </div>
            </div>
        </div>
    </div>
);

export const StatementsSection = ({ statements }: { statements: Statement[] }) => (
    <WidgetCard title="Kulüp Açıklamaları" icon="📢" headerColor="text-foreground">
        <div className="space-y-4">
            {statements.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Açıklama yok.</p> : statements.map((st, i) => (
                <div key={i} className={`p-4 rounded-lg border transition-all hover:translate-x-1 ${st.type === 'tff' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${st.type === 'tff' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {st.entity}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{st.date}</span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground leading-snug mb-1">{st.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{st.content}</p>
                </div>
            ))}
        </div>
    </WidgetCard>
);

export const StandingsSection = ({ standings }: { standings: Standing[] }) => (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border h-full flex flex-col overflow-hidden hover:shadow-md transition-all">
        <div className="p-4 border-b border-border bg-slate-50/50 flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="font-bold text-sm uppercase tracking-wider text-green-700">Puan Durumu</h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="text-[10px] text-muted-foreground bg-slate-50/80 uppercase tracking-wider sticky top-0 backdrop-blur-sm z-10">
                    <tr>
                        <th className="px-3 py-3 w-8 font-bold text-center">#</th>
                        <th className="px-3 py-3 font-bold">Takım</th>
                        <th className="px-1 py-3 text-center w-8" title="Oynanan">O</th>
                        <th className="px-1 py-3 text-center w-8" title="Averaj">AV</th>
                        <th className="px-3 py-3 text-center w-10 font-bold" title="Puan">P</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium text-xs">
                    {standings.length === 0 ? (
                        <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Veri yok</td></tr>
                    ) : standings.sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 10).map((team, i) => ( // Showing top 10 for compactness in widget
                        <tr key={team.id} className="hover:bg-slate-50 transition-colors group">
                            <td className={`px-3 py-2.5 text-center font-bold ${i < 3 ? 'text-green-600' : i > 16 ? 'text-red-600' : 'text-slate-500'}`}>
                                {team.rank || i + 1}
                            </td>
                            <td className="px-3 py-2.5 text-foreground group-hover:text-primary transition-colors truncate max-w-[140px]" title={team.teamName}>{team.teamName}</td>
                            <td className="px-1 py-2.5 text-center text-slate-500">{team.played}</td>
                            <td className="px-1 py-2.5 text-center text-slate-500">{team.goalDiff}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-foreground bg-slate-50/50 rounded-sm">{team.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {standings.length > 10 && (
                <div className="p-2 text-center text-[10px] text-muted-foreground bg-slate-50 border-t border-border">
                    ...ve {standings.length - 10} takım daha
                </div>
            )}
        </div>
    </div>
);

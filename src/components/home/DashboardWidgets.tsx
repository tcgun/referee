"use client";

import { Opinion, DisciplinaryAction, Statement, Standing } from '@/types';
import Link from 'next/link';

// Helper to color judgment
const getJudgmentColor = (j: string) => {
    switch (j) {
        case 'correct': return 'text-green-600';
        case 'incorrect': return 'text-red-600';
        case 'controversial': return 'text-orange-600';
        default: return 'text-gray-600';
    }
};

interface MatchGroupedOpinions {
    matchId: string;
    matchName: string;
    opinions: Opinion[];
}

export const TrioSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <div className="bg-white p-4 rounded shadow h-full flex flex-col">
        <h3 className="font-bold text-lg mb-3 border-b pb-2 text-blue-900 border-blue-100 flex items-center gap-2">
            📺 Trio Yorumları
        </h3>
        <div className="space-y-4 overflow-y-auto flex-1 max-h-80">
            {groupedOpinions.length === 0 ? <p className="text-gray-400 text-sm">Henüz yorum yok.</p> : groupedOpinions.map((group) => (
                <div key={group.matchId} className="space-y-2">
                    <Link href={`/matches/${group.matchId}`} className="text-xs font-bold text-blue-600 hover:underline uppercase tracking-wider block">
                        {group.matchName} &rarr;
                    </Link>
                    {group.opinions.map((op, i) => (
                        <div key={i} className="border-l-4 border-blue-500 pl-3 py-1 bg-gray-50 rounded-r">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span className="font-bold text-gray-800">{op.criticName}</span>
                                <span className={`font-bold capitalize ${getJudgmentColor(op.judgment)}`}>{op.judgment}</span>
                            </div>
                            <p className="text-sm text-gray-800 italic">"{op.opinion}"</p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const GeneralCommentsSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <div className="bg-white p-4 rounded shadow h-full flex flex-col">
        <h3 className="font-bold text-lg mb-3 border-b pb-2 text-purple-900 border-purple-100 flex items-center gap-2">
            🎙️ Yorumcular Ne Dedi?
        </h3>
        <div className="space-y-4 overflow-y-auto flex-1 max-h-80">
            {groupedOpinions.length === 0 ? <p className="text-gray-400 text-sm">Henüz yorum yok.</p> : groupedOpinions.map((group) => (
                <div key={group.matchId} className="space-y-2">
                    <Link href={`/matches/${group.matchId}`} className="text-xs font-bold text-purple-600 hover:underline uppercase tracking-wider block">
                        {group.matchName} &rarr;
                    </Link>
                    {group.opinions.map((op, i) => (
                        <div key={i} className="border-l-4 border-purple-500 pl-3 py-1 bg-gray-50 rounded-r">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span className="font-bold text-gray-800">{op.criticName}</span>
                            </div>
                            <p className="text-sm text-gray-800">"{op.opinion}"</p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const PfdkSection = ({ actions, statements }: { actions: DisciplinaryAction[], statements?: Statement[] }) => (
    <div className="bg-white p-4 rounded shadow h-full flex flex-col">
        <h3 className="font-bold text-lg mb-3 border-b pb-2 text-red-900 border-red-100 flex items-center gap-2">
            ⚖️ PFDK Sevk ve Kararları
        </h3>
        <div className="space-y-3 overflow-y-auto flex-1 max-h-80 py-1">
            {/* PFDK Statements (Official Decisions) */}
            {statements && statements.map((st, i) => (
                <div key={`st-${i}`} className="bg-red-100 p-3 rounded border border-red-200 mb-4 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-700 text-white">RESMİ KARAR</span>
                        <span className="text-xs text-gray-500">{st.date}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 leading-tight mb-1">{st.title}</h4>
                    <p className="text-xs text-gray-800 line-clamp-3">{st.content}</p>
                </div>
            ))}

            {/* Individual Sevkler */}
            {actions.length === 0 && (!statements || statements.length === 0) ? <p className="text-gray-400 text-sm">Veri bulunmuyor.</p> : actions.map((act, i) => (
                <div key={i} className="bg-red-50 p-3 rounded border border-red-100">
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-red-800 text-sm">{act.subject}</span>
                        <span className="text-xs text-gray-500">{act.date}</span>
                    </div>
                    <div className="text-xs text-gray-600 font-semibold mb-1">{act.teamName}</div>
                    <p className="text-sm text-gray-800">{act.reason}</p>
                </div>
            ))}
        </div>
    </div>
);

export const StatementsSection = ({ statements }: { statements: Statement[] }) => (
    <div className="bg-white p-4 rounded shadow h-full flex flex-col">
        <h3 className="font-bold text-lg mb-3 border-b pb-2 text-gray-800 flex items-center gap-2">
            📢 TFF / Kulüp Açıklamaları
        </h3>
        <div className="space-y-3 overflow-y-auto flex-1 max-h-80">
            {statements.length === 0 ? <p className="text-gray-400 text-sm">Açıklama yok.</p> : statements.map((st, i) => (
                <div key={i} className={`p-3 rounded border ${st.type === 'tff' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${st.type === 'tff' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'}`}>
                            {st.entity}
                        </span>
                        <span className="text-xs text-gray-400">{st.date}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 leading-tight mb-1">{st.title}</h4>
                    <p className="text-xs text-gray-700 line-clamp-3">{st.content}</p>
                </div>
            ))}
        </div>
    </div>
);

export const StandingsSection = ({ standings }: { standings: Standing[] }) => (
    <div className="bg-white p-4 rounded shadow h-full flex flex-col">
        <h3 className="font-bold text-lg mb-3 border-b pb-2 text-green-900 border-green-100 flex items-center gap-2">
            🏆 Puan Durumu
        </h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                    <tr>
                        <th className="px-2 py-2 w-8">#</th>
                        <th className="px-2 py-2">Takım</th>
                        <th className="px-1 py-2 text-center" title="Oynanan">O</th>
                        <th className="px-1 py-2 text-center" title="Galibiyet">G</th>
                        <th className="px-1 py-2 text-center" title="Beraberlik">B</th>
                        <th className="px-1 py-2 text-center" title="Mağlubiyet">M</th>
                        <th className="px-1 py-2 text-center" title="Atılan Gol">AG</th>
                        <th className="px-1 py-2 text-center" title="Yenilen Gol">YG</th>
                        <th className="px-1 py-2 text-center" title="Averaj">AV</th>
                        <th className="px-2 py-2 text-center font-bold" title="Puan">P</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {standings.length === 0 ? (
                        <tr><td colSpan={10} className="text-center p-4 text-gray-400">Veri yok</td></tr>
                    ) : standings.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((team, i) => (
                        <tr key={team.id} className="hover:bg-gray-50">
                            <td className="px-2 py-2 font-bold text-gray-800">{team.rank || i + 1}</td>
                            <td className="px-2 py-2 font-bold text-gray-900 truncate max-w-[120px]" title={team.teamName}>{team.teamName}</td>
                            <td className="px-1 py-2 text-center text-gray-800">{team.played}</td>
                            <td className="px-1 py-2 text-center text-gray-800">{team.won}</td>
                            <td className="px-1 py-2 text-center text-gray-800">{team.drawn}</td>
                            <td className="px-1 py-2 text-center text-gray-800">{team.lost}</td>
                            <td className="px-1 py-2 text-center text-gray-800">{team.goalsFor}</td>
                            <td className="px-1 py-2 text-center text-gray-800">{team.goalsAgainst}</td>
                            <td className="px-1 py-2 text-center text-gray-800">{team.goalDiff}</td>
                            <td className="px-2 py-2 text-center font-bold text-green-700 bg-green-50 rounded">{team.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

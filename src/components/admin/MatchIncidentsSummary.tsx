"use client";

import { Incident } from '@/types';

interface MatchIncidentsSummaryProps {
    incidents: Incident[];
}

export const MatchIncidentsSummary = ({ incidents }: MatchIncidentsSummaryProps) => {
    // Sort incidents by incident ID
    const sortedIncidents = [...incidents].sort((a, b) => 
        a.id.localeCompare(b.id, undefined, { numeric: true })
    );

    if (!sortedIncidents.length) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-sm uppercase text-slate-700">Pozisyon Karar Özeti</h3>
                <p className="text-xs text-slate-500 mt-1">Seçili maçtaki pozisyonların kararları ve kart hataları.</p>
            </div>
            <div className="p-6 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-100 text-slate-700 text-xs uppercase font-black tracking-wider">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">INC</th>
                            <th className="px-4 py-3">Dk</th>
                            <th className="px-4 py-3">Açıklama</th>
                            <th className="px-4 py-3">VAR</th>
                            <th className="px-4 py-3 text-amber-700 bg-amber-50">Eksik Kart</th>
                            <th className="px-4 py-3 text-blue-700 bg-blue-50">Hatali Kart</th>
                            <th className="px-4 py-3">Hakem</th>
                            <th className="px-4 py-3 rounded-tr-lg">Net Karar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedIncidents.map((inc) => (
                            <tr key={inc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-mono text-slate-400 font-bold">{inc.id}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-red-600 font-black">{inc.minute}'</td>
                                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate" title={inc.description}>{inc.description}</td>
                                <td className="px-4 py-3">
                                    {inc.varDecision && inc.varDecision !== 'Müdahale Yok' && inc.varDecision !== '(Yok/Seçiniz)' ? (
                                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tight whitespace-nowrap">
                                            {inc.varDecision}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                
                                <td className="px-4 py-3 bg-amber-50/30">
                                    {(inc.missedCards && inc.missedCards.length > 0) ? (
                                        <div className="flex flex-col gap-1">
                                            {inc.missedCards.map((mc, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 text-[11px] font-bold">
                                                    <span className={`w-2 h-3 rounded-sm ${mc.card === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'}`}></span>
                                                    <span>{mc.player}</span>
                                                    {mc.isRepeated && <span className="text-red-500">({mc.repeatedCount}. KEZ)</span>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-400">-</span>}
                                </td>

                                <td className="px-4 py-3 bg-blue-50/30">
                                    {(inc.incorrectCards && inc.incorrectCards.length > 0) ? (
                                        <div className="flex flex-col gap-1">
                                            {inc.incorrectCards.map((ic, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 text-[11px] font-bold">
                                                    <span className="truncate max-w-[80px]">{ic.player}</span>
                                                    <span className={`w-1.5 h-2 rounded-sm shrink-0 ${ic.givenCard === 'yellow' ? 'bg-yellow-400' : ic.givenCard === 'red' ? 'bg-red-600' : 'bg-slate-300'}`}></span>
                                                    <span className="text-slate-400">→</span>
                                                    <span className={`w-1.5 h-2 rounded-sm shrink-0 ${ic.correctCard === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'}`}></span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <span className="text-slate-400">-</span>}
                                </td>

                                <td className="px-4 py-3 font-bold text-slate-700">{inc.refereeDecision || '-'}</td>
                                <td className="px-4 py-3 font-black text-green-700 uppercase">{inc.finalDecision || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

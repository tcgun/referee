import React from 'react';
import { Match } from '@/types';

interface MatchHistoryProps {
    matches: (Match & { id: string })[];
    officialName: string;
}

/**
 * Görevlinin atandığı maçların listesini gösteren bileşen.
 * Component displaying the list of matches assigned to an official.
 */
export const MatchHistory: React.FC<MatchHistoryProps> = ({ matches, officialName }) => {
    if (matches.length === 0) return null;

    return (
        <div className="border-t border-slate-100 p-6 bg-slate-50/50">
            <h4 className="font-bold text-slate-700 mb-3 text-sm">
                Görev Aldığı Maçlar ({matches.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {matches.map(m => (
                    <div key={m.id} className="bg-white p-3 rounded border border-slate-200 text-xs flex justify-between items-center hover:border-blue-300 transition-colors">
                        <div>
                            <div className="font-bold text-slate-800">{m.homeTeamName} - {m.awayTeamName}</div>
                            <div className="text-slate-500">
                                {new Date(m.date).toLocaleDateString('tr-TR')} - Hafta: {m.week}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-slate-400 text-[10px] mb-1">{m.id}</div>
                            {/* Görevlinin bu maçtaki rolünü bul / Find official's role in this match */}
                            {(() => {
                                const roles: string[] = [];
                                const off = m.officials;
                                if (!off) {
                                    // Legacy support
                                    if (m.referee === officialName) roles.push('Hakem');
                                    if (m.varReferee === officialName) roles.push('VAR');
                                    return roles.length > 0 ? <span className="text-blue-600 font-bold">{roles.join(', ')}</span> : null;
                                }

                                if (off.referees?.[0] === officialName) roles.push('Orta Hakem');
                                if (off.referees?.slice(1, 3).includes(officialName)) roles.push('Yardımcı');
                                if (off.referees?.[3] === officialName) roles.push('4. Hakem');
                                if (off.varReferees?.[0] === officialName) roles.push('VAR');
                                if (off.varReferees?.slice(1).includes(officialName)) roles.push('AVAR');
                                if (off.observers?.includes(officialName)) roles.push('Gözlemci');
                                if (off.representatives?.includes(officialName)) roles.push('Temsilci');

                                return roles.length > 0 ? (
                                    <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                                        {roles.join(', ')}
                                    </span>
                                ) : null;
                            })()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

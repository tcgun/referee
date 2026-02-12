"use client";

import { Opinion } from '@/types';
import Link from 'next/link';

export interface MatchGroupedOpinions {
    matchId: string;
    matchName: string;
    week?: number;
    homeTeam?: string;
    awayTeam?: string;
    score?: string;
    opinions: Opinion[];
    againstCount?: number;
    date?: string;
}

export const MatchItem = ({ match, headerColor }: { match: MatchGroupedOpinions, headerColor?: string }) => {
    // Calculate Stats
    const stats = {
        correct: match.opinions.filter(o => o.judgment === 'correct').length,
        incorrect: match.opinions.filter(o => o.judgment === 'incorrect').length,
        controversial: match.opinions.filter(o => o.judgment === 'controversial').length,
    };

    return (
        <Link href={`/matches/${match.matchId}`} className="block border-b border-white/10 last:border-0 group">
            <div className="p-4 bg-[#161b22] hover:bg-zinc-800 transition-all flex flex-col gap-3">

                {/* Header: Teams & Score */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        {/* Home */}
                        <span className="text-sm font-black text-white text-right flex-1 truncate">{match.homeTeam || 'Ev Sahibi'}</span>

                        {/* Score & Date Container */}
                        <div className="flex flex-col items-center gap-1 min-w-[100px]">
                            {/* Score Badge */}
                            <div className="bg-black border-2 border-zinc-700 px-3 py-1 rounded-md text-sm font-black text-white tracking-widest w-full text-center shadow-neo-sm group-hover:shadow-none transition-all">
                                {(match.score && !match.score.includes('undefined') && match.score !== 'v') ? match.score : 'vs'}
                            </div>

                            {/* Date & Time */}
                            {match.date && (
                                <div className="text-[10px] font-mono font-black text-white border border-white/10 px-1.5 py-0.5 rounded bg-zinc-900">
                                    {new Date(match.date).toLocaleString('tr-TR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Away */}
                        <span className="text-sm font-black text-white text-left flex-1 truncate">{match.awayTeam || 'Deplasman'}</span>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex justify-center flex-wrap gap-2">
                    {(match.againstCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1 bg-black border border-white/10 text-white px-2 py-1 rounded text-[10px] font-black uppercase transition-transform group-hover:scale-105">
                            <span className="opacity-60">ALEYHE POZİSYON</span>
                            <span className="bg-secondary text-black px-1.5 rounded-[2px] text-[9px] border border-black">{match.againstCount}</span>
                        </div>
                    )}
                    {match.opinions.length === 0 && (
                        <span className="text-[10px] text-zinc-500 font-black italic">Henüz yorum yok</span>
                    )}
                </div>

            </div>
        </Link>
    );
};

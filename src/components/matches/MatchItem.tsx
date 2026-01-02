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
    againstCount?: number; // Count of positions with 'against' or judged incorrect
}

export const MatchItem = ({ match, headerColor }: { match: MatchGroupedOpinions, headerColor?: string }) => {
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
                            {match.score && !match.score.includes('undefined') ? match.score : 'v'}
                        </div>

                        {/* Away */}
                        <span className="text-sm font-bold text-foreground text-left flex-1 truncate">{match.awayTeam || 'Deplasman'}</span>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="flex justify-center flex-wrap gap-2">
                    {match.againstCount !== undefined && match.againstCount > 0 && (
                        <div className="flex items-center gap-1 bg-red-950/40 border border-red-500/30 text-red-500 px-2 py-1 rounded text-[10px] font-black uppercase transition-transform group-hover:scale-105">
                            <span>ALEYHE POZİSYON</span>
                            <span className="bg-red-600 text-white px-1.5 rounded-[2px] text-[9px]">{match.againstCount}</span>
                        </div>
                    )}
                    {stats.controversial > 0 && (
                        <div className="flex items-center gap-1 bg-emerald-900/30 border border-emerald-900/50 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase transition-transform group-hover:scale-105">
                            <span>Tartışmalı</span>
                            <span className="bg-emerald-500 text-emerald-950 px-1 rounded-[2px] text-[9px]">{stats.controversial}</span>
                        </div>
                    )}
                    {stats.incorrect > 0 && (
                        <div className="flex items-center gap-1 bg-red-900/30 border border-red-900/50 text-red-400 px-2 py-1 rounded text-[10px] font-bold uppercase transition-transform group-hover:scale-105">
                            <span>Hatalı Karar</span>
                            <span className="bg-red-500 text-red-950 px-1 rounded-[2px] text-[9px]">{stats.incorrect}</span>
                        </div>
                    )}
                    {stats.correct > 0 && (
                        <div className="flex items-center gap-1 bg-blue-900/30 border border-blue-900/50 text-blue-400 px-2 py-1 rounded text-[10px] font-bold uppercase transition-transform group-hover:scale-105">
                            <span>Doğru Karar</span>
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

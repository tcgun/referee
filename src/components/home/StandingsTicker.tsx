"use client";

import { Standing } from '@/types';

export function StandingsTicker({ standings }: { standings: Standing[] }) {
    if (!standings || standings.length === 0) return null;

    const sorted = [...standings].sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 18);

    return (
        <div className="w-full bg-slate-900/40 backdrop-blur-md border border-border/50 rounded-lg py-1 px-2 mb-6 shadow-inner overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max lg:min-w-0 lg:justify-between lg:w-full">
                {sorted.map((s, i) => (
                    <div key={s.id || i} className="flex items-center shrink-0">
                        <div className="flex items-center gap-1 group">
                            <span className={`text-[9px] font-black italic shrink-0 ${i === 0 ? 'text-blue-500' :
                                    i < 4 ? 'text-cyan-500' :
                                        i >= 15 ? 'text-red-500' :
                                            'text-muted-foreground'
                                }`}>
                                {i + 1}
                            </span>
                            <span className="text-[10px] font-black text-foreground/90 uppercase tracking-tighter shrink-0">
                                {s.id?.toUpperCase() || '-'}
                            </span>
                            <span className="text-[10px] font-black text-primary shrink-0">
                                {s.points || 0}
                            </span>
                        </div>
                        {i < sorted.length - 1 && (
                            <div className="w-[1px] h-2 bg-border/30 ml-2 lg:ml-1 shrink-0" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

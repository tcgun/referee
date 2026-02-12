"use client";

import { Standing } from '@/types';

export function StandingsTicker({ standings }: { standings: Standing[] }) {
    if (!standings || standings.length === 0) return null;

    const sorted = [...standings].sort((a, b) => (a.rank || 99) - (b.rank || 99)).slice(0, 22);

    return (
        <div className="w-full bg-[#161b22] border border-white/10 rounded-2xl py-2 px-3 mb-6">
            <div className="flex items-center justify-between w-full">
                {sorted.map((s, i) => (
                    <div key={s.id || i} className="flex items-center gap-1 cursor-default hover:scale-110 transition-transform">
                        <span className={`text-[10px] md:text-[11px] font-black italic ${i < 4 ? 'text-blue-400' :
                            i >= 16 ? 'text-red-500' :
                                'text-white/40'
                            }`}>
                            {i + 1}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] md:text-[12px] font-black text-white uppercase tracking-tighter">
                                {s.id?.toUpperCase() || '-'}
                            </span>
                            <span className="text-[11px] md:text-[12px] font-bold text-white/30">
                                {s.points || 0}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

"use client";

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function RefereesPage() {
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-12">
                <div className="flex flex-col gap-1 pb-6 border-b border-white/5">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
                        HAKEM <span className="text-primary">İSTATİSTİKLERİ</span>
                    </h1>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-90">
                        DETAYLI HAKEM PERFORMANS ANALİZLERİ VE RAPORLAR
                    </p>
                </div>

                {/* Sezon Seçici */}
                <div className="flex items-center justify-between gap-4 bg-[#161b22] p-3 rounded-2xl border border-white/10 shadow-2xl flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Aktif Sezon:</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5">{selectedSeason}</span>
                    </div>
                    <div className="flex bg-slate-950 p-1.5 rounded-xl border border-white/5 gap-1">
                        {['2025-2026', '2026-2027'].map((season) => (
                            <button
                                key={season}
                                onClick={() => setSelectedSeason(season)}
                                className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${selectedSeason === season
                                    ? 'bg-primary text-black shadow-md scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                    }`}
                            >
                                {season}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-[#161b22] border-2 border-white/20 rounded-2xl p-12 shadow-neo flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 shadow-xl animate-pulse">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                    </div>

                    <div className="space-y-2 max-w-md">
                        <h2 className="text-2xl font-black tracking-tighter text-white uppercase">
                            HAZIRLANIYOR
                        </h2>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed">
                            {selectedSeason} sezonuna ait detaylı hakem performans analizleri, hata oranları ve özel istatistik raporları çok yakında burada olacak.
                        </p>
                    </div>

                    <div className="pt-2">
                        <div className="h-1.5 w-24 bg-primary rounded-full shadow-glow" />
                    </div>
                </div>
            </div>
        </main>
    );
}

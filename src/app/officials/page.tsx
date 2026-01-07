"use client";

import { useEffect, useState } from 'react';

interface OfficialStat {
    name: string;
    region: string;
    rating: number;
    matches: number;
    roles: {
        referee: number;
        assistant: number;
        fourth: number;
        var: number;
        avar: number;
    };
    errors: number;
    controversial: number;
    correct: number;
}

export default function OfficialsPage() {
    const [stats, setStats] = useState<OfficialStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stats/referees')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setStats(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
                <header className="mb-8">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">
                        HAKEM VE GÖREVLİ <span className="text-primary">DÜNYASI</span>
                    </h1>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide mt-1">
                        2024-2025 Sezonu Performans Ve Görev İstatistikleri
                    </p>
                </header>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider">
                                <tr>
                                    <th className="p-4">Ad Soyad / Bölge</th>
                                    <th className="p-4 text-center">Reyting</th>
                                    <th className="p-4 text-center">ORTA</th>
                                    <th className="p-4 text-center">YRD</th>
                                    <th className="p-4 text-center">4. HKM</th>
                                    <th className="p-4 text-center">VAR</th>
                                    <th className="p-4 text-center">AVAR</th>
                                    <th className="p-4 text-center bg-slate-900 border-x border-slate-800 text-white font-black text-sm">TOPLAM</th>
                                    <th className="p-4 text-center bg-red-900 text-white border-x border-red-800">Hatalı</th>
                                    <th className="p-4 text-center text-orange-500">Tartışmalı</th>
                                    <th className="p-4 text-center text-green-500">Doğru</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium text-card-foreground">
                                {stats.map((ref: OfficialStat, i: number) => (
                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-sm">{ref.name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">{ref.region || '-'}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-black">
                                                ★ {ref.rating || '-'}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-center ${ref.roles.referee > 0 ? 'text-foreground font-bold' : 'text-muted-foreground/30'}`}>{ref.roles.referee}</td>
                                        <td className={`p-4 text-center ${ref.roles.assistant > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>{ref.roles.assistant}</td>
                                        <td className={`p-4 text-center ${ref.roles.fourth > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>{ref.roles.fourth}</td>
                                        <td className={`p-4 text-center ${ref.roles.var > 0 ? 'text-foreground font-bold' : 'text-muted-foreground/30'}`}>{ref.roles.var}</td>
                                        <td className={`p-4 text-center ${ref.roles.avar > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>{ref.roles.avar}</td>
                                        <td className="p-4 text-center font-black text-lg bg-slate-900 border-x border-slate-800 text-white font-mono">{ref.matches}</td>
                                        <td className="p-4 text-center font-bold bg-red-900 text-white border-x border-red-800">{ref.errors}</td>
                                        <td className="p-4 text-center text-orange-500 font-medium">{ref.controversial}</td>
                                        <td className="p-4 text-center text-green-500 font-medium">{ref.correct}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}

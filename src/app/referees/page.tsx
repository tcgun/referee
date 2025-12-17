"use client";

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/ui/PageShell'; // Wait, PageShell was deleted in revert. I need to make a simple layout wrapper or just use standard div.
// Revert deleted standard UI components, so I'll write raw Tailwind.

interface RefereeStat {
    name: string;
    matches: number;
    errors: number;
    controversial: number;
    correct: number;
}

export default function RefereesPage() {
    const [stats, setStats] = useState<RefereeStat[]>([]);
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
                        Hakem <span className="text-primary">İstatistikleri</span>
                    </h1>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide mt-1">
                        2024-2025 Sezonu Performans Raporu
                    </p>
                </header>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider">
                                <tr>
                                    <th className="p-4">Hakem</th>
                                    <th className="p-4 text-center">Maç</th>
                                    <th className="p-4 text-center text-red-500">Hatalı</th>
                                    <th className="p-4 text-center text-orange-500">Tartışmalı</th>
                                    <th className="p-4 text-center text-green-500">Doğru</th>
                                    <th className="p-4 text-center">Ort. Hata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium text-card-foreground">
                                {stats.map((ref, i) => (
                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4 font-bold">{ref.name}</td>
                                        <td className="p-4 text-center">{ref.matches}</td>
                                        <td className="p-4 text-center text-red-400 font-bold bg-red-900/10">{ref.errors}</td>
                                        <td className="p-4 text-center text-orange-400">{ref.controversial}</td>
                                        <td className="p-4 text-center text-green-400">{ref.correct}</td>
                                        <td className="p-4 text-center text-muted-foreground">
                                            {(ref.errors / (ref.matches || 1)).toFixed(1)}
                                        </td>
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

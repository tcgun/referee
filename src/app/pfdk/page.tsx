"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/client';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';

export default function PfdkPage() {
    const [weeks, setWeeks] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const { query, collection, getDocs, orderBy, limit } = await import('firebase/firestore');
                // Get only the highest week number (1 read)
                const q = query(collection(db, 'disciplinary_actions'), orderBy('week', 'desc'), limit(1));
                const docSnap = await getDocs(q);

                let maxWeek = 38; // Default to full season
                if (!docSnap.empty) {
                    maxWeek = docSnap.docs[0].data().week || 38;
                }

                // Generate array from 1 to maxWeek
                const allWeeks = Array.from({ length: maxWeek }, (_, i) => i + 1).sort((a, b) => b - a);
                setWeeks(allWeeks);
            } catch (err) {
                console.error("PFDK Page Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
        // ... (loading state preserved)
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-2xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-2 text-center">
                    <Skeleton className="h-10 w-64 mx-auto mb-2" />
                    <Skeleton className="h-4 w-full mx-auto" />
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50/50 p-4 border-b border-border">
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="divide-y divide-border">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-4" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-2xl mx-auto px-4 space-y-12">
                <div className="flex flex-col gap-1 pb-6 border-b border-white/5">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
                        PFDK <span className="text-primary">KARARLARI</span>
                    </h1>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-90">
                        PROFESYONEL FUTBOL DİSİPLİN KURULU HAFTALIK RAPORLARI
                    </p>
                </div>

                <div className="bg-[#161b22] border-2 border-white/20 rounded-xl overflow-hidden shadow-neo">
                    <div className="bg-white/5 p-4 border-b border-white/10">
                        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">HAFTALIK ARŞİV</h2>
                    </div>
                    {weeks.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground text-sm italic">Kayıt bulunamadı.</div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            {weeks.map(week => {
                                return (
                                    <Link key={week} href={`/pfdk/week/${week}`} className="block p-5 hover:bg-white/5 transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-bold text-lg group-hover:bg-primary/20 group-hover:scale-110 shadow-neo-sm transition-all">
                                                    📅
                                                </div>
                                                <div>
                                                    <span className="block text-lg font-black text-white group-hover:text-primary transition-colors">{week}. Hafta</span>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">HAFTALIK CEZA RAPORU</span>
                                                </div>
                                            </div>
                                            <div className="text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                                ➔
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

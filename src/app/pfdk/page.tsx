"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/client';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';

export default function PfdkPage() {
    const [dates, setDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                // We still fetch all to get unique dates (Firestore limitation for distinct queries)
                const docSnap = await getDocs(collection(db, 'disciplinary_actions'));

                const uniqueDates = new Set<string>();
                docSnap.docs.forEach(d => {
                    const data = d.data();
                    if (data.date) uniqueDates.add(data.date);
                });

                // Sort Dates (Newest First) - Assuming DD.MM.YYYY format
                const sorted = Array.from(uniqueDates).sort((a, b) => {
                    const [d1, m1, y1] = a.split('.').map(Number);
                    const [d2, m2, y2] = b.split('.').map(Number);

                    const dateA = new Date(y1, m1 - 1, d1).getTime();
                    const dateB = new Date(y2, m2 - 1, d2).getTime();

                    if (isNaN(dateA)) return 1;
                    if (isNaN(dateB)) return -1;

                    return dateB - dateA;
                });

                setDates(sorted);
            } catch (err) {
                console.error("PFDK Page Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
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
            <div className="max-w-2xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-2 text-center">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase text-red-500">PFDK KARARLARI</h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Profesyonel Futbol Disiplin Kurulu Sevk ve Ceza Raporları</p>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50/50 p-4 border-b border-border">
                        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest">TARİH LİSTESİ</h2>
                    </div>
                    {dates.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground text-sm">Kayıt bulunamadı.</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {dates.map(date => {
                                // Convert DD.MM.YYYY to DD-MM-YYYY for URL
                                const urlDate = date.replaceAll('.', '-');
                                return (
                                    <Link key={date} href={`/pfdk/${urlDate}`} className="block p-5 hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 font-bold text-xs group-hover:bg-red-100 group-hover:scale-110 transition-all">
                                                    📄
                                                </div>
                                                <div>
                                                    <span className="block text-lg font-black text-gray-800 group-hover:text-red-600 transition-colors">{date}</span>
                                                    <span className="text-xs font-bold text-gray-400 uppercase">PFDK KARARLARI</span>
                                                </div>
                                            </div>
                                            <div className="text-gray-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all">
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

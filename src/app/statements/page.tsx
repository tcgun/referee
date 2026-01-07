"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Statement } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function StatementsPage() {
    const [statements, setStatements] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const stmtSnap = await getDocs(collection(db, 'statements'));
                setStatements(stmtSnap.docs.map(d => ({ ...d.data(), id: d.id } as Statement)));
            } catch (err) {
                console.error("Statements Page Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-64 mb-1" />
                    <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <div className="grid grid-cols-1 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-6 w-24 rounded-md" />
                                <Skeleton className="h-5 w-20 rounded" />
                            </div>
                            <Skeleton className="h-8 w-3/4 mb-3" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );

    const sorted = [...statements].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase text-amber-500">RESMİ AÇIKLAMALAR</h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">TFF, MHK ve Kulüplerden Gelen Güncel Duyurular</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {sorted.length === 0 ? (
                        <div className="p-20 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground font-medium">
                            Henüz kayıtlı bir açıklama bulunmuyor.
                        </div>
                    ) : sorted.map((st, i) => {
                        const isLong = st.content.length > 200;
                        const displayContent = isLong ? st.content.substring(0, 200).trim() + '...' : st.content;

                        return (
                            <div key={st.id || i} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                                <Link href={`/statements/${st.id}`} className="block h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
                                            {st.entity}
                                        </span>
                                        <span className="text-[11px] font-bold text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                            {st.date}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-black text-foreground mb-3 tracking-tight group-hover:text-amber-600 transition-colors uppercase">{st.title}</h2>
                                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4">
                                        {displayContent}
                                    </div>
                                    {isLong && (
                                        <div className="flex items-center gap-1 text-[11px] font-black text-amber-600 uppercase tracking-tighter hover:gap-2 transition-all">
                                            Devamını Oku
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Statement } from '@/types';

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
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Veriler Yükleniyor...</span>
            </div>
        </div>
    );

    // Filter out PFDK related if they are already on PFDK page, or show all? 
    // User asked for "Açıklamalar" in general.
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
                    ) : sorted.map((st, i) => (
                        <div key={st.id || i} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
                                    {st.entity}
                                </span>
                                <span className="text-[11px] font-bold text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                                    {st.date}
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-foreground mb-3 tracking-tight">{st.title}</h2>
                            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {st.content}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}

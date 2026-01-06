"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { DisciplinaryAction, Statement } from '@/types';
import Link from 'next/link';

export default function PfdkPage() {
    const [actions, setActions] = useState<DisciplinaryAction[]>([]);
    const [statements, setStatements] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const pfdkSnap = await getDocs(collection(db, 'disciplinary_actions'));
                setActions(pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction)));

                const stmtSnap = await getDocs(collection(db, 'statements'));
                setStatements(stmtSnap.docs.map(d => ({ ...d.data(), id: d.id } as Statement)));
            } catch (err) {
                console.error("PFDK Page Fetch Error:", err);
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

    const pfdkStatements = statements.filter(s => s.title.toLowerCase().includes('pfdk'));

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase text-red-500">PFDK KARARLARI</h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Profesyonel Futbol Disiplin Kurulu Sevk ve Ceza Raporları</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Disciplinary Actions */}
                    <section className="space-y-4">
                        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">SON SEVKLER VE CEZALAR</h2>
                        <div className="grid grid-cols-1 gap-4">
                            {actions.length === 0 ? (
                                <div className="p-12 text-center bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm">Kayıt bulunamadı.</div>
                            ) : actions.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((act, i) => (
                                <div key={act.id || i} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-red-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {act.type === 'performance' && <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded">HAKEM PERFORMANSI</span>}
                                                <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded">{act.subject}</span>
                                            </div>
                                            {act.teamName && <h3 className="font-black text-sm text-foreground uppercase">{act.teamName}</h3>}
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground font-mono">{act.date}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-3 italic">"{act.reason}"</p>
                                    {act.penalty && (
                                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-2 rounded text-xs font-bold text-red-700 dark:text-red-400">
                                            CEZA: {act.penalty}
                                        </div>
                                    )}
                                    {act.matchId && (
                                        <Link href={`/matches/${act.matchId}`} className="inline-block mt-3 text-[10px] font-black text-primary hover:underline">
                                            İLGİLİ MAÇI GÖR →
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Related Statements */}
                    {pfdkStatements.length > 0 && (
                        <section className="space-y-4 pt-8">
                            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">İLGİLİ RESMİ AÇIKLAMALAR</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {pfdkStatements.map((st, i) => (
                                    <div key={st.id || i} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{st.entity}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground font-mono">{st.date}</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-foreground mb-2">{st.title}</h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{st.content}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}

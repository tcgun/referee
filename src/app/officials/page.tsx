"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Match } from '@/types';
import Link from 'next/link';

export default function OfficialsPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const q = query(collection(db, 'matches'), orderBy('week', 'desc'));
                const snap = await getDocs(q);
                setMatches(snap.docs.map(d => ({ ...d.data(), id: d.id } as Match)));
            } catch (err) {
                console.error("Officials Page Fetch Error:", err);
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

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
                <header className="mb-8">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">
                        HAKEM, GÖZLEMCİ VE <span className="text-primary">TEMSİLCİLER</span>
                    </h1>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide mt-1">
                        Maç Görevlileri ve Atama Listesi
                    </p>
                </header>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider">
                                <tr>
                                    <th className="p-4">MAÇ / HAFTA</th>
                                    <th className="p-4">HAKEM</th>
                                    <th className="p-4">YARDIMCILAR</th>
                                    <th className="p-4">VAR / AVAR</th>
                                    <th className="p-4">GÖZLEMCİ</th>
                                    <th className="p-4">TEMSİLCİLER</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium text-card-foreground">
                                {matches.map((m, i) => (
                                    <tr key={m.id || i} className="hover:bg-muted/50 transition-colors">
                                        <td className="p-4">
                                            <Link href={`/matches/${m.id}`} className="hover:underline">
                                                <div className="font-black text-[10px] text-primary mb-0.5">{m.week}. HAFTA</div>
                                                <div className="font-bold">{m.homeTeamName} - {m.awayTeamName}</div>
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-foreground">{m.officials?.referees?.[0] || m.referee || '-'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-[10px] space-y-0.5">
                                                <div>1: {m.officials?.assistants?.[0] || '-'}</div>
                                                <div>2: {m.officials?.assistants?.[1] || '-'}</div>
                                                <div>4: {m.officials?.fourthOfficial || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-[10px] space-y-0.5">
                                                <div className="font-bold text-blue-500">VAR: {m.officials?.varReferees?.[0] || m.varReferee || '-'}</div>
                                                <div>AVAR: {m.officials?.varReferees?.[1] || m.officials?.avarReferees?.[0] || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-[10px]">{m.representatives?.observer || m.officials?.observers?.[0] || '-'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-[10px] space-y-0.5">
                                                <div>1: {m.representatives?.rep1 || m.officials?.representatives?.[0] || '-'}</div>
                                                <div>2: {m.representatives?.rep2 || m.officials?.representatives?.[1] || '-'}</div>
                                                {(m.representatives?.rep3 || m.officials?.representatives?.[2]) && <div>3: {m.representatives?.rep3 || m.officials?.representatives?.[2]}</div>}
                                            </div>
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

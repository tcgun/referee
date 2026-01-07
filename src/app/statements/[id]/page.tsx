"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Statement } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';

export default function StatementDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [statement, setStatement] = useState<Statement | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        async function fetchData() {
            try {
                setLoading(true);
                const docRef = doc(db, 'statements', id as string);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setStatement({ ...snap.data(), id: snap.id } as Statement);
                } else {
                    router.replace('/statements');
                }
            } catch (err) {
                console.error("Statement Detail Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id, router]);

    if (loading) return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-3xl mx-auto px-4 space-y-8">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-4 w-32 mb-8" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        </main>
    );

    if (!statement) return null;

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-3xl mx-auto px-4 space-y-8">
                {/* Navigation */}
                <Link
                    href="/statements"
                    className="inline-flex items-center gap-2 text-xs font-black text-amber-600 hover:text-amber-700 uppercase tracking-tighter"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    Açıklamalara Dön
                </Link>

                {/* Header Section */}
                <div className="space-y-4 border-b border-border pb-8">
                    <div className="flex items-center gap-3">
                        <span className="bg-amber-100 text-amber-700 text-xs font-black px-3 py-1 rounded-lg uppercase tracking-widest border border-amber-200">
                            {statement.entity}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground font-mono bg-muted px-2 py-1 rounded border border-border/50">
                            {statement.date}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight uppercase">
                        {statement.title}
                    </h1>
                </div>

                {/* Content Section */}
                <div className="prose prose-slate max-w-none">
                    <div className="text-base md:text-lg text-foreground/90 leading-relaxed whitespace-pre-wrap font-medium">
                        {statement.content}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="pt-12 border-t border-border mt-12">
                    <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-border flex flex-col gap-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resmi Duyuru Kaynağı</span>
                        <span className="text-sm font-bold text-foreground">{statement.entity} - {statement.type === 'tff' ? 'Kurumsal İletişim' : 'Kulüp İletişim'}</span>
                    </div>
                </div>
            </div>
        </main>
    );
}

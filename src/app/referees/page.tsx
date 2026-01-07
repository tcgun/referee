"use client";

import { ShieldCheck } from 'lucide-react';

export default function RefereesPage() {
    return (
        <main className="min-h-[80vh] bg-background flex items-center justify-center p-8">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 shadow-xl">
                        <ShieldCheck className="w-10 h-10 text-blue-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">
                        HAZIRLANIYOR
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Detaylı hakem performans analizleri ve özel istatistik raporları çok yakında burada olacak.
                    </p>
                </div>

                <div className="pt-4">
                    <div className="h-1 w-24 bg-blue-600 mx-auto rounded-full" />
                </div>
            </div>
        </main>
    );
}

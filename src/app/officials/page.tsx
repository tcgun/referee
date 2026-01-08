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
    topTeams?: { name: string; count: number }[];
}

export default function OfficialsPage() {
    const [data, setData] = useState<{
        referees: OfficialStat[];
        representatives: (OfficialStat & { topTeams?: { name: string; count: number }[] })[];
        observers: (OfficialStat & { topTeams?: { name: string; count: number }[] })[];
        rankings?: {
            referee: { name: string; count: number }[];
            assistant: { name: string; count: number }[];
            fourth: { name: string; count: number }[];
            var: { name: string; count: number }[];
            avar: { name: string; count: number }[];
            representative: { name: string; count: number }[];
            observer: { name: string; count: number }[];
        };
    }>({ referees: [], representatives: [], observers: [] });

    const [activeTabs, setActiveTabs] = useState<Set<string>>(new Set(['referees']));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stats/referees')
            .then(res => res.json())
            .then(data => {
                // Assuming the API now returns all data including rankings
                if (data) setData(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const toggleTab = (tab: string) => {
        const newTabs = new Set(activeTabs);

        if (newTabs.has(tab)) {
            // Only allow hiding if there's more than 1 tab active
            if (newTabs.size > 1) {
                newTabs.delete(tab);
            }
        } else {
            newTabs.add(tab);
        }
        setActiveTabs(newTabs);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const paginate = (list: any[]) => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return list.slice(start, end);
    };

    const PaginationControls = ({ totalItems }: { totalItems: number }) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-center gap-2 mt-8">
                <button
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg bg-card border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted transition-colors"
                >
                    Önceki
                </button>
                <span className="px-4 py-2 text-xs font-bold text-muted-foreground flex items-center">
                    Sayfa {currentPage} / {totalPages}
                </span>
                <button
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg bg-card border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted transition-colors"
                >
                    Sonraki
                </button>
            </div>
        );
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTabs]); // Reset page on tab switch (though activeTabs is a set, logic might need finer handling if multiple tabs active)

    if (loading) return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );

    const renderTopTeams = (teams?: { name: string; count: number }[]) => {
        if (!teams || teams.length === 0) return <span className="text-muted-foreground/30 text-[10px]">-</span>;
        return (
            <div className="flex flex-wrap gap-1.5 justify-center max-w-[180px] mx-auto">
                {teams.map((t, idx) => {
                    const displayName = t.name || 'Bilinmeyen';
                    return (
                        <div key={idx} className="bg-slate-950 text-white px-2 py-1 rounded-md text-[9px] font-black border border-slate-800 flex items-center gap-1.5 shadow-md hover:scale-105 transition-transform group/tag">
                            <span className="truncate max-w-[110px] opacity-90 group-hover/tag:opacity-100">{displayName}</span>
                            <span className="text-primary font-mono text-[10px]">[{t.count}]</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTop10List = (title: string, list?: { name: string; count: number }[]) => {
        if (!list || list.length === 0) return null;
        return (
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-primary border-b border-border pb-2">
                    {title}
                </h4>
                <div className="space-y-2">
                    {list.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs group">
                            <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                    idx === 1 ? 'bg-slate-100 text-slate-700' :
                                        idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {idx + 1}
                                </span>
                                <span className="font-bold group-hover:text-primary transition-colors">{item.name}</span>
                            </div>
                            <span className="font-black font-mono bg-slate-900 text-white px-2 py-0.5 rounded text-[10px]">
                                {item.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-background pb-20 pt-8 text-foreground">
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6 text-foreground">
                <header className="mb-0 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase">
                            HAKEM VE GÖREVLİ <span className="text-primary">DÜNYASI</span>
                        </h1>
                        <p className="text-muted-foreground text-[10px] font-bold tracking-widest mt-1 opacity-70">
                            2024-2025 SEZONU İSTATİSTİK MERKEZİ (V4)
                        </p>
                    </div>

                    <div className="flex bg-muted/80 backdrop-blur-sm p-1.5 rounded-2xl border border-border flex-wrap gap-1 shadow-inner">
                        {[
                            { id: 'referees', label: 'Hakemler' },
                            { id: 'representatives', label: 'Temsilciler' },
                            { id: 'observers', label: 'Gözlemciler' },
                            { id: 'rankings', label: 'EN ÇOK GÖREV ALANLAR' }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => toggleTab(btn.id)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTabs.has(btn.id)
                                    ? 'bg-slate-900 text-white shadow-xl ring-2 ring-primary/20 scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                                    }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </header>

                {activeTabs.has('rankings') && (
                    <section className="animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-2xl space-y-8 relative overflow-hidden bg-gradient-to-br from-card to-muted/20">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-40"></div>

                            <div className="flex flex-col items-center text-center space-y-2">
                                <h2 className="text-sm font-black uppercase tracking-[0.5em] text-primary">
                                    EN ÇOK GÖREV ALANLAR (TOP 10)
                                </h2>
                                <div className="h-1 w-12 bg-primary/20 rounded-full"></div>
                                <p className="text-[10px] text-muted-foreground font-bold tracking-widest opacity-60">
                                    SÜPER LİG 2024-2025 SEZONU GÖREV DAĞILIMI
                                </p>
                            </div>

                            {!data.rankings ? (
                                <div className="py-24 text-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                                        İstatistikler Filtreleniyor...
                                    </span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {renderTop10List("Orta Hakem", data.rankings?.referee)}
                                    {renderTop10List("Yardımcı Hakem", data.rankings?.assistant)}
                                    {renderTop10List("VAR Hakemi", data.rankings?.var)}
                                    {renderTop10List("AVAR Hakemi", data.rankings?.avar)}
                                    {renderTop10List("4. Hakem", data.rankings?.fourth)}
                                    {renderTop10List("Temsilciler", data.rankings?.representative)}
                                    {renderTop10List("Gözlemciler", data.rankings?.observer)}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <div className="space-y-12">
                    {activeTabs.has('referees') && data.referees.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <span className="w-8 h-px bg-primary/30"></span> Hakem İstatistikleri
                            </h3>
                            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border">
                                            <tr>
                                                <th className="p-4">Ad Soyad / Bölge</th>
                                                <th className="p-4 text-center">Reyting</th>
                                                <th className="p-4 text-center">
                                                    En Çok Görev
                                                    <div className="text-[7px] font-bold opacity-50 lowercase tracking-normal font-sans">(En az 2 maç)</div>
                                                </th>
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
                                            {paginate(data.referees).map((ref: OfficialStat, i: number) => (
                                                <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm tracking-tight">{ref.name}</div>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-black opacity-60">{ref.region || '-'}</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-600 text-[10px] font-black border border-amber-200 shadow-sm">
                                                            ★ {ref.rating || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {renderTopTeams(ref.topTeams)}
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
                            <PaginationControls totalItems={data.referees.length} />
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {activeTabs.has('representatives') && data.representatives.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <span className="w-8 h-px bg-primary/30"></span> Temsilci İstatistikleri
                                </h3>
                                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border">
                                            <tr>
                                                <th className="p-4">Temsilci / Bölge</th>
                                                <th className="p-4 text-center">En Çok Görev</th>
                                                <th className="p-4 text-center">Görev</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border font-medium">
                                            {paginate(data.representatives).map((rep: any, i: number) => (
                                                <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm">{rep.name}</div>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-black opacity-60">{rep.region || '-'}</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {renderTopTeams(rep.topTeams)}
                                                    </td>
                                                    <td className="p-4 text-center font-black text-lg bg-slate-900 text-white font-mono w-24">
                                                        {rep.matches}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <PaginationControls totalItems={data.representatives.length} />
                            </div>
                        )}

                        {activeTabs.has('observers') && data.observers.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <span className="w-8 h-px bg-primary/30"></span> Gözlemci İstatistikleri
                                </h3>
                                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border">
                                            <tr>
                                                <th className="p-4">Gözlemci / Bölge</th>
                                                <th className="p-4 text-center">En Çok Görev</th>
                                                <th className="p-4 text-center">Görev</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border font-medium">
                                            {paginate(data.observers).map((obs: any, i: number) => (
                                                <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm">{obs.name}</div>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-black opacity-60">{obs.region || '-'}</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {renderTopTeams(obs.topTeams)}
                                                    </td>
                                                    <td className="p-4 text-center font-black text-lg bg-slate-900 text-white font-mono w-24">
                                                        {obs.matches}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <PaginationControls totalItems={data.observers.length} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

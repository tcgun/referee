"use client";
 
import { useEffect, useState } from 'react';
import Link from 'next/link';

const getSlug = (name: string) => {
    if (!name) return '';
    return name
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'c')
        .replace(/ç/g, 'c')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};
 
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
    classification?: string;
    dbRoles?: string[];
    // Match-based computed stats (only populated for main referee role)
    avgYellowPerMatch?: number;
    avgRedPerMatch?: number;
    avgFoulsPerMatch?: number;
    avgGoalsPerMatch?: number;
    homeFoulRatio?: number;
    avgBallInPlayMin?: number;
}
 
interface PaginationControlsProps {
    totalItems: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
}
 
const PaginationControls = ({ totalItems, currentPage, onPageChange, itemsPerPage }: PaginationControlsProps) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
 
    return (
        <div className="flex justify-center gap-2 mt-8">
            <button
                onClick={() => { onPageChange(Math.max(1, currentPage - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-card border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted transition-colors"
            >
                Önceki
            </button>
            <span className="px-4 py-2 text-xs font-bold text-muted-foreground flex items-center">
                Sayfa {currentPage} / {totalPages}
            </span>
            <button
                onClick={() => { onPageChange(Math.min(totalPages, currentPage + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-card border border-border text-xs font-bold disabled:opacity-50 hover:bg-muted transition-colors"
            >
                Sonraki
            </button>
        </div>
    );
};
 
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
    const [selectedSeason, setSelectedSeason] = useState('2025-2026');
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'elite' | 'regular'>('all');
 
    useEffect(() => {
        fetch(`/api/stats/referees?season=${selectedSeason}`, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            })
            .then(data => {
                if (data && data.referees && data.representatives && data.observers) {
                    setData(data);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedSeason]);
 
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
        setCurrentPage(1);
    };
 
    const isEliteOfficial = (official: OfficialStat) => {
        const cls = official.classification || '';
        const isEliteCls = cls.startsWith('ust-') || cls === 'var-hakemi';
        
        const hasVarOrAvarRole = 
            (official.roles && (official.roles.var > 0 || official.roles.avar > 0)) ||
            (official.dbRoles && (official.dbRoles.includes('var') || official.dbRoles.includes('avar')));
 
        return isEliteCls || hasVarOrAvarRole;
    };
 
    const getFilteredList = (list: OfficialStat[]) => {
        if (classificationFilter === 'all') return list;
        if (classificationFilter === 'elite') return list.filter(isEliteOfficial);
        return list.filter(item => !isEliteOfficial(item));
    };
 
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
 
    const paginate = (list: OfficialStat[]) => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        return list.slice(start, end);
    };

    if (loading) return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
    );
 
    const filteredReferees = getFilteredList(data.referees);
    const filteredRepresentatives = getFilteredList(data.representatives);
    const filteredObservers = getFilteredList(data.observers);
 
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
                                <Link href={`/officials/${getSlug(item.name)}`} className="font-bold group-hover:text-primary transition-colors">
                                    {item.name}
                                </Link>
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
                <header className="mb-0 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                            HAKEM VE GÖREVLİ <span className="text-primary">DÜNYASI</span>
                        </h1>
                        <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-90">
                            {selectedSeason} SEZONU İSTATİSTİK MERKEZİ (V4)
                        </p>
                    </div>
 
                    <div className="flex bg-[#161b22] p-1.5 rounded-2xl border border-white/10 flex-wrap gap-1 shadow-2xl">
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
 
                {/* Sezon Seçici */}
                <div className="flex items-center justify-between gap-4 bg-[#161b22] p-3 rounded-2xl border border-white/10 shadow-2xl flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Aktif Sezon:</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5">{selectedSeason}</span>
                    </div>
                    <div className="flex bg-slate-950 p-1.5 rounded-xl border border-white/5 gap-1">
                        {['2025-2026', '2026-2027'].map((season) => (
                            <button
                                key={season}
                                onClick={() => { setSelectedSeason(season); setLoading(true); }}
                                className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${selectedSeason === season
                                    ? 'bg-primary text-black shadow-md scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                    }`}
                            >
                                
                                {season}
                            </button>
                        ))}
                    </div>
                </div>
 
                {/* Klasman Filtresi */}
                {!activeTabs.has('rankings') && (
                    <div className="flex items-center justify-between gap-4 bg-[#161b22] p-3 rounded-2xl border border-white/10 shadow-2xl flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Klasman Filtresi:</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5">
                                {classificationFilter === 'all' 
                                    ? 'TÜMÜ' 
                                    : classificationFilter === 'elite' 
                                        ? 'ÜST KLASMAN GÖREVLİLERİ (VAR/AVAR DAHİL)' 
                                        : 'KLASMAN GÖREVLİLERİ'}
                            </span>
                        </div>
                        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-white/5 gap-1">
                            {([
                                { id: 'all', label: 'TÜMÜ' },
                                { id: 'elite', label: 'ÜST KLASMAN' },
                                { id: 'regular', label: 'KLASMAN' }
                            ] as const).map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => { setClassificationFilter(filter.id); setCurrentPage(1); }}
                                    className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${classificationFilter === filter.id
                                        ? 'bg-primary text-black shadow-md scale-105'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
 
                {activeTabs.has('rankings') && (
                    <section className="animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="bg-card border border-border/60 rounded-3xl p-8 shadow-2xl space-y-8 relative overflow-hidden bg-linear-to-br from-card to-muted/20">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-transparent via-primary to-transparent opacity-40"></div>
 
                            <div className="flex flex-col items-center text-center space-y-2">
                                <h2 className="text-sm font-black uppercase tracking-[0.5em] text-primary">
                                    EN ÇOK GÖREV ALANLAR (TOP 10)
                                </h2>
                                <div className="h-1 w-12 bg-primary/20 rounded-full"></div>
                                <p className="text-[10px] text-muted-foreground font-bold tracking-widest opacity-60">
                                    SÜPER LİG {selectedSeason} SEZONU GÖREV DAĞILIMI
                                </p>
                            </div>
 
                            {!data.rankings ? (
                                <div className="py-24 text-center">
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">
                                        İstatistikler Filtreleniyor...
                                    </span>
                                </div>
                            ) : (
                                Object.values(data.rankings).some(arr => arr && arr.length > 0) ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {renderTop10List("Orta Hakem", data.rankings?.referee)}
                                        {renderTop10List("Yardımcı Hakem", data.rankings?.assistant)}
                                        {renderTop10List("VAR Hakemi", data.rankings?.var)}
                                        {renderTop10List("AVAR Hakemi", data.rankings?.avar)}
                                        {renderTop10List("4. Hakem", data.rankings?.fourth)}
                                        {renderTop10List("Temsilciler", data.rankings?.representative)}
                                        {renderTop10List("Gözlemciler", data.rankings?.observer)}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
                                        Seçilen sezona ait sıralama verisi bulunmamaktadır.
                                    </div>
                                )
                            )}
                        </div>
                    </section>
                )}
 
                <div className="space-y-12">
                    {activeTabs.has('referees') && (
                        filteredReferees.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <span className="w-8 h-px bg-primary/30"></span> Hakem İstatistikleri
                                </h3>
                                {/* Desktop View */}
                                <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-visible">
                                    <table className="w-full text-sm text-left">
                                        <thead className="sticky top-0 z-20 bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border shadow-md">
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
                                                <th className="p-4 text-center bg-amber-950/40 border-l border-amber-900/40 text-amber-500">
                                                    🟨/Maç
                                                    <div className="text-[7px] font-bold opacity-50 lowercase tracking-normal font-sans">ort. sarı kart</div>
                                                </th>
                                                <th className="p-4 text-center bg-amber-950/20 text-amber-700">
                                                    🟥/Maç
                                                    <div className="text-[7px] font-bold opacity-50 lowercase tracking-normal font-sans">ort. kırmızı kart</div>
                                                </th>
                                                <th className="p-4 text-center bg-blue-950/30 border-l border-blue-900/40 text-blue-500">
                                                    Faul/Maç
                                                    <div className="text-[7px] font-bold opacity-50 lowercase tracking-normal font-sans">ort. faul</div>
                                                </th>
                                                <th className="p-4 text-center bg-emerald-950/30 border-x border-emerald-900/40 text-emerald-500">
                                                    ⚽ Gol/Maç
                                                    <div className="text-[7px] font-bold opacity-50 lowercase tracking-normal font-sans">ort. gol</div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border font-medium text-card-foreground">
                                            {paginate(filteredReferees).map((ref: OfficialStat, i: number) => (
                                                <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                    <td className="p-4">
                                                        <Link href={`/officials/${getSlug(ref.name)}`} className="font-bold text-sm tracking-tight text-white hover:text-primary transition-colors">
                                                            {ref.name}
                                                        </Link>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-black opacity-60">{ref.region || '-'}</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="px-2 py-1 rounded-md bg-amber-950/30 text-amber-500 text-[10px] font-black border border-amber-900/50 shadow-sm">
                                                            ★ {ref.rating || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {renderTopTeams(ref.topTeams)}
                                                    </td>
                                                    <td className={`p-4 text-center ${ref.roles.referee > 0 ? 'text-white font-bold' : 'text-muted-foreground/30'}`}>{ref.roles.referee}</td>
                                                    <td className={`p-4 text-center ${ref.roles.assistant > 0 ? 'text-white' : 'text-muted-foreground/30'}`}>{ref.roles.assistant}</td>
                                                    <td className={`p-4 text-center ${ref.roles.fourth > 0 ? 'text-white' : 'text-muted-foreground/30'}`}>{ref.roles.fourth}</td>
                                                    <td className={`p-4 text-center ${ref.roles.var > 0 ? 'text-white font-bold' : 'text-muted-foreground/30'}`}>{ref.roles.var}</td>
                                                    <td className={`p-4 text-center ${ref.roles.avar > 0 ? 'text-white' : 'text-muted-foreground/30'}`}>{ref.roles.avar}</td>
                                                    <td className="p-4 text-center font-black text-lg bg-[#12141a] border-x border-white/5 text-white font-mono">{ref.matches}</td>
                                                    <td className="p-4 text-center bg-amber-950/10 border-l border-amber-900/30">
                                                        {ref.roles.referee > 0 && ref.avgYellowPerMatch !== undefined
                                                            ? <span className="text-amber-400 font-bold font-mono text-sm">{ref.avgYellowPerMatch.toFixed(2)}</span>
                                                            : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                    </td>
                                                    <td className="p-4 text-center bg-amber-950/5">
                                                        {ref.roles.referee > 0 && ref.avgRedPerMatch !== undefined
                                                            ? <span className="text-rose-400 font-bold font-mono text-sm">{ref.avgRedPerMatch.toFixed(2)}</span>
                                                            : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                    </td>
                                                    <td className="p-4 text-center bg-blue-950/7 border-l border-blue-900/30">
                                                        {ref.roles.referee > 0 && ref.avgFoulsPerMatch !== undefined
                                                            ? <span className="text-blue-400 font-bold font-mono text-sm">{ref.avgFoulsPerMatch.toFixed(1)}</span>
                                                            : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                    </td>
                                                    <td className="p-4 text-center bg-emerald-950/7 border-x border-emerald-900/30">
                                                        {ref.roles.referee > 0 && ref.avgGoalsPerMatch !== undefined
                                                            ? <span className="text-emerald-400 font-bold font-mono text-sm">{ref.avgGoalsPerMatch.toFixed(2)}</span>
                                                            : <span className="text-muted-foreground/20 text-xs">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View */}
                                <div className="block md:hidden space-y-3">
                                    {paginate(filteredReferees).map((ref: OfficialStat, i: number) => (
                                        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <Link href={`/officials/${getSlug(ref.name)}`} className="font-bold text-sm text-white hover:text-primary transition-colors">
                                                        {ref.name}
                                                    </Link>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-black opacity-60 mt-0.5">{ref.region || '-'}</div>
                                                </div>
                                                <span className="px-2 py-1 rounded-md bg-amber-950/30 text-amber-500 text-[10px] font-black border border-amber-900/50 shadow-sm shrink-0">
                                                    ★ {ref.rating || '-'}
                                                </span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                                                <span className="text-muted-foreground/60">En Çok Görev:</span>
                                                <div>{renderTopTeams(ref.topTeams)}</div>
                                            </div>

                                            <div className="grid grid-cols-4 gap-1.5 text-center pt-2 border-t border-white/5">
                                                <div>
                                                    <div className="text-[8px] font-black text-muted-foreground/60">ORTA</div>
                                                    <div className="text-xs font-mono font-bold text-white mt-0.5">{ref.roles.referee}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[8px] font-black text-muted-foreground/60">VAR</div>
                                                    <div className="text-xs font-mono font-bold text-white mt-0.5">{ref.roles.var}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[8px] font-black text-muted-foreground/60">TOPLAM</div>
                                                    <div className="text-xs font-mono font-black text-primary mt-0.5">{ref.matches}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[8px] font-black text-amber-500">🟨/Maç</div>
                                                    <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                                                        {ref.roles.referee > 0 && ref.avgYellowPerMatch !== undefined
                                                            ? ref.avgYellowPerMatch.toFixed(2)
                                                            : '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <PaginationControls totalItems={filteredReferees.length} currentPage={currentPage} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <span className="w-8 h-px bg-primary/30"></span> Hakem İstatistikleri
                                </h3>
                                <div className="bg-[#161b22] border border-white/10 rounded-2xl p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] shadow-xl">
                                    Seçilen sezona veya klasmana ait hakem verisi bulunmamaktadır.
                                </div>
                            </div>
                        )
                    )}
 
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {activeTabs.has('representatives') && (
                            filteredRepresentatives.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <span className="w-8 h-px bg-primary/30"></span> Temsilci İstatistikleri
                                    </h3>
                                    {/* Desktop View */}
                                    <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-visible">
                                        <table className="w-full text-sm text-left">
                                            <thead className="sticky top-0 z-20 bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border shadow-md">
                                                <tr>
                                                    <th className="p-4">Temsilci / Bölge</th>
                                                    <th className="p-4 text-center">En Çok Görev</th>
                                                    <th className="p-4 text-center">Görev</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border font-medium">
                                                {paginate(filteredRepresentatives).map((rep: OfficialStat, i: number) => (
                                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                        <td className="p-4">
                                                            <Link href={`/officials/${getSlug(rep.name)}`} className="font-bold text-sm text-white hover:text-primary transition-colors">
                                                                    {rep.name}
                                                            </Link>
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

                                    {/* Mobile Cards View */}
                                    <div className="block md:hidden space-y-3">
                                        {paginate(filteredRepresentatives).map((rep: OfficialStat, i: number) => (
                                            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <Link href={`/officials/${getSlug(rep.name)}`} className="font-bold text-sm text-white hover:text-primary transition-colors">
                                                            {rep.name}
                                                        </Link>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-black opacity-60 mt-0.5">{rep.region || '-'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-base font-mono font-black text-white">{rep.matches} Görev</div>
                                                        <div className="text-[8px] text-muted-foreground/50 font-bold uppercase">Temsilci</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                                                    <span className="text-muted-foreground/60">En Çok Görev:</span>
                                                    <div>{renderTopTeams(rep.topTeams)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <PaginationControls totalItems={filteredRepresentatives.length} currentPage={currentPage} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <span className="w-8 h-px bg-primary/30"></span> Temsilci İstatistikleri
                                    </h3>
                                    <div className="bg-[#161b22] border border-white/10 rounded-2xl p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] shadow-xl">
                                        Seçilen sezona veya klasmana ait temsilci verisi bulunmamaktadır.
                                    </div>
                                </div>
                            )
                        )}
 
                        {activeTabs.has('observers') && (
                            filteredObservers.length > 0 ? (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <span className="w-8 h-px bg-primary/30"></span> Gözlemci İstatistikleri
                                    </h3>
                                    {/* Desktop View */}
                                    <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-visible">
                                        <table className="w-full text-sm text-left">
                                            <thead className="sticky top-0 z-20 bg-muted text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border shadow-md">
                                                <tr>
                                                    <th className="p-4">Gözlemci / Bölge</th>
                                                    <th className="p-4 text-center">En Çok Görev</th>
                                                    <th className="p-4 text-center">Görev</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border font-medium">
                                                {paginate(filteredObservers).map((obs: OfficialStat, i: number) => (
                                                    <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                        <td className="p-4">
                                                            <Link href={`/officials/${getSlug(obs.name)}`} className="font-bold text-sm text-white hover:text-primary transition-colors">
                                                                {obs.name}
                                                            </Link>
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

                                    {/* Mobile Cards View */}
                                    <div className="block md:hidden space-y-3">
                                        {paginate(filteredObservers).map((obs: OfficialStat, i: number) => (
                                            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <Link href={`/officials/${getSlug(obs.name)}`} className="font-bold text-sm text-white hover:text-primary transition-colors">
                                                            {obs.name}
                                                        </Link>
                                                        <div className="text-[10px] text-muted-foreground uppercase font-black opacity-60 mt-0.5">{obs.region || '-'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-base font-mono font-black text-white">{obs.matches} Görev</div>
                                                        <div className="text-[8px] text-muted-foreground/50 font-bold uppercase">Gözlemci</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                                                    <span className="text-muted-foreground/60">En Çok Görev:</span>
                                                    <div>{renderTopTeams(obs.topTeams)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <PaginationControls totalItems={filteredObservers.length} currentPage={currentPage} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <span className="w-8 h-px bg-primary/30"></span> Gözlemci İstatistikleri
                                    </h3>
                                    <div className="bg-[#161b22] border border-white/10 rounded-2xl p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] shadow-xl">
                                        Seçilen sezona veya klasmana ait gözlemci verisi bulunmamaktadır.
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Team, Match, DisciplinaryAction } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { resolveTeamId, getTeamStadium } from '@/lib/teams';

export default function TeamPage() {
    const params = useParams();
    const teamId = params.id as string;
    const [team, setTeam] = useState<Team | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [actions, setActions] = useState<DisciplinaryAction[]>([]);
    const [activeTab, setActiveTab] = useState<'matches' | 'disciplinary'>('matches');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);

    const getNormalizedCategory = (act: DisciplinaryAction): string => {
        if (act.category) {
            const c = act.category.toUpperCase().trim();
            if (c === 'İDARECİ' || c === 'YÖNETİCİ') return 'YÖNETİCİ';
            if (c === 'TEKNİK SORUMLU' || c === 'TEKNİK KADRO') return 'TEKNİK KADRO';
            if (c === 'KULÜP ÇALIŞANI' || c === 'ÇALIŞAN') return 'ÇALIŞAN';
            return c; // KULÜP, FUTBOLCU, etc.
        }
        const s = (act.subject || '').toUpperCase();
        if (s === 'KULÜP' || s.includes('KULÜBÜ') || s.includes('A.Ş.')) return 'KULÜP';
        if (s.includes('İDARECİSİ') || s.includes('BAŞKANI') || s.includes('YÖNETİCİSİ')) return 'YÖNETİCİ';
        if (s.includes('TEKNİK') || s.includes('ANTRENÖR')) return 'TEKNİK KADRO';
        if (s.includes('GÖREVLİSİ') || s.includes('MASÖRÜ') || s.includes('ÇALIŞANI')) return 'ÇALIŞAN';
        return 'FUTBOLCU';
    };

    const categories = [
        { id: 'ALL', label: 'TÜMÜ' },
        { id: 'KULÜP', label: 'KULÜP CEZALARI' },
        { id: 'YÖNETİCİ', label: 'YÖNETİCİLER' },
        { id: 'TEKNİK KADRO', label: 'TEKNİK KADRO' },
        { id: 'FUTBOLCU', label: 'FUTBOLCULAR' },
        { id: 'ÇALIŞAN', label: 'ÇALIŞANLAR' }
    ];

    const filteredActions = selectedCategory === 'ALL'
        ? actions
        : actions.filter(act => getNormalizedCategory(act) === selectedCategory);

    useEffect(() => {
        async function fetchData() {
            if (!teamId) return;
            try {
                setLoading(true);
                // 1. Fetch Team
                const teamSnap = await getDoc(doc(db, 'teams', teamId));
                if (teamSnap.exists()) {
                    setTeam(teamSnap.data() as Team);
                }

                // 2. Fetch Matches
                const res = await fetch(`/api/public/matches?raw=true`);
                if (res.ok) {
                    const allMatches = await res.json() as Match[];
                    const filteredMatches = allMatches.filter(m => 
                        m.homeTeamId === teamId || m.awayTeamId === teamId
                    );
                    filteredMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    setMatches(filteredMatches);
                }

                // 3. Fetch Disciplinary Actions
                const pfdkSnap = await getDocs(collection(db, 'disciplinary_actions'));
                const allActions = pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction));
                const filteredActions = allActions.filter(act => {
                    return act.teamId === teamId || resolveTeamId(act.teamName || '') === teamId;
                });
                filteredActions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setActions(filteredActions);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [teamId]);

    const parsePenalty = (text: string) => {
        if (!text) return 0;
        const matches = text.match(/(\d{1,3}(\.\d{3})*)\s*TL/i);
        if (matches && matches[1]) {
            return parseInt(matches[1].replace(/\./g, ''));
        }
        return 0;
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('tr-TR').format(val) + " TL";
    };

    const getFinalPenalty = (act: DisciplinaryAction) => {
        if (act.appealStatus === 'accepted') {
            return '';
        }
        if (act.appealStatus === 'partially_accepted' && act.appealedPenalty) {
            return act.appealedPenalty;
        }
        return act.penalty || '';
    };

    const totalFine = actions.reduce((sum, act) => sum + parsePenalty(getFinalPenalty(act)), 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!team) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white">
                <div className="text-center py-20 text-muted-foreground text-xs font-bold uppercase tracking-[0.2em]">
                    Takım bulunamadı.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="text-primary hover:underline font-black text-xs uppercase tracking-wider mb-6 block w-fit">
                    &larr; Takımlara Dön
                </Link>

                <header className="mb-8 flex items-center gap-6 bg-[#161b22] p-6 rounded-2xl border border-white/10 shadow-neo">
                    <div className="w-20 h-20 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center font-bold text-gray-500 overflow-hidden shrink-0">
                        {team.logo ? (
                            <img src={team.logo} className="w-full h-full object-contain p-2" alt={team.name} />
                        ) : (
                            <span className="text-2xl font-black text-white">{team.name[0]}</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none mb-2">{team.name}</h1>
                        <div className="flex gap-2">
                            <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded border border-primary/20 uppercase tracking-wider">
                                SÜPER LİG
                            </span>
                            {getTeamStadium(teamId) && (
                                <span className="bg-white/5 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded border border-white/5 uppercase tracking-wider">
                                    🏟️ {getTeamStadium(teamId)}
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                {/* Tab Switcher */}
                <div className="flex bg-[#161b22] p-1.5 rounded-xl border border-white/10 shadow-neo-sm overflow-hidden mb-8">
                    <button
                        onClick={() => setActiveTab('matches')}
                        className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                            activeTab === 'matches'
                                ? 'bg-primary text-black shadow-lg scale-102'
                                : 'text-muted-foreground hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Maç Geçmişi
                    </button>
                    <button
                        onClick={() => setActiveTab('disciplinary')}
                        className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                            activeTab === 'disciplinary'
                                ? 'bg-red-600 text-white shadow-lg scale-102'
                                : 'text-muted-foreground hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Disiplin Analizi (PFDK)
                    </button>
                </div>

                {activeTab === 'matches' ? (
                    <div className="space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-primary mb-4 px-2">Maç Listesi</h2>
                        {matches.length === 0 && (
                            <p className="p-8 text-center bg-[#161b22] border border-white/5 rounded-2xl text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                Maç kaydı bulunamadı.
                            </p>
                        )}

                        {matches.map(match => (
                            <Link key={match.id} href={`/matches/${match.id}`} className="block">
                                <div className="bg-[#161b22] border border-white/10 p-4 rounded-2xl hover:border-primary/50 transition-all flex justify-between items-center relative overflow-hidden group">
                                    <div className="absolute top-0 bottom-0 left-0 w-1.5" style={{ backgroundColor: match.homeTeamId === teamId ? team.colors?.primary || '#FF5DAD' : '#64748b' }} />
                                    
                                    <div className="flex-1 text-right font-black uppercase text-xs md:text-sm pr-4 group-hover:text-primary transition-colors truncate">
                                        {match.homeTeamName}
                                    </div>
                                    <div className="px-4 text-center shrink-0">
                                        <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                                            {new Date(match.date).toLocaleDateString('tr-TR')}
                                        </div>
                                        <div className="text-sm font-black bg-slate-900 px-3 py-1 rounded-xl border border-white/5 text-primary font-mono">
                                            {match.score || 'v'}
                                        </div>
                                    </div>
                                    <div className="flex-1 text-left font-black uppercase text-xs md:text-sm pl-4 group-hover:text-primary transition-colors truncate">
                                        {match.awayTeamName}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Stats Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#161b22] border border-white/10 p-6 rounded-2xl shadow-neo-sm flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">TOPLAM SEVK</span>
                                <span className="text-3xl font-black text-blue-400 font-mono">{actions.length}</span>
                            </div>
                            <div className="bg-[#161b22] border border-white/10 p-6 rounded-2xl shadow-neo-sm flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">TOPLAM CEZA</span>
                                <span className="text-3xl font-black text-red-500 font-mono">{actions.filter(a => a.penalty).length}</span>
                            </div>
                            <div className="bg-[#161b22] border border-white/10 p-6 rounded-2xl shadow-neo-sm flex flex-col items-center justify-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">TOPLAM PARA CEZASI</span>
                                <span className="text-3xl font-black text-primary font-mono">{formatMoney(totalFine)}</span>
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-4 pt-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-primary px-2">Cezalar & Sevkler</h2>
                            
                            {/* Category Filter Tabs */}
                            <div className="flex flex-wrap gap-2 mb-4 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                                {categories.map(cat => {
                                    const count = cat.id === 'ALL'
                                        ? actions.length
                                        : actions.filter(a => getNormalizedCategory(a) === cat.id).length;

                                    if (count === 0 && cat.id !== 'ALL') return null; // Hide empty categories to keep UI clean

                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                                selectedCategory === cat.id
                                                    ? 'bg-primary text-black font-extrabold shadow-sm scale-102'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {cat.label} ({count})
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredActions.length === 0 && (
                                <p className="p-8 text-center bg-[#161b22] border border-white/5 rounded-2xl text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                    Bu kategoride disiplin kaydı bulunmamaktadır.
                                </p>
                            )}

                            {filteredActions.map(act => (
                                <div key={act.id} className="bg-[#161b22] border-2 border-white/10 rounded-2xl p-6 shadow-neo-sm flex flex-col gap-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
                                    
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-md font-black text-white uppercase tracking-tight">
                                                👤 {act.subject}
                                            </span>
                                            {!act.matchId && (
                                                <span className="inline-block mt-1 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 w-fit">
                                                    Bağlı Kulüp: {team?.name || act.teamName || ''} (Maçsız Sevk)
                                                </span>
                                            )}
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                                {act.reason}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="bg-slate-900 border border-white/5 text-gray-300 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                                                📅 {new Date(act.date).toLocaleDateString('tr-TR')}
                                            </span>
                                            {act.week && (
                                                <span className="bg-primary text-black text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">
                                                    {act.week}. HAFTA
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {act.penalty && (
                                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl flex flex-wrap items-center gap-2 justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-red-500 text-xs font-black uppercase tracking-wider ${act.appealStatus === 'accepted' || act.appealStatus === 'partially_accepted' ? 'line-through opacity-60' : ''}`}>
                                                    ⚠️ Ceza: {act.penalty}
                                                </span>
                                                {act.appealStatus && act.appealStatus !== 'none' && (
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-wider ${
                                                        act.appealStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        act.appealStatus === 'partially_accepted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        act.appealStatus === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                        {act.appealStatus === 'accepted' ? 'Tahkim: İptal' :
                                                         act.appealStatus === 'partially_accepted' ? `Tahkim: İndirildi (${act.appealedPenalty})` :
                                                         act.appealStatus === 'rejected' ? 'Tahkim: Red' : 'Tahkim: Karar Bekleniyor'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {act.appealStatus && act.appealStatus !== 'none' && act.appealNote && (
                                        <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4 text-xs text-gray-400 font-medium leading-relaxed mt-1">
                                            <div className="font-bold text-indigo-400 mb-1 flex items-center justify-between">
                                                <span>⚖️ Tahkim Kurulu Kararı</span>
                                                {act.appealDate && <span className="text-[9px] text-zinc-500">{act.appealDate}</span>}
                                            </div>
                                            {act.appealNote}
                                        </div>
                                    )}

                                    {act.note && (
                                        <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-xs text-gray-400 font-medium leading-relaxed">
                                            {act.note}
                                        </div>
                                    )}

                                    {act.matchId && (
                                        <div className="flex justify-end mt-2">
                                            <Link
                                                href={`/matches/${act.matchId.replace(/^d-/, '')}?tab=pfdk`}
                                                className="bg-slate-900 border border-white/10 hover:border-primary hover:text-primary text-white text-[9px] font-black px-4 py-2 rounded-lg transition-all uppercase tracking-widest active:scale-95 shadow-sm"
                                            >
                                                İlgili Maç Detayı ➔
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

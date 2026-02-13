"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/firebase/client';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';
import { DisciplinaryAction, Match } from '@/types';
import { cleanSponsorsInText, getTeamName, resolveTeamId } from '@/lib/teams';

export default function PfdkPage() {
    const [competition, setCompetition] = useState<'league' | 'cup'>('league');
    const [maxWeek, setMaxWeek] = useState(38);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [weekLoading, setWeekLoading] = useState(false);
    const [actions, setActions] = useState<DisciplinaryAction[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);

    // 1. Initial Load: Get max week (and potentially cup data if needed)
    useEffect(() => {
        async function fetchInitial() {
            try {
                setLoading(true);
                const q = query(
                    collection(db, 'disciplinary_actions'),
                    where('competition', '==', 'league'),
                    orderBy('week', 'desc'),
                    limit(1)
                );
                const docSnap = await getDocs(q);

                let mWeek = 34; // Updated default for 1-17, 18-34
                if (!docSnap.empty) {
                    mWeek = docSnap.docs[0].data().week || 34;
                }
                setMaxWeek(mWeek);
                setSelectedWeek(mWeek);
            } catch (err) {
                console.error("PFDK Max Week Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchInitial();
    }, []);

    // 2. Fetch Data when selectedWeek OR competition changes
    useEffect(() => {
        if (competition === 'league' && !selectedWeek) return;

        async function fetchWeekData() {
            try {
                setWeekLoading(true);
                const pfdkQ = competition === 'league'
                    ? query(collection(db, 'disciplinary_actions'), where('competition', '==', 'league'), where('week', '==', selectedWeek))
                    : query(collection(db, 'disciplinary_actions'), where('competition', '==', 'cup'), orderBy('date', 'desc'), limit(50));

                const pfdkSnap = await getDocs(pfdkQ);
                setActions(pfdkSnap.docs.map(d => ({ ...d.data(), id: d.id } as DisciplinaryAction)));

                const matchQ = competition === 'league'
                    ? query(collection(db, 'matches'), where('competition', '==', 'league'), where('week', '==', selectedWeek))
                    : query(collection(db, 'matches'), where('competition', '==', 'cup'), orderBy('date', 'desc'), limit(50));

                const matchSnap = await getDocs(matchQ);
                setMatches(matchSnap.docs.map(d => ({ ...d.data(), id: d.id } as Match)));
            } catch (err) {
                console.error("PFDK Fetch Data Error:", err);
            } finally {
                setWeekLoading(false);
            }
        }
        fetchWeekData();
    }, [selectedWeek, competition]);

    const cleanTeamName = (rawName: string) => {
        const id = resolveTeamId(rawName);
        return id ? getTeamName(id) : rawName;
    };

    // Grouping Logic
    const groupMap: Record<string, DisciplinaryAction[]> = {};
    actions.forEach(act => {
        let groupTitle = cleanTeamName(act.teamName || 'DİĞER');
        if (act.matchId) {
            const mId = act.matchId.replace(/^d-/, '');
            const match = matches.find(m => m.id === mId || m.id === `d-${mId}`);
            if (match) {
                groupTitle = `${cleanTeamName(match.homeTeamName)} - ${cleanTeamName(match.awayTeamName)}`;
            }
        }
        if (!groupMap[groupTitle]) groupMap[groupTitle] = [];
        groupMap[groupTitle].push(act);
    });
    const sortedGroups = Object.keys(groupMap).sort((a, b) => a.localeCompare(b, 'tr'));

    if (loading) return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
        </main>
    );

    const halfSplit = 17;
    const currentHalf = (selectedWeek || 1) <= halfSplit ? 1 : 2;

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500 leading-none">
                        PFDK <span className="">KARARLARI</span>
                    </h1>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-90">
                        PROFESYONEL FUTBOL DİSİPLİN KURULU ŞEFFAFLIK RAPORU
                    </p>
                </div>

                {/* Competition Switcher */}
                <div className="flex bg-[#161b22] p-1 rounded-xl border border-white/10 shadow-neo-sm overflow-hidden">
                    <button
                        onClick={() => setCompetition('league')}
                        className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${competition === 'league' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                    >
                        SÜPER LİG
                    </button>
                    <button
                        onClick={() => setCompetition('cup')}
                        className={`flex-1 py-3 px-4 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${competition === 'cup' ? 'bg-red-600 text-white shadow-lg' : 'text-muted-foreground hover:text-white hover:bg-white/5'}`}
                    >
                        TÜRKİYE KUPASI
                    </button>
                </div>

                {/* Week Selector (Only for League) */}
                {competition === 'league' && (
                    <div className="space-y-4">
                        <div className="flex gap-4 border-b border-border pb-2">
                            {[
                                { id: 1, label: `1. Yarı (1-17)`, range: [1, 17] },
                                { id: 2, label: `2. Yarı (18-34)`, range: [18, 34] }
                            ].map(half => {
                                const isActive = currentHalf === half.id;
                                return (
                                    <button
                                        key={half.id}
                                        onClick={() => setSelectedWeek(half.range[0])}
                                        className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {half.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 34 }, (_, i) => i + 1).map(week => {
                                const inGroup = currentHalf === 1 ? week <= 17 : week > 17;
                                if (!inGroup) return null;

                                const isSelected = selectedWeek === week;
                                const hasPassed = week <= maxWeek;

                                return (
                                    <button
                                        key={week}
                                        onClick={() => setSelectedWeek(week)}
                                        disabled={!hasPassed}
                                        className={`min-w-[42px] h-10 rounded-lg text-xs font-black transition-all border flex items-center justify-center ${isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105 z-10'
                                            : hasPassed
                                                ? 'bg-card text-foreground border-border hover:border-primary/50'
                                                : 'bg-muted/30 text-muted-foreground/30 border-transparent cursor-not-allowed'
                                            }`}
                                    >
                                        {week}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Week Content */}
                <div className="pt-8 space-y-6">
                    {competition === 'cup' && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                                TÜRKİYE KUPASI GÜNCEL DOSYALARI LİSTELENİYOR
                            </p>
                        </div>
                    )}

                    {weekLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                        </div>
                    ) : sortedGroups.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm italic">
                            {competition === 'league' ? `${selectedWeek}. Hafta için` : 'Türkiye Kupası için'} henüz kayıtlı bir sevk veya ceza bulunamadı.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {sortedGroups.map(group => {
                                const groupActions = groupMap[group];
                                const referralCount = groupActions.filter(a => !a.penalty).length;
                                const penaltyCount = groupActions.filter(a => a.penalty).length;
                                const firstAction = groupActions[0];
                                const matchId = firstAction?.matchId?.replace(/^d-/, '');

                                return (
                                    <div key={group} className="bg-white border-2 border-border rounded-xl p-6 shadow-neo overflow-hidden relative group hover:border-primary transition-colors">
                                        <div className="absolute top-0 left-0 right-0 h-1 flex">
                                            <div className="bg-blue-500" style={{ width: `${(referralCount / groupActions.length) * 100}%` }} />
                                            <div className="bg-red-500" style={{ width: `${(penaltyCount / groupActions.length) * 100}%` }} />
                                        </div>
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="flex-1 text-center md:text-left">
                                                <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight leading-none mb-2">{group}</h3>
                                                <div className="flex gap-2 justify-center md:justify-start">
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">{referralCount} SEVK</span>
                                                    <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase">{penaltyCount} CEZA</span>
                                                </div>
                                            </div>
                                            {matchId && (
                                                <Link
                                                    href={`/matches/${matchId}?tab=pfdk`}
                                                    className="bg-gray-900 text-white text-[10px] font-black px-6 py-3 rounded-lg hover:bg-primary hover:text-black transition-all uppercase tracking-widest shadow-neo-sm active:scale-95"
                                                >
                                                    MAÇ DETAYI ➔
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

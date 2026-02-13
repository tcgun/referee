"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Match, Opinion } from '@/types';
import { MatchItem, MatchGroupedOpinions } from '@/components/matches/MatchItem';

// Helper: Group matches by week
const groupByWeek = (matches: MatchGroupedOpinions[]) => {
    const groups: { [key: number]: MatchGroupedOpinions[] } = {};
    matches.forEach(m => {
        const week = m.week || 0;
        if (!groups[week]) groups[week] = [];
        groups[week].push(m);
    });
    // Sort weeks descending
    return Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([week, matches]) => ({ week: Number(week), matches }));
};

export default function MatchesListingPage() {
    const [competition, setCompetition] = useState<'league' | 'cup'>('league');
    const [matches, setMatches] = useState<MatchGroupedOpinions[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekLoading, setWeekLoading] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
    const [maxWeek, setMaxWeek] = useState(34);

    // 1. Initial Load: Get available weeks for League
    useEffect(() => {
        async function fetchInitial() {
            try {
                setLoading(true);
                // We could derive this from existing matches or hardcode 34
                // Let's find the max week currently in DB for league
                const { query, where, collection, getDocs, orderBy, limit } = await import('firebase/firestore');
                const q = query(
                    collection(db, 'matches'),
                    where('competition', '==', 'league'),
                    orderBy('week', 'desc'),
                    limit(1)
                );
                const snap = await getDocs(q);
                let mWeek = 34;
                if (!snap.empty) {
                    mWeek = snap.docs[0].data().week || 34;
                }

                // Get all available weeks that have matches
                const allWeeksQ = query(collection(db, 'matches'), where('competition', '==', 'league'));
                const allWeeksSnap = await getDocs(allWeeksQ);
                const weeks = Array.from(new Set(allWeeksSnap.docs.map(d => d.data().week))).filter(Boolean) as number[];

                setAvailableWeeks(weeks);
                setMaxWeek(mWeek);
                setSelectedWeek(mWeek);
            } catch (err) {
                console.error("Matches Initial Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchInitial();
    }, []);

    // 2. Fetch Data when selectedWeek OR competition changes
    useEffect(() => {
        if (competition === 'league' && !selectedWeek) return;

        async function fetchMatches() {
            try {
                setWeekLoading(true);
                const { collection, getDocs, query, where, orderBy, limit, collectionGroup } = await import('firebase/firestore');

                const matchesQ = competition === 'league'
                    ? query(collection(db, 'matches'), where('competition', '==', 'league'), where('week', '==', selectedWeek), orderBy('date', 'asc'))
                    : query(collection(db, 'matches'), where('competition', '==', 'cup'), orderBy('date', 'desc'), limit(40));

                const matchesSnap = await getDocs(matchesQ);

                const matchesData = await Promise.all(matchesSnap.docs.map(async (mDoc) => {
                    const mData = mDoc.data() as Match;
                    const matchId = mDoc.id;

                    // Fetch Opinions
                    const opinionsQ = query(collectionGroup(db, 'opinions'), where('matchId', '==', matchId));
                    const opinionsSnap = await getDocs(opinionsQ);
                    const opinions = opinionsSnap.docs.map(d => d.data() as Opinion);

                    // Fetch Incidents (Minimal check)
                    const incSnap = await getDocs(collection(db, 'matches', matchId, 'incidents'));
                    let againstCount = 0;
                    for (const incDoc of incSnap.docs) {
                        const opsSnap = await getDocs(collection(db, 'matches', matchId, 'incidents', incDoc.id, 'opinions'));
                        const hasIncorrect = opsSnap.docs.some(o => o.data().judgment === 'incorrect');
                        if (hasIncorrect) againstCount++;
                    }

                    const hScore = mData.homeScore !== undefined ? mData.homeScore : '-';
                    const aScore = mData.awayScore !== undefined ? mData.awayScore : '-';
                    const displayScore = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (mData.score && mData.score !== 'v' ? mData.score : 'vs');

                    return {
                        matchId,
                        matchName: mData.homeTeamName && mData.awayTeamName ? `${mData.homeTeamName} - ${mData.awayTeamName}` : mData.id,
                        week: mData.week,
                        homeTeam: mData.homeTeamName,
                        awayTeam: mData.awayTeamName,
                        score: displayScore,
                        opinions,
                        againstCount,
                        date: mData.date as string
                    } as MatchGroupedOpinions;
                }));

                setMatches(matchesData);
            } catch (err) {
                console.error("Matches Fetch Error:", err);
            } finally {
                setWeekLoading(false);
            }
        }
        fetchMatches();
    }, [selectedWeek, competition]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium uppercase tracking-tighter">Yükleniyor...</span>
            </div>
        </div>
    );

    const halfSplit = 17;
    const currentHalf = (selectedWeek || 1) <= halfSplit ? 1 : 2;

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">

                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500 leading-none">MAÇLAR</h1>
                    <p className="text-muted-foreground text-[10px] font-bold tracking-[0.3em] uppercase opacity-90">HAKEM VE GÖZLEMCİ PERFORMANS ANALİZLERİ</p>
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
                                { id: 'h1', label: '1. Yarı (1-17)', range: [1, 17] },
                                { id: 'h2', label: '2. Yarı (18-34)', range: [18, 34] }
                            ].map(group => {
                                const isActive = selectedWeek && selectedWeek >= group.range[0] && selectedWeek <= group.range[1];
                                return (
                                    <button
                                        key={group.id}
                                        onClick={() => {
                                            if (!isActive) setSelectedWeek(group.range[0]);
                                        }}
                                        className={`text-[10px] font-black uppercase tracking-widest pb-1 transition-all ${isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {group.label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 34 }, (_, i) => i + 1).map(week => {
                                const isFirstHalf = week <= 17;
                                const currentGroup = (selectedWeek && selectedWeek <= 17) ? 'h1' : 'h2';
                                const inCurrentGroup = (currentGroup === 'h1' && isFirstHalf) || (currentGroup === 'h2' && !isFirstHalf);

                                if (!inCurrentGroup) return null;

                                const hasData = availableWeeks.includes(week);
                                const isSelected = selectedWeek === week;

                                return (
                                    <button
                                        key={week}
                                        onClick={() => setSelectedWeek(week)}
                                        className={`min-w-[42px] h-10 rounded-lg text-xs font-black transition-all border flex items-center justify-center ${isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105 z-10'
                                            : hasData
                                                ? 'bg-card text-foreground border-border hover:border-primary/50'
                                                : 'bg-muted/30 text-muted-foreground/30 border-transparent'
                                            }`}
                                    >
                                        {week}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {competition === 'cup' && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                                TÜRKİYE KUPASI GÜNCEL MAÇLARI LİSTELENİYOR
                            </p>
                        </div>
                    )}

                    {weekLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-24 bg-card animate-pulse rounded-xl border border-border" />
                            ))}
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                            <span className="text-muted-foreground font-medium">
                                {competition === 'league' ? `${selectedWeek}. Hafta için` : 'Türkiye Kupası için'} henüz maç verisi bulunamadı.
                            </span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {matches.map((match) => (
                                <div key={match.matchId} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <MatchItem match={match} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}

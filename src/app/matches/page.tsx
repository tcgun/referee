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
    const [matches, setMatches] = useState<MatchGroupedOpinions[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

    useEffect(() => {
        async function fetchMatches() {
            try {
                setLoading(true);
                const matchesQ = query(collection(db, 'matches'), orderBy('week', 'desc'));
                const matchesSnap = await getDocs(matchesQ);

                const matchesData = await Promise.all(matchesSnap.docs.map(async (mDoc) => {
                    const mData = mDoc.data() as Match;
                    const matchId = mDoc.id;

                    // Fetch Opinions
                    const { collectionGroup, where, collection, getDocs } = await import('firebase/firestore');
                    const opinionsQ = query(collectionGroup(db, 'opinions'), where('matchId', '==', matchId));
                    const opinionsSnap = await getDocs(opinionsQ);
                    const opinions = opinionsSnap.docs.map(d => d.data() as Opinion);

                    // Fetch Incidents
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

                const sortedMatches = matchesData.sort((a, b) => {
                    const dateA = new Date(a.date || 0).getTime();
                    const dateB = new Date(b.date || 0).getTime();
                    return dateA - dateB;
                });

                setMatches(sortedMatches);
                if (sortedMatches.length > 0) {
                    const maxWeek = Math.max(...sortedMatches.map(m => m.week || 0));
                    setSelectedWeek(maxWeek);
                }
            } catch (err) {
                console.error("Matches Listing Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMatches();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Maçlar Yükleniyor...</span>
            </div>
        </div>
    );

    const availableWeeks = Array.from(new Set(matches.map(m => m.week || 0))).sort((a, b) => b - a);
    const filteredMatches = matches.filter(m => m.week === selectedWeek);

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">

                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-500">MAÇLAR</h1>
                    <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Lig Haftalarına Göre Maç Listesi</p>
                </div>

                {/* Week Selector */}
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    {availableWeeks.map(week => (
                        <button
                            key={week}
                            onClick={() => setSelectedWeek(week)}
                            className={`flex-shrink-0 px-6 py-2 rounded-full text-sm font-black transition-all border ${selectedWeek === week
                                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105'
                                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                                }`}
                        >
                            {week}. HAFTA
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    {selectedWeek === null ? (
                        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                            <span className="text-muted-foreground font-medium">Henüz maç verisi bulunamadı.</span>
                        </div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                            <span className="text-muted-foreground font-medium">{selectedWeek}. Hafta için henüz maç verisi bulunamadı.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredMatches.map((match) => (
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

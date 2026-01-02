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

    useEffect(() => {
        async function fetchMatches() {
            try {
                setLoading(true);
                // 1. Fetch Matches
                const matchesQ = query(collection(db, 'matches'), orderBy('week', 'desc'), limit(50));
                const matchesSnap = await getDocs(matchesQ);

                const matchesData = await Promise.all(matchesSnap.docs.map(async (mDoc) => {
                    const mData = mDoc.data() as Match;
                    const matchId = mDoc.id;

                    // 2. Fetch Opinions for this match to show stats
                    const { collectionGroup, where, collection, getDocs } = await import('firebase/firestore');
                    const opinionsQ = query(collectionGroup(db, 'opinions'), where('matchId', '==', matchId));
                    const opinionsSnap = await getDocs(opinionsQ);
                    const opinions = opinionsSnap.docs.map(d => d.data() as Opinion);

                    // 3. Fetch Incidents to count "Aleyhe" (Incorrect judgments)
                    const incSnap = await getDocs(collection(db, 'matches', matchId, 'incidents'));
                    let againstCount = 0;
                    for (const incDoc of incSnap.docs) {
                        const opsSnap = await getDocs(collection(db, 'matches', matchId, 'incidents', incDoc.id, 'opinions'));
                        const hasIncorrect = opsSnap.docs.some(o => o.data().judgment === 'incorrect');
                        if (hasIncorrect) againstCount++;
                    }

                    // Handle scores properly
                    const hScore = mData.homeScore !== undefined ? mData.homeScore : '-';
                    const aScore = mData.awayScore !== undefined ? mData.awayScore : '-';
                    const displayScore = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (mData.score || 'v');

                    return {
                        matchId,
                        matchName: `${mData.week}. Hafta: ${mData.homeTeamName} - ${mData.awayTeamName}`,
                        week: mData.week,
                        homeTeam: mData.homeTeamName,
                        awayTeam: mData.awayTeamName,
                        score: displayScore,
                        opinions,
                        againstCount
                    } as MatchGroupedOpinions;
                }));

                setMatches(matchesData);
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

    const grouped = groupByWeek(matches);

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">

                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">MAÇLAR</h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Lig Haftalarına Göre Maç Listesi</p>
                </div>

                <div className="space-y-12">
                    {grouped.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl">
                            <span className="text-muted-foreground font-medium">Henüz maç verisi bulunamadı.</span>
                        </div>
                    ) : grouped.map((group) => (
                        <section key={group.week} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-black uppercase tracking-widest shadow-lg">
                                    {group.week}. HAFTA
                                </div>
                                <div className="h-px bg-border flex-1"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {group.matches.map((match) => (
                                    <div key={match.matchId} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                        <MatchItem match={match} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

            </div>
        </main>
    );
}

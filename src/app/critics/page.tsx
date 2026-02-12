"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, collectionGroup, query, where, limit, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { MatchItem, MatchGroupedOpinions } from '@/components/matches/MatchItem';
import { Opinion, Match } from '@/types';

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

export default function CriticsPage() {
    const [matches, setMatches] = useState<MatchGroupedOpinions[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const genQ = query(collectionGroup(db, 'opinions'), where('type', '==', 'general'));
                const querySnapshot = await getDocs(genQ);

                const groups: { [key: string]: MatchGroupedOpinions } = {};
                for (const d of querySnapshot.docs) {
                    const matchId = d.ref.path.split('/')[1];
                    if (!groups[matchId]) {
                        groups[matchId] = { matchId, matchName: 'Yükleniyor...', opinions: [], againstCount: 0 };
                    }
                    const opinionData = d.data() as Opinion;
                    groups[matchId].opinions.push(opinionData);
                }

                const matchIds = Object.keys(groups);
                if (matchIds.length > 0) {
                    const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
                    await Promise.all(matchIds.map(async (mid) => {
                        try {
                            const mSnap = await getDoc(doc(db, 'matches', mid));
                            if (mSnap.exists()) {
                                const mData = mSnap.data() as Match;
                                groups[mid].matchName = `${mData.week}. Hafta: ${mData.homeTeamName} - ${mData.awayTeamName}`;
                                groups[mid].week = mData.week;
                                groups[mid].homeTeam = mData.homeTeamName;
                                groups[mid].awayTeam = mData.awayTeamName;

                                const hScore = mData.homeScore !== undefined ? mData.homeScore : '-';
                                const aScore = mData.awayScore !== undefined ? mData.awayScore : '-';
                                groups[mid].score = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (mData.score || 'v');

                                const incSnap = await getDocs(collection(db, 'matches', mid, 'incidents'));
                                let againstCount = 0;
                                for (const incDoc of incSnap.docs) {
                                    const opsSnap = await getDocs(collection(db, 'matches', mid, 'incidents', incDoc.id, 'opinions'));
                                    const hasIncorrect = opsSnap.docs.some(o => o.data().judgment === 'incorrect');
                                    if (hasIncorrect) againstCount++;
                                }
                                groups[mid].againstCount = againstCount;
                            }
                        } catch (e) { console.error('Match data fetch err', e) }
                    }));
                }

                setMatches(Object.values(groups).sort((a, b) => (b.week || 0) - (a.week || 0)));
            } catch (err) {
                console.error("Critics Page Fetch Error:", err);
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

    const grouped = groupByWeek(matches);

    return (
        <main className="min-h-screen bg-background pb-20 pt-8">
            <div className="max-w-4xl mx-auto px-4 space-y-12">
                <div className="flex flex-col gap-1 pb-6 border-b border-white/5">
                    <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase leading-none">
                        YORUMCULAR & <span className="text-primary">UZMANLAR</span>
                    </h1>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.3em] uppercase opacity-90">
                        BAĞIMSIZ HAKEM ANALİZLERİ VE GÖRÜŞLERİ
                    </p>
                </div>

                <div className="space-y-12">
                    {grouped.length === 0 ? (
                        <div className="text-center py-20 bg-card border border-dashed border-white/10 rounded-2xl">
                            <span className="text-muted-foreground font-medium italic">Henüz yorumcu verisi bulunamadı.</span>
                        </div>
                    ) : grouped.map((group) => (
                        <section key={group.week} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-secondary text-black px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-neo-sm">
                                    {group.week}. HAFTA
                                </div>
                                <div className="h-px bg-white/10 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {group.matches.map((match) => (
                                    <div key={match.matchId} className="bg-card border border-white/20 rounded-xl overflow-hidden shadow-neo border-2 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                                        <MatchItem match={match} headerColor="text-primary" />
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

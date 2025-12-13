"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { Team, Match } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function TeamPage() {
    const params = useParams();
    const teamId = params.id as string;
    const [team, setTeam] = useState<Team | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!teamId) return;
            try {
                // Fetch Team
                const teamSnap = await getDoc(doc(db, 'teams', teamId));
                if (teamSnap.exists()) {
                    setTeam(teamSnap.data() as Team);
                }

                // Fetch Matches (Home or Away) - Firestore "OR" query requires "in" or multiple queries. 
                // Simpler for MVP: Fetch all matches and filter client side or 2 queries.
                // Or better: matches/{matchId} -> has homeTeamId field.
                // Let's do 2 queries for now or just fetch all matches (if small dataset).
                // Since it's MVP, fetching all matches by date is fine if small. But filtering is better.
                // Actually best way: 'matches' collection, where homeTeamId == teamId.

                const q1 = query(collection(db, 'matches'), where('homeTeamId', '==', teamId));
                const q2 = query(collection(db, 'matches'), where('awayTeamId', '==', teamId));

                const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                const m1 = snap1.docs.map(d => d.data() as Match);
                const m2 = snap2.docs.map(d => d.data() as Match);

                // Merge and Sort
                const allMatches = [...m1, ...m2].sort((a, b) => {
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                });

                // Dedup if any match matches both (unlikely unless self-play)
                setMatches(allMatches);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [teamId]);

    if (loading) return <div className="p-8 text-center">Loading match history...</div>;
    if (!team) return <div className="p-8 text-center">Team not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="text-blue-500 hover:underline mb-4 block">&larr; Back to Teams</Link>

                <header className="mb-8 flex items-center gap-4 bg-white p-6 rounded shadow-sm">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                        {team.logo ? <img src={team.logo} className="w-full h-full object-contain" /> : team.name[0]}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{team.name}</h1>
                        <p className="text-gray-500">Match History</p>
                    </div>
                </header>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold px-2">Matches</h2>
                    {matches.length === 0 && <p className="p-4 text-gray-400">No matches found.</p>}

                    {matches.map(match => (
                        <Link key={match.id} href={`/matches/${match.id}`} className="block">
                            <div className="bg-white p-4 rounded shadow-sm hover:shadow-md transition-all flex justify-between items-center border-l-4" style={{ borderLeftColor: match.homeTeamId === team.id ? team.colors.primary : '#ccc' }}>
                                <div className="flex-1 text-right font-semibold">{match.homeTeamName}</div>
                                <div className="px-4 text-center">
                                    <div className="text-xs text-gray-400 mb-1">{new Date(match.date).toLocaleDateString()}</div>
                                    <div className="text-xl font-bold bg-gray-100 px-3 py-1 rounded">{match.score || 'v'}</div>
                                </div>
                                <div className="flex-1 text-left font-semibold">{match.awayTeamName}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

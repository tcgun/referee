"use client";

import { useEffect, useState } from 'react';
import { Match } from '@/types';

/**
 * Sidebar'da gösterilecek haftalık fikstürü çeken hook.
 */
export function useFixtures(selectedSeason: string, selectedWeek: number) {
    const [fixtures, setFixtures] = useState<Match[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        async function fetchFixtures() {
            if (!selectedSeason || !selectedWeek) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/public/matches?season=${selectedSeason}&week=${selectedWeek}&raw=true`);
                if (res.ok) {
                    const list = await res.json();
                    list.sort((a: Match, b: Match) => {
                        const dA = a.date ? new Date(a.date as string).getTime() : 0;
                        const dB = b.date ? new Date(b.date as string).getTime() : 0;
                        return dA - dB;
                    });
                    setFixtures(list);
                }
            } catch (err) {
                console.error("Fixtures fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchFixtures();
    }, [selectedWeek, selectedSeason]);

    return { fixtures, fixturesLoading: loading };
}

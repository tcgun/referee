"use client";

import { useEffect, useState } from 'react';
import { nameToSlug } from '@/lib/turkishUtils';

interface RefereeCareerData {
    official?: {
        name: string;
        region?: string;
        rating?: number;
        classification?: string;
    };
    career?: {
        totalMatches: number;
        avgYellowPerMatch: number;
        avgRedPerMatch: number;
        avgFoulsPerMatch: number;
        avgPenaltiesPerMatch: number;
    };
    matchDetails?: {
        ballInPlayTime: string | null;
    }[];
}

/**
 * Hakem kariyer istatistiklerini çeken hook.
 */
export function useRefereeCareer(refereeName: string | undefined) {
    const [stats, setStats] = useState<RefereeCareerData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!refereeName) {
            setStats(null);
            return;
        }
        async function fetchRefereeCareer() {
            setLoading(true);
            try {
                const slug = nameToSlug(refereeName || '');
                const res = await fetch(`/api/stats/referees/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                } else {
                    setStats(null);
                }
            } catch (e) {
                console.error("Error fetching referee career stats:", e);
                setStats(null);
            } finally {
                setLoading(false);
            }
        }
        fetchRefereeCareer();
    }, [refereeName]);

    return { refereeCareerStats: stats, refereeCareerLoading: loading };
}

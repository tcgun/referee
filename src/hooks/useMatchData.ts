"use client";

import { useEffect, useState } from 'react';
import { Match, Incident, Opinion, DisciplinaryAction } from '@/types';

interface IncidentWithOpinions extends Incident {
    opinions: Opinion[];
}

interface UseMatchDataReturn {
    match: Match | null;
    incidents: IncidentWithOpinions[];
    disciplinaryActions: DisciplinaryAction[];
    loading: boolean;
    selectedSeason: string;
    selectedWeek: number;
    setSelectedSeason: (season: string) => void;
    setSelectedWeek: (week: number) => void;
}

/**
 * Maç verisini, olayları ve disiplin cezalarını çeken hook.
 * İlk yüklemede season/week değerlerini maçtan alır.
 */
export function useMatchData(matchId: string): UseMatchDataReturn {
    const [match, setMatch] = useState<Match | null>(null);
    const [incidents, setIncidents] = useState<IncidentWithOpinions[]>([]);
    const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');
    const [selectedWeek, setSelectedWeek] = useState<number>(1);

    useEffect(() => {
        async function fetchMatchData() {
            if (!matchId) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/public/matches?id=${matchId}`);
                if (!res.ok) throw new Error("Match not found");
                const data = await res.json();

                setMatch(data.match);
                setIncidents(data.incidents || []);
                setDisciplinaryActions(data.disciplinaryActions || []);

                const seasonVal = data.match.season || '2025-2026';
                setSelectedWeek(data.match.week || 1);
                setSelectedSeason(seasonVal);
            } catch (err) {
                console.error("Match fetch details error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMatchData();
    }, [matchId]);

    return {
        match,
        incidents,
        disciplinaryActions,
        loading,
        selectedSeason,
        selectedWeek,
        setSelectedSeason,
        setSelectedWeek
    };
}

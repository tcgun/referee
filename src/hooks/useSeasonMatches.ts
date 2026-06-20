"use client";

import { useEffect, useState, useMemo } from 'react';
import { Match } from '@/types';
import { normalizeForComparison } from '@/lib/turkishUtils';

interface OfficialLookup {
    /** Map<normalizedName, Map<teamId, matchCount>> */
    countMap: Map<string, Map<string, number>>;
}

/**
 * Tüm sezon maçlarını çekip, görevli → takım eşleşme sayısını
 * O(1) lookup tablosunda cache'leyen hook.
 * 
 * Daha önce her görevli için O(n) full scan yapılıyordu.
 * Artık tek seferde Map oluşturup O(1) erişim sağlanıyor.
 */
export function useSeasonMatches(season: string | undefined) {
    const [allSeasonMatches, setAllSeasonMatches] = useState<Match[]>([]);

    useEffect(() => {
        if (!season) return;
        async function fetchAllSeasonMatches() {
            try {
                const res = await fetch(`/api/public/matches?season=${season}&raw=true`);
                if (res.ok) {
                    const data = await res.json();
                    setAllSeasonMatches(data);
                }
            } catch (e) {
                console.error("Error fetching season matches:", e);
            }
        }
        fetchAllSeasonMatches();
    }, [season]); // ✅ Primitive dependency, sonsuz döngü yok

    /** 
     * Görevli ismi → hangi takıma kaç maç yönettiğinin lookup tablosu.
     * O(matches × officialsPerMatch) tek seferde oluşturulur.
     */
    const officialLookup: OfficialLookup = useMemo(() => {
        const countMap = new Map<string, Map<string, number>>();

        const addOfficialForTeam = (name: string | undefined, teamId: string) => {
            if (!name || name === '-') return;
            const norm = normalizeForComparison(name);
            if (!countMap.has(norm)) countMap.set(norm, new Map());
            const teamMap = countMap.get(norm)!;
            teamMap.set(teamId, (teamMap.get(teamId) || 0) + 1);
        };

        for (const m of allSeasonMatches) {
            const teams = [m.homeTeamId, m.awayTeamId];
            for (const teamId of teams) {
                // Tüm görevlileri topla
                addOfficialForTeam(m.referee, teamId);
                addOfficialForTeam(m.varReferee, teamId);

                if (m.officials) {
                    m.officials.referees?.forEach(r => addOfficialForTeam(r, teamId));
                    m.officials.varReferees?.forEach(r => addOfficialForTeam(r, teamId));
                    m.officials.assistants?.forEach(r => addOfficialForTeam(r, teamId));
                    addOfficialForTeam(m.officials.fourthOfficial, teamId);
                    m.officials.avarReferees?.forEach(r => addOfficialForTeam(r, teamId));
                    m.officials.observers?.forEach(r => addOfficialForTeam(r, teamId));
                    m.officials.representatives?.forEach(r => addOfficialForTeam(r, teamId));
                }
                if (m.representatives) {
                    addOfficialForTeam(m.representatives.observer, teamId);
                    addOfficialForTeam(m.representatives.rep1, teamId);
                    addOfficialForTeam(m.representatives.rep2, teamId);
                    addOfficialForTeam(m.representatives.rep3, teamId);
                }
            }
        }

        return { countMap };
    }, [allSeasonMatches]);

    /** O(1) lookup ile görevlinin bir takıma kaç maç yönettiğini döndürür */
    const getOfficialCountForTeam = (officialName: string, teamId: string): number => {
        if (!officialName || !teamId) return 0;
        const norm = normalizeForComparison(officialName);
        return officialLookup.countMap.get(norm)?.get(teamId) || 0;
    };

    return {
        allSeasonMatches,
        getOfficialCountForTeam
    };
}

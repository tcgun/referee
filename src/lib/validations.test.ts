import { describe, it, expect } from 'vitest';
import { matchSchema } from './validations';

describe('validations - matchSchema', () => {
    const validBaseMatch = {
        id: 'week1-gs-fb',
        homeTeamId: 'gs',
        awayTeamId: 'fb',
        homeTeamName: 'Galatasaray',
        awayTeamName: 'Fenerbahçe',
        date: '2026-06-19T20:00:00.000Z',
        week: 1,
        season: '2025-2026',
        stadium: 'Rams Park',
        referee: 'Ali Şansalan',
    };

    it('should validate a valid base match without refereeStats', () => {
        const result = matchSchema.safeParse(validBaseMatch);
        expect(result.success).toBe(true);
    });

    it('should fail validation if refereeStats is missing required Zod fields', () => {
        const invalidMatch = {
            ...validBaseMatch,
            refereeStats: {
                ballInPlayTime: '54:30',
                // missing fouls, yellowCards, etc.
            },
        };
        const result = matchSchema.safeParse(invalidMatch);
        expect(result.success).toBe(false);
    });

    it('should succeed validation if refereeStats has all required fields', () => {
        const validMatch = {
            ...validBaseMatch,
            refereeStats: {
                ballInPlayTime: '54:30',
                fouls: 22,
                yellowCards: 4,
                redCards: 0,
                incorrectDecisions: 1,
                errorsFavoringHome: 1,
                errorsFavoringAway: 0,
            },
        };
        const result = matchSchema.safeParse(validMatch);
        expect(result.success).toBe(true);
    });

    it('should succeed validation with fraction format ballInPlayTime', () => {
        const validMatchFraction = {
            ...validBaseMatch,
            refereeStats: {
                ballInPlayTime: '54:30 / 98:15',
                fouls: 22,
                yellowCards: 4,
                redCards: 0,
                incorrectDecisions: 1,
                errorsFavoringHome: 1,
                errorsFavoringAway: 0,
            },
        };
        const result = matchSchema.safeParse(validMatchFraction);
        expect(result.success).toBe(true);
    });
});

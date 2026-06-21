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

import { disciplinaryActionSchema } from './validations';

describe('validations - disciplinaryActionSchema', () => {
    const validBaseAction = {
        id: 'action-1',
        subject: 'Fenerbahçe',
        reason: 'Sportmenliğe aykırı açıklama',
        date: '2025-08-09',
    };

    it('should validate a valid base action', () => {
        const result = disciplinaryActionSchema.safeParse(validBaseAction);
        expect(result.success).toBe(true);
    });

    it('should allow null and undefined for optional fields', () => {
        const actionWithNulls = {
            ...validBaseAction,
            week: null,
            matchId: null,
            teamName: null,
            teamId: null,
            type: null,
            penalty: null,
            note: null,
            competition: null,
            season: null,
            appealStatus: null,
            appealedPenalty: null,
            appealNote: null,
            appealDate: null,
        };
        const result = disciplinaryActionSchema.safeParse(actionWithNulls);
        expect(result.success).toBe(true);
    });

    it('should allow empty strings or omission for optional fields', () => {
        const actionWithEmptyStrings = {
            ...validBaseAction,
            teamName: '',
            teamId: '',
            appealStatus: '',
            appealedPenalty: '',
            appealNote: '',
            appealDate: '',
        };
        const result = disciplinaryActionSchema.safeParse(actionWithEmptyStrings);
        expect(result.success).toBe(true);
    });
});


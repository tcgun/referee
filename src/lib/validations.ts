import { z } from 'zod';

// Team Schema
export const teamSchema = z.object({
    id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
    name: z.string().min(1).max(100),
    logo: z.string().url().optional().or(z.literal('')),
    colors: z.object({
        primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color'),
        secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color'),
        text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Text color must be a valid hex color'),
    }),
});

// Match Schema
export const matchSchema = z.object({
    id: z.string().min(1).max(100),
    homeTeamId: z.string().min(1).max(50),
    awayTeamId: z.string().min(1).max(50),
    homeTeamName: z.string().min(1).max(100),
    awayTeamName: z.string().min(1).max(100),
    date: z.string().or(z.date()).transform((val) => {
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string') {
            // Try to parse as ISO date, if fails return as-is
            const parsed = new Date(val);
            return isNaN(parsed.getTime()) ? val : parsed.toISOString();
        }
        return val;
    }),
    week: z.number().int().min(1).max(40),
    season: z.string().regex(/^\d{4}-\d{4}$/, 'Season must be in format YYYY-YYYY'),
    stadium: z.string().min(1).max(200),
    referee: z.string().min(1).max(100),
    varReferee: z.string().min(1).max(100).optional(),
    score: z.string().regex(/^\d+-\d+$/).optional(), // Format: "2-1"
    stats: z.object({
        homePossession: z.number().min(0).max(100).optional(),
        awayPossession: z.number().min(0).max(100).optional(),
        homeShots: z.number().int().min(0).optional(),
        awayShots: z.number().int().min(0).optional(),
        homeShotsOnTarget: z.number().int().min(0).optional(),
        awayShotsOnTarget: z.number().int().min(0).optional(),
        homeBigChances: z.number().int().min(0).optional(),
        awayBigChances: z.number().int().min(0).optional(),
        homeCorners: z.number().int().min(0).optional(),
        awayCorners: z.number().int().min(0).optional(),
        homeOffsides: z.number().int().min(0).optional(),
        awayOffsides: z.number().int().min(0).optional(),
        homeSaves: z.number().int().min(0).optional(),
        awaySaves: z.number().int().min(0).optional(),
        homeFouls: z.number().int().min(0).optional(),
        awayFouls: z.number().int().min(0).optional(),
        homeYellowCards: z.number().int().min(0).optional(),
        awayYellowCards: z.number().int().min(0).optional(),
        homeRedCards: z.number().int().min(0).optional(),
        awayRedCards: z.number().int().min(0).optional(),
    }).optional(),
    officials: z.object({
        referees: z.array(z.string()).optional(),
        varReferees: z.array(z.string()).optional(),
        observers: z.array(z.string()).optional(),
        representatives: z.array(z.string()).optional(),
    }).optional(),
    lineups: z.object({
        home: z.array(z.object({
            number: z.string(),
            name: z.string(),
        })).optional(),
        away: z.array(z.object({
            number: z.string(),
            name: z.string(),
        })).optional(),
        homeSubs: z.array(z.object({
            number: z.string(),
            name: z.string(),
        })).optional(),
        awaySubs: z.array(z.object({
            number: z.string(),
            name: z.string(),
        })).optional(),
        homeCoach: z.string().optional(),
        awayCoach: z.string().optional(),
    }).optional(),
    refereeStats: z.object({
        ballInPlayTime: z.string().min(1).max(20),
        fouls: z.number().int().min(0),
        yellowCards: z.number().int().min(0),
        redCards: z.number().int().min(0),
        incorrectDecisions: z.number().int().min(0),
        errorsFavoringHome: z.number().int().min(0),
        errorsFavoringAway: z.number().int().min(0),
        homeErrors: z.array(z.string()).optional(),
        awayErrors: z.array(z.string()).optional(),
        performanceNotes: z.array(z.string()).optional(),
    }).optional(),
    status: z.enum(['draft', 'published']).optional(),
});

// Incident Schema
export const incidentSchema = z.object({
    id: z.string().min(1).max(100),
    matchId: z.string().min(1).max(100),
    minute: z.union([z.number().int().min(0).max(120), z.string().regex(/^\d{1,3}(\+\d{1,2})?$/)]),
    description: z.string().min(1).max(1000),
    refereeDecision: z.string().min(1).max(200),
    varDecision: z.string().max(200).optional(),
    varRecommendation: z.enum(['none', 'review', 'monitor_only']).optional(), // none: Yok, review: İnceleme Önerisi, monitor_only: Sadece Takip (Opsiyonel)
    correctDecision: z.string().max(200).optional(), // Hakem ne yapmalıydı?
    finalDecision: z.string().min(1).max(200),
    favorOf: z.string().max(50).optional(),
    against: z.string().max(50).optional(),
    impact: z.enum(['penalty', 'red_card', 'goal', 'none', 'unknown', 'cancelled_goal']),
    videoUrl: z.string().url().optional().or(z.literal('')),
});

// Opinion Schema
export const opinionSchema = z.object({
    id: z.string().min(1).max(100),
    matchId: z.string().min(1).max(100),
    incidentId: z.string().min(1).max(100).optional(), // Made optional to support migration to positionId
    positionId: z.string().min(1).max(100).optional(), // New link
    criticName: z.string().min(1).max(100),
    opinion: z.string().max(5000).optional().or(z.literal('')),
    shortOpinion: z.string().max(500).optional(),
    reasoning: z.string().max(500).optional(),
    judgment: z.enum(['correct', 'incorrect', 'controversial']),
    type: z.enum(['trio', 'general']).optional(),
});

// Standing Schema
export const standingSchema = z.object({
    id: z.string().min(1).max(50),
    teamName: z.string().min(1).max(100),
    played: z.number().int().min(0),
    won: z.number().int().min(0),
    drawn: z.number().int().min(0),
    lost: z.number().int().min(0),
    goalsFor: z.number().int().min(0).optional(),
    goalsAgainst: z.number().int().min(0).optional(),
    goalDiff: z.number().int(),
    points: z.number().int().min(0),
    rank: z.number().int().min(1).optional(),
});

// Statement Schema
export const statementSchema = z.object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(5000),
    entity: z.string().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
    url: z.string().url().optional().or(z.literal('')),
    type: z.enum(['tff', 'club']),
});

// Position Schema
export const positionSchema = z.object({
    id: z.string().min(1).max(100),
    matchId: z.string().min(1).max(100),
    minute: z.union([z.number().int().min(0).max(120), z.string().regex(/^\d{1,3}(\+\d{1,2})?$/)]),
    type: z.enum(['penalty', 'red_card', 'yellow_card', 'goal', 'offside', 'foul', 'other']),
    description: z.string().max(500).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    videoUrl: z.string().url().optional().or(z.literal('')),
});

// Disciplinary Action Schema
export const disciplinaryActionSchema = z.object({
    id: z.string().min(1).max(100),
    teamName: z.string().max(100).optional().or(z.literal('')),
    subject: z.string().min(1).max(100),
    reason: z.string().min(1).max(5000),
    matchId: z.string().max(100).optional(),
    type: z.enum(['pfdk', 'performance', 'penalty']).optional(),
    penalty: z.string().max(200).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
});

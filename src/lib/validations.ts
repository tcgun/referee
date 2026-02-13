import { z } from 'zod';

// --- Constants / Sabitler ---

// ID: Lowercase alphanumeric with hyphens (e.g., "gal-fene")
export const REGEX_ID = /^[a-z0-9-]+$/;
export const MSG_ID = 'ID küçük harf alfasayısal ve tire içermelidir';

// Hex Color: # followed by 6 hex digits
export const REGEX_HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
export const MSG_HEX_COLOR = 'Geçerli bir hex renk kodu giriniz (Örn: #FF0000)';

// Season: YYYY-YYYY format
export const REGEX_SEASON = /^\d{4}-\d{4}$/;
export const MSG_SEASON = 'Sezon YYYY-YYYY formatında olmalıdır';

// Score: "2-1" or "2 - 1"
export const REGEX_SCORE = /^\d+\s*-\s*\d+$/;
export const MSG_SCORE = 'Skor formatı "2-1" şeklinde olmalıdır';

// Date: YYYY-MM-DD
export const REGEX_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MSG_DATE = 'Tarih YYYY-MM-DD formatında olmalıdır';

// Minute: 1-120 or 90+4
export const REGEX_MINUTE_PLUS = /^\d{1,3}(\+\d{1,2})?$/;

// --- Schemas ---

// Team Schema
export const teamSchema = z.object({
    id: z.string().min(1).max(50).regex(REGEX_ID, MSG_ID),
    name: z.string().min(1).max(100),
    logo: z.string().url().optional().or(z.literal('')),
    colors: z.object({
        primary: z.string().regex(REGEX_HEX_COLOR, MSG_HEX_COLOR),
        secondary: z.string().regex(REGEX_HEX_COLOR, MSG_HEX_COLOR),
        text: z.string().regex(REGEX_HEX_COLOR, MSG_HEX_COLOR),
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
            const parsed = new Date(val);
            return isNaN(parsed.getTime()) ? val : parsed.toISOString();
        }
        return val;
    }),
    week: z.number().int().min(1).max(40),
    season: z.string().regex(REGEX_SEASON, MSG_SEASON),
    stadium: z.string().min(1).max(200),
    referee: z.string().min(1).max(100),
    varReferee: z.string().min(1).max(100).optional(),
    score: z.string().regex(REGEX_SCORE).optional(),
    homeScore: z.number().int().min(0).optional(),
    awayScore: z.number().int().min(0).optional(),
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
    competition: z.enum(['league', 'cup']).optional(),
    group: z.string().max(10).optional().or(z.literal('')),
});

// Incident Schema
export const incidentSchema = z.object({
    id: z.string().min(1).max(100),
    matchId: z.string().min(1).max(100),
    minute: z.union([z.number().int().min(0).max(120), z.string().regex(REGEX_MINUTE_PLUS)]),
    description: z.string().min(1).max(1000),
    refereeDecision: z.string().min(1).max(200),
    varDecision: z.string().max(200).optional(),
    varRecommendation: z.enum(['none', 'review', 'monitor_only']).optional(),
    correctDecision: z.string().max(200).optional(),
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
    incidentId: z.string().min(1).max(100).optional(),
    positionId: z.string().min(1).max(100).optional(),
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
    date: z.string().regex(REGEX_DATE, MSG_DATE),
    url: z.string().url().optional().or(z.literal('')),
    type: z.enum(['tff', 'club']),
});

// Disciplinary Action Schema
export const disciplinaryActionSchema = z.object({
    id: z.string().min(1).max(100),
    teamName: z.string().max(100).optional().or(z.literal('')),
    subject: z.string().min(1).max(100),
    reason: z.string().min(1).max(5000),
    matchId: z.string().max(100).optional(),
    type: z.enum(['pfdk', 'performance', 'penalty']).optional(),
    penalty: z.string().max(1000).optional(), // Increased max length for flexibility
    date: z.string().regex(REGEX_DATE, MSG_DATE),
    week: z.number().int().min(0).max(40).optional(), // Updated min to 0 for cup/general
    note: z.string().max(10000).optional().or(z.literal('')), // Full legal text
    competition: z.enum(['league', 'cup']).optional(),
});

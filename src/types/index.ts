export interface Team {
    id: string; // Document ID (e.g. "gaziantep-fk")
    name: string;
    logo: string; // URL or text placeholder
    colors: {
        primary: string;
        secondary: string;
        text: string;
    };
}

export interface MatchStats {
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
    homeShotsOnTarget: number;
    awayShotsOnTarget: number;
    homeBigChances: number;
    awayBigChances: number;
    homeCorners: number;
    awayCorners: number;
    homeOffsides: number;
    awayOffsides: number;
    homeSaves: number;
    awaySaves: number;
    homeFouls: number;
    awayFouls: number;
    homeYellowCards: number;
    awayYellowCards: number;
    homeRedCards: number;
    awayRedCards: number;
}

export interface MatchOfficials {
    referees: string[]; // [Main, Asst1, Asst2, 4th]
    varReferees: string[]; // [VAR, AVAR, etc]
    observers: string[];
    representatives: string[];
}

export interface Player {
    number: string;
    name: string;
}

export interface MatchLineups {
    home?: Player[];
    away?: Player[];
    homeSubs?: Player[];
    awaySubs?: Player[];
    homeCoach?: string;
    awayCoach?: string;
}

export interface Match {
    id: string; // Document ID (e.g. "week1-gfk-gs")
    homeTeamId: string;
    awayTeamId: string;
    homeTeamName: string; // Denormalized for easy access
    awayTeamName: string; // Denormalized
    date: string | Date; // ISO string or Firestore Timestamp
    week: number;
    season: string; // "2024-2025"
    stadium: string;
    referee: string;
    varReferee: string;
    score?: string; // Optional, initially 0-0 or null
    stats?: MatchStats;
    officials?: MatchOfficials;
    lineups?: MatchLineups;
}

export type DecisionImpact = 'penalty' | 'red_card' | 'goal' | 'none' | 'unknown';

export interface Incident {
    id: string; // Document ID
    matchId: string;
    minute: number;
    description: string;
    refereeDecision: string; // Field decision
    varDecision?: string; // VAR intervention details
    finalDecision: string;
    favorOf?: string; // Team ID
    against?: string; // Team ID
    impact: DecisionImpact;
    videoUrl?: string; // Temsili/Placeholder
}

export interface Opinion {
    id: string;
    criticName: string; // Changed to string to support general commentators
    opinion: string; // The text of what they said
    reasoning: string; // Short "Why?"
    judgment: 'correct' | 'incorrect' | 'controversial';
    type?: 'trio' | 'general'; // 'trio' by default
}

export interface Standing {
    id: string; // teamId usually
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
    rank?: number;
}

export interface Statement {
    id: string;
    title: string;
    content: string;
    entity: string; // e.g. "TFF", "Galatasaray", "Fenerbahçe"
    date: string;
    url?: string;
    type: 'tff' | 'club';
}

export interface DisciplinaryAction {
    id: string;
    teamName: string;
    subject: string; // Player or Official Name
    reason: string;
    date: string;
}

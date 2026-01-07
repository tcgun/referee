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

export type OfficialRole = 'referee' | 'assistant' | 'fourth' | 'var' | 'avar' | 'observer' | 'representative';

export interface Official {
    id: string;
    name: string;
    region?: string;
    roles: OfficialRole[];
    rating?: number; // overall rating
    matchesCount?: number;
    roleCounts?: Partial<Record<OfficialRole, number>>;
}

export interface MatchStats {
    homePossession?: number;
    awayPossession?: number;
    homeShots?: number;
    awayShots?: number;
    homeShotsOnTarget?: number;
    awayShotsOnTarget?: number;
    homeBlockedShots?: number;
    awayBlockedShots?: number;
    homePasses?: number;
    awayPasses?: number;
    homePassAccuracy?: number;
    awayPassAccuracy?: number;
    homeBigChances?: number;
    awayBigChances?: number;
    homeCorners?: number;
    awayCorners?: number;
    homeOffsides?: number;
    awayOffsides?: number;
    homeSaves?: number;
    awaySaves?: number;
    homeFouls?: number;
    awayFouls?: number;
    homeYellowCards?: number;
    awayYellowCards?: number;
    homeRedCards?: number;
    awayRedCards?: number;
}

export interface MatchOfficials {
    referees: string[]; // [Main, Asst1, Asst2, 4th]
    varReferees: string[]; // [VAR, AVAR, etc]
    assistants?: string[];
    fourthOfficial?: string;
    avarReferees?: string[];
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
    homeScore?: number;
    awayScore?: number;
    stats?: MatchStats;
    officials?: MatchOfficials;
    representatives?: {
        observer?: string;
        rep1?: string;
        rep2?: string;
        rep3?: string;
        [key: string]: string | undefined;
    };
    lineups?: MatchLineups;
    status?: 'draft' | 'published';
    refereeStats?: RefereeStats;
}

export interface RefereeStats {
    ballInPlayTime: string; // "54:30"
    fouls: number;
    yellowCards: number;
    redCards: number;
    incorrectDecisions: number;
    errorsFavoringHome: number;
    errorsFavoringAway: number;
    homeErrors?: string[];
    awayErrors?: string[];
    performanceNotes?: string[];
}

export type DecisionImpact = 'penalty' | 'red_card' | 'goal' | 'none' | 'unknown';

export interface Incident {
    id: string; // Document ID
    matchId: string;
    minute: number | string;
    description: string;
    refereeDecision: string; // Field decision
    varDecision?: string; // VAR intervention details
    varRecommendation?: 'none' | 'review' | 'monitor_only'; // Structured VAR outcome
    correctDecision?: string; // What should have been done
    finalDecision: string;
    favorOf?: string; // Team ID
    against?: string; // Team ID
    impact: DecisionImpact;
    videoUrl?: string; // Temsili/Placeholder
}

export interface Opinion {
    id: string;
    matchId: string; // Required link to match
    incidentId?: string; // Optional link to incident
    positionId?: string; // Optional link to position
    criticName: string; // Changed to string to support general commentators
    opinion: string; // The text of what they said
    shortOpinion?: string; // Short summary for quick view
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
    teamName?: string;
    subject: string; // Player or Official Name
    reason: string;
    matchId?: string; // Optional link to a match
    type?: 'pfdk' | 'performance'; // 'pfdk' is default
    penalty?: string; // Short summary
    date: string;
}

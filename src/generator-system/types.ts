export type PresetDimensions = {
  width: number;
  height: number;
  name: string;
  category: "Instagram" | "Twitter" | "Facebook" | "YouTube" | "WhatsApp";
};

export const PRESETS: Record<string, PresetDimensions> = {
  "ratio-1-1": { width: 1080, height: 1080, name: "Kare (1:1)", category: "Instagram" },
  "ratio-4-5": { width: 1080, height: 1350, name: "Portre (4:5)", category: "Instagram" },
  "ratio-9-16": { width: 1080, height: 1920, name: "Hikaye (9:16)", category: "Instagram" },
  "ratio-16-9": { width: 1920, height: 1080, name: "Yatay (16:9)", category: "Instagram" },
};

export interface OfficialData {
  name: string;
  image?: string;
  x: number;
  y: number;
  scale: number;
  show?: boolean;
}

export interface MistakeItem {
  id: string;
  minute: string;
  title: string;
  description1: string;
  description2: string;
  description3: string;
  icon?: "check" | "cross" | "question" | "none";
  inc?: string;
  refDecision?: string;
  finalDecision?: string;
  cardPlayer?: string;
  varIntervention?: string;
}

export interface AppState {
  comment: string;
  highlight: string;
  author: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  minute: string;
  date: string;
  separator: "·" | "—";
  bgColor: string;
  currentPreset: string;
  pattern: "none" | "dots" | "grid" | "noise";

  // Branding & Handles
  handles: {
    twitter: string;
    instagram: string;
    facebook: string;
    youtube: string;
    tiktok: string;
    website: string;
  };

  authorTitle: string;
  showMatchInfo: boolean;
  showBrandingBar: boolean;
  showMinute: boolean;
  contentLayout?: "compact" | "spread";
  authorImage?: string;
  showAuthorImage: boolean;
  template: "template1" | "template2" | "template3" | "template4" | "template5";
  theme: "varsayim";
  showPositionBox: boolean;
  positionText: string;
  positionMinute: string;
  positionLabel: string;
  refereeDecision: string;
  showSponsor: boolean;
  sponsorName: string;
  sponsorLogo?: string;
  matchWeek: string;

  // Referee Stats
  stats: {
    matches?: string;
    yellowCards?: string;
    redCards?: string;
    penalties?: string;
    homeWin?: string;
    awayWin?: string;
    draw?: string;
    varGo?: string;
    wrongDecision?: string;
    homeYellow?: string;
    awayYellow?: string;
    homeRed?: string;
    awayRed?: string;
    homePenalty?: string;
    awayPenalty?: string;
    fouls?: string;
    homeFoul?: string;
    awayFoul?: string;
    varMatches?: string;
    avarMatches?: string;
    varCalls?: string;
  };

  // Match Officials (Normalized)
  officials: Record<string, OfficialData>;

  showObserver?: boolean;
  showRepresentative?: boolean;
  showVar?: boolean;
  showAvar?: boolean;
  showAvar2?: boolean;

  // Template 5
  matchMistakes: MistakeItem[];
  showNextPageIndicator?: boolean;

  // Author Image Positioning (Keep separate for now as it's unique)
  authorImageX?: number;
  authorImageY?: number;
  authorImageScale?: number;
  fontSizeMultiplier: number;
}

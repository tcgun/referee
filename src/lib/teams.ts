/**
 * Utility functions for Team Management.
 * Handles team data, colors, and resolving team identifiers from user input.
 *
 * @module lib/teams
 */

interface TeamColors {
    primary: string;
    secondary: string;
}

interface TeamData {
    name: string;
    colors: TeamColors;
    short: string;
    aliases?: string[];
}

export const SUPER_LIG_TEAMS: Record<string, TeamData> = {
    'bes': {
        name: 'Beşiktaş',
        colors: { primary: '#000000', secondary: '#ffffff' },
        short: 'bes'
    },
    'kon': {
        name: 'Konyaspor',
        colors: { primary: '#008000', secondary: '#FFFFFF' },
        short: 'kon',
        aliases: ['tümosan konyaspor', 'tumosan konyaspor']
    },
    'gal': {
        name: 'Galatasaray',
        colors: { primary: '#A90432', secondary: '#FDB912' },
        short: 'gal'
    },
    'goz': {
        name: 'Göztepe',
        colors: { primary: '#FFFF00', secondary: '#FF0000' },
        short: 'goz'
    },
    'bas': {
        name: 'Başakşehir Futbol Kulübü',
        colors: { primary: '#E56B25', secondary: '#163962' },
        short: 'bas',
        aliases: ['basaksehir', 'rams', 'ibfk', 'medipol', 'rams başakşehir', 'rams babşakşehir', 'başakşehir']
    },
    'ant': {
        name: 'Antalyaspor',
        colors: { primary: '#E30613', secondary: '#FFFFFF' },
        short: 'ant',
        aliases: ['bitexen antalyaspor', 'hesapcom antalyaspor']
    },
    'sam': {
        name: 'Samsunspor',
        colors: { primary: '#CC0000', secondary: '#FFFFFF' },
        short: 'sam'
    },
    'tra': {
        name: 'Trabzonspor',
        colors: { primary: '#A52A2A', secondary: '#87CEEB' },
        short: 'tra'
    },
    'ala': {
        name: 'Alanyaspor',
        colors: { primary: '#F9B517', secondary: '#008C45' },
        short: 'ala',
        aliases: ['corendon alanyaspor']
    },
    'fen': {
        name: 'Fenerbahçe',
        colors: { primary: '#002d72', secondary: '#f9b517' },
        short: 'fen'
    },
    'gen': {
        name: 'Gençlerbirliği',
        colors: { primary: '#ff0000', secondary: '#000000' },
        short: 'gen'
    },
    'kas': {
        name: 'Kasımpaşa',
        colors: { primary: '#004A99', secondary: '#FFFFFF' },
        short: 'kas'
    },
    'koc': {
        name: 'Kocaelispor',
        colors: { primary: '#008000', secondary: '#000000' },
        short: 'koc'
    },
    'fat': {
        name: 'Fatih Karagümrük',
        colors: { primary: '#ff0000', secondary: '#000000' },
        short: 'fat',
        aliases: ['fatih karagümrük', 'karagümrük', 'mısırlı', 'vavaçars']
    },
    'eyu': {
        name: 'Eyüpspor',
        colors: { primary: '#800080', secondary: '#FFFF00' },
        short: 'eyu',
        aliases: ['ikas eyüpspor']
    },
    'riz': {
        name: 'Rizespor',
        colors: { primary: '#008C45', secondary: '#163962' },
        short: 'riz',
        aliases: ['çaykur rizespor']
    },
    'gaz': {
        name: 'Gaziantep Futbol Kulübü',
        colors: { primary: '#DA291C', secondary: '#000000' },
        short: 'gaz',
        aliases: ['gfk', 'gaziantepfk', 'gaziantep', 'sumudica']
    },
    'kay': {
        name: 'Kayserispor',
        colors: { primary: '#FFD700', secondary: '#CC0000' },
        short: 'kay',
        aliases: ['mondihome kayserispor', 'zecorner kayserispor']
    }
};

/**
 * Retrieves the primary and secondary colors for a given team.
 * Falls back to default gray colors if team not found.
 *
 * @param {string} teamId - The ID of the team (e.g., 'gal', 'fen').
 * @returns {TeamColors} Object containing primary and secondary hex colors.
 */
export function getTeamColors(teamId: string): TeamColors {
    const team = SUPER_LIG_TEAMS[teamId] || { colors: { primary: '#333333', secondary: '#cccccc' } };
    return team.colors;
}

/**
 * Retrieves the full name of a team.
 * Returns the input ID if team is not found.
 *
 * @param {string} teamId - The ID of the team.
 * @returns {string} The full team name or the ID itself.
 */
export function getTeamName(teamId: string): string {
    const team = SUPER_LIG_TEAMS[teamId];
    return team ? team.name : teamId;
}

/**
 * Normalizes a string for searching: lowercases, replaces Turkish characters, removes non-alphanumerics.
 *
 * @param {string} s - Input string.
 * @returns {string} Normalized string.
 */
function normalizeString(s: string): string {
    return s.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/[^a-z0-9]/g, '');
}

/**
 * Attempts to resolve a user input string to a valid Team ID.
 * Checks against short codes, IDs, aliases, and fuzzy name matches.
 *
 * @param {string} input - The search string (e.g., "Galatasaray", "Cimbom").
 * @returns {string | null} The Team ID if found, otherwise null.
 */
export function resolveTeamId(input: string): string | null {
    if (!input) return null;
    const search = input.toLowerCase().trim();
    const searchNorm = normalizeString(search);

    // 1. Direct shortcode match
    for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
        if (data.short === search) return id;

        // Check aliases with normalization
        if (data.aliases) {
            if (data.aliases.includes(search)) return id;
            if (data.aliases.some(alias => normalizeString(alias) === searchNorm)) return id;
        }
    }

    // 2. Direct ID match
    if (SUPER_LIG_TEAMS[search]) return search;

    // 3. Name fuzzy match
    for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
        const teamNameNorm = normalizeString(data.name);
        // Normalized inclusion check (bidirectional)
        if (teamNameNorm.includes(searchNorm) || searchNorm.includes(teamNameNorm)) {
            return id;
        }
    }

    return null;
}

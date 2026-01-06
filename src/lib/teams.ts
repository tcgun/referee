export const SUPER_LIG_TEAMS: Record<string, { name: string; colors: { primary: string; secondary: string }; short: string; aliases?: string[] }> = {
    'bes': {
        name: 'Beşiktaş',
        colors: { primary: '#000000', secondary: '#ffffff' },
        short: 'bes'
    },
    'kon': {
        name: 'Konyaspor',
        colors: { primary: '#008000', secondary: '#FFFFFF' },
        short: 'kon'
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
        short: 'bas'
    },
    'ant': {
        name: 'Antalyaspor',
        colors: { primary: '#E30613', secondary: '#FFFFFF' },
        short: 'ant'
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
        short: 'ala'
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
        short: 'fat'
    },
    'eyu': {
        name: 'Eyüpspor',
        colors: { primary: '#800080', secondary: '#FFFF00' },
        short: 'eyu'
    },
    'riz': {
        name: 'Rizespor',
        colors: { primary: '#008C45', secondary: '#163962' },
        short: 'riz'
    },
    'gaz': {
        name: 'Gaziantep Futbol Kulübü',
        colors: { primary: '#DA291C', secondary: '#000000' },
        short: 'gaz',
        aliases: ['gfk']
    },
    'kay': {
        name: 'Kayserispor',
        colors: { primary: '#FFD700', secondary: '#CC0000' },
        short: 'kay'
    }
};

export function getTeamColors(teamId: string) {
    const team = SUPER_LIG_TEAMS[teamId] || { colors: { primary: '#333333', secondary: '#cccccc' } };
    return team.colors;
}

export function getTeamName(teamId: string) {
    const team = SUPER_LIG_TEAMS[teamId];
    return team ? team.name : teamId;
}

export function resolveTeamId(input: string): string | null {
    if (!input) return null;
    const search = input.toLowerCase().trim();

    // 1. Direct shortcode match
    for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
        if (data.short === search) return id;
        if (data.aliases?.includes(search)) return id;
    }

    // 2. Direct ID match
    if (SUPER_LIG_TEAMS[search]) return search;

    // 3. Normalized name match
    const normalize = (s: string) => s.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/[ığüşöç]/g, (m) => {
            const map: any = { 'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c' };
            return map[m];
        });

    const searchNorm = normalize(search);
    for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
        if (normalize(data.name).includes(searchNorm) || normalize(id).includes(searchNorm)) {
            return id;
        }
    }

    return null;
}

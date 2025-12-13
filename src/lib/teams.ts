export const SUPER_LIG_TEAMS: Record<string, { name: string; colors: { primary: string; secondary: string } }> = {
    'galatasaray': {
        name: 'Galatasaray',
        colors: { primary: '#A90432', secondary: '#FDB912' }
    },
    'fenerbahce': {
        name: 'Fenerbahçe',
        colors: { primary: '#002d72', secondary: '#f9b517' }
    },
    'besiktas': {
        name: 'Beşiktaş',
        colors: { primary: '#000000', secondary: '#ffffff' }
    },
    'trabzonspor': {
        name: 'Trabzonspor',
        colors: { primary: '#A52A2A', secondary: '#87CEEB' }
    },
    'gaziantep-fk': {
        name: 'Gaziantep FK',
        colors: { primary: '#DA291C', secondary: '#000000' }
    },
    'samsunspor': {
        name: 'Samsunspor',
        colors: { primary: '#CC0000', secondary: '#FFFFFF' }
    },
    'basaksehir': {
        name: 'Başakşehir',
        colors: { primary: '#E56B25', secondary: '#163962' }
    },
    // Add default fallback
    'default': {
        name: 'Takım',
        colors: { primary: '#333333', secondary: '#cccccc' }
    }
};

export function getTeamColors(teamId: string) {
    const team = SUPER_LIG_TEAMS[teamId] || SUPER_LIG_TEAMS['default'];
    return team.colors;
}

export function getTeamName(teamId: string) {
    const team = SUPER_LIG_TEAMS[teamId] || SUPER_LIG_TEAMS['default'];
    return team.name;
}

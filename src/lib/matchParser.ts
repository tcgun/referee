import { Match, MatchStats, MatchEvent } from '@/types';
import { resolveTeamId, getTeamName } from '@/lib/teams';

export const parseMatchData = (text: string, currentMatch: Partial<Match>): Partial<Match> => {
    if (!text.trim()) return currentMatch;

    const newMatch = { ...currentMatch };
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // 1. Initialize Objects if missing
    if (!newMatch.officials) newMatch.officials = { referees: ['', '', '', ''], varReferees: [], observers: [], representatives: [] };
    if (!newMatch.lineups) newMatch.lineups = { home: [], away: [], homeSubs: [], awaySubs: [], homeCoach: '', awayCoach: '' };
    if (!newMatch.stats) newMatch.stats = {} as MatchStats;

    // 2. Identify Teams (First 2 non-numeric lines usually, or lines ending with A.Ş., SK, etc)
    // Heuristic: Look for lines that resolve to a team ID
    const potentialTeams: string[] = [];

    // We scan the first 20 lines for team names
    for (const line of lines.slice(0, 20)) {
        if (potentialTeams.length >= 2) break;
        // Skip lines that are likely not team names (dates, scores, etc)
        if (line.match(/^\d+$/)) continue;
        if (line.length < 3) continue;

        const tid = resolveTeamId(line);
        if (tid && !potentialTeams.includes(tid)) {
            potentialTeams.push(tid);
        }
    }

    if (potentialTeams.length >= 2) {
        // Assign Home/Away based on appearance order
        const hId = potentialTeams[0];
        const aId = potentialTeams[1];
        newMatch.homeTeamId = hId;
        newMatch.homeTeamName = getTeamName(hId);
        newMatch.awayTeamId = aId;
        newMatch.awayTeamName = getTeamName(aId);
    }

    // 3. Scan for Date, Stadium, Score inside Header
    // Try to find Score: Look for lines that are just numbers near team names
    const scoreLines = lines.slice(0, 15).filter(l => /^\d{1,2}$/.test(l));
    if (scoreLines.length >= 2) {
        newMatch.homeScore = parseInt(scoreLines[0]);
        newMatch.awayScore = parseInt(scoreLines[1]);
        newMatch.score = `${newMatch.homeScore}-${newMatch.awayScore}`;
    }

    // Date & Stadium
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Date Parsing
        const dateMatch = line.match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})/);
        if (dateMatch) {
            let timePart = '00:00';
            // Check same line for time
            const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
                timePart = timeMatch[0];
            } else if (i + 1 < lines.length) {
                // Check next line for time
                const nextLine = lines[i + 1];
                const nextTimeMatch = nextLine.match(/(\d{1,2}):(\d{2})/);
                if (nextTimeMatch && nextLine.length < 20) {
                    timePart = nextTimeMatch[0];
                }
            }

            const day = dateMatch[1];
            const month = dateMatch[2];
            const year = dateMatch[3];
            const [hour, minute] = timePart.split(':');

            const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

            if (!isNaN(d.getTime()) && i < 30) {
                newMatch.date = d.toISOString();
            }
        }

        if ((line.includes('STADYUMU') || line.includes('STADI') || line.includes('Stadyumu') || line.includes('Stadı')) && line.length < 100) {
            newMatch.stadium = line.split(' - ')[0].trim();
        }
    }

    // 4. Officials
    lines.forEach(line => {
        const lower = line.toLocaleLowerCase('tr-TR');

        if (line.includes('(Hakem)') || lower.includes('(hakem)')) {
            newMatch.referee = line.replace(/\(Hakem\)/i, '').trim();
            newMatch.officials!.referees[0] = newMatch.referee;
        }
        else if (line.includes('(1. Yardımcı') || lower.includes('(1. yardımcı')) newMatch.officials!.referees[1] = line.replace(/\(1\. Yardımcı Hakem\)/i, '').trim();
        else if (line.includes('(2. Yardımcı') || lower.includes('(2. yardımcı')) newMatch.officials!.referees[2] = line.replace(/\(2\. Yardımcı Hakem\)/i, '').trim();
        else if (line.includes('(Dördüncü') || lower.includes('(dördüncü')) newMatch.officials!.referees[3] = line.replace(/\(Dördüncü Hakem\)/i, '').trim();
        else if (line.includes('(VAR)') || lower.includes('(var)')) {
            const vName = line.replace(/\(VAR\)/i, '').trim();
            if (!newMatch.officials!.varReferees.includes(vName)) newMatch.officials!.varReferees.push(vName);
            newMatch.varReferee = vName;
        }
        else if (line.includes('(AVAR)') || lower.includes('(avar)')) {
            const avName = line.replace(/\(AVAR\)/i, '').trim();
            if (!newMatch.officials!.varReferees.includes(avName)) newMatch.officials!.varReferees.push(avName);
        }
        else if (line.includes('(Gözlemci)') || lower.includes('(gözlemci)')) newMatch.officials!.observers.push(line.replace(/\(Gözlemci\)/i, '').trim());
        else if (line.includes('(Temsilci)') || lower.includes('(temsilci)')) newMatch.officials!.representatives.push(line.replace(/\(Temsilci\)/i, '').trim());
    });

    // 5. Lineups Logic - IMPROVED for Coach Parsing

    // We need to identify sections: Home XI -> Home Subs -> (Maybe Home Coach) -> Away XI -> Away Subs -> (Maybe Away Coach)
    // The "İlk 11" appears twice. The "Yedekler" appears twice.
    // "Teknik Sorumlu" or "Teknik Direktör" appears twice usually at the end of each team's block.

    const homeXI: any[] = []; const awayXI: any[] = [];
    const homeSubs: any[] = []; const awaySubs: any[] = [];
    let homeCoach = ''; let awayCoach = '';

    // State machine
    let currentTeam: 'home' | 'away' = 'home';
    let section: 'xi' | 'subs' | 'coach' | 'none' = 'none';

    // Scan triggers
    // We assume the first "İlk 11" is Home, second is Away.
    let firstXIFound = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lower = line.toLocaleLowerCase('tr-TR');

        // Detect Section Headers
        if (lower.includes('i̇lk 11') || lower.includes('ilk 11')) {
            if (firstXIFound) {
                currentTeam = 'away';
            } else {
                currentTeam = 'home';
                firstXIFound = true;
            }
            section = 'xi';
            continue;
        }

        if (lower.includes('yedekler')) {
            // Team stays same as whatever XI we were just processing
            section = 'subs';
            continue;
        }

        if (lower.includes('teknik sorumlu') || lower.includes('teknik direktör')) {
            // Team stays same
            section = 'coach';
            continue;
        }

        if (lower.includes('kartlar') || lower.includes('goller') || lower.includes('oyundan çıkanlar')) {
            section = 'none';
            continue;
        }

        // Process Content based on section
        if (section === 'xi' || section === 'subs') {
            const playerMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (playerMatch) {
                const pObj = { number: playerMatch[1], name: playerMatch[2].trim() };
                if (currentTeam === 'home') {
                    if (section === 'xi') homeXI.push(pObj); else homeSubs.push(pObj);
                } else {
                    if (section === 'xi') awayXI.push(pObj); else awaySubs.push(pObj);
                }
            }
        } else if (section === 'coach') {
            // Usually the coach name is on the line right after "Teknik Sorumlu" if strictly formatted, 
            // OR it might be the same line if "Teknik Sorumlu: Okan Buruk".
            // Implementation in MatchForm assumed it was the line itself if it didn't match keywords.
            // But usually the header is its own line.

            // If the current line IS "Teknik Sorumlu", we do nothing, wait for next line.
            // Check if this line is a player/number or garbage
            if (line.match(/^(\d+)\./)) continue; // It's a player, maybe we missed a section switch?
            if (line.length < 3) continue;

            // It's likely the coach name
            if (currentTeam === 'home') {
                if (!homeCoach) homeCoach = line;
            } else {
                if (!awayCoach) awayCoach = line;
            }
            // After finding coach, we effectively close this specific coach search until next trigger
            // But we keep section as coach until we hit something else, or just take the first valid line.
        }
    }

    newMatch.lineups.home = homeXI;
    newMatch.lineups.away = awayXI;
    newMatch.lineups.homeSubs = homeSubs;
    newMatch.lineups.awaySubs = awaySubs;

    // Only update if found, to preserve manual edits if re-parsing partials? 
    // Actually for smart paste we usually want to overwrite.
    newMatch.lineups.homeCoach = homeCoach;
    newMatch.lineups.awayCoach = awayCoach;


    // 6. Events (Goals, Cards, Subs)
    const events: MatchEvent[] = [];
    let homeYellow = 0; let awayYellow = 0;
    let homeRed = 0; let awayRed = 0;

    // Use a fresh pass for events since they are strictly sectioned usually at the bottom
    let eventContext: 'none' | 'goals' | 'subsOut' | 'subsIn' = 'none';
    let eventTeam: 'home' | 'away' = 'home';
    // It's hard to distinguish Home/Away events just by list order if they are separated by team columns in visual representation but interleaved in pasted text.
    // However, usually TFF text paste puts Home block then Away block for cards? 
    // Or it lists "Sarı Kartlar" then a list of players.
    // If it's a list, we might need heuristic.
    // BUT, the specific format usually parsed is:
    // ...
    // Sarı Kartlar
    // 35.dk Player (Home)
    // 40.dk Player (Away) -> This is NOT how TFF text usually looks.
    // Usually: Home Team Name ... ... Away Team Name ...
    // Let's stick to the heuristic: The text is usually two large columns pasted into one stream.
    // Everything before the second team's XI is Home, everything after is Away.

    // Let's refine the "second team start" index.
    const xiIndices = lines.map((l, i) => l.toLocaleLowerCase('tr-TR').includes('ilk 11') ? i : -1).filter(i => i !== -1);
    const secondXIIndex = xiIndices.length > 1 ? xiIndices[1] : 9999;

    lines.forEach((line, idx) => {
        const isFirst = idx < secondXIIndex;
        const teamId = isFirst ? 'home' : 'away';

        // Yellow Card
        if (line.includes('Sarı Kart')) {
            if (isFirst) homeYellow++; else awayYellow++;
            const parts = line.replace('Sarı Kart', '').trim();
            const minuteMatch = parts.match(/(\d+\+?\d*)\.dk/);
            const minute = minuteMatch ? minuteMatch[0] : '';
            if (minute) {
                const player = parts.replace(minute, '').trim();
                events.push({ type: 'yellow_card', minute, player, teamId });
            }
        }
        // Red Card
        else if (line.includes('Kırmızı Kart')) {
            if (isFirst) homeRed++; else awayRed++;
            const parts = line.replace('Kırmızı Kart', '').replace('Çift Sarıdan', '').trim();
            const minuteMatch = parts.match(/(\d+\+?\d*)\.dk/);
            const minute = minuteMatch ? minuteMatch[0] : '';
            if (minute) {
                const player = parts.replace(minute, '').trim();
                events.push({ type: 'red_card', minute, player, teamId });
            }
        }
    });

    // Goals and Subs usually appear in "Are" sections or specific lists
    // TFF format: "Goller" section might be present.
    // Let's use the context scan again for Goals and Subs specifically

    lines.forEach((line, idx) => {
        const teamId = idx < secondXIIndex ? 'home' : 'away';
        const lower = line.toLocaleLowerCase('tr-TR');

        if (lower.includes('goller')) { eventContext = 'goals'; return; }
        if (lower.includes('kartlar')) { eventContext = 'none'; return; }
        if (lower.includes('oyundan çıkanlar')) { eventContext = 'subsOut'; return; }
        if (lower.includes('oyuna girenler')) { eventContext = 'subsIn'; return; }
        if (lower.includes('yedekler') || lower.includes('ilk 11') || lower.includes('teknik')) { eventContext = 'none'; return; }

        const minuteMatch = line.match(/(\d+\+?\d*)\.dk/);
        if (minuteMatch) {
            const minute = minuteMatch[0];
            const player = line.replace(minute, '').replace('(H)', '').replace('(D)', '').replace(/\(.*\)/g, '').trim(); // Remove parens comments

            if (eventContext === 'goals') {
                events.push({ type: 'goal', minute, player, teamId });
            } else if (eventContext === 'subsOut') {
                events.push({ type: 'substitution_out', minute, player, teamId });
            } else if (eventContext === 'subsIn') {
                events.push({ type: 'substitution_in', minute, player, teamId });
            }
        }
    });

    newMatch.events = events;
    if (newMatch.stats) {
        newMatch.stats.homeYellowCards = homeYellow;
        newMatch.stats.awayYellowCards = awayYellow;
        newMatch.stats.homeRedCards = homeRed;
        newMatch.stats.awayRedCards = awayRed;
    }

    const generateMatchId = (m: Partial<Match>) => {
        const activeWeek = m.week || 1;
        if (activeWeek && m.homeTeamId && m.awayTeamId && m.date) {
            const d = new Date(m.date);
            if (!isNaN(d.getTime())) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `week${activeWeek}-${m.homeTeamId}-${m.awayTeamId}-${yyyy}-${mm}-${dd}`;
            }
        }
        return m.id || '';
    };

    if (!newMatch.id || newMatch.id.startsWith('week1-takim-takim')) {
        const newId = generateMatchId(newMatch);
        if (newId) newMatch.id = newId;
    }

    return newMatch;
};

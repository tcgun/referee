import { SUPER_LIG_TEAMS, getTeamName, replaceTeamNamesWithSystemNames } from '@/lib/teams';
import { Match } from '@/types';

export interface ParsedAction {
    teamName: string;
    teamId: string;
    subject: string;
    reason: string;
    penalty: string;
    date: string;
    matchId: string;
    week?: number;
    competition: 'league' | 'cup';
    note: string;
}

function normalizeText(s: string): string {
    if (!s) return "";
    let n = s.toLowerCase();
    n = n.replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/i̇/g, 'i')
        .replace(/İ/g, 'i');
    return n;
}

export function parsePfdkText(rawInput: string, allMatches: Match[] = []): ParsedAction[] {
    if (!rawInput || !rawInput.trim()) {
        return [];
    }

    const paragraphs: string[] = [];
    let currentParagraph = "";
    
    for (const line of rawInput.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (currentParagraph) {
                paragraphs.push(currentParagraph);
                currentParagraph = "";
            }
            continue;
        }
        
        const isNewClause = /^\d+[-.]/.test(trimmed) || trimmed.startsWith("Aynı müsabakada") || trimmed.startsWith("Aynı müsabakada,");
        if (isNewClause && currentParagraph) {
            paragraphs.push(currentParagraph);
            currentParagraph = trimmed;
        } else {
            if (currentParagraph) {
                currentParagraph += " " + trimmed;
            } else {
                currentParagraph = trimmed;
            }
        }
    }
    if (currentParagraph) {
        paragraphs.push(currentParagraph);
    }

    const items: ParsedAction[] = [];
    let lastMatchDate: string | null = null;
    let lastMatchId: string | null = null;
    let lastWeek: number | undefined = undefined;

    for (const p of paragraphs) {
        const normP = normalizeText(p);
        let teamId: string | null = null;
        let bestIndex = Infinity;

        for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
            const normName = normalizeText(data.name);
            const index = normP.indexOf(normName);
            if (index !== -1 && index < bestIndex) {
                bestIndex = index;
                teamId = id;
            }

            const normShort = normalizeText(data.short);
            const shortRegex = new RegExp(`\\b${normShort}\\b`, 'i');
            const shortMatch = normP.match(shortRegex);
            if (shortMatch && shortMatch.index! < bestIndex) {
                bestIndex = shortMatch.index!;
                teamId = id;
            }

            if (data.aliases) {
                for (const alias of data.aliases) {
                    const normAlias = normalizeText(alias);
                    const aIdx = normP.indexOf(normAlias);
                    if (aIdx !== -1 && aIdx < bestIndex) {
                        bestIndex = aIdx;
                        teamId = id;
                    }
                }
            }
        }

        if (!teamId) {
            continue;
        }

        const teamName = getTeamName(teamId);

        const dateMatch = p.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        let dateStr = "";
        if (dateMatch) {
            dateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
            lastMatchDate = dateStr;
        } else if (p.includes("Aynı müsabakada") || p.includes("Aynı müsabakada,")) {
            dateStr = lastMatchDate || "";
        } else {
            dateStr = lastMatchDate || new Date().toISOString().split('T')[0];
        }

        let matchedMatch: Match | undefined = undefined;
        if (teamId && dateStr) {
            matchedMatch = allMatches.find(m => {
                const mDateStr = new Date(m.date).toISOString().split('T')[0];
                const involvesTeam = m.homeTeamId === teamId || m.awayTeamId === teamId;
                return involvesTeam && mDateStr === dateStr;
            });
        }

        let matchId = "";
        let week: number | undefined = undefined;
        if (matchedMatch) {
            matchId = matchedMatch.id;
            week = matchedMatch.week;
            lastMatchId = matchId;
            lastWeek = week;
        } else if (p.includes("Aynı müsabakada") || p.includes("Aynı müsabakada,")) {
            matchId = lastMatchId || "";
            week = lastWeek;
        }

        let subject = "Kulüp";
        const subjectRegex = /(?:idarecisi|yöneticisi|başkanı|antrenörü|teknik sorumlusu|futbolcusu|sporcusu|görevlisi|masörü)\s+([A-ZÇĞİÖŞÜa-zçğıöşü\s’'-]{3,30})(?=['’’](?:nin|nın|nun|nün|in|ın|un|ün|i|ı|u|ü|a|e|den|dan|ta|te|da|de|la|le)\b)/i;
        const subMatch = p.match(subjectRegex);
        if (subMatch) {
            subject = subMatch[1].trim();
            subject = subject.replace(/['’]s$/, '');
        }

        let reason = "Disiplin İhlali";
        const quoteRegex = /["'“”«»]([^"'“”«»]{5,})["'“”«»]/;
        const quoteMatch = p.match(quoteRegex);
        if (quoteMatch) {
            reason = quoteMatch[1].trim();
        } else {
            const patterns = [
                /,\s*([^,.]+?)\s+nedeniyle/i,
                /,\s*([^,.]+?)\s+dolayı/i,
                /,\s*([^,.]+?)\s+ötürü/i,
                /([^,.]+?)\s+nedeniyle/i,
                /([^,.]+?)\s+dolayı/i
            ];
            for (const pattern of patterns) {
                const match = p.match(pattern);
                if (match) {
                    let val = match[1].trim();
                    val = val.replace(/^müsabakasında,\s*/i, '')
                             .replace(/^maddesi\s+uyarınca\s*/i, '')
                             .replace(/^beyanlarında\s+yer\s+alan\s*/i, '')
                             .replace(/^paylaşımda\s+yer\s+alan\s*/i, '');
                    reason = val.charAt(0).toUpperCase() + val.slice(1);
                    break;
                }
            }
        }

        const penalties: string[] = [];
        const hakMatch = p.match(/(\d+)\s+GÜN\s+HAK\s+MAHRUMİYETİ/i);
        if (hakMatch) {
            penalties.push(`${hakMatch[1]} Gün Hak Mahrumiyeti`);
        }
        const menMatch = p.match(/(\d+)\s+RESMİ\s+MÜSABAKADAN\s+MEN/i);
        if (menMatch) {
            penalties.push(`${menMatch[1]} Maç Men`);
        }
        const fineMatch = p.match(/([\d.]+)\.-?\s*TL\s+PARA\s+CEZASI/i);
        if (fineMatch) {
            penalties.push(`${fineMatch[1]} TL Para Cezası`);
        }
        if (p.includes("İHTAR CEZASI")) {
            penalties.push("İhtar");
        }
        if (p.includes("kartlarının bloke edilmesi")) {
            const blockMatch = p.match(/([A-ZÇĞİÖŞÜ0-9\s]+TRİBÜN[A-ZÇĞİÖŞÜ0-9\s]*\s+[A-Za-z0-9\s-]+blok(?:ta|ında)?)/);
            if (blockMatch) {
                penalties.push(`Kart Bloke (${blockMatch[1].trim().replace(/\s+/g, ' ')})`);
            } else if (p.includes("MİSAFİR TRİBÜN")) {
                penalties.push("Kart Bloke (Misafir Tribün)");
            } else {
                penalties.push("Kart Bloke");
            }
        }
        
        const penalty = penalties.length > 0 ? penalties.join(" ve ") : "Cezalandırılmasına";

        items.push({
            teamName,
            teamId,
            subject,
            reason,
            penalty,
            date: dateStr || new Date().toISOString().split('T')[0],
            matchId,
            week,
            competition: (matchedMatch?.competition as 'league' | 'cup') || 'league',
            note: replaceTeamNamesWithSystemNames(p)
        });
    }

    return items;
}

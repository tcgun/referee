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
    category?: string;
}

export function extractDate(text: string): string | null {
    if (!text) return null;
    // YYYY-MM-DD
    const ymdMatch = text.match(/(\d{4})[-/.](\d{2})[-/.](\d{2})/);
    if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
    }
    // DD.MM.YYYY
    const dmyMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dmyMatch) {
        const day = dmyMatch[1].padStart(2, '0');
        const month = dmyMatch[2].padStart(2, '0');
        const year = dmyMatch[3];
        return `${year}-${month}-${day}`;
    }
    // Turkish month format: e.g. "20 Haziran 2026", "9 Ağustos 2025"
    const monthsTr: Record<string, string> = {
        'ocak': '01', 'subat': '02', 'şubat': '02', 'mart': '03', 'nisan': '04',
        'mayis': '05', 'mayıs': '05', 'haziran': '06', 'temmuz': '07', 'agustos': '08',
        'ağustos': '08', 'eylul': '09', 'eylül': '09', 'ekim': '10', 'kasim': '11',
        'kasım': '11', 'aralik': '12', 'aralık': '12'
    };
    const monthsKeys = Object.keys(monthsTr).join('|');
    const trDateRegex = new RegExp(`(\\d{1,2})\\s+(${monthsKeys})\\s+(\\d{4})`, 'i');
    const trDateMatch = text.match(trDateRegex);
    if (trDateMatch) {
        const day = trDateMatch[1].padStart(2, '0');
        const monthStr = trDateMatch[2].toLowerCase();
        const month = monthsTr[monthStr];
        const year = trDateMatch[3];
        return `${year}-${month}-${day}`;
    }
    return null;
}

export function parseCategoryFromText(text: string, subject: string): string {
    const s = subject.toUpperCase();
    if (s === 'KULÜP' || s.includes('KULÜBÜ') || s.includes('A.Ş.')) {
        return 'KULÜP';
    }

    const normText = text.toLowerCase();
    const normSubject = subject.toLowerCase();

    // Escape regex characters in subject name
    const escapedSubject = normSubject.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?:\\b([a-zçğıöşüıİ]+(?:\\s+[a-zçğıöşüıİ]+){0,2})\\s+)?${escapedSubject}`, 'i');
    const match = normText.match(regex);
    
    if (match && match[1]) {
        const role = match[1].trim();
        const cleanRole = role.replace(/^(?:ve|veya|ile|aynı|müsabakada|müsabakasında|sonrasında|tarihinde|tarihli)\s+/, '').trim();
        if (cleanRole && cleanRole.length > 2) {
            return normalizeCategory(cleanRole);
        }
    }

    // Fallbacks
    const normP = normText;
    if (normP.includes('idarecisi') || normP.includes('baskani') || normP.includes('başkanı') || normP.includes('yoneticisi') || normP.includes('yöneticisi')) {
        return 'İDARECİ';
    }
    if (normP.includes('teknik sorumlusu') || normP.includes('antrenoru') || normP.includes('antrenörü') || normP.includes('teknik direktoru') || normP.includes('teknik direktörü')) {
        return 'TEKNİK SORUMLU';
    }
    if (normP.includes('gorevlisi') || normP.includes('görevlisi') || normP.includes('masoru') || normP.includes('masörü') || normP.includes('fizyoterapisti') || normP.includes('doktoru') || normP.includes('calisani') || normP.includes('çalışanı') || normP.includes('temsilcisi')) {
        return 'KULÜP ÇALIŞANI';
    }
    if (normP.includes('futbolcusu') || normP.includes('sporcusu')) {
        return 'FUTBOLCU';
    }

    return 'FUTBOLCU'; // Default fallback for a person
}

function normalizeCategory(role: string): string {
    const r = role.toLowerCase().trim();
    if (r.includes('idareci') || r.includes('yönetici') || r.includes('başkan')) {
        return 'İDARECİ';
    }
    if (r.includes('futbolcu') || r.includes('sporcu')) {
        return 'FUTBOLCU';
    }
    if (r.includes('teknik') || r.includes('antrenör')) {
        return 'TEKNİK SORUMLU';
    }
    if (r.includes('görevli') || r.includes('masör') || r.includes('fizyoterapist') || r.includes('doktor') || r.includes('çalışan') || r.includes('temsilci') || r.includes('personel')) {
        return 'KULÜP ÇALIŞANI';
    }
    return r.toUpperCase()
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .replace(/ğ/g, 'Ğ')
        .replace(/ü/g, 'Ü')
        .replace(/ş/g, 'Ş')
        .replace(/ö/g, 'Ö')
        .replace(/ç/g, 'Ç');
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

    const defaultDate = extractDate(rawInput) || new Date().toISOString().split('T')[0];

    const paragraphs: string[] = [];
    let currentParagraph = "";
    
    for (const line of rawInput.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) {
            // Only split on blank lines if the current paragraph seems complete (ends with a period/punctuation)
            const endsWithSentenceFinisher = /[.!?]['"’”)•“]?\s*$/.test(currentParagraph);
            if (currentParagraph && endsWithSentenceFinisher) {
                paragraphs.push(currentParagraph);
                currentParagraph = "";
            }
            continue;
        }
        
        const isNewClause = /^\d+[-.]/.test(trimmed) || /^[-•*]\s+/.test(trimmed) || trimmed.startsWith("Aynı müsabakada") || trimmed.startsWith("Aynı müsabakada,");
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

        const dateMatch = p.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        let dateStr = "";
        if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            dateStr = `${year}-${month}-${day}`;
            lastMatchDate = dateStr;
        } else if (p.includes("Aynı müsabakada") || p.includes("Aynı müsabakada,")) {
            dateStr = lastMatchDate || defaultDate;
        } else {
            dateStr = lastMatchDate || defaultDate;
        }

        let matchedMatch: Match | undefined = undefined;
        const isMatchRelated = /müsabaka|maç/i.test(p);
        if (isMatchRelated && teamId && dateStr) {
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
        const subjectRegex = /(?:[iİıI]darec[iİıI]s[iİıI]|yönet[iİıI]c[iİıI]s[iİıI]|başkan[ıİiI]|antrenörü|tekn[iİıI]k\s+sorumlusu|tekn[iİıI]k\s+d[iİıI]rektörü|futbolcusu|sporcusu|görevl[iİıI]s[iİıI]|masörü)\s+([A-ZÇĞİÖŞÜa-zçğıöşü\s'-]{3,30})(?=['’’](?:nin|nın|nun|nün|in|ın|un|ün|i|ı|u|ü|a|e|den|dan|ta|te|da|de|la|le)\b)/i;
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
        const category = parseCategoryFromText(p, subject);

        items.push({
            teamName,
            teamId,
            subject,
            reason,
            penalty,
            date: dateStr || defaultDate,
            matchId,
            week,
            competition: (matchedMatch?.competition as 'league' | 'cup') || 'league',
            note: replaceTeamNamesWithSystemNames(p),
            category
        });
    }

    return items;
}

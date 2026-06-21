import { SUPER_LIG_TEAMS, getTeamName, replaceTeamNamesWithSystemNames } from '@/lib/teams';
import { normalizeTurkish } from '@/lib/turkishUtils';
import { extractDate, parseCategoryFromText } from './pfdkParser';

export interface ParsedAppeal {
    teamName: string;
    teamId: string;
    subject: string;
    appealStatus: 'none' | 'pending' | 'accepted' | 'rejected' | 'partially_accepted';
    appealedPenalty: string;
    appealNote: string;
    appealDate: string;
    category?: string;
}

export function parseTahkimText(rawInput: string): ParsedAppeal[] {
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
        
        const isNewClause = /^\d+[-.]/.test(trimmed) || /^[-•*]\s+/.test(trimmed);
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

    const items: ParsedAppeal[] = [];

    for (const p of paragraphs) {
        const normP = normalizeTurkish(p);
        let teamId: string | null = null;
        let bestIndex = Infinity;

        // 1. Resolve Team
        for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
            const normName = normalizeTurkish(data.name);
            const index = normP.indexOf(normName);
            if (index !== -1 && index < bestIndex) {
                bestIndex = index;
                teamId = id;
            }

            const normShort = normalizeTurkish(data.short);
            const shortRegex = new RegExp(`\\b${normShort}\\b`, 'i');
            const shortMatch = normP.match(shortRegex);
            if (shortMatch && typeof shortMatch.index === 'number' && shortMatch.index < bestIndex) {
                bestIndex = shortMatch.index;
                teamId = id;
            }

            if (data.aliases) {
                for (const alias of data.aliases) {
                    const normAlias = normalizeTurkish(alias);
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

        // 2. Resolve Subject (Person or Club)
        let subject = "Kulüp";
        const subjectRegex = /(?:[iİıI]darec[iİıI]s[iİıI]|yönet[iİıI]c[iİıI]s[iİıI]|başkan[ıİiI]|antrenörü|tekn[iİıI]k\s+sorumlusu|tekn[iİıI]k\s+d[iİıI]rektörü|futbolcusu|sporcusu|görevl[iİıI]s[iİıI]|masörü)\s+([A-ZÇĞİÖŞÜa-zçğıöşü\s'-]{3,30})(?=['’’](?:nin|nın|nun|nün|in|ın|un|ün|i|ı|u|ü|a|e|den|dan|ta|te|da|de|la|le)\b)/i;
        const subMatch = p.match(subjectRegex);
        if (subMatch) {
            subject = subMatch[1].trim();
            subject = subject.replace(/['’]s$/, '');
        }

        // 3. Resolve Appeal Status
        let appealStatus: ParsedAppeal['appealStatus'] = 'none';
        
        const isAccepted = /kaldırılmasına|iptaline|ceza tayinine yer olmadığına/i.test(p);
        const isRejected = /reddine|reddedilerek onanmasına|onanmasına/i.test(p) && !/düzeltilerek|indirilmesine|ertelenmesine/i.test(p);
        const isPartiallyAccepted = /düzeltilerek|indirilmesine|ertelenmesine/i.test(p);
        
        if (isAccepted) {
            appealStatus = 'accepted';
        } else if (isPartiallyAccepted) {
            appealStatus = 'partially_accepted';
        } else if (isRejected) {
            appealStatus = 'rejected';
        } else {
            // It is an introduction/header paragraph, skip it
            continue;
        }

        // 4. Resolve Appealed Penalty (for partially_accepted)
        let appealedPenalty = "";
        if (appealStatus === 'accepted') {
            appealedPenalty = "Ceza Kaldırıldı";
        } else if (appealStatus === 'partially_accepted') {
            // Parse TL amounts
            const tlMatches = [...p.matchAll(/([\d.]+)(?:\.-)?\s*TL/gi)];
            if (tlMatches.length >= 2) {
                appealedPenalty = `${tlMatches[tlMatches.length - 1][1]} TL Para Cezası`;
            } else if (tlMatches.length === 1) {
                appealedPenalty = `${tlMatches[0][1]} TL Para Cezası`;
            }

            // Parse match men
            const menMatches = [...p.matchAll(/(\d+)\s+resmi\s+müsabakadan\s+men/gi)];
            if (menMatches.length >= 2) {
                appealedPenalty = `${menMatches[menMatches.length - 1][1]} Maç Men`;
            } else if (menMatches.length === 1) {
                appealedPenalty = `${menMatches[0][1]} Maç Men`;
            }

            if (!appealedPenalty) {
                appealedPenalty = "Ceza İndirildi";
            }
        } else if (appealStatus === 'rejected') {
            appealedPenalty = "İtiraz Reddedildi";
        }

        const category = parseCategoryFromText(p, subject);

        items.push({
            teamName,
            teamId,
            subject,
            appealStatus,
            appealedPenalty,
            appealNote: replaceTeamNamesWithSystemNames(p),
            appealDate: defaultDate,
            category
        });
    }

    return items;
}

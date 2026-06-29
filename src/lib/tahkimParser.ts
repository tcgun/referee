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
    pfdkDecisionDate?: string;
}

export function extractReferencedPfdkDate(text: string): string | null {
    if (!text) return null;
    const pfdkDateRegex = /PFDK(?:'nın|’nın|’un|’un|ün|ün|\s+’\s*nın|)?\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*(?:tarih|tarihli)/i;
    const match = text.match(pfdkDateRegex);
    if (match) {
        return extractDate(match[1]);
    }
    return null;
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
    let lastParsedPfdkDate: string | null = null;

    for (const p of paragraphs) {
        // Extract referenced PFDK date if present in this paragraph
        const refPfdkDate = extractReferencedPfdkDate(p);
        if (refPfdkDate) {
            lastParsedPfdkDate = refPfdkDate;
        }

        const normP = normalizeTurkish(p);
        
        // Skip TFF Board of Directors (Yönetim Kurulu) or MHK/administrative appeals
        if (normP.includes('yonetim kurulu') || normP.includes('merkez hakem kurulu') || normP.includes('mhk')) {
            continue;
        }

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
        const subjectRegex = /(?:[iİıI]darec[iİıI]s[iİıI]|yönet[iİıI]c[iİıI]s[iİıI]|başkan[ıİiI]|antrenörü|tekn[iİıI]k\s+sorumlusu|tekn[iİıI]k\s+d[iİıI]rektörü|futbolcusu|sporcusu|görevl[iİıI]s[iİıI]|masörü)\s+([A-ZÇĞİÖŞÜa-zçğıöşü\s'-]{3,30})(?=['’’](?:nin|nın|nun|nün|in|ın|un|ün|i|ı|u|ü|a|e|den|dan|ta|te|da|de|la|le))/i;
        const subMatch = p.match(subjectRegex);
        if (subMatch) {
            subject = subMatch[1].trim();
            subject = subject.replace(/['’]s$/, '');
        }

        // 3. Resolve Appeal Status
        let appealStatus: ParsedAppeal['appealStatus'] = 'none';
        
        let isAccepted = /kaldırılmasına|iptaline|ceza tayinine yer olmadığına/i.test(p);
        let isPartiallyAccepted = /düzeltilerek|indirilmesine|ertelenmesine/i.test(p);
        const isRejected = /reddine|reddedilerek onanmasına|onanmasına/i.test(p) && !/düzeltilerek|indirilmesine|ertelenmesine/i.test(p);
        
        // Özel durum: Kararın kaldırılmasına ve yeni (daha düşük) bir ceza verilmesine (kısmen kabul/indirim)
        if (isAccepted && /kaldırılmasına\s+(?:ve|veya|,)?\s+.*cezalandırılmasına/i.test(p)) {
            isPartiallyAccepted = true;
            isAccepted = false;
        }

        if (isPartiallyAccepted) {
            appealStatus = 'partially_accepted';
        } else if (isAccepted) {
            appealStatus = 'accepted';
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
            // 1. Blok/Tribün cezası kısmi kabul/indirim tespiti
            if (/blok|bloke|tribün/i.test(p)) {
                const decisionStartIdx = Math.max(0, p.search(/kararda|kararında|itirazı/i));
                const decisionText = p.substring(decisionStartIdx);
                
                const blockRegex = /((?:Güney|Kuzey|Doğu|Batı|Maraton|Spor\s+Toto|Baba\s+Hakkı)\s+(?:Tribün[ü|ü]?|Tribün)?\s*(?:\d+(?:\s*(?:ve|,|veya)\s*\d+)*)\s*(?:numaralı)?\s*blok(?:lar)?)/gi;
                const approvedBlocks: string[] = [];
                
                const matches = [...decisionText.matchAll(blockRegex)];
                for (const match of matches) {
                    const blockStr = match[0];
                    const idx = match.index!;
                    const subtext = decisionText.substring(idx + blockStr.length);
                    
                    const firstOnanma = subtext.search(/onanmasına|onanması|reddine|reddedilerek/i);
                    const firstKaldirilma = subtext.search(/kaldırılmasına|iptaline/i);
                    
                    const hasOnanma = firstOnanma !== -1;
                    const hasKaldirilma = firstKaldirilma !== -1;
                    
                    if (hasOnanma && (!hasKaldirilma || firstOnanma < firstKaldirilma)) {
                        approvedBlocks.push(blockStr.trim());
                    }
                }
                
                if (approvedBlocks.length > 0) {
                    const uniqueBlocks = [...new Set(approvedBlocks)].map(b => 
                        b.replace(/\s*numaralı\s*blok(?:lar)?/i, '').trim()
                    );
                    appealedPenalty = `Kart Bloke (${uniqueBlocks.join(', ')})`;
                }
            }

            // 2. Parse TL amounts (if not block penalty)
            if (!appealedPenalty) {
                const tlMatches = [...p.matchAll(/([\d.,]+)(?:\.-)?\s*TL/gi)];
                if (tlMatches.length >= 2) {
                    appealedPenalty = `${tlMatches[tlMatches.length - 1][1]} TL Para Cezası`;
                } else if (tlMatches.length === 1) {
                    appealedPenalty = `${tlMatches[0][1]} TL Para Cezası`;
                }
            }

            // 3. Parse match men (if not resolved yet)
            if (!appealedPenalty) {
                const menMatches = [...p.matchAll(/(\d+)\s+resmi\s+müsabakadan\s+men/gi)];
                if (menMatches.length >= 2) {
                    appealedPenalty = `${menMatches[menMatches.length - 1][1]} Maç Men`;
                } else if (menMatches.length === 1) {
                    appealedPenalty = `${menMatches[0][1]} Maç Men`;
                }
            }

            if (!appealedPenalty) {
                appealedPenalty = "Ceza İndirildi";
            }
        } else if (appealStatus === 'rejected') {
            appealedPenalty = "İtiraz Reddedildi";
        }

        let appealNote = "";
        if (appealStatus === 'rejected') {
            appealNote = "Tahkim Kurulu, yapılan itirazı esastan reddederek PFDK cezasını onamıştır.";
        } else if (appealStatus === 'accepted') {
            appealNote = "Tahkim Kurulu, yapılan itirazı kabul ederek PFDK cezasını tamamen kaldırmıştır.";
        } else if (appealStatus === 'partially_accepted') {
            if (/blok|bloke|tribün/i.test(p)) {
                const decisionStartIdx = Math.max(0, p.search(/kararda|kararında|itirazı/i));
                const decisionText = p.substring(decisionStartIdx);
                const blockRegex = /((?:Güney|Kuzey|Doğu|Batı|Maraton|Spor\s+Toto|Baba\s+Hakkı)\s+(?:Tribün[ü|ü]?|Tribün)?\s*(?:\d+(?:\s*(?:ve|,|veya)\s*\d+)*)\s*(?:numaralı)?\s*blok(?:lar)?)/gi;
                const approvedBlocks: string[] = [];
                const cancelledBlocks: string[] = [];
                const matches = [...decisionText.matchAll(blockRegex)];
                for (const match of matches) {
                    const blockStr = match[0];
                    const idx = match.index!;
                    const subtext = decisionText.substring(idx + blockStr.length);
                    const firstOnanma = subtext.search(/onanmasına|onanması|reddine|reddedilerek/i);
                    const firstKaldirilma = subtext.search(/kaldırılmasına|iptaline/i);
                    const hasOnanma = firstOnanma !== -1;
                    const hasKaldirilma = firstKaldirilma !== -1;
                    if (hasOnanma && (!hasKaldirilma || firstOnanma < firstKaldirilma)) {
                        approvedBlocks.push(blockStr.trim());
                    } else if (hasKaldirilma && (!hasOnanma || firstKaldirilma < firstOnanma)) {
                        cancelledBlocks.push(blockStr.trim());
                    }
                }
                const cleanApproved = [...new Set(approvedBlocks)].map(b => b.replace(/\s*numaralı\s*blok(?:lar)?/i, '').trim());
                const cleanCancelled = [...new Set(cancelledBlocks)].map(b => b.replace(/\s*numaralı\s*blok(?:lar)?/i, '').trim());
                if (cleanApproved.length > 0 && cleanCancelled.length > 0) {
                    appealNote = `Tahkim Kurulu, itirazı kısmen kabul ederek ${cleanCancelled.join(', ')} bloklarının cezasını kaldırmış, ${cleanApproved.join(', ')} bloklarının cezasını ise onamıştır.`;
                } else if (cleanApproved.length > 0) {
                    appealNote = `Tahkim Kurulu, itirazı kısmen kabul ederek ${cleanApproved.join(', ')} bloklarının cezasını onamıştır.`;
                } else if (cleanCancelled.length > 0) {
                    appealNote = `Tahkim Kurulu, itirazı kısmen kabul ederek ${cleanCancelled.join(', ')} bloklarının cezasını kaldırmıştır.`;
                } else {
                    appealNote = `Tahkim Kurulu, itirazı kısmen kabul ederek blok kapatma cezasını düzenlemiştir.`;
                }
            } else {
                const tlMatches = [...p.matchAll(/([\d.,]+)(?:\.-)?\s*TL/gi)];
                const menMatches = [...p.matchAll(/(\d+)\s+resmi\s+müsabakadan\s+men/gi)];
                if (tlMatches.length >= 2) {
                    appealNote = `Tahkim Kurulu, yapılan itirazı kısmen kabul ederek para cezasını ${tlMatches[0][1]} TL'den ${tlMatches[tlMatches.length - 1][1]} TL'ye indirmiştir.`;
                } else if (menMatches.length >= 2) {
                    appealNote = `Tahkim Kurulu, yapılan itirazı kısmen kabul ederek müsabakadan men cezasını ${menMatches[0][1]} maçtan ${menMatches[menMatches.length - 1][1]} maça indirmiştir.`;
                } else {
                    appealNote = `Tahkim Kurulu, yapılan itirazı kısmen kabul ederek PFDK cezasında indirime gitmiştir.`;
                }
            }
        } else {
            appealNote = `Tahkim Kurulu karar aşamasındadır.`;
        }

        const category = parseCategoryFromText(p, subject);

        items.push({
            teamName,
            teamId,
            subject,
            appealStatus,
            appealedPenalty,
            appealNote,
            appealDate: defaultDate,
            category,
            pfdkDecisionDate: lastParsedPfdkDate || undefined
        });
    }

    return items;
}

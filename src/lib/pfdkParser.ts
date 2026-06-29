import { SUPER_LIG_TEAMS, getTeamName, replaceTeamNamesWithSystemNames } from '@/lib/teams';
import { Match } from '@/types';
import { normalizeTurkish } from './turkishUtils';

export interface ParsedAction {
    teamName: string;
    teamId: string;
    subject: string;
    reason: string;
    penalty: string;
    date: string;
    pfdkDecisionDate?: string;
    matchId: string;
    week?: number;
    competition: 'league' | 'cup';
    note: string;
    category?: string;
    isMatchRelated?: boolean;
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
    if (normP.includes('futbolcusu') || normP.includes('sporcusu') || normP.includes('futbolculari') || normP.includes('sporculari')) {
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
            // Split on blank lines if the current paragraph seems complete (ends with a period/comma/semicolon/punctuation)
            const endsWithClauseFinisher = /[.,;!?]['"’”)•“]?\s*$/.test(currentParagraph);
            if (currentParagraph && endsWithClauseFinisher) {
                paragraphs.push(currentParagraph);
                currentParagraph = "";
            }
            continue;
        }
        
        const normTrimmed = normalizeText(trimmed);
        const startsWithTeam = Object.values(SUPER_LIG_TEAMS).some(data => {
            const normName = normalizeText(data.name);
            if (normTrimmed.startsWith(normName)) return true;
            if (data.aliases) {
                return data.aliases.some(alias => normTrimmed.startsWith(normalizeText(alias)));
            }
            return false;
        });

        const isNewClause = 
            /^\d+[-.]/.test(trimmed) || 
            /^[-•*]\s+/.test(trimmed) || 
            normTrimmed.startsWith("ayni musabakada") || 
            startsWithTeam;

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

        // Find all teams mentioned in this paragraph
        const mentionedTeamIds = new Set<string>();
        for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
            const normName = normalizeText(data.name);
            if (normP.includes(normName)) {
                mentionedTeamIds.add(id);
                continue;
            }

            const normShort = normalizeText(data.short);
            const shortRegex = new RegExp(`\\b${normShort}\\b`, 'i');
            if (shortRegex.test(normP)) {
                mentionedTeamIds.add(id);
                continue;
            }

            if (data.aliases) {
                for (const alias of data.aliases) {
                    const normAlias = normalizeText(alias);
                    if (normP.includes(normAlias)) {
                        mentionedTeamIds.add(id);
                        break;
                    }
                }
            }
        }

        const dateMatch = p.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        let dateStr = "";
        if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            dateStr = `${year}-${month}-${day}`;
            lastMatchDate = dateStr;
        } else if (normP.includes("ayni musabakada")) {
            dateStr = lastMatchDate || defaultDate;
        } else {
            dateStr = lastMatchDate || defaultDate;
        }

        const isSameMatch = normP.includes("ayni musabakada");
        let matchedMatch: Match | undefined = undefined;
        const isMatchRelated = /musabaka|mac|karsilasma/i.test(normP);
        if (isMatchRelated && teamId && !isSameMatch) {
            const otherTeamIds = Array.from(mentionedTeamIds).filter(id => id !== teamId);
            
            if (otherTeamIds.length > 0) {
                // Find all matches between teamId and any of these otherTeamIds
                const candidateMatches = allMatches.filter(m => {
                    const involvesTeam = m.homeTeamId === teamId || m.awayTeamId === teamId;
                    const involvesOpponent = otherTeamIds.includes(m.homeTeamId) || otherTeamIds.includes(m.awayTeamId);
                    return involvesTeam && involvesOpponent;
                });
                
                if (candidateMatches.length > 0) {
                    const targetTime = dateStr ? new Date(dateStr).getTime() : NaN;
                    if (!isNaN(targetTime)) {
                        let bestDiff = Infinity;
                        let bestMatch = candidateMatches[0];
                        for (const m of candidateMatches) {
                            const mTime = new Date(m.date).getTime();
                            if (!isNaN(mTime)) {
                                const diff = Math.abs(mTime - targetTime);
                                if (diff < bestDiff) {
                                    bestDiff = diff;
                                    bestMatch = m;
                                }
                            }
                        }
                        // Accept matching if within 30 days
                        if (bestDiff <= 30 * 24 * 60 * 60 * 1000) {
                            matchedMatch = bestMatch;
                        }
                    }
                    
                    if (!matchedMatch) {
                        // Unconditional closest match
                        const targetTime = dateStr ? new Date(dateStr).getTime() : NaN;
                        if (!isNaN(targetTime)) {
                            let bestDiff = Infinity;
                            let bestMatch = candidateMatches[0];
                            for (const m of candidateMatches) {
                                const mTime = new Date(m.date).getTime();
                                if (!isNaN(mTime)) {
                                    const diff = Math.abs(mTime - targetTime);
                                    if (diff < bestDiff) {
                                        bestDiff = diff;
                                        bestMatch = m;
                                    }
                                }
                            }
                            matchedMatch = bestMatch;
                        } else {
                            matchedMatch = candidateMatches[0];
                        }
                    }
                }
            }

            // Fallback to date-only matching if no match was found yet
            if (!matchedMatch && dateStr) {
                matchedMatch = allMatches.find(m => {
                    const mDateStr = new Date(m.date).toISOString().split('T')[0];
                    const involvesTeam = m.homeTeamId === teamId || m.awayTeamId === teamId;
                    return involvesTeam && mDateStr === dateStr;
                });
            }
        }

        let matchId = "";
        let week: number | undefined = undefined;
        if (matchedMatch) {
            matchId = matchedMatch.id;
            week = matchedMatch.week;
            lastMatchId = matchId;
            lastWeek = week;
        } else if (normP.includes("ayni musabakada")) {
            matchId = lastMatchId || "";
            week = lastWeek;
        }

        let subject = "Kulüp";
        const subjectRegex = /(?:[iİıI]darec[iİıI]s[iİıI]|[iİıI]darec[iİıI]ler[iİıI]|yönet[iİıI]c[iİıI]s[iİıI]|yönet[iİıI]c[iİıI]ler[iİıI]|başkan[ıİiI]|başkanlar[ıİiI]|antrenörü|antrenörler[iİıI]|tekn[iİıI]k\s+sorumlusu|tekn[iİıI]k\s+sorumlular[ıİiI]|futbolcusu|futbolcular[ıİiI]|sporcu(?:su|ları)?|görevl[iİıI]s[iİıI]|görevl[iİıI]ler[iİıI]|masörü)\s+([A-ZÇĞİÖŞÜa-zçğıöşü\s'-]{3,30})(?:’|'|‘|’)?(?:nin|nın|nun|nün|in|ın|un|ün|i|ı|u|ü|a|e|den|dan|ta|te|da|de|la|le)?/i;
        const subMatch = p.match(subjectRegex);
        if (subMatch) {
            subject = subMatch[1].trim();
            subject = subject.replace(/['’]s$/, '');
            subject = subject.replace(/\s+(?:hakkında|ilişkin|dair|hakkındaki|yönelik)\b.*/i, '').trim();
        }

        let reason = "Disiplin İhlali";
        const quoteRegex = /["'“”«»]([^"'“”«»]{5,})["'“”«»]/;
        const quoteMatch = p.match(quoteRegex);
        if (quoteMatch) {
            reason = quoteMatch[1].trim();
        } else {
            const patterns = [
                /,\s*([^,]+?)\s+nedeniyle/i,
                /,\s*([^,]+?)\s+dolayı/i,
                /,\s*([^,]+?)\s+ötürü/i,
                /([^,]+?)\s+nedeniyle/i,
                /([^,]+?)\s+dolayı/i
            ];
            for (const pattern of patterns) {
                const match = p.match(pattern);
                if (match) {
                    let val = match[1].trim();
                    val = val.replace(/^müsabakasında,\s*/i, '')
                             .replace(/^maddesi\s+uyarınca\s*/i, '')
                             .replace(/^beyanlarında\s+yer\s+alan\s*/i, '')
                             .replace(/^paylaşımda\s+yer\s+alan\s*/i, '')
                             .replace(/^.*?\byer\s+alan\s+/i, '')
                             .replace(/^.*?\b(müsabakasında|karsilasmasinda|karşılaşmasında)\s+/i, '');
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
        const girisMatch = p.match(/(\d+)\s+RESMİ\s+MÜSABAKADA\s+SOYUNMA\s+ODASINA\s+VE\s+YEDEK\s+KULÜBESİNE\s+GİRİŞ\s+YASAĞI/i);
        if (girisMatch) {
            penalties.push(`${girisMatch[1]} Maç Soyunma Odasına ve Yedek Kulübesine Giriş Yasağı`);
        }
        const fineMatch = p.match(/([\d.]+)\.-?\s*TL\s+PARA\s+CEZASI/i);
        if (fineMatch) {
            penalties.push(`${fineMatch[1]} TL Para Cezası`);
        }
        if (p.includes("İHTAR CEZASI")) {
            penalties.push("İhtar");
        }
        const seyircisizMatch = p.match(/(\d+)\s+RESMİ\s+MÜSABAKAYI\s+(?:KENDİ\s+SAHASINDA\s+)?SEYİRCİSİZ\s+OYNAMA/i);
        if (seyircisizMatch) {
            penalties.push(`${seyircisizMatch[1]} Maç Seyircisiz Oynama`);
        }
        const puanSilmeMatch = p.match(/(\d+)\s+PUAN\s+SİLME/i);
        if (puanSilmeMatch) {
            penalties.push(`${puanSilmeMatch[1]} Puan Silme`);
        }
        if (p.includes("KINAMA CEZASI")) {
            penalties.push("Kınama");
        }
        if (p.includes("kartlarının bloke edilmesi")) {
            const blockMatch = p.match(/(?:bulunan|bulunduğu|yer\s+alan|bloke\s+edilen)\s+([a-zçğıöşüA-ZÇĞİÖŞÜ0-9\s(),\-\/]+\bblok(?:ta|ında|larda|larında)?\b)/i);
            if (blockMatch) {
                let blockText = blockMatch[1].trim().replace(/\s+/g, ' ');
                blockText = blockText.replace(/\s*numaralı\s*blok(?:ta|ında|larda|larında)?/i, '')
                                     .replace(/\s*blok(?:ta|ında|larda|larında)?/i, '')
                                     .trim();
                penalties.push(`Kart Bloke (${blockText})`);
            } else if (p.includes("MİSAFİR TRİBÜN")) {
                penalties.push("Kart Bloke (Misafir Tribün)");
            } else {
                penalties.push("Kart Bloke");
            }
        }
        
        let penalty = "";
        if (penalties.length > 0) {
            penalty = penalties.join(" ve ");
        } else if (normP.includes("ceza tayinine yer olmadigina")) {
            penalty = "Ceza Tayinine Yer Olmadığına";
        } else if (normP.includes("ceza verilmesine yer olmadigina")) {
            penalty = "Ceza Verilmesine Yer Olmadığına";
        } else {
            penalty = "Cezalandırılmasına";
        }
        
        const category = parseCategoryFromText(p, subject);

        const cleanReason = reason.trim().replace(/^,+|,+$/g, '').trim();
        const cleanPenalty = penalty.trim();
        
        let formattedPenalty = cleanPenalty.charAt(0).toLowerCase() + cleanPenalty.slice(1);
        let noteActionWord = "verilmiştir";
        
        if (cleanPenalty === "Ceza Tayinine Yer Olmadığına") {
            formattedPenalty = "ceza tayinine yer olmadığına";
            noteActionWord = "karar verilmiştir";
        } else if (cleanPenalty === "Ceza Verilmesine Yer Olmadığına") {
            formattedPenalty = "ceza verilmesine yer olmadığına";
            noteActionWord = "karar verilmiştir";
        }

        let generatedNote = "";
        if (subject.toLowerCase() === 'kulüp') {
            generatedNote = `Kulübe, ${cleanReason.charAt(0).toLowerCase() + cleanReason.slice(1)} nedeniyle ${formattedPenalty} ${noteActionWord}.`;
        } else {
            generatedNote = `${subject} hakkında, ${cleanReason.charAt(0).toLowerCase() + cleanReason.slice(1)} nedeniyle ${formattedPenalty} ${noteActionWord}.`;
        }

        items.push({
            teamName,
            teamId,
            subject,
            reason,
            penalty,
            date: dateStr || defaultDate,
            pfdkDecisionDate: defaultDate,
            matchId,
            week,
            competition: (matchedMatch?.competition as 'league' | 'cup') || 'league',
            note: generatedNote,
            category,
            isMatchRelated
        });
    }

    return items;
}

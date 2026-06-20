/**
 * Ortak Türkçe metin yardımcı fonksiyonları.
 * 
 * Projede daha önce 3 ayrı yerde (MatchClient, tahkimParser, nameToSlug)
 * tekrar eden Türkçe karakter dönüşüm mantığını tek noktada birleştirir.
 */

/** Türkçe özel karakterleri ASCII karşılıklarına dönüştürür */
const TURKISH_CHAR_MAP: Record<string, string> = {
    'ı': 'i', 'İ': 'i', 'I': 'i',
    'ğ': 'g', 'Ğ': 'g',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ö': 'o', 'Ö': 'o',
    'ç': 'c', 'Ç': 'c',
    'i̇': 'i', // Combining dot above
};

const TURKISH_REGEX = /[ıİIğĞüÜşŞöÖçÇi̇]/g;

/**
 * Türkçe karakterleri ASCII karşılıklarına dönüştürür ve küçük harfe çevirir.
 * Boşlukları korur.
 * 
 * @example normalizeTurkish("GÖZTEPE A.Ş.") → "goztepe a.s."
 */
export function normalizeTurkish(input: string): string {
    if (!input) return '';
    return input
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .toLowerCase()
        .replace(TURKISH_REGEX, (ch) => TURKISH_CHAR_MAP[ch] || ch);
}

/**
 * İsim karşılaştırması için normalize eder.
 * Tüm boşlukları siler, küçük harf + ASCII dönüşüm yapar.
 * 
 * @example normalizeForComparison("Halil  Umut MELER") → "halilumutmeler"
 */
export function normalizeForComparison(input: string): string {
    return normalizeTurkish(input).replace(/\s+/g, '').trim();
}

/**
 * İsmi URL-safe slug'a dönüştürür.
 * 
 * @example nameToSlug("Halil Umut MELER") → "halil-umut-meler"
 */
export function nameToSlug(name: string): string {
    if (!name) return '';
    return normalizeTurkish(name)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Diakritik işaretleri kaldır
        .replace(/[^a-z0-9\s-]/g, '')   // Harf/rakam/boşluk/tire dışını kaldır
        .trim()
        .replace(/\s+/g, '-')           // Boşlukları tire yap
        .replace(/-+/g, '-');           // Ardışık tireleri tekile indir
}

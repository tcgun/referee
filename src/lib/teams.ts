export const SUPER_LIG_TEAMS: Record<string, { name: string; colors: { primary: string; secondary: string }; short: string; aliases?: string[] }> = {
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
 * Verilen takım ID'sine göre takımın renklerini döndürür.
 * Returns team colors based on the provided team ID.
 * @param teamId - Takım kimliği (örn: 'gal', 'fen')
 * @returns {object} - { primary: string, secondary: string }
 */
export function getTeamColors(teamId: string) {
    const team = SUPER_LIG_TEAMS[teamId] || { colors: { primary: '#333333', secondary: '#cccccc' } };
    return team.colors;
}

/**
 * Verilen takım ID'sine göre tam takım ismini döndürür.
 * Returns full team name based on the provided team ID.
 * @param teamId - Takım kimliği
 * @returns {string} - Tam takım ismi veya ID
 */
export function getTeamName(teamId: string) {
    const team = SUPER_LIG_TEAMS[teamId];
    return team ? team.name : teamId;
}

/**
 * Girilen metne göre en uygun takım ID'sini bulmaya çalışır.
 * Attempts to resolve the most appropriate team ID based on input text.
 * @param input - Arama metni (takım ismi, kısaltma veya alias)
 * @returns {string | null} - Bulunan takım ID'si veya null
 */
export function resolveTeamId(input: string): string | null {
    if (!input) return null;
    const search = input.toLowerCase().trim();

    // Helper: Normalize string (remove tr chars, non-alphanumeric)
    // Yardımcı: Metni normalize et (Türkçe karakterleri ve alfasayısal olmayanları temizle)
    const normalize = (s: string) => {
        let n = s.toLowerCase();
        n = n.replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/İ/g, 'i');
        return n.replace(/[^a-z0-9]/g, '');
    };

    const searchNorm = normalize(search);

    // 1. Doğrudan kısa kod eşleşmesi / Direct shortcode match
    for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
        if (data.short === search) return id;

        // Alias (takma isim) kontrolü
        if (data.aliases) {
            if (data.aliases.includes(search)) return id;
            if (data.aliases.some(alias => normalize(alias) === searchNorm)) return id;
        }
    }

    // 2. Doğrudan ID eşleşmesi / Direct ID match
    if (SUPER_LIG_TEAMS[search]) return search;

    // 3. İsim benzerliği eşleşmesi / Name fuzzy match
    for (const [id, data] of Object.entries(SUPER_LIG_TEAMS)) {
        const teamNameNorm = normalize(data.name);
        // Normalize edilmiş içerik kontrolü (çift yönlü)
        if (teamNameNorm.includes(searchNorm) || searchNorm.includes(teamNameNorm)) {
            return id;
        }
    }

    return null;
}

/**
 * Metin içerisindeki sponsor isimlerini ve bilinen takım aliaslarını temizler.
 * Removes sponsor names and known team aliases from a given text.
 * @param text - Temizlenecek metin
 * @returns {string} - Temizlenmiş metin
 */
export function cleanSponsorsInText(text: string): string {
    if (!text) return text;
    let cleaned = text;

    // 1. Önce spesifik uzun kalıpları ve lig isimlerini temizle (Regex \b kullanmadan)
    cleaned = cleaned.replace(/TRENDYOL\s+SÜPER\s+LİG/gi, 'SÜPER LİG');
    cleaned = cleaned.replace(/MEHMET\s+ALİ\s+YILMAZ\s+SEZONU/gi, '');
    cleaned = cleaned.replace(/MEHMET\s+ALİ\s+YILMAZ/gi, ''); // Ekstra güvenlik
    cleaned = cleaned.replace(/BAŞAKŞEHİR\s+FUTBOL\s+KULÜBÜ/gi, 'BAŞAKŞEHİR FUTBOL KULÜBÜ'); // İsmi koru
    cleaned = cleaned.replace(/GAZİANTEP\s+FUTBOL\s+KULÜBÜ/gi, 'GAZİANTEP FUTBOL KULÜBÜ'); // İsmi koru
    cleaned = cleaned.replace(/FUTBOL\s+A\.Ş\./gi, '');
    cleaned = cleaned.replace(/A\.Ş\./gi, '');

    // 2. Bilinen sponsorlar listesi
    const sponsors = [
        'RAMS', 'TÜMOSAN', 'BİTEXEN', 'BITEXEN', 'HESAPCOM', 'CORENDON',
        'İKAS', 'IKAS', 'ÇAYKUR', 'CAYKUR', 'MONDİHOME', 'MONDIHOME',
        'VAVAÇARS', 'VAVACARS', 'SÜRAT KARGO', 'BELLONA', 'KUZEY BORU',
        'ATAKAŞ', 'ATAKAS', 'YUKATEL', 'NETGLOBAL', 'ZECORNER'
    ];

    // 3. Kelime bazlı temizlik (Türkçe karakter duyarlı word boundary simülasyonu)
    sponsors.forEach(s => {
        // \b Türkçe karakterlerde (İKAS gibi) çalışmadığı için özel regex kullanıyoruz
        // (?:^|[^a-zA-ZçğıöşüÇĞİÖŞÜİ]) -> Kelime başı veya harf olmayan karakter
        // (?=[^a-zA-ZçğıöşüÇĞİÖŞÜİ]|$) -> Kelime sonu veya harf olmayan karakter
        const regex = new RegExp(`(^|[^a-zA-ZçğıöşüÇĞİÖŞÜİ])${s}([^a-zA-ZçğıöşüÇĞİÖŞÜİ]|$)`, 'gi');

        // Eşleşmeyi temizlerken aradaki karakterleri (boşluk, tire vb.) korumaya çalışalım
        // Ama sponsor ismini ve o bölgedeki ekstra boşluğu silmek istiyoruz
        cleaned = cleaned.replace(regex, (match, p1, p2) => {
            // Eğer aradaki karakter tire ise tireyi koru, yoksa boşluk ise temizle
            const start = p1 === '-' ? '-' : '';
            const end = p2 === '-' ? '-' : ' ';
            return start + end;
        });
    });

    // 4. Temizlik kalıntılarını toparla
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s-\s/g, '-'); // Tire etrafındaki gereksiz boşluklar
    cleaned = cleaned.replace(/-\s/g, '-');
    cleaned = cleaned.replace(/\s-/g, '-');
    cleaned = cleaned.trim();

    // Eğer başı veya sonu tire/boşluk ile kaldıysa temizle
    cleaned = cleaned.replace(/^[- \s]+|[- \s]+$/g, '');

    return cleaned;
}

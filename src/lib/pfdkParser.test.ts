import { describe, it, expect } from 'vitest';
import { parsePfdkText } from './pfdkParser';
import { Match } from '@/types';

describe('PFDK Parser Tests', () => {
    const mockMatches: Match[] = [
        {
            id: 'week1-gaz-gal-2025-08-08',
            homeTeamId: 'gaz',
            awayTeamId: 'gal',
            homeTeamName: 'Gaziantep FK',
            awayTeamName: 'Galatasaray',
            date: '2025-08-08T20:00:00.000Z',
            week: 1,
            season: '2025-2026',
            stadium: 'Gaziantep Stadyumu',
            referee: 'Ali Şansalan',
            varReferee: 'Alper Ulusoy',
            competition: 'league'
        },
        {
            id: 'week1-sam-gen-2025-08-09',
            homeTeamId: 'sam',
            awayTeamId: 'gen',
            homeTeamName: 'Samsunspor',
            awayTeamName: 'Gençlerbirliği',
            date: '2025-08-09T19:00:00.000Z',
            week: 1,
            season: '2025-2026',
            stadium: 'Samsun 19 Mayıs Stadyumu',
            referee: 'Kadir Sağlam',
            varReferee: 'Hakan Ceylan',
            competition: 'league'
        },
        {
            id: 'week1-ant-kas-2025-08-09',
            homeTeamId: 'ant',
            awayTeamId: 'kas',
            homeTeamName: 'Antalyaspor',
            awayTeamName: 'Kasımpaşa',
            date: '2025-08-09T21:45:00.000Z',
            week: 1,
            season: '2025-2026',
            stadium: 'Antalya Stadyumu',
            referee: 'Atilla Karaoğlan',
            varReferee: 'Koray Gençerler',
            competition: 'league'
        },
        {
            id: 'week1-eyu-kon-2025-08-10',
            homeTeamId: 'eyu',
            awayTeamId: 'kon',
            homeTeamName: 'Eyüpspor',
            awayTeamName: 'Konyaspor',
            date: '2025-08-10T19:15:00.000Z',
            week: 1,
            season: '2025-2026',
            stadium: 'Recep Tayyip Erdoğan Stadyumu',
            referee: 'Zorbay Küçük',
            varReferee: 'Mustafa İlker Coşkun',
            competition: 'league'
        },
        {
            id: 'week1-fb-ts-2025-08-09',
            homeTeamId: 'fb',
            awayTeamId: 'ts',
            homeTeamName: 'Fenerbahçe',
            awayTeamName: 'Trabzonspor',
            date: '2025-08-09T19:00:00.000Z',
            week: 1,
            season: '2025-2026',
            stadium: 'Şükrü Saracoğlu',
            referee: 'Kadir Sağlam',
            varReferee: 'Hakan Ceylan',
            competition: 'league'
        }
    ];

    it('should parse the user sample text and correctly extract registered Süper Lig actions', () => {
        const rawText = `
        PFDK Kararları - 14.08.2025
        Profesyonel Futbol Disiplin Kurulu’nun 14.08.2025 tarihli toplantısı.

        1- GAZİANTEP FUTBOL KULÜBÜ A.Ş.’nin, 08.08.2025 tarihinde oynanan GAZİANTEP FUTBOL KULÜBÜ A.Ş.-GALATASARAY A.Ş. Trendyol Süper Lig müsabakasında, taraftarlarının neden olduğu saha olayları nedeniyle FDT’nin 52/2. ve 46/1. maddeleri uyarınca 220.000.-TL PARA CEZASI ile cezalandırılmasına,

        Aynı müsabakada GAZİANTEP FUTBOL KULÜBÜ A.Ş.’nin, taraftarlarının neden olduğu çirkin ve kötü tezahürat nedeniyle FDT’nin 53/3. maddesi uyarınca çirkin ve kötü tezahüratta bulunan GÜNEY KALE ARKASI ALT TRİBÜN D blokta yer alan seyircilerin elektronik bilet kapsamındaki kartlarının bloke edilmesi suretiyle bir sonraki ev sahibi kulüp olduğu müsabakaya girişlerinin engellenmesine,

        2- GALATASARAY A.Ş.’nin, 08.08.2025 tarihinde oynanan GAZİANTEP FUTBOL KULÜBÜ A.Ş.-GALATASARAY A.Ş. Trendyol Süper Lig müsabakasında, taraftarlarının neden olduğu saha olayları nedeniyle FDT’nin 52/2. ve 46/1. maddeleri uyarınca 220.000.-TL PARA CEZASI ile cezalandırılmasına,

        3- GENÇLERBİRLİĞİ Kulübü idarecisi RIFAT SONGÜR’ün, 09.08.2025 tarihinde oynanan SAMSUNSPOR A.Ş.-GENÇLERBİRLİĞİ Trendyol Süper Lig müsabakasında, akredite edilmediği alanlarda bulunmasından dolayı talimatlara aykırılık nedeniyle FDT’nin 46/1. maddesi uyarınca 40.000.-TL PARA CEZASI ile cezalandırılmasına,

        4- KASIMPAŞA A.Ş. Antrenörü ÖZGÜR ÖÇAL’ın, 09.08.2025 tarihinde oynanan HESAP.COM ANTALYASPOR-KASIMPAŞA A.Ş. Trendyol Süper Lig müsabakasında, akreditasyon kartını görünür bir şekilde boynuna asmamasından dolayı talimatlara aykırılık nedeniyle FDT’nin 46/1. maddesi uyarınca 40.000.-TL PARA CEZASI ile cezalandırılmasına,

        6- TÜMOSAN KONYASPOR Kulübü idarecisi CELALETTİN HAKAN KATIRCI’nın, 10.08.2025 tarihinde oynanan İKAS EYÜPSPOR-TÜMOSAN KONYASPOR müsabakasında akredite edilmediği yeşil zeminde bulunmasından dolayı talimatlara aykırılık nedeniyle FDT’nin 46/1. maddesi uyarınca 40.000.-TL PARA CEZASI ile cezalandırılmasına,

        8- FENERBAHÇE A.Ş.’nin, 09.08.2025 tarihinde Kulüp resmi internet sitesinde yapılan paylaşımda yer alan Futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamalar nedeniyle FDT’nin 38/1-b maddesi uyarınca 2.700.000.-TL PARA CEZASI ile cezalandırılmasına,

        9- EMİNEVİM ÜMRANİYESPOR Kulübünün, 08.08.2025 tarihinde oynanan EMİNEVİM ÜMRANİYESPOR-MANİSA FUTBOL KULÜBÜ Trendyol 1. Lig müsabakasında, akreditasyon sisteminin işletilmemesinden dolayı talimatlara aykırılık nedeniyle FDT’nin 46/1. maddesi uyarınca 110.000.-TL PARA CEZASI ile cezalandırılmasına,
        `;

        const result = parsePfdkText(rawText, mockMatches);

        // Should ignore Ümraniyespor (1. Lig team not in registered teams)
        expect(result.length).toBe(7);

        // Gaziantep FK Saha Olayları
        expect(result[0].teamId).toBe('gaz');
        expect(result[0].subject).toBe('Kulüp');
        expect(result[0].penalty).toBe('220.000 TL Para Cezası');
        expect(result[0].matchId).toBe('week1-gaz-gal-2025-08-08');
        expect(result[0].week).toBe(1);
        expect(result[0].category).toBe('KULÜP');

        // Gaziantep FK Kart Bloke (Aynı Müsabaka)
        expect(result[1].teamId).toBe('gaz');
        expect(result[1].subject).toBe('Kulüp');
        expect(result[1].penalty).toContain('Kart Bloke (GÜNEY KALE ARKASI ALT TRİBÜN D blok');
        expect(result[1].matchId).toBe('week1-gaz-gal-2025-08-08');
        expect(result[1].category).toBe('KULÜP');

        // Galatasaray Saha Olayları
        expect(result[2].teamId).toBe('gal');
        expect(result[2].subject).toBe('Kulüp');
        expect(result[2].penalty).toBe('220.000 TL Para Cezası');
        expect(result[2].matchId).toBe('week1-gaz-gal-2025-08-08');
        expect(result[2].category).toBe('KULÜP');

        // Gençlerbirliği Rıfat Songür
        expect(result[3].teamId).toBe('gen');
        expect(result[3].subject).toBe('RIFAT SONGÜR');
        expect(result[3].penalty).toBe('40.000 TL Para Cezası');
        expect(result[3].matchId).toBe('week1-sam-gen-2025-08-09');
        expect(result[3].category).toBe('İDARECİ');

        // Kasımpaşa Özgür Öçal
        expect(result[4].teamId).toBe('kas');
        expect(result[4].subject).toBe('ÖZGÜR ÖÇAL');
        expect(result[4].penalty).toBe('40.000 TL Para Cezası');
        expect(result[4].matchId).toBe('week1-ant-kas-2025-08-09');
        expect(result[4].category).toBe('TEKNİK SORUMLU');

        // Konyaspor Celalettin Hakan Katırcı
        expect(result[5].teamId).toBe('kon');
        expect(result[5].subject).toBe('CELALETTİN HAKAN KATIRCI');
        expect(result[5].penalty).toBe('40.000 TL Para Cezası');
        expect(result[5].matchId).toBe('week1-eyu-kon-2025-08-10');
        expect(result[5].category).toBe('İDARECİ');

        // Fenerbahçe Açıklamalar (Non-Match-Related)
        expect(result[6].teamId).toBe('fen');
        expect(result[6].subject).toBe('Kulüp');
        expect(result[6].penalty).toBe('2.700.000 TL Para Cezası');
        expect(result[6].matchId).toBe('');
        expect(result[6].week).toBeUndefined();
        expect(result[6].category).toBe('KULÜP');
        expect(result[6].isMatchRelated).toBe(false);

        // Check cleaned note text
        expect(result[0].note).toContain('Gaziantep FK-Galatasaray SÜPER LİG müsabakasında');
        expect(result[0].isMatchRelated).toBe(true);
    });

    it('should correctly match matchId even if parsed date differs slightly from match date, by using opponent name matching', () => {
        // In mockMatches, we have a match on 2025-08-08 for gaz vs gal.
        // Let's pass a text containing a slightly different date (e.g. 09.08.2025)
        const rawText = `
        1- GAZİANTEP FUTBOL KULÜBÜ A.Ş.’nin, 09.08.2025 tarihinde oynanan GAZİANTEP FUTBOL KULÜBÜ A.Ş.-GALATASARAY A.Ş. Trendyol Süper Lig müsabakasında taraftarların neden olduğu saha olayları nedeniyle 220.000.-TL PARA CEZASI ile cezalandırılmasına,
        `;

        const result = parsePfdkText(rawText, mockMatches);
        
        expect(result.length).toBe(1);
        expect(result[0].teamId).toBe('gaz');
        // It should match the 2025-08-08 match because gaz and gal are both mentioned, and it is the closest match
        expect(result[0].matchId).toBe('week1-gaz-gal-2025-08-08');
        expect(result[0].week).toBe(1);
    });

    it('should split multiple club/manager clauses ending in a comma or starting with team names, even with no leading numbers', () => {
        const rawText = `
        FENERBAHÇE A.Ş.’nin, 09.08.2025 tarihinde Kulüp resmi internet sitesinde yapılan paylaşımda yer alan Futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamalar nedeniyle FDT’nin 38/1-b maddesi uyarınca 2.700.000.-TL PARA CEZASI ile cezalandırılmasına,

        FENERBAHÇE A.Ş. idarecisi SERTAÇ KOMSUOĞLU’nun, 09.08.2025 tarihinde Kulüp resmi internet sitesinde ve 10.08.2025 tarihinde SporX medya kuruluşunda paylaşılan beyanlarında yer alan Futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamaları nedeniyle FDT’nin 38/1-a maddesi uyarınca 30 GÜN HAK MAHRUMİYETİ ve 3.000.000.-TL PARA CEZASI ile cezalandırılmasına,
        `;

        const result = parsePfdkText(rawText);

        expect(result.length).toBe(2);

        expect(result[0].teamId).toBe('fen');
        expect(result[0].subject).toBe('Kulüp');
        expect(result[0].penalty).toBe('2.700.000 TL Para Cezası');

        expect(result[1].teamId).toBe('fen');
        expect(result[1].subject).toBe('SERTAÇ KOMSUOĞLU');
        expect(result[1].penalty).toBe('30 Gün Hak Mahrumiyeti ve 3.000.000 TL Para Cezası');
    });
});

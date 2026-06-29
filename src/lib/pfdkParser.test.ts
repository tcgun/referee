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
        expect(result[1].penalty).toContain('Kart Bloke (GÜNEY KALE ARKASI ALT TRİBÜN D)');
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
        expect(result[0].note).toBe('Kulübe, taraftarlarının neden olduğu saha olayları nedeniyle 220.000 TL Para Cezası verilmiştir.');
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
        expect(result[1].reason).toBe('Futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamaları');
        expect(result[1].note).toBe('SERTAÇ KOMSUOĞLU hakkında, futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamaları nedeniyle 30 Gün Hak Mahrumiyeti ve 3.000.000 TL Para Cezası verilmiştir.');
    });

    it('should parse Yıldırım Ali Koç paragraph correctly and inherit the match date/id', () => {
        const mockMatchesList: Match[] = [
            {
                id: 'week5-fb-ala-2025-09-17',
                homeTeamId: 'fen',
                awayTeamId: 'ala',
                homeTeamName: 'Fenerbahçe',
                awayTeamName: 'Alanyaspor',
                date: '2025-09-17T20:00:00.000Z',
                week: 5,
                season: '2025-2026',
                stadium: 'Şükrü Saracoğlu',
                referee: 'Kadir Sağlam',
                varReferee: 'Hakan Ceylan',
                competition: 'league'
            }
        ];

        const rawText = `
        1- FENERBAHÇE A.Ş.’nin, 17.09.2025 tarihinde oynanan FENERBAHÇE A.Ş.-CORENDON ALANYASPOR Trendyol Süper Lig Mehmet Ali Yılmaz Sezonu müsabakasında, taraftarlarının neden olduğu çirkin ve kötü tezahürat nedeniyle ve bu eylemin aynı sezon içinde ev sahibi kulüp olduğu müsabakada 2. kez gerçekleştirilmesinden dolayı FDT’nin 53/2. maddesi uyarınca 400.000.-TL PARA CEZASI ile cezalandırılmasına, FDT’nin 53/3. maddesi uyarınca çirkin ve kötü tezahüratta bulunan KUZEY TRİBÜN E, K, M, C, D, L bloklarda yer alan seyircilerin elektronik bilet kapsamındaki kartlarının bloke edilmesi suretiyle bir sonraki ev sahibi kulüp olduğu müsabakaya girişlerinin engellenmesine,
        
        Aynı müsabakada FENERBAHÇE A.Ş. Başkanı YILDIRIM ALİ KOÇ’un, müsabaka sonrası medyada yapmış olduğu beyanlarında yer alan Futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamaları nedeniyle FDT’nin 38/1-a maddesi uyarınca 15 GÜN HAK MAHRUMİYETİ ve 2.000.000.-TL PARA CEZASI ile cezalandırılmasına,
        `;

        const result = parsePfdkText(rawText, mockMatchesList);
        
        expect(result.length).toBe(2);

        // First action: Fenerbahçe Kulüp
        expect(result[0].teamId).toBe('fen');
        expect(result[0].subject).toBe('Kulüp');
        expect(result[0].matchId).toBe('week5-fb-ala-2025-09-17');
        expect(result[0].week).toBe(5);

        // Second action: Yıldırım Ali Koç
        expect(result[1].teamId).toBe('fen');
        expect(result[1].subject).toBe('YILDIRIM ALİ KOÇ');
        expect(result[1].matchId).toBe('week5-fb-ala-2025-09-17');
        expect(result[1].week).toBe(5);
        expect(result[1].isMatchRelated).toBe(true);
    });

    it('should parse Samsunspor Pape Cherif Ndiaye appeal rejection correctly as a Futbolcu action', () => {
        const mockMatchesList: Match[] = [
            {
                id: 'week6-gaz-sam-2025-09-27',
                homeTeamId: 'gaz',
                awayTeamId: 'sam',
                homeTeamName: 'Gaziantep FK',
                awayTeamName: 'Samsunspor',
                date: '2025-09-27T19:00:00.000Z',
                week: 6,
                season: '2025-2026',
                stadium: 'Gaziantep Stadyumu',
                referee: 'Ali Şansalan',
                varReferee: 'Alper Ulusoy',
                competition: 'league'
            }
        ];

        const rawText = `
        3- SAMSUNSPOR A.Ş. vekilinin sporcuları PAPE CHERIF NDIAYE hakkında, 27.09.2025 tarihinde Gaziantep Stadyumunda oynanan GAZİANTEP FUTBOL A.Ş.- SAMSUNSPOR FUTBOL A.Ş. Trendyol Süper Lig Mehmet Ali Yılmaz Sezonu müsabakasında, müsabakada görmüş olduğu ikinci sarı kart ile devamındaki kırmızı kart ve cezai uygulamalarının kaldırılmasına ilişkin talebinin somut olayda şahısta hata hali bulunmadığından FDT’nin 86/2. ve 86/3. maddeleri uyarınca REDDİNE,
        `;

        const result = parsePfdkText(rawText, mockMatchesList);
        expect(result.length).toBe(1);
        expect(result[0].teamId).toBe('sam');
        expect(result[0].subject).toBe('PAPE CHERIF NDIAYE');
        expect(result[0].category).toBe('FUTBOLCU');
        expect(result[0].matchId).toBe('week6-gaz-sam-2025-09-27');
        expect(result[0].week).toBe(6);
        expect(result[0].isMatchRelated).toBe(true);
    });

    it('should strip match details and date prefixes and extract multiple block closures correctly for Beşiktaş action', () => {
        const rawText = `
        1- BEŞİKTAŞ A.Ş.’nin, 17.08.2025 tarihinde oynanan BEŞİKTAŞ A.Ş.-İKAS EYÜPSPOR Trendyol Süper Lig müsabakasında taraftarlarının neden olduğu çirkin ve kötü tezahürat nedeniyle ve bu eylemin aynı sezon içinde ev sahibi kulüp olduğu müsabakada ilk kez gerçekleştirilmesinden dolayı FDT’nin 53/2. maddesi uyarınca İHTAR CEZASI ile cezalandırılmasına, FDT’nin 53/3. maddesi uyarınca çirkin ve kötü tezahüratta bulunan SPOR TOTO (KUZEY ALT) TRİBÜN 107-108-109, SPOR TOTO (KUZEY ÜST) TRİBÜN 408-409, BABA HAKKI (DOĞU ALT) TRİBÜN 116, DOĞU ÜST TRİBÜN 416, GÜNEY ALT TRİBÜN 120-121, GÜNEY ÜST TRİBÜN 423 numaralı bloklarda yer alan seyircilerin elektronik bilet kapsamındaki kartlarının bloke edilmesi suretiyle bir sonraki ev sahibi kulüp olduğu müsabakaya girişlerinin engellenmesine,
        `;
        const result = parsePfdkText(rawText);
        expect(result.length).toBe(1);
        expect(result[0].teamId).toBe('bes');
        expect(result[0].reason).toBe('Taraftarlarının neden olduğu çirkin ve kötü tezahürat');
        expect(result[0].penalty).toBe('İhtar ve Kart Bloke (SPOR TOTO (KUZEY ALT) TRİBÜN 107-108-109, SPOR TOTO (KUZEY ÜST) TRİBÜN 408-409, BABA HAKKI (DOĞU ALT) TRİBÜN 116, DOĞU ÜST TRİBÜN 416, GÜNEY ALT TRİBÜN 120-121, GÜNEY ÜST TRİBÜN 423)');
        expect(result[0].note).toBe('Kulübe, taraftarlarının neden olduğu çirkin ve kötü tezahürat nedeniyle i̇htar ve Kart Bloke (SPOR TOTO (KUZEY ALT) TRİBÜN 107-108-109, SPOR TOTO (KUZEY ÜST) TRİBÜN 408-409, BABA HAKKI (DOĞU ALT) TRİBÜN 116, DOĞU ÜST TRİBÜN 416, GÜNEY ALT TRİBÜN 120-121, GÜNEY ÜST TRİBÜN 423) verilmiştir.');
    });

    it('should parse Ceza Tayinine Yer Olmadığına actions correctly', () => {
        const rawText = `
        RAMS BAŞAKŞEHİR FK Başkanı GÖKSEL GÜMÜŞDAĞ hakkında, 28.09.2025 tarihinde Kulüp resmi sosyal medya (X) hesabından yapılan paylaşımda yer alan Futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamalar nedeniyle Kurulumuza sevk yapılmış ise de; CEZA TAYİNİNE YER OLMADIĞINA,
        `;
        const result = parsePfdkText(rawText);
        expect(result.length).toBe(1);
        expect(result[0].teamId).toBe('bas');
        expect(result[0].subject).toBe('GÖKSEL GÜMÜŞDAĞ');
        expect(result[0].reason).toBe('Futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamalar');
        expect(result[0].penalty).toBe('Ceza Tayinine Yer Olmadığına');
        expect(result[0].note).toBe('GÖKSEL GÜMÜŞDAĞ hakkında, futbolun ve Kurumların İtibarını Zedelemeye Yönelik Açıklamalar nedeniyle ceza tayinine yer olmadığına karar verilmiştir.');
    });

    it('should parse Soyunma Odasına ve Yedek Kulübesine Giriş Yasağı correctly', () => {
        const rawText = `
        MISIRLI.COM.TR FATİH KARAGÜMRÜK Kulübü görevlisi UMUT KÖSE’nin, 24.10.2025 tarihinde oynananMISIRLI.COM.TR FATİH KARAGÜMRÜK-ZECORNER KAYSERİSPOR Trendyol Süper Lig Mehmet Ali Yılmaz Sezonu müsabakasında, müsabaka hakemine yönelik sportmenliğe aykırı hareketi nedeniyle FDT’nin 36/1-c ve 35/4. maddeleri uyarınca 1 RESMİ MÜSABAKADA SOYUNMA ODASINA VE YEDEK KULÜBESİNE GİRİŞ YASAĞI ve 80.000.-TL PARA CEZASI ile cezalandırılmasına,
        `;
        const result = parsePfdkText(rawText);
        expect(result.length).toBe(1);
        expect(result[0].teamId).toBe('fat');
        expect(result[0].subject).toBe('UMUT KÖSE');
        expect(result[0].reason).toBe('Müsabaka hakemine yönelik sportmenliğe aykırı hareketi');
        expect(result[0].penalty).toBe('1 Maç Soyunma Odasına ve Yedek Kulübesine Giriş Yasağı ve 80.000 TL Para Cezası');
        expect(result[0].note).toBe('UMUT KÖSE hakkında, müsabaka hakemine yönelik sportmenliğe aykırı hareketi nedeniyle 1 Maç Soyunma Odasına ve Yedek Kulübesine Giriş Yasağı ve 80.000 TL Para Cezası verilmiştir.');
    });

    it('should parse Seyircisiz Oynama, Puan Silme, and Kınama penalties correctly', () => {
        const rawText = `
        1- FENERBAHÇE A.Ş.’nin, taraftarlarının neden olduğu saha olayları nedeniyle 1 RESMİ MÜSABAKAYI KENDİ SAHASINDA SEYİRCİSİZ OYNAMA CEZASI ve 3 PUAN SİLME CEZASI ve KINAMA CEZASI ile cezalandırılmasına,
        `;
        const result = parsePfdkText(rawText);
        expect(result.length).toBe(1);
        expect(result[0].teamId).toBe('fen');
        expect(result[0].subject).toBe('Kulüp');
        expect(result[0].reason).toBe('Taraftarlarının neden olduğu saha olayları');
        expect(result[0].penalty).toBe('1 Maç Seyircisiz Oynama ve 3 Puan Silme ve Kınama');
        expect(result[0].note).toBe('Kulübe, taraftarlarının neden olduğu saha olayları nedeniyle 1 Maç Seyircisiz Oynama ve 3 Puan Silme ve Kınama verilmiştir.');
    });

    it('should parse Beşiktaş vs Kocaelispor block closures correctly', () => {
        const rawText = `
        12- BEŞİKTAŞ A.Ş.’nin, 29.09.2025 tarihinde oynanan BEŞİKTAŞ A.Ş.-KOCAELİSPOR Trendyol Süper Lig Mehmet Ali Yılmaz Sezonu müsabakasında, taraftarlarının neden olduğu çirkin ve kötü tezahürat nedeniyle FDT’nin 53/3. maddesi uyarınca çirkin ve kötü tezahüratta bulunan SPOR TOTO(KUZEYALT) 108, SPOR TOTO(KUZEYÜST) 408, 409, DOĞU ÜST TRİBÜNÜ 415, 416, KUZEY TRİBÜNÜ ÜST 408 numaralı bloklarda yer alan seyircilerin elektronik bilet kapsamındaki kartlarının bloke edilmesi suretiyle bir sonraki ev sahibi kulüp olduğu müsabakaya girişlerinin engellenmesine,
        `;
        const result = parsePfdkText(rawText);
        expect(result.length).toBe(1);
        expect(result[0].teamId).toBe('bes');
        expect(result[0].subject).toBe('Kulüp');
        expect(result[0].penalty).toBe('Kart Bloke (SPOR TOTO(KUZEYALT) 108, SPOR TOTO(KUZEYÜST) 408, 409, DOĞU ÜST TRİBÜNÜ 415, 416, KUZEY TRİBÜNÜ ÜST 408)');
        expect(result[0].note).toBe('Kulübe, taraftarlarının neden olduğu çirkin ve kötü tezahürat nedeniyle kart Bloke (SPOR TOTO(KUZEYALT) 108, SPOR TOTO(KUZEYÜST) 408, 409, DOĞU ÜST TRİBÜNÜ 415, 416, KUZEY TRİBÜNÜ ÜST 408) verilmiştir.');
    });
});

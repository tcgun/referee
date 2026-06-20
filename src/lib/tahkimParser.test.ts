import { describe, it, expect } from 'vitest';
import { parseTahkimText } from './tahkimParser';

describe('Tahkim Parser Tests', () => {
    it('should parse appeal decisions correctly', () => {
        const rawText = `
        Tahkim Kurulu Kararları - 21.08.2025
        
        1- KONYASPOR Kulübü idarecisi CELALETTİN HAKAN KATIRCI’nın, PFDK’nın 14.08.2025 tarihli kararına itirazı incelendi. Yapılan müzakere neticesinde; itirazın kabulü ile kararın kaldırılmasına,
        
        2- GAZİANTEP FUTBOL KULÜBÜ A.Ş.’nin taraftarlarının neden olduğu saha olayları nedeniyle PFDK uyarınca 220.000.-TL PARA CEZASI ile cezalandırılmasına dair karara itirazı incelendi. Yapılan müzakere neticesinde; para cezasının 110.000.-TL olarak düzeltilerek onanmasına,
        
        3- GALATASARAY A.Ş.’nin PFDK kararına itirazı incelendi. Yapılan müzakere neticesinde; itirazın reddi ile kararın onanmasına,
        
        4- FENERBAHÇE A.Ş. futbolcusu EDIN DZEKO’nun men cezasına itirazı incelendi. Müzakere neticesinde; 3 resmi müsabakadan men cezasının 2 resmi müsabakadan men cezası olarak düzeltilerek onanmasına karar verilmiştir.
        `;

        const result = parseTahkimText(rawText);

        expect(result.length).toBe(4);

        // Konyaspor Celalettin Hakan Katırcı - Accepted (Ceza Kaldırıldı)
        expect(result[0].teamId).toBe('kon');
        expect(result[0].subject).toBe('CELALETTİN HAKAN KATIRCI');
        expect(result[0].appealStatus).toBe('accepted');
        expect(result[0].appealedPenalty).toBe('Ceza Kaldırıldı');

        // Gaziantep FK - Partially Accepted (Ceza İndirildi: 220k -> 110k)
        expect(result[1].teamId).toBe('gaz');
        expect(result[1].subject).toBe('Kulüp');
        expect(result[1].appealStatus).toBe('partially_accepted');
        expect(result[1].appealedPenalty).toBe('110.000 TL Para Cezası');

        // Galatasaray - Rejected (İtiraz Reddedildi)
        expect(result[2].teamId).toBe('gal');
        expect(result[2].subject).toBe('Kulüp');
        expect(result[2].appealStatus).toBe('rejected');
        expect(result[2].appealedPenalty).toBe('İtiraz Reddedildi');

        // Fenerbahçe Edin Dzeko - Partially Accepted (3 Maç Men -> 2 Maç Men)
        expect(result[3].teamId).toBe('fen');
        expect(result[3].subject).toBe('EDIN DZEKO');
        expect(result[3].appealStatus).toBe('partially_accepted');
        expect(result[3].appealedPenalty).toBe('2 Maç Men');
    });

    it('should parse Fenerbahçe specific appeal decisions correctly', () => {
        const rawText = `
        Fenerbahçe Futbol A.Ş.’nin ve Antrenörü Pedro Luis Ferreira Machado’nun PFDK’nın 21.08.2025 tarih ve E.2025-2026/19 - K.2025-2026/26 sayılı kararına itirazı incelendi. Yapılan müzakere neticesinde;

        - Fenerbahçe Futbol A.Ş.’nin taraftarlarının neden olduğu saha olayları nedeniyle FDT’nin 52/2. ve 46/1. maddeleri uyarınca 220.000,00 TL para cezası ile cezalandırılmasına dair kararda sübut, hukuki niteleme ve cezanın tayini bakımından bir isabetsizlik bulunmadığı anlaşıldığından, başvurunun reddi ile kararın onanmasına, oybirliğiyle,

        - Fenerbahçe Futbol A.Ş.’nin yedek kulübesinde bulunan mensubunun sportif ekipmanında 5 yıldızlı logo kullanmasından dolayı talimatlara aykırılık nedeniyle FDT’nin 46/1. maddesi uyarınca 220.000,00 TL para cezası ile cezalandırılmasına dair kararda sübut, hukuki niteleme ve cezanın tayini bakımından bir isabetsizlik bulunmadığı anlaşıldığından, başvurunun reddi ile kararın onanmasına, oybirliğiyle,

        - Fenerbahçe Futbol A.Ş.’nin Antrenörü Pedro Luis Ferreira Machado’nun akreditasyon kartını görünür bir şekilde boynuna asmamasından dolayı talimatlara aykırılık nedeniyle FDT’nin 46/1. maddesi uyarınca 40.000,00 TL para cezası ile cezalandırılmasına dair kararda sübut, hukuki niteleme ve cezanın tayini bakımından bir isabetsizlik bulunmadığı anlaşıldığından, başvurunun reddi ile kararın onanmasına, oybirliğiyle,
        `;

        const result = parseTahkimText(rawText);

        // Result will be 4 elements: the intro paragraph (resolved as pending since it matches 'Fenerbahçe' but no clear status) and 3 decision bullet points.
        // We are interested in the decision bullet points starting from index 1.
        expect(result.length).toBe(4);

        // First decision: Saha Olayları - Rejected
        expect(result[1].teamId).toBe('fen');
        expect(result[1].subject).toBe('Kulüp');
        expect(result[1].appealStatus).toBe('rejected');
        expect(result[1].appealedPenalty).toBe('İtiraz Reddedildi');

        // Second decision: Sportif Ekipman - Rejected
        expect(result[2].teamId).toBe('fen');
        expect(result[2].subject).toBe('Kulüp');
        expect(result[2].appealStatus).toBe('rejected');
        expect(result[2].appealedPenalty).toBe('İtiraz Reddedildi');

        // Third decision: Pedro Machado - Rejected
        expect(result[3].teamId).toBe('fen');
        expect(result[3].subject).toBe('Pedro Luis Ferreira Machado');
        expect(result[3].appealStatus).toBe('rejected');
        expect(result[3].appealedPenalty).toBe('İtiraz Reddedildi');
    });
});

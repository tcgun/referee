import { describe, it, expect } from 'vitest';
import { parseMatchData } from './matchParser';
import { Match } from '@/types';

// Mock the teams module since it depends on a large constant file we might not want to import fully in unit tests
// But usually for integration tests it's fine. If resolveTeamId is pure, we can just use it.
// Let's assume for this test we can use the real one or mock it.
// If we can't import the real one easily without side effects, we mock.
// src/lib/teams.ts seems simple enough.

describe('matchParser', () => {
    const baseMatch: Partial<Match> = {
        id: '', week: 1, date: new Date().toISOString(), status: 'draft',
        homeTeamId: '', awayTeamId: '', homeTeamName: '', awayTeamName: ''
    };

    it('should parse home and away coaches correctly', () => {
        const sampleText = `
            GALATASARAY A.Ş. 2-1 FENERBAHÇE A.Ş.
            30.01.2026 - 20:00
            RAMS PARK STADYUMU
            
            Hakem: ALİ ŞANSALAN
            
            GALATASARAY A.Ş.
            ilk 11
            1. FERNANDO MUSLERA
            10. DRIES MERTENS
            
            Yedekler
            19. GÜNAY GÜVENÇ
            
            Teknik Sorumlu
            OKAN BURUK
            
            Kartlar
            ...
            
            FENERBAHÇE A.Ş.
            İlk 11
            1. DOMINIK LIVAKOVIC
            
            Yedekler
            53. ERTUĞRUL ÇETİN
            
            Teknik Sorumlu
            JOSE MOURINHO
            
            Kartlar
            ...
        `;

        const result = parseMatchData(sampleText, baseMatch);

        expect(result.lineups?.homeCoach).toBe('OKAN BURUK');
        expect(result.lineups?.awayCoach).toBe('JOSE MOURINHO');
        expect(result.lineups?.home).toHaveLength(2);
        expect(result.lineups?.away).toHaveLength(1);
    });

    it('should be case insensitive for technical manager title', () => {
        const sampleText = `
            Team A vs Team B
            
            TEKNİK DİREKTÖR
            Home Coach Name
            
            ...
            
            TEKNİK SORUMLU
            Away Coach Name
        `;

        // We need to simulate the structure where Home comes first then Away
        // The parser relies on "İlk 11" to switch teams.
        const textWithContext = `
            Team A
            İlk 11
            1. Player A
            
            TEKNİK DİREKTÖR
            Home Coach Name
            
            Team B
            İlk 11
            2. Player B
            
            TEKNİK SORUMLU
            Away Coach Name
        `;

        const result = parseMatchData(textWithContext, baseMatch);
        expect(result.lineups?.homeCoach).toBe('Home Coach Name');
        expect(result.lineups?.awayCoach).toBe('Away Coach Name');
    });

    it('should handle different team sequences', () => {
        // TFF text sometimes puts all Home data then all Away data.
        // Our parser handles this via "İlk 11" detection.
        const text = `
            TRABZONSPOR A.Ş.
            ilk 11
            1. UĞURCAN ÇAKIR
            Teknik Sorumlu
            ŞENOL GÜNEŞ
            
            BEŞİKTAŞ A.Ş.
            İLK 11
            34. MERT GÜNOK
            Teknik Sorumlu
            GIOVANNI VAN BRONKHORST
        `;

        const result = parseMatchData(text, baseMatch);
        expect(result.lineups?.homeCoach).toBe('ŞENOL GÜNEŞ');
        expect(result.lineups?.awayCoach).toBe('GIOVANNI VAN BRONKHORST');
    });
});

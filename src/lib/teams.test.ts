import { describe, it, expect } from 'vitest';
import { resolveTeamId, getTeamName, getTeamColors } from './teams';

describe('Teams Logic', () => {
    describe('resolveTeamId', () => {
        it('should resolve exact short codes', () => {
            expect(resolveTeamId('gal')).toBe('gal');
            expect(resolveTeamId('fen')).toBe('fen');
            expect(resolveTeamId('bes')).toBe('bes');
        });

        it('should resolve full names case-insensitively', () => {
            expect(resolveTeamId('Galatasaray')).toBe('gal');
            expect(resolveTeamId('fenerbahçe')).toBe('fen');
            expect(resolveTeamId('BEŞİKTAŞ')).toBe('bes');
        });

        it('should resolve known aliases', () => {
            expect(resolveTeamId('cimbom')).toBe(null); // Alias not in file but testing logic
            expect(resolveTeamId('gfk')).toBe('gaz');
            expect(resolveTeamId('başakşehir')).toBe('bas');
            expect(resolveTeamId('rams başakşehir')).toBe('bas');
        });

        it('should return null for unknown teams', () => {
            expect(resolveTeamId('Unknown FC')).toBe(null);
            expect(resolveTeamId('')).toBe(null);
        });

        it('should resolve by direct ID if passed', () => {
            // If I pass 'gal' it should return 'gal' (covered in short code, but specifically logic step 2)
            expect(resolveTeamId('gal')).toBe('gal');
        });
    });

    describe('getTeamName', () => {
        it('should return correct name for valid ID', () => {
            expect(getTeamName('gal')).toBe('Galatasaray');
        });

        it('should return ID if team not found', () => {
            expect(getTeamName('unknown')).toBe('unknown');
        });
    });

    describe('getTeamColors', () => {
        it('should return correct colors for valid ID', () => {
            const colors = getTeamColors('gal');
            expect(colors.primary).toBe('#A90432');
            expect(colors.secondary).toBe('#FDB912');
        });

        it('should return default colors for invalid ID', () => {
            const colors = getTeamColors('invalid_id');
            expect(colors.primary).toBe('#333333');
        });
    });
});

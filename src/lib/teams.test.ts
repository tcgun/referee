import { describe, it, expect } from 'vitest';
import { resolveTeamId, getTeamName } from './teams';

describe('Team Logic', () => {
    it('should resolve team names correctly', () => {
        expect(getTeamName('gal')).toBe('Galatasaray');
        expect(getTeamName('unknown')).toBe('unknown');
    });

    it('should resolve team IDs from various inputs', () => {
        expect(resolveTeamId('Galatasaray')).toBe('gal');
        expect(resolveTeamId('gal')).toBe('gal');
        expect(resolveTeamId('Rams Başakşehir')).toBe('bas');
        expect(resolveTeamId('fenerbahce')).toBe('fen');
        expect(resolveTeamId('BJK')).toBe(null); // Assuming BJK is not mapped directly
    });
});

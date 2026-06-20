import { getAdminDb } from '@/firebase/admin';
import { Match, Official, DisciplinaryAction, Statement, Standing, Team } from '@/types';
import fs from 'fs';
import path from 'path';

const globalForCache = global as unknown as {
    matchesCache?: Match[];
    officialsCache?: Official[];
    disciplinaryCache?: DisciplinaryAction[];
    statementsCache?: Statement[];
    standingsCache?: Standing[];
    cacheTimestamp?: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

const BACKUP_DIR = path.join(process.cwd(), 'scratch');
const MATCHES_BACKUP_PATH = path.join(BACKUP_DIR, 'matches_backup.json');
const OFFICIALS_BACKUP_PATH = path.join(BACKUP_DIR, 'officials_backup.json');
const DISCIPLINARY_BACKUP_PATH = path.join(BACKUP_DIR, 'disciplinary_backup.json');
const STATEMENTS_BACKUP_PATH = path.join(BACKUP_DIR, 'statements_backup.json');
const STANDINGS_BACKUP_PATH = path.join(BACKUP_DIR, 'standings_backup.json');
const TEAMS_BACKUP_PATH = path.join(BACKUP_DIR, 'teams_backup.json');


function ensureDirectoryExistence(filePath: string) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
}

function saveBackup(filePath: string, data: unknown) {
    try {
        ensureDirectoryExistence(filePath);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`[Cache Backup] Saved database backup to ${path.basename(filePath)}`);
    } catch (err) {
        console.error(`[Cache Backup] Failed to save backup to ${filePath}:`, err);
    }
}

function readBackup(filePath: string): unknown | null {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`[Cache Fallback] Loaded database backup from ${path.basename(filePath)}`);
            return JSON.parse(content);
        }
    } catch (err) {
        console.error(`[Cache Fallback] Failed to read backup from ${filePath}:`, err);
    }
    return null;
}

function nameToSlug(name: string) {
    if (!name) return '';
    return name
        .replace(/İ/g, 'i')
        .replace(/I/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'c')
        .replace(/ç/g, 'c')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function extractOfficialsFromMatches(matches: Match[]): Official[] {
    const officialsMap = new Map<string, Set<string>>(); // Name -> Set of Roles
    
    matches.forEach(m => {
        if (m.referee) {
            const name = m.referee.trim();
            if (!officialsMap.has(name)) officialsMap.set(name, new Set());
            officialsMap.get(name)!.add('referee');
        }
        if (m.varReferee) {
            const name = m.varReferee.trim();
            if (!officialsMap.has(name)) officialsMap.set(name, new Set());
            officialsMap.get(name)!.add('var');
        }
        if (m.officials) {
            const mRefs = m.officials.referees || [];
            mRefs.forEach((r, idx) => {
                if (!r) return;
                const name = r.trim();
                if (!officialsMap.has(name)) officialsMap.set(name, new Set());
                if (idx === 0) officialsMap.get(name)!.add('referee');
                else if (idx === 1 || idx === 2) officialsMap.get(name)!.add('assistant');
                else if (idx === 3) officialsMap.get(name)!.add('fourth');
            });
            const mVars = m.officials.varReferees || [];
            mVars.forEach((v, idx) => {
                if (!v) return;
                const name = v.trim();
                if (!officialsMap.has(name)) officialsMap.set(name, new Set());
                if (idx === 0) officialsMap.get(name)!.add('var');
                else officialsMap.get(name)!.add('avar');
            });
            m.officials.representatives?.forEach(rep => {
                if (!rep) return;
                const name = rep.trim();
                if (!officialsMap.has(name)) officialsMap.set(name, new Set());
                officialsMap.get(name)!.add('representative');
            });
            m.officials.observers?.forEach(obs => {
                if (!obs) return;
                const name = obs.trim();
                if (!officialsMap.has(name)) officialsMap.set(name, new Set());
                officialsMap.get(name)!.add('observer');
            });
        }
    });

    return Array.from(officialsMap.entries()).map(([name, rolesSet]) => {
        const roles = Array.from(rolesSet);
        return {
            id: nameToSlug(name),
            name,
            region: 'İstanbul',
            classification: roles.includes('referee') ? 'Süper Lig Hakemi' : 'Klasman Hakemi',
            rating: 8.2,
            seasons: ['2025-2026'],
            roles
        } as Official;
    });
}

export async function getCachedMatches(): Promise<Match[]> {
    const now = Date.now();
    if (globalForCache.matchesCache && globalForCache.cacheTimestamp && (now - globalForCache.cacheTimestamp < CACHE_TTL_MS)) {
        return globalForCache.matchesCache;
    }

    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        console.log('[Cache Matches] Force-loading local JSON backup in Mock Mode');
        const backup = readBackup(MATCHES_BACKUP_PATH) as Match[] | null;
        if (backup) {
            globalForCache.matchesCache = backup;
            return backup;
        }
        return [];
    }

    try {
        const firestore = getAdminDb();
        const matchesSnap = await firestore.collection('matches').get();
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
        
        globalForCache.matchesCache = matches;
        globalForCache.cacheTimestamp = now;
        
        // Save to file backup asynchronously
        saveBackup(MATCHES_BACKUP_PATH, matches);
        
        return matches;
    } catch (error) {
        console.error('[Cache Matches] Firestore fetch failed:', error);
        
        if (globalForCache.matchesCache) {
            console.warn('[Cache Matches] Using expired matches in-memory cache due to Firestore error');
            return globalForCache.matchesCache;
        }
        
        const backup = readBackup(MATCHES_BACKUP_PATH) as Match[] | null;
        if (backup) {
            console.warn('[Cache Matches] Using local JSON backup file due to Firestore error');
            globalForCache.matchesCache = backup;
            return backup;
        }
        
        throw error;
    }
}

export async function getCachedOfficials(): Promise<Official[]> {
    const now = Date.now();
    if (globalForCache.officialsCache && globalForCache.cacheTimestamp && (now - globalForCache.cacheTimestamp < CACHE_TTL_MS)) {
        return globalForCache.officialsCache;
    }

    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        console.log('[Cache Officials] Force-loading local officials in Mock Mode');
        const backup = readBackup(OFFICIALS_BACKUP_PATH) as Official[] | null;
        if (backup && backup.length > 0) {
            globalForCache.officialsCache = backup;
            return backup;
        }
        const matches = await getCachedMatches();
        if (matches && matches.length > 0) {
            const extracted = extractOfficialsFromMatches(matches);
            globalForCache.officialsCache = extracted;
            return extracted;
        }
        return [];
    }

    try {
        const firestore = getAdminDb();
        const officialsSnap = await firestore.collection('officials').get();
        const officials = officialsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Official));
        
        globalForCache.officialsCache = officials;
        
        // Save to file backup
        saveBackup(OFFICIALS_BACKUP_PATH, officials);
        
        return officials;
    } catch (error) {
        console.error('[Cache Officials] Firestore fetch failed:', error);
        
        if (globalForCache.officialsCache) {
            console.warn('[Cache Officials] Using expired officials in-memory cache due to Firestore error');
            return globalForCache.officialsCache;
        }
        
        const backup = readBackup(OFFICIALS_BACKUP_PATH) as Official[] | null;
        if (backup && backup.length > 0) {
            console.warn('[Cache Officials] Using local JSON backup file due to Firestore error');
            globalForCache.officialsCache = backup;
            return backup;
        }
        
        // Fallback: extract from matches backup
        const matches = await getCachedMatches().catch(() => [] as Match[]);
        if (matches && matches.length > 0) {
            console.warn('[Cache Officials] Generating officials list from matches backup due to Firestore error');
            const extracted = extractOfficialsFromMatches(matches);
            globalForCache.officialsCache = extracted;
            return extracted;
        }
        
        throw error;
    }
}

export async function getCachedDisciplinaryActions(): Promise<DisciplinaryAction[]> {
    const now = Date.now();
    if (globalForCache.disciplinaryCache && globalForCache.cacheTimestamp && (now - globalForCache.cacheTimestamp < CACHE_TTL_MS)) {
        return globalForCache.disciplinaryCache;
    }

    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        console.log('[Cache Disciplinary] Force-loading local JSON backup in Mock Mode');
        const backup = readBackup(DISCIPLINARY_BACKUP_PATH) as DisciplinaryAction[] | null;
        if (backup) {
            globalForCache.disciplinaryCache = backup;
            return backup;
        }
        return [];
    }

    try {
        const firestore = getAdminDb();
        const snap = await firestore.collection('disciplinary_actions').get();
        const actions = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as DisciplinaryAction));
        
        globalForCache.disciplinaryCache = actions;
        
        // Save to file backup asynchronously
        saveBackup(DISCIPLINARY_BACKUP_PATH, actions);
        
        return actions;
    } catch (error) {
        console.error('[Cache Disciplinary] Firestore fetch failed:', error);
        
        if (globalForCache.disciplinaryCache) {
            return globalForCache.disciplinaryCache;
        }
        
        const backup = readBackup(DISCIPLINARY_BACKUP_PATH) as DisciplinaryAction[] | null;
        if (backup) {
            globalForCache.disciplinaryCache = backup;
            return backup;
        }
        
        return []; // Return empty list instead of throwing to avoid breaking pages
    }
}

export function writeLocalMatches(matches: Match[]) {
    globalForCache.matchesCache = matches;
    saveBackup(MATCHES_BACKUP_PATH, matches);
}

export function writeLocalOfficials(officials: Official[]) {
    globalForCache.officialsCache = officials;
    saveBackup(OFFICIALS_BACKUP_PATH, officials);
}

export function writeLocalDisciplinary(actions: DisciplinaryAction[]) {
    globalForCache.disciplinaryCache = actions;
    saveBackup(DISCIPLINARY_BACKUP_PATH, actions);
}

export async function getCachedStatements(): Promise<Statement[]> {
    const now = Date.now();
    if (globalForCache.statementsCache && globalForCache.cacheTimestamp && (now - globalForCache.cacheTimestamp < CACHE_TTL_MS)) {
        return globalForCache.statementsCache;
    }
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        return (readBackup(STATEMENTS_BACKUP_PATH) as Statement[]) || [];
    }
    try {
        const firestore = getAdminDb();
        const snap = await firestore.collection('statements').get();
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Statement));
        globalForCache.statementsCache = data;
        saveBackup(STATEMENTS_BACKUP_PATH, data);
        return data;
    } catch (e) {
        console.error('[Cache Statements] Firestore fetch failed:', e);
        const backup = readBackup(STATEMENTS_BACKUP_PATH) as Statement[] | null;
        if (backup) {
            globalForCache.statementsCache = backup;
            return backup;
        }
        return [];
    }
}

export function writeLocalStatements(statements: Statement[]) {
    globalForCache.statementsCache = statements;
    saveBackup(STATEMENTS_BACKUP_PATH, statements);
}

export async function getCachedStandings(): Promise<Standing[]> {
    const now = Date.now();
    if (globalForCache.standingsCache && globalForCache.cacheTimestamp && (now - globalForCache.cacheTimestamp < CACHE_TTL_MS)) {
        return globalForCache.standingsCache;
    }
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        return (readBackup(STANDINGS_BACKUP_PATH) as Standing[]) || [];
    }
    try {
        const firestore = getAdminDb();
        const snap = await firestore.collection('standings').get();
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Standing));
        globalForCache.standingsCache = data;
        saveBackup(STANDINGS_BACKUP_PATH, data);
        return data;
    } catch (e) {
        console.error('[Cache Standings] Firestore fetch failed:', e);
        const backup = readBackup(STANDINGS_BACKUP_PATH) as Standing[] | null;
        if (backup) {
            globalForCache.standingsCache = backup;
            return backup;
        }
        return [];
    }
}

export function writeLocalStandings(standings: Standing[]) {
    globalForCache.standingsCache = standings;
    saveBackup(STANDINGS_BACKUP_PATH, standings);
}

export async function getCachedTeams(): Promise<Team[]> {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        return (readBackup(TEAMS_BACKUP_PATH) as Team[]) || [];
    }
    try {
        const firestore = getAdminDb();
        const snap = await firestore.collection('teams').get();
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        saveBackup(TEAMS_BACKUP_PATH, data);
        return data;
    } catch (e) {
        console.error('[Cache Teams] Firestore fetch failed:', e);
        return (readBackup(TEAMS_BACKUP_PATH) as Team[]) || [];
    }
}

export function writeLocalTeams(teams: Team[]) {
    saveBackup(TEAMS_BACKUP_PATH, teams);
}

export function invalidateCache() {
    globalForCache.matchesCache = undefined;
    globalForCache.officialsCache = undefined;
    globalForCache.disciplinaryCache = undefined;
    globalForCache.statementsCache = undefined;
    globalForCache.standingsCache = undefined;
    globalForCache.cacheTimestamp = undefined;
    console.log('Stats cache invalidated!');
}


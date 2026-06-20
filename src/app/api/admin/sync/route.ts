import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { 
    getCachedMatches, 
    getCachedOfficials, 
    getCachedDisciplinaryActions, 
    getCachedStatements, 
    getCachedStandings, 
    getCachedTeams 
} from '@/lib/cache';

class FirestoreBatcher {
    private db: any;
    private currentBatch: any;
    private operationsCount = 0;
    public totalCommits = 0;
    public totalOperations = 0;

    constructor(db: any) {
        this.db = db;
        this.currentBatch = db.batch();
    }

    async set(ref: any, data: any) {
        this.currentBatch.set(ref, data, { merge: true });
        this.operationsCount++;
        this.totalOperations++;
        if (this.operationsCount >= 400) {
            await this.commit();
        }
    }

    async delete(ref: any) {
        this.currentBatch.delete(ref);
        this.operationsCount++;
        this.totalOperations++;
        if (this.operationsCount >= 400) {
            await this.commit();
        }
    }

    async commit() {
        if (this.operationsCount > 0) {
            await this.currentBatch.commit();
            this.currentBatch = this.db.batch();
            this.operationsCount = 0;
            this.totalCommits++;
        }
    }
}

export async function POST(request: Request) {
    return withAdminGuard(request, async () => {
        try {
            console.log('[SYNC] Starting synchronization of local JSON data to Firestore database');
            const firestore = getAdminDb();
            const batcher = new FirestoreBatcher(firestore);

            // 1. Matches, Incidents, and Opinions
            const matches = await getCachedMatches();
            console.log(`[SYNC] Syncing ${matches.length} matches...`);
            for (const match of matches) {
                // Prepare match doc (remove incidents nested array to save clean DB doc)
                const { incidents, ...matchData } = match as any;
                const matchRef = firestore.collection('matches').doc(match.id);
                await batcher.set(matchRef, matchData);

                if (Array.isArray(incidents)) {
                    for (const inc of incidents) {
                        const { opinions, ...incData } = inc;
                        const incRef = matchRef.collection('incidents').doc(inc.id);
                        await batcher.set(incRef, incData);

                        if (Array.isArray(opinions)) {
                            for (const op of opinions) {
                                const opRef = incRef.collection('opinions').doc(op.id);
                                await batcher.set(opRef, op);
                            }
                        }
                    }
                }
            }

            // 2. Officials
            const officials = await getCachedOfficials();
            console.log(`[SYNC] Syncing ${officials.length} officials...`);
            for (const off of officials) {
                const offRef = firestore.collection('officials').doc(off.id);
                await batcher.set(offRef, off);
            }

            // 3. Disciplinary Actions
            const actions = await getCachedDisciplinaryActions();
            console.log(`[SYNC] Syncing ${actions.length} disciplinary actions...`);
            for (const act of actions) {
                const actRef = firestore.collection('disciplinary_actions').doc(act.id);
                await batcher.set(actRef, act);
            }

            // 4. Statements
            const statements = await getCachedStatements();
            console.log(`[SYNC] Syncing ${statements.length} statements...`);
            for (const stmt of statements) {
                const stmtRef = firestore.collection('statements').doc(stmt.id);
                await batcher.set(stmtRef, stmt);
            }

            // 5. Standings
            const standings = await getCachedStandings();
            console.log(`[SYNC] Syncing ${standings.length} standings...`);
            for (const stand of standings) {
                const standRef = firestore.collection('standings').doc(stand.id);
                await batcher.set(standRef, stand);
            }

            // 6. Teams
            const teams = await getCachedTeams();
            console.log(`[SYNC] Syncing ${teams.length} teams...`);
            for (const team of teams) {
                const teamRef = firestore.collection('teams').doc(team.id);
                await batcher.set(teamRef, team);
            }

            // Commit final outstanding writes
            await batcher.commit();

            console.log(`[SYNC] Sync complete! Total Firestore operations: ${batcher.totalOperations} in ${batcher.totalCommits} batches.`);
            return NextResponse.json({
                success: true,
                operationsCount: batcher.totalOperations,
                batchesCount: batcher.totalCommits
            });
        } catch (error: any) {
            console.error('[SYNC] Sync process failed:', error);
            return NextResponse.json({ 
                error: 'Sync failed', 
                details: error instanceof Error ? error.message : String(error) 
            }, { status: 500 });
        }
    });
}

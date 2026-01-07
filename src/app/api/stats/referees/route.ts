import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Match, Opinion } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const firestore = getAdminDb();
        const matchesSnap = await firestore.collection('matches').get();
        const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Match));

        const refereeStats: Record<string, {
            name: string;
            matches: number; // Total matches involved
            roles: {
                referee: number;
                assistant: number;
                fourth: number;
                var: number;
                avar: number;
            };
            errors: number;
            controversial: number;
            correct: number;
        }> = {};

        const getStatObj = (name: string) => {
            if (!name) return null;
            const cleanName = name.trim();
            if (!cleanName) return null;

            if (!refereeStats[cleanName]) {
                refereeStats[cleanName] = {
                    name: cleanName,
                    matches: 0,
                    roles: { referee: 0, assistant: 0, fourth: 0, var: 0, avar: 0 },
                    errors: 0, controversial: 0, correct: 0
                };
            }
            return refereeStats[cleanName];
        };

        // Parallel fetch for opinions
        const promises = matches.map(async (match) => {
            // Process Roles
            const visited = new Set<string>(); // avoid double counting if name appears twice? unlikely but safe.

            const incrementRole = (name: string, role: keyof typeof refereeStats[string]['roles']) => {
                const stat = getStatObj(name);
                if (stat) {
                    stat.roles[role]++;
                    if (!visited.has(stat.name)) {
                        stat.matches++; // Increment total participation once per match
                        visited.add(stat.name);
                    }
                }
            };

            // Main Referee
            if (match.referee) incrementRole(match.referee, 'referee');

            // Officials Array Checking
            if (match.officials) {
                // Referees: [Main, Asst1, Asst2, 4th]
                const refs = match.officials.referees || [];
                // Asst 1 & 2
                if (refs[1]) incrementRole(refs[1], 'assistant');
                if (refs[2]) incrementRole(refs[2], 'assistant');
                // 4th
                if (refs[3]) incrementRole(refs[3], 'fourth');

                // VARs: [VAR, AVAR...]
                const vars = match.officials.varReferees || [];
                if (vars[0]) incrementRole(vars[0], 'var');
                // AVARs
                vars.slice(1).forEach(avar => {
                    if (avar) incrementRole(avar, 'avar');
                });
            } else {
                // Fallback for older data if only top-level fields exist
                if (match.varReferee) incrementRole(match.varReferee, 'var');
            }

            // Stats (Opinions) - usually attributed to Main Referee
            // If we want to verify who made the error, we'd need more data. 
            // For now, we attach opinion stats to the Main Referee.
            if (match.referee) {
                const mainRefStat = getStatObj(match.referee);

                if (mainRefStat) {
                    const opinionsSnap = await firestore
                        .collection('matches')
                        .doc(match.id)
                        .collection('opinions')
                        .get();

                    opinionsSnap.forEach(doc => {
                        const op = doc.data() as Opinion;
                        if (op.judgment === 'incorrect') mainRefStat.errors += 1;
                        else if (op.judgment === 'controversial') mainRefStat.controversial += 1;
                        else if (op.judgment === 'correct') mainRefStat.correct += 1;
                    });
                }
            }
        });

        await Promise.all(promises);

        // Fetch official metadata (region, rating)
        const officialsSnap = await firestore.collection('officials').get();
        const officialMetadata: Record<string, { region: string, rating: number }> = {};
        officialsSnap.forEach(doc => {
            const data = doc.data();
            officialMetadata[data.name] = {
                region: data.region || '',
                rating: data.rating || 0
            };
        });

        // Convert to array and merge metadata
        const statsArray = Object.values(refereeStats).map(stat => ({
            ...stat,
            region: officialMetadata[stat.name]?.region || '',
            rating: officialMetadata[stat.name]?.rating || 0
        })).sort((a, b) => {
            // Sort by Name alphabetically
            return a.name.localeCompare(b.name, 'tr');
        });

        return NextResponse.json(statsArray);

    } catch (error: any) {
        console.error('Referee Stats Error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { Match, OfficialRole } from '@/types';

export async function POST(request: Request) {
    return withAdminGuard(request, async () => {
        const firestore = getAdminDb();
        try {
            // 1. Get all matches
            const matchesSnap = await firestore.collection('matches').get();
            const matches = matchesSnap.docs.map(d => d.data() as Match);

            // 2. Extract unique officials and their roles/counts
            const officialMap: Record<string, { roles: Set<OfficialRole>, counts: Record<OfficialRole, number> }> = {};

            const addRole = (name: string | undefined, role: OfficialRole) => {
                if (!name) return;
                const cleanName = name.trim();
                if (!cleanName) return;

                if (!officialMap[cleanName]) {
                    officialMap[cleanName] = {
                        roles: new Set(),
                        counts: { referee: 0, assistant: 0, fourth: 0, var: 0, avar: 0, observer: 0, representative: 0 }
                    };
                }
                officialMap[cleanName].roles.add(role);
                officialMap[cleanName].counts[role]++;
            };

            matches.forEach(m => {
                addRole(m.referee, 'referee');
                addRole(m.varReferee, 'var');

                if (m.officials) {
                    const refs = m.officials.referees || [];
                    if (refs[1]) addRole(refs[1], 'assistant');
                    if (refs[2]) addRole(refs[2], 'assistant');
                    if (refs[3]) addRole(refs[3], 'fourth');

                    const vars = m.officials.varReferees || [];
                    vars.slice(1).forEach(v => addRole(v, 'avar'));

                    (m.officials.observers || []).forEach(o => addRole(o, 'observer'));
                    (m.officials.representatives || []).forEach(r => addRole(r, 'representative'));
                }
            });

            // 3. Batch write officials
            const batch = firestore.batch();
            let count = 0;

            for (const [name, data] of Object.entries(officialMap)) {
                const totalMatches = Object.values(data.counts).reduce((a, b) => a + b, 0);
                const docId = name.trim().replace(/\//g, '-');
                const docRef = firestore.collection('officials').doc(docId);

                batch.set(docRef, {
                    name,
                    roles: Array.from(data.roles),
                    roleCounts: data.counts,
                    matchesCount: totalMatches,
                }, { merge: true }); // Use merge to avoid overwriting rating/region
                count++;
            }

            if (count > 0) {
                await batch.commit();
            }

            return NextResponse.json({ success: true, processed: count });

            if (count > 0) {
                await batch.commit();
            }

            return NextResponse.json({ success: true, added: count });
        } catch (error) {
            console.error('Sync Error:', error);
            return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
        }
    });
}

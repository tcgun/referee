import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { Match, OfficialRole, Official } from '@/types';
import * as admin from 'firebase-admin';
import { invalidateCache, getCachedMatches, getCachedOfficials, writeLocalOfficials } from '@/lib/cache';

export async function POST(request: Request) {
    return withAdminGuard(request, async () => {
        try {
            if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
                const matches = await getCachedMatches();
                const officialMap: Record<string, { roles: Set<OfficialRole>, counts: Record<OfficialRole, number>, seasons: Set<string> }> = {};

                const addRole = (name: string | undefined, role: OfficialRole, season: string) => {
                    if (!name) return;
                    const cleanName = name.trim();
                    if (!cleanName) return;

                    if (!officialMap[cleanName]) {
                        officialMap[cleanName] = {
                            roles: new Set(),
                            counts: { referee: 0, assistant: 0, fourth: 0, var: 0, avar: 0, observer: 0, representative: 0 },
                            seasons: new Set()
                        };
                    }
                    officialMap[cleanName].roles.add(role);
                    officialMap[cleanName].counts[role]++;
                    if (season) {
                        officialMap[cleanName].seasons.add(season);
                    }
                };

                matches.forEach(m => {
                    const s = m.season || '2025-2026';
                    addRole(m.referee, 'referee', s);
                    addRole(m.varReferee, 'var', s);

                    if (m.officials) {
                        const refs = m.officials.referees || [];
                        if (refs[1]) addRole(refs[1], 'assistant', s);
                        if (refs[2]) addRole(refs[2], 'assistant', s);
                        if (refs[3]) addRole(refs[3], 'fourth', s);

                        const vars = m.officials.varReferees || [];
                        vars.slice(1).forEach(v => addRole(v, 'avar', s));

                        (m.officials.observers || []).forEach(o => addRole(o, 'observer', s));
                        (m.officials.representatives || []).forEach(r => addRole(r, 'representative', s));
                    }
                });

                const localOfficials = await getCachedOfficials();
                const localOfficialsMap = new Map<string, Official>();
                localOfficials.forEach(o => localOfficialsMap.set(o.id, o));

                const updatedOfficials: Official[] = [];

                for (const [name, data] of Object.entries(officialMap)) {
                    const totalMatches = Object.values(data.counts).reduce((a, b) => a + b, 0);
                    const docId = name.trim().replace(/\//g, '-');
                    const existing = localOfficialsMap.get(docId);

                    const seasonsList = Array.from(data.seasons);

                    let mergedOfficial: Official;
                    if (existing) {
                        mergedOfficial = {
                            ...existing,
                            name,
                            roles: Array.from(data.roles),
                            roleCounts: data.counts,
                            matchesCount: totalMatches,
                            seasons: Array.from(new Set([...(existing.seasons || []), ...seasonsList]))
                        };
                    } else {
                        mergedOfficial = {
                            id: docId,
                            name,
                            roles: Array.from(data.roles),
                            roleCounts: data.counts,
                            matchesCount: totalMatches,
                            rating: 0,
                            classification: '',
                            seasons: seasonsList
                        };
                    }
                    updatedOfficials.push(mergedOfficial);
                }

                writeLocalOfficials(updatedOfficials);
                invalidateCache();
                return NextResponse.json({ success: true, processed: updatedOfficials.length, added: updatedOfficials.length });
            }

            const firestore = getAdminDb();
            // 1. Get all matches
            const matchesSnap = await firestore.collection('matches').get();
            const matches = matchesSnap.docs.map(d => d.data() as Match);

            // 2. Extract unique officials and their roles/counts
            const officialMap: Record<string, { roles: Set<OfficialRole>, counts: Record<OfficialRole, number>, seasons: Set<string> }> = {};

            const addRole = (name: string | undefined, role: OfficialRole, season: string) => {
                if (!name) return;
                const cleanName = name.trim();
                if (!cleanName) return;

                if (!officialMap[cleanName]) {
                    officialMap[cleanName] = {
                        roles: new Set(),
                        counts: { referee: 0, assistant: 0, fourth: 0, var: 0, avar: 0, observer: 0, representative: 0 },
                        seasons: new Set()
                    };
                }
                officialMap[cleanName].roles.add(role);
                officialMap[cleanName].counts[role]++;
                if (season) {
                    officialMap[cleanName].seasons.add(season);
                }
            };

            matches.forEach(m => {
                const s = m.season || '2025-2026';
                addRole(m.referee, 'referee', s);
                addRole(m.varReferee, 'var', s);

                if (m.officials) {
                    const refs = m.officials.referees || [];
                    if (refs[1]) addRole(refs[1], 'assistant', s);
                    if (refs[2]) addRole(refs[2], 'assistant', s);
                    if (refs[3]) addRole(refs[3], 'fourth', s);

                    const vars = m.officials.varReferees || [];
                    vars.slice(1).forEach(v => addRole(v, 'avar', s));

                    (m.officials.observers || []).forEach(o => addRole(o, 'observer', s));
                    (m.officials.representatives || []).forEach(r => addRole(r, 'representative', s));
                }
            });

            // 3. Batch write officials
            const batch = firestore.batch();
            let count = 0;

            for (const [name, data] of Object.entries(officialMap)) {
                const totalMatches = Object.values(data.counts).reduce((a, b) => a + b, 0);
                const docId = name.trim().replace(/\//g, '-');
                const docRef = firestore.collection('officials').doc(docId);

                const updatePayload: any = {
                    name,
                    roles: Array.from(data.roles),
                    roleCounts: data.counts,
                    matchesCount: totalMatches,
                };

                if (data.seasons.size > 0) {
                    updatePayload.seasons = admin.firestore.FieldValue.arrayUnion(...Array.from(data.seasons));
                }

                batch.set(docRef, updatePayload, { merge: true }); // Use merge to avoid overwriting rating/region
                count++;
            }

            if (count > 0) {
                await batch.commit();
                invalidateCache();
            }

            return NextResponse.json({ success: true, processed: count, added: count });
        } catch (error) {
            console.error('Sync Error:', error);
            return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
        }
    });
}

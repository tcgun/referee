import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { Official } from '@/types';
import * as admin from 'firebase-admin';

export async function GET(request: Request) {
    return withAdminGuard(request, async () => {
        const firestore = getAdminDb();
        try {
            const snapshot = await firestore.collection('officials').orderBy('name').get();
            const officials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json(officials);
        } catch (error) {
            console.error('Error fetching officials:', error);
            return NextResponse.json({ error: 'Failed to fetch officials' }, { status: 500 });
        }
    });
}

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            const body = await req.json();

            // Bulk array insertion
            if (Array.isArray(body)) {
                const snapshot = await firestore.collection('officials').get();
                const existingMap = new Map<string, Official>();
                snapshot.docs.forEach(doc => {
                    existingMap.set(doc.id, doc.data() as Official);
                });

                const batch = firestore.batch();
                const officialsRef = firestore.collection('officials');
                const addedIds: string[] = [];

                for (const item of body) {
                    const { name, region, roles, classification, seasons } = item;
                    if (!name) {
                        continue; // skip invalid records
                    }

                    const docId = name.trim().replace(/\//g, '-');
                    const docRef = officialsRef.doc(docId);
                    const existing = existingMap.get(docId);

                    let newOfficial;
                    if (existing) {
                        newOfficial = {
                            name,
                            region: region || existing.region || '',
                            roles: Array.from(new Set([...(existing.roles || []), ...(roles || [])])),
                            matchesCount: existing.matchesCount || 0,
                            rating: existing.rating || 0,
                            classification: classification || existing.classification || '',
                            seasons: admin.firestore.FieldValue.arrayUnion(...(seasons || ['2025-2026']))
                        };
                    } else {
                        newOfficial = {
                            name,
                            region: region || '',
                            roles: roles || [],
                            matchesCount: 0,
                            rating: 0,
                            classification: classification || '',
                            seasons: admin.firestore.FieldValue.arrayUnion(...(seasons || ['2025-2026']))
                        };
                    }

                    batch.set(docRef, newOfficial, { merge: true });
                    addedIds.push(docId);
                }

                await batch.commit();
                return NextResponse.json({ success: true, count: addedIds.length });
            }

            // Single official insertion
            const { name, region, roles, classification, seasons } = body;

            if (!name) {
                return NextResponse.json({ error: 'Name is required' }, { status: 400 });
            }

            const docId = name.trim().replace(/\//g, '-');
            const docRef = firestore.collection('officials').doc(docId);
            const docSnap = await docRef.get();

            let finalOfficialForDb;
            let finalOfficialForResponse;

            if (docSnap.exists) {
                const existing = docSnap.data() || {};
                const mergedRoles = Array.from(new Set([...(existing.roles || []), ...(roles || [])]));
                const mergedSeasons = Array.from(new Set([...(existing.seasons || []), ...(seasons || ['2025-2026'])]));

                finalOfficialForDb = {
                    name,
                    region: region || existing.region || '',
                    roles: mergedRoles,
                    matchesCount: existing.matchesCount || 0,
                    rating: existing.rating || 0,
                    classification: classification || existing.classification || '',
                    seasons: admin.firestore.FieldValue.arrayUnion(...(seasons || ['2025-2026']))
                };

                finalOfficialForResponse = {
                    name,
                    region: region || existing.region || '',
                    roles: mergedRoles,
                    matchesCount: existing.matchesCount || 0,
                    rating: existing.rating || 0,
                    classification: classification || existing.classification || '',
                    seasons: mergedSeasons
                };
            } else {
                finalOfficialForDb = {
                    name,
                    region: region || '',
                    roles: roles || [],
                    matchesCount: 0,
                    rating: 0,
                    classification: classification || '',
                    seasons: admin.firestore.FieldValue.arrayUnion(...(seasons || ['2025-2026']))
                };

                finalOfficialForResponse = {
                    name,
                    region: region || '',
                    roles: roles || [],
                    matchesCount: 0,
                    rating: 0,
                    classification: classification || '',
                    seasons: seasons || ['2025-2026']
                };
            }

            await docRef.set(finalOfficialForDb, { merge: true });

            return NextResponse.json({ id: docId, ...finalOfficialForResponse });
        } catch (error) {
            console.error('Error adding official:', error);
            return NextResponse.json({ error: 'Failed to add official' }, { status: 500 });
        }
    });
}

export async function PUT(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            const body = await req.json();
            const { id, name, region, roles, rating, classification, seasons } = body;

            if (!id || !name) {
                return NextResponse.json({ error: 'Missing fields (id and name are required)' }, { status: 400 });
            }

            const updateData: Partial<Official> = {
                name,
                region,
                roles: roles || [],
                rating: rating !== undefined ? Number(rating) : 0,
                classification: classification || ''
            };

            if (seasons) {
                updateData.seasons = seasons;
            }

            await firestore.collection('officials').doc(id).update(updateData);

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Error updating official:', error);
            return NextResponse.json({ error: 'Failed to update official' }, { status: 500 });
        }
    });
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            const { searchParams } = new URL(req.url);

            if (searchParams.get('clear') === 'true') {
                const season = searchParams.get('season');
                const snapshot = await firestore.collection('officials').get();
                const batch = firestore.batch();

                if (season) {
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const seasons = data.seasons || [];
                        if (seasons.includes(season)) {
                            if (seasons.length <= 1) {
                                // Only belongs to this season, delete the document entirely
                                batch.delete(doc.ref);
                            } else {
                                // Belongs to other seasons as well, only remove this season from the array
                                batch.update(doc.ref, {
                                    seasons: admin.firestore.FieldValue.arrayRemove(season)
                                });
                            }
                        }
                    });
                } else {
                    // No season specified, delete all documents
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                }

                await batch.commit();
                return NextResponse.json({ success: true, message: 'Officials cleared successfully' });
            }

            const id = searchParams.get('id');

            if (!id) {
                return NextResponse.json({ error: 'ID required' }, { status: 400 });
            }

            await firestore.collection('officials').doc(id).delete();
            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Error deleting official:', error);
            return NextResponse.json({ error: 'Failed to delete official' }, { status: 500 });
        }
    });
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { disciplinaryActionSchema } from '@/lib/validations';
import { v4 as uuidv4 } from 'uuid';
import { getCachedMatches, getCachedDisciplinaryActions, writeLocalDisciplinary, invalidateCache } from '@/lib/cache';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const body = await req.json();

        const validationResult = disciplinaryActionSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;

        let matchId = data.matchId || '';
        if (matchId && !matchId.startsWith('d-')) {
            matchId = `d-${matchId}`;
        }

        const slugify = (text: string) => {
            const trMap: Record<string, string> = {
                'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
                'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
            };
            let str = text.toString();
            Object.keys(trMap).forEach(key => {
                str = str.replaceAll(key, trMap[key]);
            });
            return str.toLowerCase().trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-');
        };

        const subjectSlug = slugify(data.subject || 'unknown');
        const uniqueSuffix = uuidv4().slice(0, 4);
        const id = data.id || `d-${matchId.replace('d-', '')}-${subjectSlug}-${uniqueSuffix}`;

        let finalWeek = data.week ?? null;

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            if (!finalWeek && matchId) {
                const matches = await getCachedMatches();
                const mDoc = matches.find(m => m.id === matchId.replace('d-', ''));
                if (mDoc) {
                    finalWeek = mDoc.week || null;
                }
            }

            const saveData: Record<string, unknown> = {
                ...data,
                id,
                matchId: matchId || null,
                week: finalWeek,
                updatedAt: new Date().toISOString()
            };

            Object.keys(saveData).forEach(key => {
                if (saveData[key] === undefined) {
                    delete saveData[key];
                }
            });

            const actions = await getCachedDisciplinaryActions();
            const existingIdx = actions.findIndex(a => a.id === id);
            if (existingIdx > -1) {
                actions[existingIdx] = { ...actions[existingIdx], ...saveData } as any; // safe cast for mock array insertion
            } else {
                actions.push(saveData as any);
            }

            writeLocalDisciplinary(actions);

            // Also propagate to Firestore in Mock Mode since UI reads from it directly
            try {
                const firestore = getAdminDb();
                await firestore.collection('disciplinary_actions').doc(id).set(saveData, { merge: true });
            } catch (dbErr: unknown) {
                console.error('Failed to sync write to Firestore in mock mode:', dbErr);
            }

            invalidateCache();
            return NextResponse.json({ success: true, id });
        }

        const firestore = getAdminDb();
        // Ensure week is present if matchId exists
        if (!finalWeek && matchId) {
            const matchSnap = await firestore.collection('matches').doc(matchId.replace('d-', '')).get();
            if (matchSnap.exists) {
                finalWeek = matchSnap.data()?.week || null;
            }
        }

        const saveData: Record<string, unknown> = {
            ...data,
            id,
            matchId: matchId || null,
            week: finalWeek,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined fields to prevent Firestore crashes
        Object.keys(saveData).forEach(key => {
            if (saveData[key] === undefined) {
                delete saveData[key];
            }
        });

        try {
            await firestore.collection('disciplinary_actions').doc(id).set(saveData, { merge: true });
            invalidateCache();
            return NextResponse.json({ success: true, id });
        } catch (dbError: unknown) {
            console.error('Firestore Save Error:', dbError);
            return NextResponse.json({
                error: 'Database operation failed',
                message: dbError instanceof Error ? dbError.message : String(dbError)
            }, { status: 500 });
        }
    });
}

export async function PUT(request: Request) {
    return POST(request);
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const deleteAll = searchParams.get('all') === 'true' || id === 'all';

        if (!id && !deleteAll) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            if (deleteAll) {
                writeLocalDisciplinary([]);
                try {
                    const firestore = getAdminDb();
                    const snap = await firestore.collection('disciplinary_actions').get();
                    const batch = firestore.batch();
                    snap.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                } catch (dbErr: unknown) {
                    console.error('Failed to delete live Firestore disciplinary_actions collection in mock mode:', dbErr);
                    return NextResponse.json({
                        error: 'Mock mode local clear succeeded, but Firestore deletion failed',
                        message: dbErr instanceof Error ? dbErr.message : String(dbErr)
                    }, { status: 500 });
                }
            } else if (id) {
                const actions = await getCachedDisciplinaryActions();
                const filtered = actions.filter(a => a.id !== id);
                writeLocalDisciplinary(filtered);
                try {
                    const firestore = getAdminDb();
                    await firestore.collection('disciplinary_actions').doc(id).delete();
                } catch (dbErr: unknown) {
                    console.error('Failed to delete live Firestore disciplinary_actions doc in mock mode:', dbErr);
                    return NextResponse.json({
                        error: 'Mock mode local delete succeeded, but Firestore deletion failed',
                        message: dbErr instanceof Error ? dbErr.message : String(dbErr)
                    }, { status: 500 });
                }
            }
            invalidateCache();
            return NextResponse.json({ success: true });
        }

        const firestore = getAdminDb();
        try {
            if (deleteAll) {
                const snap = await firestore.collection('disciplinary_actions').get();
                const batch = firestore.batch();
                snap.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            } else if (id) {
                await firestore.collection('disciplinary_actions').doc(id).delete();
            }
            invalidateCache();
            return NextResponse.json({ success: true });
        } catch (dbError: unknown) {
            console.error('Firestore Delete Error:', dbError);
            return NextResponse.json({
                error: 'Database deletion failed',
                message: dbError instanceof Error ? dbError.message : String(dbError)
            }, { status: 500 });
        }
    });
}

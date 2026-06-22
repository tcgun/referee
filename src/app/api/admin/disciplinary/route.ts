import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { disciplinaryActionSchema } from '@/lib/validations';
import { DisciplinaryAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getCachedMatches, getCachedDisciplinaryActions, writeLocalDisciplinary, invalidateCache } from '@/lib/cache';

const findWeekByDate = (dateStr: string | Date | undefined, matches: Array<{ date?: string | Date; week?: number | null }>): number | null => {
    if (!dateStr) return null;
    if (!matches || matches.length === 0) return null;
    const targetTime = new Date(dateStr).getTime();
    
    let closestMatch = null;
    let minDiff = Infinity;
    
    for (const m of matches) {
        if (!m.date) continue;
        const mTime = new Date(m.date).getTime();
        const diff = Math.abs(targetTime - mTime);
        if (diff < minDiff) {
            minDiff = diff;
            closestMatch = m;
        }
    }
    
    return closestMatch ? closestMatch.week || null : null;
};

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

        let finalWeek = data.week !== undefined && data.week !== null ? data.week : null;

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            if (finalWeek === null) {
                const matches = await getCachedMatches();
                if (matchId) {
                    const mDoc = matches.find(m => m.id === matchId.replace('d-', ''));
                    if (mDoc) {
                        finalWeek = mDoc.week || null;
                    }
                }
                if (finalWeek === null && data.date) {
                    finalWeek = findWeekByDate(data.date, matches);
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
                actions[existingIdx] = { ...actions[existingIdx], ...saveData } as unknown as DisciplinaryAction;
            } else {
                actions.push(saveData as unknown as DisciplinaryAction);
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
        if (finalWeek === null) {
            const matches = await getCachedMatches();
            if (matchId) {
                const mDoc = matches.find(m => m.id === matchId.replace('d-', ''));
                if (mDoc) {
                    finalWeek = mDoc.week || null;
                }
            }
            if (finalWeek === null && data.date) {
                finalWeek = findWeekByDate(data.date, matches);
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
        const clearAppeals = searchParams.get('clearAppeals') === 'true';

        if (!id && !deleteAll && !clearAppeals) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            if (clearAppeals) {
                const actions = await getCachedDisciplinaryActions();
                const updated = actions.map(a => ({
                    ...a,
                    appealStatus: 'none',
                    appealedPenalty: '',
                    appealNote: '',
                    appealDate: ''
                }));
                writeLocalDisciplinary(updated as unknown as DisciplinaryAction[]);
                try {
                    const firestore = getAdminDb();
                    const snap = await firestore.collection('disciplinary_actions').get();
                    const batch = firestore.batch();
                    snap.docs.forEach(doc => {
                        batch.update(doc.ref, {
                            appealStatus: 'none',
                            appealedPenalty: '',
                            appealNote: '',
                            appealDate: ''
                        });
                    });
                    await batch.commit();
                } catch (dbErr: unknown) {
                    console.error('Failed to clear live Firestore appeals in mock mode:', dbErr);
                    return NextResponse.json({
                        error: 'Mock mode local clear succeeded, but Firestore update failed',
                        message: dbErr instanceof Error ? dbErr.message : String(dbErr)
                    }, { status: 500 });
                }
            } else if (deleteAll) {
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
            if (clearAppeals) {
                const snap = await firestore.collection('disciplinary_actions').get();
                const batch = firestore.batch();
                snap.docs.forEach(doc => {
                    batch.update(doc.ref, {
                        appealStatus: 'none',
                        appealedPenalty: '',
                        appealNote: '',
                        appealDate: ''
                    });
                });
                await batch.commit();
            } else if (deleteAll) {
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
            console.error('Firestore Delete/Clear Error:', dbError);
            return NextResponse.json({
                error: 'Database operation failed',
                message: dbError instanceof Error ? dbError.message : String(dbError)
            }, { status: 500 });
        }
    });
}

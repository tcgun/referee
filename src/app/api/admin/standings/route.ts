import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { standingSchema } from '@/lib/validations';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        try {
            const firestore = getAdminDb();
            const body = await req.json();

            // Handle bulk updates (array)
            if (Array.isArray(body)) {
                const batch = firestore.batch();
                const results = [];

                for (const item of body) {
                    const validationResult = standingSchema.partial().safeParse(item);
                    if (!validationResult.success) {
                        return NextResponse.json({
                            error: 'Validation failed for item: ' + (item.id || 'unknown'),
                            details: validationResult.error.format()
                        }, { status: 400 });
                    }

                    const data = validationResult.data;
                    if (!data.id) {
                        return NextResponse.json({ error: 'ID is required for all items' }, { status: 400 });
                    }

                    const docRef = firestore.collection('standings').doc(data.id);
                    batch.set(docRef, data, { merge: true });
                    results.push(data.id);
                }

                await batch.commit();
                return NextResponse.json({ success: true, count: results.length, ids: results });
            }

            // Handle single item update (existing logic)
            const validationResult = standingSchema.partial().safeParse(body);
            if (!validationResult.success) {
                return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
            }

            const data = validationResult.data;
            if (!data.id) {
                return NextResponse.json({ error: 'ID is required' }, { status: 400 });
            }

            await firestore.collection('standings').doc(data.id).set(data, { merge: true });

            return NextResponse.json({ success: true, id: data.id });
        } catch (error: any) {
            console.error('Error saving standing:', error);
            return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
        }
    });
}

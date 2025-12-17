import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { teamSchema } from '@/lib/validations';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const body = await req.json();

        const validationResult = teamSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        if (!data.id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await firestore.collection('teams').doc(data.id).set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    });
}

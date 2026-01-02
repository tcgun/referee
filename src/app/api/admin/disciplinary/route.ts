import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { disciplinaryActionSchema } from '@/lib/validations';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const body = await req.json();

        const validationResult = disciplinaryActionSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        const id = data.id || uuidv4();

        await firestore.collection('disciplinary_actions').doc(id).set({ ...data, id }, { merge: true });

        return NextResponse.json({ success: true, id });
    });
}

export async function PUT(request: Request) {
    return POST(request);
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await firestore.collection('disciplinary_actions').doc(id).delete();
        return NextResponse.json({ success: true });
    });
}

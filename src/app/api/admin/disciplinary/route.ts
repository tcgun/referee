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

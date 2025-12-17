import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { statementSchema } from '@/lib/validations';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const body = await req.json();

        const validationResult = statementSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        // Generate ID if missing and it's a new entry (though partial usually implies update, here we are flexible)
        // However, standardizing on client-provided ID or generating one here.
        // Let's assume user form sends ID or we generate (logic mostly relies on ID being present).
        const id = data.id || uuidv4();

        await firestore.collection('statements').doc(id).set({ ...data, id }, { merge: true });

        return NextResponse.json({ success: true, id });
    });
}

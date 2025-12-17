import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { matchSchema } from '@/lib/validations';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const body = await req.json();

        // Allow partial updates for flexibility
        const validationResult = matchSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        // Ensure ID presence (if new doc, use provided or generate?)
        // Schema checks ID existence, but if partial, maybe ID is missing?
        // Basic rule: ID must be known to update/create.
        if (!data.id) {
            // Check if we can generate one or if it's required. Schema says required string.
            // If user sends partial without ID, we can't update.
            return NextResponse.json({ error: 'ID is required for update/create' }, { status: 400 });
        }

        await firestore.collection('matches').doc(data.id).set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    });
}

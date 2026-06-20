import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { statementSchema } from '@/lib/validations';
import { Statement } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getCachedStatements, writeLocalStatements, invalidateCache } from '@/lib/cache';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const body = await req.json();

        const validationResult = statementSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        const id = data.id || uuidv4();

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const statements = await getCachedStatements();
            const existingIdx = statements.findIndex(s => s.id === id);

            const saveData = { ...data, id };

            if (existingIdx > -1) {
                statements[existingIdx] = { ...statements[existingIdx], ...saveData } as Statement;
            } else {
                const fullStatement: Statement = {
                    id,
                    title: data.title || '',
                    content: data.content || '',
                    entity: data.entity || '',
                    date: data.date || new Date().toISOString(),
                    type: data.type || 'club',
                    url: data.url,
                    season: data.season
                };
                statements.push(fullStatement);
            }

            writeLocalStatements(statements);
            invalidateCache();
            return NextResponse.json({ success: true, id });
        }

        const firestore = getAdminDb();
        await firestore.collection('statements').doc(id).set({ ...data, id }, { merge: true });
        invalidateCache();

        return NextResponse.json({ success: true, id });
    });
}

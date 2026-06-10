import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { Statement } from '@/types';

export const revalidate = 1800; // Cache for 30 minutes

export async function GET() {
    try {
        const firestore = getAdminDb();
        const stmtSnap = await firestore.collection('statements').get();
        const statements = stmtSnap.docs.map(d => ({ ...d.data(), id: d.id } as Statement));

        return NextResponse.json(statements);
    } catch (error: any) {
        console.error('Public Statements API Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch statements',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

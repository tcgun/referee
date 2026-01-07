import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { Official } from '@/types';

export async function GET(request: Request) {
    return withAdminGuard(request, async () => {
        const firestore = getAdminDb();
        try {
            const snapshot = await firestore.collection('officials').orderBy('name').get();
            const officials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json(officials);
        } catch (error) {
            console.error('Error fetching officials:', error);
            return NextResponse.json({ error: 'Failed to fetch officials' }, { status: 500 });
        }
    });
}

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            const body = await req.json();
            const { name, region, roles } = body;

            if (!name || !roles || roles.length === 0) {
                return NextResponse.json({ error: 'Name and at least one role is required' }, { status: 400 });
            }

            const newOfficial: Omit<Official, 'id'> = {
                name,
                region: region || '',
                roles,
                matchesCount: 0,
                rating: 0
            };

            const docId = name.trim().replace(/\//g, '-');
            await firestore.collection('officials').doc(docId).set(newOfficial);

            return NextResponse.json({ id: docId, ...newOfficial });
        } catch (error) {
            console.error('Error adding official:', error);
            return NextResponse.json({ error: 'Failed to add official' }, { status: 500 });
        }
    });
}

export async function PUT(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            const body = await req.json();
            const { id, name, region, roles, rating } = body;

            if (!id || !name || !roles) {
                return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
            }

            await firestore.collection('officials').doc(id).update({
                name,
                region,
                roles,
                rating: rating !== undefined ? Number(rating) : 0
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Error updating official:', error);
            return NextResponse.json({ error: 'Failed to update official' }, { status: 500 });
        }
    });
}

export async function DELETE(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) {
                return NextResponse.json({ error: 'ID required' }, { status: 400 });
            }

            await firestore.collection('officials').doc(id).delete();
            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Error deleting official:', error);
            return NextResponse.json({ error: 'Failed to delete official' }, { status: 500 });
        }
    });
}

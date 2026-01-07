import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();
        const { oldId, newId } = await req.json();

        if (!oldId || !newId) {
            return NextResponse.json({ error: 'oldId and newId are required' }, { status: 400 });
        }

        if (oldId === newId) {
            return NextResponse.json({ error: 'IDs are identical' }, { status: 400 });
        }

        try {
            const oldMatchRef = firestore.collection('matches').doc(oldId);
            const newMatchRef = firestore.collection('matches').doc(newId);

            const oldMatchSnap = await oldMatchRef.get();
            if (!oldMatchSnap.exists) {
                return NextResponse.json({ error: 'Source match not found' }, { status: 404 });
            }

            const newMatchSnap = await newMatchRef.get();
            if (newMatchSnap.exists) {
                return NextResponse.json({ error: 'Target ID already exists' }, { status: 400 });
            }

            // --- 1. COPY MAIN DATA ---
            const matchData = oldMatchSnap.data()!;
            await newMatchRef.set({ ...matchData, id: newId });

            // --- 2. COPY SUB-COLLECTIONS (Incidents & Opinions) ---
            const incidentsSnap = await oldMatchRef.collection('incidents').get();
            for (const incDoc of incidentsSnap.docs) {
                const incData = incDoc.data();
                const newIncRef = newMatchRef.collection('incidents').doc(incDoc.id);
                await newIncRef.set(incData);

                // Copy Opinions for this incident
                const opinionsSnap = await incDoc.ref.collection('opinions').get();
                for (const opDoc of opinionsSnap.docs) {
                    const opData = opDoc.data();
                    await newIncRef.collection('opinions').doc(opDoc.id).set({
                        ...opData,
                        matchId: newId // Update matchId reference inside opinion
                    });
                }
            }

            // --- 3. UPDATE EXTERNAL REFERENCES (Disciplinary Actions & Positions) ---
            const pfdkSnap = await firestore.collection('disciplinary_actions').where('matchId', '==', oldId).get();

            const batch = firestore.batch();

            pfdkSnap.docs.forEach(doc => {
                batch.update(doc.ref, { matchId: newId });
            });



            if (!pfdkSnap.empty) {
                await batch.commit();
            }

            // --- 4. DELETE OLD DATA (Recursive) ---
            // Re-fetching or just using refs to delete
            for (const incDoc of incidentsSnap.docs) {
                const opinionsSnap = await incDoc.ref.collection('opinions').get();
                for (const opDoc of opinionsSnap.docs) {
                    await opDoc.ref.delete();
                }
                await incDoc.ref.delete();
            }
            await oldMatchRef.delete();

            return NextResponse.json({ success: true, newId });

        } catch (error: any) {
            console.error('Rename failure:', error);
            return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 });
        }
    });
}

import { NextResponse } from 'next/server';
import { firestore } from '@/firebase/admin';

export async function GET() {
    try {
        const matchId = 'week1-gfk-gs';
        const docRef = firestore.collection('matches').doc(matchId);
        const docSnap = await docRef.get();

        const teamRef = firestore.collection('teams').doc('galatasaray');
        const teamSnap = await teamRef.get();

        return NextResponse.json({
            matchExists: docSnap.exists,
            matchData: docSnap.exists ? docSnap.data() : null,
            teamExists: teamSnap.exists,
            teamData: teamSnap.exists ? teamSnap.data() : null,
            env: {
                hasAdminKey: !!process.env.ADMIN_KEY,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
                projectId: process.env.FIREBASE_PROJECT_ID
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}

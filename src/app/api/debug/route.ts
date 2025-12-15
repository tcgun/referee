import { NextResponse } from 'next/server';
import { firestore } from '@/firebase/admin';

export async function GET() {
    // Disable debug endpoint in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

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
            // Only expose env info in development
            env: process.env.NODE_ENV === 'development' ? {
                hasAdminKey: !!process.env.ADMIN_KEY,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
                projectId: process.env.FIREBASE_PROJECT_ID
            } : undefined
        });
    } catch (error) {
        const isDev = process.env.NODE_ENV === 'development';
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error('Debug endpoint error:', error);
        
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                ...(isDev && { details: errorMessage, stack: errorStack })
            },
            { status: 500 }
        );
    }
}

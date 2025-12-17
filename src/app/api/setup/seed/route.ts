import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { matchSchema, incidentSchema, opinionSchema, teamSchema } from '@/lib/validations';

const TEAMS = [
    { id: 'galatasaray', name: 'Galatasaray', colors: { primary: '#A90432', secondary: '#FDB912', text: '#ffffff' } },
    { id: 'gaziantep-fk', name: 'Gaziantep FK', colors: { primary: '#ED1C24', secondary: '#000000', text: '#ffffff' } }
];

const MATCH = {
    id: 'week1-gfk-gs',
    week: 1,
    season: '2024-2025',
    homeTeamId: 'gaziantep-fk',
    awayTeamId: 'galatasaray',
    homeTeamName: 'Gaziantep FK',
    awayTeamName: 'Galatasaray',
    date: '2024-09-02T19:45:00.000Z',
    stadium: 'Kalyon Stadyumu',
    referee: 'Mehmet Türkmen',
    varReferee: 'Mustafa İlker Coşkun',
    score: '1-0', // Updated to fictional partial score for seeding
    stats: {
        homePossession: 45, awayPossession: 55,
        homeShots: 8, awayShots: 12,
        homeShotsOnTarget: 3, awayShotsOnTarget: 5
    }
};

export async function POST(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Disabled in production' }, { status: 403 });
    }

    return withAdminGuard(request, async (req) => {
        const firestore = getAdminDb();

        try {
            // 1. Teams
            for (const team of TEAMS) {
                await firestore.collection('teams').doc(team.id).set(team);
            }

            // 2. Match
            await firestore.collection('matches').doc(MATCH.id).set(MATCH);

            // 3. Incidents
            const incidentId = 'min-15-penalty';
            const incident = {
                id: incidentId,
                matchId: MATCH.id,
                minute: 15,
                description: 'Ceza sahası içinde elle oynama itirazı',
                refereeDecision: 'Devam',
                finalDecision: 'Penaltı',
                impact: 'penalty',
                videoUrl: ''
            };
            await firestore.collection('matches').doc(MATCH.id).collection('incidents').doc(incidentId).set(incident);

            // 4. Opinions
            const opinion = {
                id: 'deniz-coban-1',
                matchId: MATCH.id,
                incidentId,
                criticName: 'Deniz Çoban',
                opinion: 'Net bir penaltı, kol vücuttan çok açık.',
                judgment: 'incorrect',
                type: 'trio'
            };
            await firestore.collection('matches').doc(MATCH.id).collection('incidents').doc(incidentId).collection('opinions').doc(opinion.id).set(opinion);

            return NextResponse.json({ message: 'Seeding completed' });

        } catch (error) {
            console.error('Seeding error:', error);
            return NextResponse.json({ error: 'Seeding failed' }, { status: 500 });
        }
    });
}

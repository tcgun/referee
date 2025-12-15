import { NextResponse } from 'next/server';
import { firestore } from '@/firebase/admin';
import { verifyAdminKey } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: Request) {
    // Disable seed endpoint in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    try {
        // Rate limiting: 5 requests per minute per IP (seed is expensive)
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(`seed-api:${clientIP}`, 5, 60000);
        if (!rateLimit.success) {
            return NextResponse.json(
                { 
                    error: 'Too many requests', 
                    retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
                },
                { 
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': rateLimit.limit.toString(),
                        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
                        'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
                    }
                }
            );
        }

        const authHeader = request.headers.get('x-admin-key');
        if (!verifyAdminKey(authHeader)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Teams
        const teams = [
            { id: 'galatasaray', name: 'Galatasaray', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Galatasaray_Star_Logo.png', colors: { primary: '#A90432', secondary: '#FDB912', text: '#ffffff' } },
            { id: 'gaziantep-fk', name: 'Gaziantep FK', logo: '', colors: { primary: '#DA291C', secondary: '#000000', text: '#ffffff' } }
        ];

        for (const t of teams) {
            await firestore.collection('teams').doc(t.id).set(t);
        }

        // 2. Match
        const matchId = 'week1-gfk-gs';
        const matchData = {
            id: matchId,
            homeTeamId: 'gaziantep-fk',
            awayTeamId: 'galatasaray',
            homeTeamName: 'Gaziantep FK',
            awayTeamName: 'Galatasaray',
            date: new Date('2024-08-11').toISOString(), // Approx date
            week: 1,
            season: '2024-2025',
            stadium: 'Kalyon Stadyumu',
            referee: 'Atilla Karaoğlan',
            varReferee: 'Erkan Engin',
            score: '0-3' // Placeholder
        };
        await firestore.collection('matches').doc(matchId).set(matchData);

        // 3. Incidents
        const incidents = [
            {
                id: 'inc1', matchId, minute: 23,
                description: 'Kerem Aktürkoğlu golü ofsayt gerekçesiyle iptal edildi.',
                refereeDecision: 'Ofsayt (Yarı Otomatik)', varDecision: 'Onay', finalDecision: 'Gol İptal',
                impact: 'cancelled_goal',
                videoUrl: 'https://www.youtube.com/watch?v=HuW3Z8eTjwE', // Example link
                opinions: [
                    { id: 'op1', criticName: 'Deniz Çoban', opinion: 'Teknoloji kararı, yorum yapılmaz.', judgment: 'correct', type: 'trio' },
                    { id: 'op2', criticName: 'Bülent Yıldırım', opinion: 'Doğru karar.', judgment: 'correct', type: 'trio' }
                ]
            },
            {
                id: 'inc2', matchId, minute: 76,
                description: 'Icardi penaltı bekledi.',
                refereeDecision: 'Devam', varDecision: 'İnceleme önerilmedi', finalDecision: 'Devam',
                impact: 'none',
                videoUrl: 'https://www.youtube.com/watch?v=HuW3Z8eTjwE&t=120s', // Example with timestamp
                opinions: [
                    { id: 'op3', criticName: 'Deniz Çoban', opinion: 'Temas var ama penaltı için yeterli değil.', judgment: 'correct', type: 'trio' },
                    { id: 'op4', criticName: 'Bahattin Duran', opinion: 'Bence devam kararı doğru.', judgment: 'correct', type: 'trio' }
                ]
            }
        ];

        for (const inc of incidents) {
            const { opinions, ...incData } = inc;
            await firestore.collection('matches').doc(matchId).collection('incidents').doc(incData.id).set(incData);

            for (const op of opinions) {
                await firestore.collection('matches').doc(matchId).collection('incidents').doc(incData.id).collection('opinions').doc(op.id).set(op);
            }
        }

        // 4. Sample General Opinions (for independent collectionGroup testing)
        // We add these to a different match or just disjointed for demo
        // Actually, let's add them to the SAME match but with type='general'
        const generalOpinions = [
            { id: 'gen1', criticName: 'Mehmet Demirkol', opinion: 'Hakem maçı kontrol altında tuttu.', judgment: 'correct', type: 'general' },
            { id: 'gen2', criticName: 'Rıdvan Dilmen', opinion: 'Galatasaray hak etti.', judgment: 'correct', type: 'general' }
        ];

        // Add general opinions to a general incident or existing one
        // For simplicity, let's add them to incident 1
        for (const op of generalOpinions) {
            await firestore.collection('matches').doc(matchId).collection('incidents').doc('inc1').collection('opinions').doc(op.id).set(op);
        }

        // 5. Standings
        const standings = [
            { id: 'galatasaray', teamName: 'Galatasaray', played: 1, won: 1, drawn: 0, lost: 0, goalDiff: 3, points: 3 },
            { id: 'fenerbahce', teamName: 'Fenerbahçe', played: 1, won: 1, drawn: 0, lost: 0, goalDiff: 1, points: 3 },
            { id: 'besiktas', teamName: 'Beşiktaş', played: 1, won: 1, drawn: 0, lost: 0, goalDiff: 2, points: 3 },
            { id: 'trabzonspor', teamName: 'Trabzonspor', played: 1, won: 0, drawn: 1, lost: 0, goalDiff: 0, points: 1 },
            { id: 'gaziantep-fk', teamName: 'Gaziantep FK', played: 1, won: 0, drawn: 0, lost: 1, goalDiff: -3, points: 0 },
        ];
        for (const s of standings) await firestore.collection('standings').doc(s.id).set(s);

        // 6. Statements
        const statements = [
            { id: 'st1', title: 'PFDK Kararları Açıklandı', content: 'Profesyonel Futbol Disiplin Kurulu’nun 12.08.2024 tarihli kararları...', entity: 'TFF', date: '2024-08-12', type: 'tff' },
            { id: 'st2', title: 'Kamuoyuna Duyuru', content: 'Dün akşam oynanan maçtaki hakem kararları hakkında...', entity: 'Galatasaray SK', date: '2024-08-12', type: 'club' }
        ];
        for (const s of statements) await firestore.collection('statements').doc(s.id).set(s);

        // 7. Disciplinary Actions
        const disciplinary = [
            { id: 'da1', teamName: 'Gaziantep FK', subject: 'Ertuğrul Ersoy', reason: 'Ciddi Faul', date: '2024-08-12' },
            { id: 'da2', teamName: 'Galatasaray', subject: 'Okan Buruk', reason: 'Sportmenliğe Aykırı Hareket', date: '2024-08-12' }
        ];
        for (const d of disciplinary) await firestore.collection('disciplinary_actions').doc(d.id).set(d);

        return NextResponse.json({ success: true, message: 'All Sample Data Seeded (Match, Standings, Statements, PFDK)!' });
    } catch (error) {
        const isDev = process.env.NODE_ENV === 'development';
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        
        console.error('Seed error:', error);
        
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                ...(isDev && { details: errorMessage })
            },
            { status: 500 }
        );
    }
}

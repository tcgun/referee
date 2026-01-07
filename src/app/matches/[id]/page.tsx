import { Metadata } from 'next';
import { getAdminDb } from '@/firebase/admin';
import MatchClient from './MatchClient';

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { id } = await params;

    try {
        const db = getAdminDb();
        const doc = await db.collection('matches').doc(id).get();

        if (!doc.exists) {
            return { title: 'Maç Bulunamadı' };
        }

        const match = doc.data();
        const score = (match?.homeScore !== undefined && match?.awayScore !== undefined) ? `${match.homeScore}-${match.awayScore}` : (match?.score && match?.score !== 'v' ? match.score : 'vs');
        const title = `${match?.homeTeamName} ${score} ${match?.awayTeamName}`;
        const dateStr = match?.date ? new Date(match.date).toLocaleDateString('tr-TR') : '';

        return {
            title,
            description: `${title} maç analizi, hakem kararları ve VAR incelemeleri. ${dateStr}`,
            openGraph: {
                title,
                description: `${title} detaylı maç analizi.`,
                type: 'article',
            }
        };
    } catch (e) {
        return { title: 'Maç Detayı' };
    }
}

export default function Page() {
    return <MatchClient />;
}

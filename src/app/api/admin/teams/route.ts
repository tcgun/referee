import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { teamSchema } from '@/lib/validations';
import { Team } from '@/types';
import { getCachedTeams, writeLocalTeams } from '@/lib/cache';

export async function POST(request: Request) {
    return withAdminGuard(request, async (req) => {
        const body = await req.json();

        const validationResult = teamSchema.partial().safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Validation failed', details: validationResult.error.format() }, { status: 400 });
        }

        const data = validationResult.data;
        if (!data.id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
            const teams = await getCachedTeams();
            const existingIdx = teams.findIndex(t => t.id === data.id);
            if (existingIdx > -1) {
                teams[existingIdx] = { ...teams[existingIdx], ...data } as Team;
            } else {
                const fullTeam: Team = {
                    id: data.id,
                    name: data.name || '',
                    logo: data.logo || '',
                    colors: data.colors || { primary: '', secondary: '', text: '' }
                };
                teams.push(fullTeam);
            }
            writeLocalTeams(teams);
            return NextResponse.json({ success: true, id: data.id });
        }

        const firestore = getAdminDb();
        await firestore.collection('teams').doc(data.id).set(data, { merge: true });

        return NextResponse.json({ success: true, id: data.id });
    });
}

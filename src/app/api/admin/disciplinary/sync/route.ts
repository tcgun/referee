import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';

export async function POST(request: Request) {
    return withAdminGuard(request, async () => {
        const firestore = getAdminDb();
        try {
            const batch = firestore.batch();
            // 1. Sync Matches (ensure competition: 'league' if missing)
            const matchSnapshot = await firestore.collection('matches').get();
            let matchCount = 0;
            for (const doc of matchSnapshot.docs) {
                const data = doc.data();
                if (!data.competition) {
                    batch.update(doc.ref, { competition: 'league' });
                    matchCount++;
                }
            }

            // 2. Sync Disciplinary Actions
            const snapshot = await firestore.collection('disciplinary_actions').get();
            let count = 0;

            const slugify = (text: string) => {
                const trMap: Record<string, string> = {
                    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
                    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
                };
                let str = text.toString();
                Object.keys(trMap).forEach(key => {
                    str = str.replaceAll(key, trMap[key]);
                });
                return str.toLowerCase().trim()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-');
            };

            for (const doc of snapshot.docs) {
                const data = doc.data();
                const oldId = doc.id;

                // A. Prefix matchId if not already prefixed
                let matchId = data.matchId || '';
                if (matchId && !matchId.startsWith('d-')) {
                    matchId = `d-${matchId}`;
                }

                // B. Generate structured ID: d-{matchId}-{subject}
                const subjectSlug = slugify(data.subject || 'unknown');
                const newId = `d-${matchId.replace('d-', '')}-${subjectSlug}`;

                // C. Backfill competition field if missing (legacy records)
                let competition = data.competition;
                let competitionUpdated = false;
                if (!competition) {
                    competition = 'league';
                    competitionUpdated = true;
                }

                // D. Create new doc if ID changed or match/competition updated
                if (newId !== oldId) {
                    const newRef = firestore.collection('disciplinary_actions').doc(newId);
                    batch.set(newRef, {
                        ...data,
                        id: newId,
                        matchId: matchId,
                        competition: competition
                    });
                    // Delete old doc
                    batch.delete(doc.ref);
                    count++;
                } else if (data.matchId !== matchId || competitionUpdated) {
                    batch.update(doc.ref, {
                        matchId: matchId,
                        competition: competition
                    });
                    count++;
                }
            }

            if (count > 0 || matchCount > 0) {
                await batch.commit();
            }

            return NextResponse.json({ success: true, processed: count, matchesProcessed: matchCount });
        } catch (error) {
            console.error('Disciplinary Sync Error:', error);
            return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
        }
    });
}

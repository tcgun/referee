import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';
import { getCachedMatches } from '@/lib/cache';

const findWeekByDate = (dateStr: string | Date | undefined, matches: Array<{ date?: string | Date; week?: number | null }>): number | null => {
    if (!dateStr) return null;
    if (!matches || matches.length === 0) return null;
    const targetTime = new Date(dateStr).getTime();
    
    let closestMatch = null;
    let minDiff = Infinity;
    
    for (const m of matches) {
        if (!m.date) continue;
        const mTime = new Date(m.date).getTime();
        const diff = Math.abs(targetTime - mTime);
        if (diff < minDiff) {
            minDiff = diff;
            closestMatch = m;
        }
    }
    
    return closestMatch ? closestMatch.week || null : null;
};

export async function POST(request: Request) {
    return withAdminGuard(request, async () => {
        const firestore = getAdminDb();
        try {
            const matches = await getCachedMatches();
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

                // C2. Backfill week field if missing
                let week = data.week;
                let weekUpdated = false;
                if (!week) {
                    if (matchId) {
                        const mDoc = matches.find(m => m.id === matchId.replace('d-', ''));
                        if (mDoc) {
                            week = mDoc.week || null;
                        }
                    }
                    if (!week && data.date) {
                        week = findWeekByDate(data.date, matches);
                    }
                    if (week !== data.week) {
                        weekUpdated = true;
                    }
                }

                // D. Create new doc if ID changed or match/competition/week updated
                if (newId !== oldId) {
                    const newRef = firestore.collection('disciplinary_actions').doc(newId);
                    batch.set(newRef, {
                        ...data,
                        id: newId,
                        matchId: matchId,
                        competition: competition,
                        week: week
                    });
                    // Delete old doc
                    batch.delete(doc.ref);
                    count++;
                } else if (data.matchId !== matchId || competitionUpdated || weekUpdated) {
                    batch.update(doc.ref, {
                        matchId: matchId,
                        competition: competition,
                        week: week
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

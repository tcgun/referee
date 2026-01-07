import { NextResponse } from 'next/server';
import { getAdminDb } from '@/firebase/admin';
import { withAdminGuard } from '@/lib/api-wrapper';

export async function POST(request: Request) {
    return withAdminGuard(request, async () => {
        const firestore = getAdminDb();
        try {
            const snapshot = await firestore.collection('disciplinary_actions').get();
            const batch = firestore.batch();
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

                // 1. Prefix matchId if not already prefixed
                let matchId = data.matchId || '';
                if (matchId && !matchId.startsWith('d-')) {
                    matchId = `d-${matchId}`;
                }

                // 2. Generate structured ID: d-{matchId}-{subject}
                const subjectSlug = slugify(data.subject || 'unknown');
                const newId = `d-${matchId.replace('d-', '')}-${subjectSlug}`;

                // 3. Create new doc if ID changed or matchId updated
                if (newId !== oldId) {
                    const newRef = firestore.collection('disciplinary_actions').doc(newId);
                    batch.set(newRef, {
                        ...data,
                        id: newId,
                        matchId: matchId
                    });
                    // Delete old doc
                    batch.delete(doc.ref);
                    count++;
                } else if (data.matchId !== matchId) {
                    // Just update matchId if ID is already same (unlikely for UUIDs)
                    batch.update(doc.ref, { matchId: matchId });
                    count++;
                }
            }

            if (count > 0) {
                await batch.commit();
            }

            return NextResponse.json({ success: true, processed: count });
        } catch (error) {
            console.error('Disciplinary Sync Error:', error);
            return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
        }
    });
}

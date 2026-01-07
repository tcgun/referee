import { timingSafeEqual } from 'crypto';

/**
 * Timing-safe comparison for admin key authentication
 * Prevents timing attacks by using constant-time comparison
 */
export function verifyAdminKey(providedKey: string | null): boolean {
    const adminKey = process.env.ADMIN_KEY || '';

    if (!providedKey) {
        return false;
    }

    // Convert to buffers for timing-safe comparison
    const adminKeyBuffer = Buffer.from(adminKey, 'utf8');
    const providedKeyBuffer = Buffer.from(providedKey, 'utf8');

    // If lengths don't match, use timing-safe comparison anyway to prevent timing leaks
    if (adminKeyBuffer.length !== providedKeyBuffer.length) {
        // Compare with a dummy buffer of same length to maintain constant time
        const dummyBuffer = Buffer.alloc(adminKeyBuffer.length);
        timingSafeEqual(dummyBuffer, providedKeyBuffer);
        return false;
    }

    return timingSafeEqual(adminKeyBuffer, providedKeyBuffer);
}

const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);

/**
 * Verifies Firebase ID Token and checks valid Admin UID
 */
import { getAdminAuth } from '@/firebase/admin';

export async function verifyAdminToken(token: string | null): Promise<boolean> {
    if (!token) return false;

    // Check if token starts with Bearer
    if (token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    try {
        const decodedToken = await getAdminAuth().verifyIdToken(token);

        // If we have a wishlist of UIDs, check against it
        if (ADMIN_UIDS.length > 0) {
            return ADMIN_UIDS.includes(decodedToken.uid);
        }

        // If no whitelist defined, any valid user is admin
        return true;
    } catch (error) {
        console.error('Token verification failed:', error);
        return false;
    }
}



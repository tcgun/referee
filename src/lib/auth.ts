/**
 * Authentication utility functions.
 * Handles Admin Key verification and Firebase Token verification.
 *
 * @module lib/auth
 */

import { timingSafeEqual } from 'crypto';
import { getAdminAuth } from '@/firebase/admin';

/**
 * Verifies the provided Admin Key against the environment variable using timing-safe comparison.
 * Prevents timing attacks by ensuring constant-time comparison execution.
 *
 * @param {string | null} providedKey - The key provided in the request header.
 * @returns {boolean} True if the key matches, false otherwise.
 */
export function verifyAdminKey(providedKey: string | null): boolean {
    const adminKey = process.env.ADMIN_KEY || '';

    if (!providedKey) {
        return false;
    }

    try {
        const adminKeyBuffer = Buffer.from(adminKey, 'utf8');
        const providedKeyBuffer = Buffer.from(providedKey, 'utf8');

        // If lengths don't match, return false immediately.
        // Note: Strict constant-time comparison for length mismatch is complex in JS buffers.
        // We accept slight timing leak on length check for simplicity vs complexity trade-off here,
        // as the key space is huge.
        if (adminKeyBuffer.length !== providedKeyBuffer.length) {
            return false;
        }

        return timingSafeEqual(adminKeyBuffer, providedKeyBuffer);
    } catch (error) {
        // Handle encoding errors or buffer creation failures
        return false;
    }
}

const ADMIN_UIDS = (process.env.ADMIN_UIDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * Verifies a Firebase ID Token and checks if the user is in the allowed Admin UID list.
 *
 * @param {string | null} token - The Firebase ID Token (Bearer token).
 * @returns {Promise<boolean>} True if the token is valid and authorized.
 */
export async function verifyAdminToken(token: string | null): Promise<boolean> {
    if (!token) return false;

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
        const decodedToken = await getAdminAuth().verifyIdToken(cleanToken);

        // If we have a whitelist of UIDs, check against it
        if (ADMIN_UIDS.length > 0) {
            return ADMIN_UIDS.includes(decodedToken.uid);
        }

        // If no whitelist defined, any valid user is admin (be careful with this configuration)
        return true;
    } catch (error) {
        // Log generic error message, avoid leaking details in logs if not necessary
        console.error('Token verification failed');
        return false;
    }
}

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


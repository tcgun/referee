/**
 * Simple in-memory rate limiter for API endpoints
 * Note: In production with multiple server instances, consider using Redis (Upstash)
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
}

/**
 * Check rate limit for an identifier (IP address or user ID)
 * @param identifier - Unique identifier (e.g., IP address)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result
 */
export function checkRateLimit(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 10000 // 10 seconds default
): RateLimitResult {
    const now = Date.now();
    const key = identifier;
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired entry
        const newEntry: RateLimitEntry = {
            count: 1,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(key, newEntry);
        return {
            success: true,
            limit: maxRequests,
            remaining: maxRequests - 1,
            resetTime: newEntry.resetTime,
        };
    }

    // Increment count
    entry.count++;

    if (entry.count > maxRequests) {
        return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
    // Try various headers that proxies/load balancers use
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback to 'unknown' if we can't determine IP
    return 'unknown';
}



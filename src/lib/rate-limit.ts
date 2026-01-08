/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * @module lib/rate-limit
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (now > entry.resetTime) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
}

/**
 * Checks the rate limit for a specific identifier (IP or User ID).
 * Implements a fixed-window counter algorithm.
 *
 * @param {string} identifier - Unique identifier (e.g., IP address).
 * @param {number} [maxRequests=10] - Maximum allowed requests per window.
 * @param {number} [windowMs=10000] - Duration of the window in milliseconds.
 * @returns {RateLimitResult} Status of the rate limit check.
 */
export function checkRateLimit(
    identifier: string,
    maxRequests: number = 10,
    windowMs: number = 10000
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired entry
        const newEntry: RateLimitEntry = {
            count: 1,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(identifier, newEntry);
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
 * Extracts the client IP address from the request headers.
 *
 * @param {Request} request - The incoming HTTP request.
 * @returns {string} The detected IP address or 'unknown'.
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

    return 'unknown';
}

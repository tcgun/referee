/**
 * Utility functions for common operations.
 *
 * @module lib/utils
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with clsx, ensuring no conflicts.
 *
 * @param {...ClassValue[]} inputs - The class values to merge.
 * @returns {string} The merged class string.
 *
 * @example
 * cn("px-2 py-1", "bg-red-500", condition && "text-white")
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

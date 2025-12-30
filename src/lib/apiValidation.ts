/**
 * API Input Validation Schemas
 * 
 * Shared Zod schemas for validating API route inputs
 * to prevent injection attacks and ensure data integrity.
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const commonSchemas = {
    uuid: z.string().uuid('Invalid UUID format'),
    nonEmptyString: z.string().min(1, 'String cannot be empty').max(10000, 'String too long'),
    url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
    email: z.string().email('Invalid email format').max(255, 'Email too long'),
    pageNumber: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    limit: z.coerce.number().int().min(1).max(1000).default(30),
    dateString: z.string().datetime('Invalid date format'),
    searchQuery: z.string().max(200, 'Search query too long').optional(),
};

/**
 * Admin route validation schemas
 */
export const adminSchemas = {
    eventId: commonSchemas.uuid,
    organizerId: commonSchemas.uuid,
    venueId: commonSchemas.uuid,
    tagId: commonSchemas.uuid,
    queueId: commonSchemas.uuid,
    
    protectionMode: z.enum(['auto_update', 'protected', 'review_required'], {
        errorMap: () => ({ message: 'Invalid protection mode' }),
    }),
    
    queueStatus: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
    
    queueAction: z.enum(['approve', 'reject', 'approve-selective', 'delete-event', 'update-field', 'reset'], {
        errorMap: () => ({ message: 'Invalid queue action' }),
    }),
    
    reportType: z.enum(['ingestion-summary', 'moderation-sla', 'enrichment-coverage']).default('ingestion-summary'),
    
    statusFilter: z.enum(['succeeded', 'failed', 'pending']).optional(),
};

/**
 * Sanitize search query to prevent SQL injection
 */
export function sanitizeSearchQuery(query: string | null | undefined): string | null {
    if (!query) return null;
    
    // Remove potentially dangerous characters
    const sanitized = query
        .trim()
        .slice(0, 200) // Limit length
        .replace(/[%_\\]/g, (match) => `\\${match}`); // Escape ILIKE special chars
    
    // Only allow alphanumeric, spaces, and common URL/path characters
    if (!/^[a-zA-Z0-9\s.\-_:/]+$/.test(sanitized)) {
        return null;
    }
    
    return sanitized.length > 0 ? sanitized : null;
}

/**
 * Validate and sanitize pagination parameters
 */
export function validatePagination(params: {
    page?: string | null;
    pageSize?: string | null;
}): { page: number; pageSize: number; offset: number } {
    const page = commonSchemas.pageNumber.parse(params.page);
    const pageSize = commonSchemas.pageSize.parse(params.pageSize);
    const offset = (page - 1) * pageSize;
    
    return { page, pageSize, offset };
}


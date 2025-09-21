// Common utilities to reduce code duplication
import * as Sentry from '@sentry/nextjs';

// =============================================
// ERROR HANDLING UTILITIES
// =============================================

/**
 * Standardized error message extraction (DRY utility)
 * Eliminates repeated "error instanceof Error ? error.message : '...'" pattern
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error occurred'): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Log and capture error with Sentry (DRY utility)
 */
export function logAndCaptureError(error: unknown, context: string, metadata?: Record<string, unknown>): string {
  const errorMessage = getErrorMessage(error);
  console.error(`[${context}] ${errorMessage}`, error);

  Sentry.captureException(error, {
    tags: { context },
    extra: metadata
  });

  return errorMessage;
}

// =============================================
// SCORE UTILITIES
// =============================================

/**
 * Cap score at maximum value (DRY utility)
 */
export function capScore(score: number, max: number = 1.0): number {
  return Math.min(score, max);
}

/**
 * Normalize score to 0-1 range
 */
export function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return capScore((value - min) / (max - min));
}

/**
 * Combine multiple scores with weights
 */
export function combineWeightedScores(scores: Record<string, number>, weights: Record<string, number>): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, score] of Object.entries(scores)) {
    const weight = weights[key] || 0;
    totalScore += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

// =============================================
// ERROR HANDLING UTILITIES
// =============================================

export interface ErrorContext {
  function: string;
  userId?: string;
  eventId?: string;
  [key: string]: unknown;
}

/**
 * Standardized error handling with Sentry integration
 */
export function handleServiceError(
  error: unknown,
  context: ErrorContext,
  fallbackValue?: unknown
): unknown {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  console.error(`Error in ${context.function}:`, errorMessage);
  
  Sentry.captureException(error, {
    tags: {
      service: 'enhanced-analytics',
      function: context.function
    },
    extra: context
  });

  return fallbackValue;
}

/**
 * Async operation with standardized error handling
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  fallbackValue: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleServiceError(error, context);
    return fallbackValue;
  }
}

// =============================================
// PROFILE UTILITIES
// =============================================

/**
 * Safe profile data extraction (DRY utility)
 */
export function safeExtractProfileData<T>(
  profile: { preferences?: unknown } | null,
  path: string,
  validator: (data: unknown) => data is T,
  fallback: T
): T {
  try {
    if (!profile?.preferences) return fallback;
    
    const preferences = profile.preferences as Record<string, unknown>;
    const data = preferences[path];
    
    return validator(data) ? data : fallback;
  } catch (error) {
    console.warn(`Error extracting profile data at path '${path}':`, error);
    return fallback;
  }
}

// =============================================
// TIME UTILITIES
// =============================================

/**
 * Calculate days between dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is within range
 */
export function isDateInRange(
  date: Date,
  startDate: Date,
  endDate: Date
): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Get time ago string
 */
export function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

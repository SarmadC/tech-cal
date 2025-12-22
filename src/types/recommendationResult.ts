/**
 * Recommendation Result Types
 *
 * Standardized Result pattern for recommendation service operations.
 * Provides type-safe error handling without exceptions.
 *
 * Usage:
 * ```
 * const result = await calculateScore(event, profile);
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

/**
 * Success result with data
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
  metadata?: ResultMetadata;
}

/**
 * Failure result with error information
 */
export interface FailureResult {
  success: false;
  error: RecommendationError;
  metadata?: ResultMetadata;
}

/**
 * Union type for Result pattern
 */
export type Result<T> = SuccessResult<T> | FailureResult;

/**
 * Error codes for recommendation operations
 */
export enum RecommendationErrorCode {
  // Input validation errors (4xx equivalent)
  INVALID_PROFILE = 'INVALID_PROFILE',
  INVALID_EVENT = 'INVALID_EVENT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  
  // Processing errors (5xx equivalent)
  SCORING_FAILED = 'SCORING_FAILED',
  CACHE_ERROR = 'CACHE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Business logic errors
  NO_EVENTS_FOUND = 'NO_EVENTS_FOUND',
  COLD_START = 'COLD_START',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  
  // Unknown/fallback
  UNKNOWN = 'UNKNOWN',
}

/**
 * Recommendation error with structured information
 */
export interface RecommendationError {
  code: RecommendationErrorCode;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Metadata for tracking and debugging
 */
export interface ResultMetadata {
  duration?: number;  // Execution time in ms
  cached?: boolean;   // Whether result was from cache
  algorithm?: string; // Scoring algorithm used
  candidateCount?: number; // Number of candidates considered
  retryCount?: number;
  requestId?: string;
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a success result
 */
export function success<T>(data: T, metadata?: ResultMetadata): SuccessResult<T> {
  return {
    success: true,
    data,
    metadata,
  };
}

/**
 * Create a failure result
 */
export function failure(
  code: RecommendationErrorCode,
  message: string,
  details?: Record<string, unknown>
): FailureResult {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a failure result from an Error object
 */
export function failureFromError(
  error: Error,
  code: RecommendationErrorCode = RecommendationErrorCode.UNKNOWN
): FailureResult {
  return {
    success: false,
    error: {
      code,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for success results
 */
export function isSuccess<T>(result: Result<T>): result is SuccessResult<T> {
  return result.success === true;
}

/**
 * Type guard for failure results
 */
export function isFailure<T>(result: Result<T>): result is FailureResult {
  return result.success === false;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Unwrap a result, throwing if failure
 */
export function unwrap<T>(result: Result<T>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw new Error(`${result.error.code}: ${result.error.message}`);
}

/**
 * Unwrap a result with a default value for failures
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Map over a successful result
 */
export function mapResult<T, U>(
  result: Result<T>,
  fn: (data: T) => U
): Result<U> {
  if (isSuccess(result)) {
    return success(fn(result.data), result.metadata);
  }
  return result;
}

/**
 * Chain multiple result operations
 */
export function flatMapResult<T, U>(
  result: Result<T>,
  fn: (data: T) => Result<U>
): Result<U> {
  if (isSuccess(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Combine multiple results - all must succeed
 */
export function combineResults<T>(results: Result<T>[]): Result<T[]> {
  const data: T[] = [];
  
  for (const result of results) {
    if (isFailure(result)) {
      return result;
    }
    data.push(result.data);
  }
  
  return success(data);
}

/**
 * Try-catch wrapper that returns a Result
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorCode: RecommendationErrorCode = RecommendationErrorCode.UNKNOWN
): Promise<Result<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    if (error instanceof Error) {
      return failureFromError(error, errorCode);
    }
    return failure(errorCode, String(error));
  }
}

/**
 * Synchronous try-catch wrapper
 */
export function trySync<T>(
  fn: () => T,
  errorCode: RecommendationErrorCode = RecommendationErrorCode.UNKNOWN
): Result<T> {
  try {
    const data = fn();
    return success(data);
  } catch (error) {
    if (error instanceof Error) {
      return failureFromError(error, errorCode);
    }
    return failure(errorCode, String(error));
  }
}

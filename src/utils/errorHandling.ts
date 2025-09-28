/**
 * Consolidated error handling utilities following DRY principles
 */

export interface ErrorFallback<T> {
  fallback: T;
  logLevel: 'error' | 'warn' | 'info';
}

/**
 * Handle database errors with consistent logging and optional fallbacks
 */
export function handleDbError<T>(
  error: unknown, 
  operation: string, 
  fallback?: ErrorFallback<T>
): T | never {
  const message = `Database error ${operation}: ${error}`;
  
  if (fallback) {
    console[fallback.logLevel](message);
    return fallback.fallback;
  }
  
  console.error(message);
  throw error;
}

/**
 * Handle method errors with consistent logging and optional fallbacks
 */
export function handleMethodError<T>(
  error: unknown, 
  methodName: string, 
  fallback?: ErrorFallback<T>
): T | never {
  const message = `Method error in ${methodName}: ${error}`;
  
  if (fallback) {
    console[fallback.logLevel](message);
    return fallback.fallback;
  }
  
  console.error(message);
  throw error;
}

/**
 * Safe async operation wrapper with fallback
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn(`Safe async operation failed (${operationName}):`, error);
    return fallback;
  }
}

/**
 * Safe parallel operations with individual fallbacks
 */
export async function safeParallel<T extends readonly unknown[]>(
  operations: { [K in keyof T]: () => Promise<T[K]> },
  fallbacks: T,
  operationName: string
): Promise<T> {
  const results = await Promise.allSettled(operations.map(op => op()));
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`Parallel operation ${index} failed (${operationName}):`, result.reason);
      return fallbacks[index];
    }
  }) as unknown as T;
}

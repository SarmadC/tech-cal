/**
 * Utility functions for consistent error handling across the application
 */

export interface ErrorDetails {
    message: string;
    code?: string;
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Unknown error occurred';
}

/**
 * Extract error details for logging and responses
 */
export function getErrorDetails(error: unknown): ErrorDetails {
    if (error instanceof Error) {
        return {
            message: error.message,
            code: 'name' in error ? String(error.name) : undefined
        };
    }
    if (typeof error === 'string') {
        return { message: error };
    }
    return { message: 'Unknown error occurred' };
}
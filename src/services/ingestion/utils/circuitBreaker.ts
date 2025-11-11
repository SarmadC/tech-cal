/**
 * Circuit Breaker Pattern for Firecrawl API
 * 
 * Prevents cascading failures by temporarily blocking requests
 * when the API is experiencing issues.
 */

interface CircuitBreakerState {
    failures: number;
    lastFailureTime: number | null;
    state: 'closed' | 'open' | 'half-open';
}

const CIRCUIT_BREAKER_CONFIG = {
    FAILURE_THRESHOLD: 5, // Open circuit after 5 consecutive failures
    RESET_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes before attempting to close
    HALF_OPEN_SUCCESS_THRESHOLD: 2, // Need 2 successes to close from half-open
} as const;

class CircuitBreaker {
    private state: CircuitBreakerState = {
        failures: 0,
        lastFailureTime: null,
        state: 'closed',
    };

    /**
     * Check if circuit breaker allows the request
     */
    canProceed(): boolean {
        const now = Date.now();

        // If circuit is closed, allow requests
        if (this.state.state === 'closed') {
            return true;
        }

        // If circuit is open, check if enough time has passed to try half-open
        if (this.state.state === 'open') {
            if (
                this.state.lastFailureTime &&
                now - this.state.lastFailureTime >= CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS
            ) {
                this.state.state = 'half-open';
                this.state.failures = 0;
                return true;
            }
            return false;
        }

        // If circuit is half-open, allow one request to test
        return true;
    }

    /**
     * Record a successful request
     */
    recordSuccess(): void {
        if (this.state.state === 'half-open') {
            this.state.failures++;
            if (this.state.failures >= CIRCUIT_BREAKER_CONFIG.HALF_OPEN_SUCCESS_THRESHOLD) {
                this.state.state = 'closed';
                this.state.failures = 0;
                this.state.lastFailureTime = null;
            }
        } else if (this.state.state === 'closed') {
            // Reset failure count on success
            this.state.failures = 0;
        }
    }

    /**
     * Record a failed request
     */
    recordFailure(): void {
        this.state.failures++;
        this.state.lastFailureTime = Date.now();

        if (this.state.failures >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
            this.state.state = 'open';
        }
    }

    /**
     * Get current state for debugging
     */
    getState(): CircuitBreakerState {
        return { ...this.state };
    }

    /**
     * Reset circuit breaker (for testing/manual intervention)
     */
    reset(): void {
        this.state = {
            failures: 0,
            lastFailureTime: null,
            state: 'closed',
        };
    }
}

// Singleton instance
export const firecrawlCircuitBreaker = new CircuitBreaker();






// Simplified cache invalidation hooks
import { useCallback, useState } from 'react';
import { CacheInvalidationService } from '@/services/cacheInvalidationService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Simple hook for cache invalidation operations
 * Consolidated functionality without over-engineering
 */
export function useCacheInvalidation() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidateUserCache = useCallback(async (): Promise<number> => {
    if (!user) {
      setError('User not authenticated');
      return 0;
    }

    setIsLoading(true);
    setError(null);

    try {
      return await CacheInvalidationService.invalidateUserCache(user.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Cache invalidation failed';
      setError(errorMessage);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const invalidateCache = useCallback(async (
    type: 'profile' | 'event' | 'all',
    id?: string
  ): Promise<{ success: boolean; invalidatedCount?: number }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/career-impact/cache', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Cache invalidation failed');
        return { success: false };
      }

      return {
        success: true,
        invalidatedCount: result.data?.invalidatedCount
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      return { success: false };

    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    invalidateUserCache,
    invalidateCache,
    isLoading,
    error
  };
}
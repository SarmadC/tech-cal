'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCacheInvalidation } from '@/hooks/useCacheInvalidation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Debug component to test cache invalidation functionality
 * Only include in development builds
 */
export function CacheInvalidationTest() {
  const { user } = useAuth();
  const { invalidateUserCache, invalidateCache, isLoading, error } = useCacheInvalidation();

  const [testResults, setTestResults] = useState<Array<{
    test: string;
    result: string;
    timestamp: string;
    success: boolean;
  }>>([]);

  const addTestResult = (test: string, result: string, success: boolean) => {
    setTestResults(prev => [{
      test,
      result,
      timestamp: new Date().toLocaleTimeString(),
      success
    }, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testProfileUpdate = async () => {
    if (!user) {
      addTestResult('Profile Update Test', 'No user logged in', false);
      return;
    }

    try {
      // Simulate profile update via API
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: `Test User ${Date.now()}`,
          currentRole: 'Senior Developer'
        })
      });

      const result = await response.json();
      addTestResult(
        'Profile Update Test',
        result.success ? 'Profile updated, cache auto-invalidated' : result.error,
        result.success
      );
    } catch (err) {
      addTestResult('Profile Update Test', `Error: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  };


  const getCacheStats = async () => {
    try {
      const response = await fetch('/api/career-impact/cache');
      const result = await response.json();

      if (result.success) {
        const stats = result.data.stats;
        addTestResult(
          'Cache Stats',
          `Keys: ${stats.totalKeys}, Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`,
          true
        );
      } else {
        addTestResult('Cache Stats', result.error, false);
      }
    } catch (err) {
      addTestResult('Cache Stats', `Error: ${err instanceof Error ? err.message : String(err)}`, false);
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Cache Invalidation Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please log in to test cache invalidation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Cache Invalidation Test</CardTitle>
        <p className="text-sm text-gray-600">
          Test cache invalidation on profile changes. Check browser console for detailed logs.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={testProfileUpdate}
            disabled={isLoading}
            variant="outline"
          >
            Test Profile Update
          </Button>

          <Button
            onClick={getCacheStats}
            variant="outline"
          >
            Get Cache Stats
          </Button>

          <Button
            onClick={async () => {
              const count = await invalidateUserCache();
              addTestResult('User Cache Invalidation', `${count} entries invalidated`, count > 0);
            }}
            disabled={isLoading}
            variant="secondary"
          >
            Invalidate User Cache
          </Button>

          <Button
            onClick={async () => {
              const result = await invalidateCache('all');
              addTestResult(
                'Clear All Cache',
                result.success ? `${result.invalidatedCount || 0} entries cleared` : 'Failed',
                result.success
              );
            }}
            disabled={isLoading}
            variant="destructive"
          >
            Clear All Cache
          </Button>
        </div>

        {/* Status Display */}
        {isLoading && (
          <div className="text-center text-sm text-blue-600">
            Cache operation in progress...
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-center text-sm text-red-600">
            Error: {error}
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Test Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-xs border-b pb-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{result.test}</span>
                    <span className="text-gray-500">{result.timestamp}</span>
                  </div>
                  <div className={`mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.result}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
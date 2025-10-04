'use client';

import { useState, useRef, useEffect } from 'react';

interface ScoreBreakdownButtonProps {
  eventId: string;
}

interface BreakdownData {
  error?: string;
  overall?: number;
  confidence?: number;
  components?: Record<string, number>;
  scoringTriggers?: string[];
  topReasons?: string[];
  algorithmVersion?: string;
  computedAt?: string;
  eventType?: {
    raw: string | null;
    normalized: string | null;
  };
}

export function ScoreBreakdownButton({ eventId }: ScoreBreakdownButtonProps) {
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Only show in dev or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN !== 'true') {
    return null;
  }

  const fetchBreakdown = async (force = false) => {
    // Debounce: prevent spam (500ms)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 500) return;
    lastFetchRef.current = now;

    // Abort previous request (dedupe)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      const res = await fetch(`/api/events/${eventId}/score-breakdown`, {
        signal: abortControllerRef.current.signal
      });
      const data = await res.json();
      const result = data.success ? { ...data.data, computedAt: new Date().toISOString() } : { error: data.error };

      if (isMountedRef.current) {
        setBreakdown(result);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      if (isMountedRef.current) {
        setBreakdown({ error: 'Failed to fetch breakdown' });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="mt-2 border-t border-border-subtle pt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => fetchBreakdown()}
          disabled={loading}
          className="text-xs text-text-tertiary hover:text-text-secondary underline"
        >
          {loading ? 'Loading...' : '[Dev] Score Breakdown'}
        </button>
        {breakdown && !breakdown.error && (
          <button
            onClick={() => fetchBreakdown(true)}
            disabled={loading}
            className="text-xs text-text-tertiary hover:text-text-secondary underline"
          >
            Recompute
          </button>
        )}
      </div>
      {breakdown && (
        <div className="mt-2 rounded bg-background-elevated p-2 text-xs">
          {breakdown.error ? (
            <p className="text-red-500">{breakdown.error}</p>
          ) : (
            <>
              <p><strong>Overall:</strong> {breakdown.overall} (±{Math.round((breakdown.confidence ?? 0) * 100)}%)</p>
              <p><strong>Algorithm:</strong> {breakdown.algorithmVersion}</p>
              {breakdown.computedAt && (
                <p className="text-text-tertiary">
                  Computed: {new Date(breakdown.computedAt).toLocaleTimeString()}
                </p>
              )}
              <p className="mt-1"><strong>Components:</strong></p>
              <ul className="ml-4 space-y-0.5">
                {breakdown.components && Object.entries(breakdown.components).map(([key, value]) => (
                  <li key={key}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}: {value}
                  </li>
                ))}
              </ul>
              {breakdown.scoringTriggers && breakdown.scoringTriggers.length > 0 && (
                <>
                  <p className="mt-1"><strong>Triggers ({breakdown.scoringTriggers.length}):</strong></p>
                  <p className="ml-4">{breakdown.scoringTriggers.join(', ')}</p>
                </>
              )}
              {breakdown.topReasons && breakdown.topReasons.length > 0 && (
                <>
                  <p className="mt-1"><strong>Top Reasons:</strong></p>
                  {breakdown.topReasons.map((reason, i) => (
                    <p key={i} className="ml-4">• {reason}</p>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

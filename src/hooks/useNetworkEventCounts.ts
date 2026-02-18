'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts';

export interface NetworkEventCount {
  eventId: string;
  networkCount: number;
  sampleAvatars: string[];
}

interface NetworkCountsResponse {
  success?: boolean;
  data?: {
    counts?: NetworkEventCount[];
  };
}

interface UseNetworkEventCountsResult {
  countsByEventId: Record<string, NetworkEventCount>;
  isLoading: boolean;
}

const MAX_EVENT_IDS_PER_REQUEST = 100;

function toChunks(values: string[], size: number): string[][] {
  if (values.length <= size) {
    return [values];
  }

  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export function useNetworkEventCounts(eventIds: string[]): UseNetworkEventCountsResult {
  const { user, loading } = useAuth();
  const [countsByEventId, setCountsByEventId] = useState<Record<string, NetworkEventCount>>({});
  const [isLoading, setIsLoading] = useState(false);

  const normalizedEventIds = useMemo(() => (
    Array.from(new Set(eventIds.filter(Boolean))).sort()
  ), [eventIds]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user || normalizedEventIds.length === 0) {
      setCountsByEventId({});
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    const loadNetworkCounts = async () => {
      setIsLoading(true);

      try {
        const chunks = toChunks(normalizedEventIds, MAX_EVENT_IDS_PER_REQUEST);
        const responses = await Promise.all(
          chunks.map(async (chunk) => {
            const searchParams = new URLSearchParams({
              eventIds: chunk.join(','),
            });

            const response = await fetch(`/api/events/network-counts?${searchParams.toString()}`, {
              credentials: 'include',
              signal: abortController.signal,
            });

            if (response.status === 401) {
              return [];
            }

            if (!response.ok) {
              throw new Error('Failed to fetch network event counts.');
            }

            const payload = await response.json() as NetworkCountsResponse;
            if (!payload.success || !payload.data?.counts) {
              return [];
            }

            return payload.data.counts;
          })
        );

        if (!isMounted) {
          return;
        }

        const nextMap: Record<string, NetworkEventCount> = {};
        for (const responseCounts of responses) {
          for (const networkCount of responseCounts) {
            nextMap[networkCount.eventId] = networkCount;
          }
        }

        setCountsByEventId(nextMap);
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') {
          return;
        }

        if (isMounted) {
          setCountsByEventId({});
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadNetworkCounts();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user, loading, normalizedEventIds]);

  return {
    countsByEventId,
    isLoading,
  };
}


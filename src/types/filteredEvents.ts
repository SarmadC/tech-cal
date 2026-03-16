import type { Event } from '@/types/events';
import type { FilterCounts } from '@/utils/filterCountUtils';

export interface FilteredEventsData {
  events: Event[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    applied: Record<string, unknown>;
    available: {
      categories: Array<{ id: string; name: string; count: number }>;
      difficulties: Array<{ value: string; count: number }>;
      formats: Array<{ value: string; count: number }>;
      locations?: Array<{ value: string; count: number }>;
    };
  };
  stats: {
    processingTimeMs: number;
    filteredCount: number;
    totalCount: number;
  };
  isColdStart?: boolean;
  counts?: FilterCounts;
}

export interface FilteredEventsResponse {
  success: boolean;
  data?: FilteredEventsData;
  error?: string;
}

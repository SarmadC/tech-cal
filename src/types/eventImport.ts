// src/types/eventImport.ts

/**
 * Event Import Types
 * Shared types for the event import system - follows existing type patterns
 */

// ============================================
// RAW EVENT TYPES (From External APIs)
// ============================================

/**
 * Raw event data from external APIs before transformation
 * This is the common format all adapters convert to
 */
export interface RawEvent {
  // Core identifiers
  externalId: string;
  source: EventSource;
  sourceUrl: string;

  // Event information
  title: string;
  description: string;
  organizer: {
    name: string;
    verified?: boolean;
    website?: string;
    logo?: string;
  };

  // Timing (ISO strings from APIs)
  startTime: string;
  endTime?: string;
  timezone?: string;

  // Location
  location?: {
    name?: string;
    address?: string;
    city?: string;
    country?: string;
    isOnline?: boolean;
  };

  // URLs
  registrationUrl?: string;
  livestreamUrl?: string;

  // Event metadata
  category?: string;
  tags?: string[];
  capacity?: number;
  attendeeCount?: number;
  priceRange?: string;
  difficulty?: string;
  language?: string;

  // Raw API response (for debugging)
  rawData?: unknown;
}

// ============================================
// IMPORT CONFIGURATION
// ============================================

export type EventSource = 'eventbrite' | 'meetup' | 'github';

export interface SourceConfig {
  enabled: boolean;
  batchSize: number;
  rateLimit: {
    requestsPerHour: number;
    requestsPerMinute?: number;
  };
  filters: {
    categories?: string[];
    keywords?: string[];
    locations?: string[];
    dateRange?: {
      startDays: number; // Days from now
      endDays: number;   // Days from now
    };
  };
}

export interface ImportConfig {
  sources: Record<EventSource, SourceConfig>;
  qualityThresholds: {
    minQualityScore: number;
    minDescriptionLength: number;
    requireVenue: boolean;
    requireRegistration: boolean;
  };
  processing: {
    batchSize: number;
    timeoutMs: number;
    maxRetries: number;
  };
}

// ============================================
// QUALITY ASSESSMENT
// ============================================

export interface QualityMetrics {
  hasDescription: boolean;
  hasValidDates: boolean;
  hasVenue: boolean;
  hasOrganizer: boolean;
  isNotSpam: boolean;
  isTechRelevant: boolean;
  organizerVerified: boolean;
  hasRegistration: boolean;
}

export interface QualityAssessment {
  score: number; // 0-100
  metrics: QualityMetrics;
  reasons: string[];
  shouldImport: boolean;
}

// ============================================
// IMPORT RESULTS
// ============================================

export interface ImportStats {
  source: EventSource;
  fetched: number;
  qualified: number;
  imported: number;
  duplicates: number;
  errors: number;
  processingTimeMs: number;
}

export interface ImportResult {
  success: boolean;
  stats: ImportStats;
  errors: Array<{
    eventId: string;
    error: string;
    rawEvent?: RawEvent;
  }>;
  importedEventIds: string[];
}

export interface BatchImportResult {
  success: boolean;
  results: ImportResult[];
  totalStats: {
    totalFetched: number;
    totalImported: number;
    totalErrors: number;
    totalDuplicates: number;
    processingTimeMs: number;
  };
  errors: string[];
}

// ============================================
// SOURCE ADAPTER INTERFACE
// ============================================

export interface SourceAdapter {
  readonly source: EventSource;
  
  /**
   * Fetch raw events from external API
   */
  fetchEvents(config: SourceConfig): Promise<RawEvent[]>;
  
  /**
   * Get rate limit information
   */
  getRateLimit(): {
    remaining: number;
    resetTime: Date;
  };
  
  /**
   * Test API connection and credentials
   */
  testConnection(): Promise<boolean>;
}

// ============================================
// ERROR TYPES
// ============================================

export class EventImportError extends Error {
  constructor(
    message: string,
    public source: EventSource,
    public eventId?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'EventImportError';
  }
}

export class RateLimitError extends EventImportError {
  constructor(
    source: EventSource,
    public resetTime: Date,
    public remaining: number = 0
  ) {
    super(`Rate limit exceeded for ${source}. Resets at ${resetTime.toISOString()}`, source);
    this.name = 'RateLimitError';
  }
}

export class QualityFilterError extends EventImportError {
  constructor(
    source: EventSource,
    eventId: string,
    public qualityScore: number,
    public reasons: string[]
  ) {
    super(`Event ${eventId} failed quality filter (score: ${qualityScore})`, source, eventId);
    this.name = 'QualityFilterError';
  }
}

// ============================================
// UTILITY TYPES
// ============================================


/**
 * Import job configuration for scheduling
 */
export interface ImportJob {
  id: string;
  sources: EventSource[];
  config: ImportConfig;
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: BatchImportResult;
}

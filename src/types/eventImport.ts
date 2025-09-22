// src/types/eventImport.ts

/**
 * Simplified Event Import Types
 * For manual event creation and RSS feed imports
 */

// ============================================
// RSS FEED TYPES
// ============================================

/**
 * RSS feed event data structure
 */
export interface RSSEvent {
  // Core identifiers
  id: string;
  source: 'rss' | 'manual';
  sourceUrl: string;

  // Event information
  title: string;
  description: string;
  link?: string;

  // Timing (from RSS pubDate or manual input)
  startTime: string;
  endTime?: string;
  timezone?: string;

  // Location (if available in RSS)
  location?: string;
  isOnline?: boolean;

  // Metadata
  category?: string;
  tags?: string[];
  language?: string;

  // RSS-specific
  pubDate?: string;
  author?: string;
  feedUrl?: string;
}

// ============================================
// MANUAL IMPORT TYPES
// ============================================

/**
 * Manual event creation data
 */
export interface ManualEventData {
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  location?: string;
  isOnline?: boolean;
  registrationUrl?: string;
  livestreamUrl?: string;
  organizerName?: string;
  category?: string;
  tags?: string[];
  capacity?: number;
  difficulty?: string;
  language?: string;
  timezone?: string;
}

// ============================================
// IMPORT RESULTS
// ============================================

export interface ImportStats {
  source: 'rss' | 'manual';
  fetched: number;
  imported: number;
  duplicates: number;
  errors: number;
  processingTimeMs: number;
}

export interface ImportResult {
  success: boolean;
  stats: ImportStats;
  errors: Array<{
    item: string;
    error: string;
  }>;
  importedEventIds: string[];
}

// ============================================
// RSS FEED CONFIGURATION
// ============================================

export interface RSSFeedConfig {
  url: string;
  name: string;
  enabled: boolean;
  categories?: string[];
  keywords?: string[];
  lastFetched?: string;
  errorCount?: number;
}

export interface RSSImportConfig {
  feeds: RSSFeedConfig[];
  processing: {
    batchSize: number;
    timeoutMs: number;
    maxRetries: number;
  };
  filters: {
    minDescriptionLength: number;
    techKeywords: string[];
    blockedKeywords: string[];
  };
}

// ============================================
// ERROR TYPES
// ============================================

export class RSSImportError extends Error {
  constructor(
    message: string,
    public feedUrl: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'RSSImportError';
  }
}

export class ManualImportError extends Error {
  constructor(
    message: string,
    public eventData?: Partial<ManualEventData>,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ManualImportError';
  }
}
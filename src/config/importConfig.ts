// src/config/importConfig.ts

import type { ImportConfig } from '@/types/eventImport';

/**
 * Default Import Configuration
 * Centralized configuration for event imports - easy to modify
 */

export const defaultImportConfig: ImportConfig = {
  sources: {
    eventbrite: {
      enabled: Boolean(process.env.EVENTBRITE_API_TOKEN),
      batchSize: 50,
      rateLimit: {
        requestsPerHour: 1000,
        requestsPerMinute: 50
      },
      filters: {
        categories: ['102', '101', '113'], // Science & Technology, Business, Careers
        keywords: [
          'software', 'developer', 'tech', 'programming', 'coding',
          'javascript', 'python', 'react', 'node.js', 'ai', 'machine learning',
          'devops', 'cloud', 'aws', 'docker', 'kubernetes'
        ],
        dateRange: {
          startDays: 0,   // From today
          endDays: 90     // Next 3 months
        }
      }
    },
    
    meetup: {
      enabled: Boolean(process.env.MEETUP_API_KEY),
      batchSize: 30,
      rateLimit: {
        requestsPerHour: 200,
        requestsPerMinute: 10
      },
      filters: {
        keywords: [
          'javascript', 'python', 'react', 'vue', 'angular', 'node.js',
          'artificial intelligence', 'machine learning', 'data science',
          'blockchain', 'cybersecurity', 'devops', 'cloud computing',
          'mobile development', 'web development', 'software engineering'
        ],
        locations: ['San Francisco', 'New York', 'London', 'Berlin', 'Toronto'],
        dateRange: {
          startDays: 0,
          endDays: 60
        }
      }
    },
    
    github: {
      enabled: false, // Experimental - enable manually
      batchSize: 20,
      rateLimit: {
        requestsPerHour: 5000,
        requestsPerMinute: 60
      },
      filters: {
        keywords: ['conference', 'event', 'meetup', 'workshop', 'hackathon'],
        dateRange: {
          startDays: 0,
          endDays: 180
        }
      }
    }
  },
  
  qualityThresholds: {
    minQualityScore: 50,        // Raised from 40 to be more selective
    minDescriptionLength: 150,  // Raised from 100 for better quality
    requireVenue: false,        // Online events are OK
    requireRegistration: false, // Free events without registration are OK
    minTechRelevanceScore: 2,   // Must have at least 2 tech signals
    blockNonTechCategories: true // Block obvious non-tech categories
  },
  
  processing: {
    batchSize: 100,    // Events per batch when storing
    timeoutMs: 30000,  // 30 second timeout per source
    maxRetries: 2      // Retry failed requests twice
  }
};

/**
 * Get import configuration with environment overrides
 */
export function getImportConfig(): ImportConfig {
  const config = { ...defaultImportConfig };
  
  // Environment-specific overrides
  if (process.env.NODE_ENV === 'development') {
    // Smaller batches for development
    config.sources.eventbrite.batchSize = 10;
    config.sources.meetup.batchSize = 10;
    config.sources.github.batchSize = 5;
  }
  
  if (process.env.NODE_ENV === 'production') {
    // Higher quality bar for production
    config.qualityThresholds.minQualityScore = 50;
    config.qualityThresholds.minDescriptionLength = 150;
  }
  
  // Allow environment variable overrides
  if (process.env.IMPORT_MIN_QUALITY_SCORE) {
    config.qualityThresholds.minQualityScore = parseInt(process.env.IMPORT_MIN_QUALITY_SCORE);
  }
  
  if (process.env.IMPORT_BATCH_SIZE) {
    const batchSize = parseInt(process.env.IMPORT_BATCH_SIZE);
    config.sources.eventbrite.batchSize = batchSize;
    config.sources.meetup.batchSize = Math.floor(batchSize * 0.6); // Meetup has lower rate limits
    config.sources.github.batchSize = Math.floor(batchSize * 0.4);
  }
  
  return config;
}

/**
 * Configuration for different environments
 */
export const environmentConfigs = {
  development: {
    ...defaultImportConfig,
    sources: {
      ...defaultImportConfig.sources,
      eventbrite: { ...defaultImportConfig.sources.eventbrite, batchSize: 5 },
      meetup: { ...defaultImportConfig.sources.meetup, batchSize: 3 },
      github: { ...defaultImportConfig.sources.github, batchSize: 2, enabled: true }
    },
    qualityThresholds: {
      ...defaultImportConfig.qualityThresholds,
      minQualityScore: 30 // Lower bar for testing
    }
  },
  
  staging: {
    ...defaultImportConfig,
    qualityThresholds: {
      ...defaultImportConfig.qualityThresholds,
      minQualityScore: 45
    }
  },
  
  production: {
    ...defaultImportConfig,
    qualityThresholds: {
      ...defaultImportConfig.qualityThresholds,
      minQualityScore: 55,
      minDescriptionLength: 150
    }
  }
} as const;

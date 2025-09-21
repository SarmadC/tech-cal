// src/utils/eventQualityFilter.ts

import type { RawEvent, QualityAssessment, QualityMetrics, ImportConfig } from '@/types/eventImport';

/**
 * Shared quality filtering system for all event sources
 * Follows DRY principle - one quality filter for ALL sources
 */

// ============================================
// QUALITY KEYWORDS (Centralized)
// ============================================

const TECH_KEYWORDS = [
  // Programming languages
  'javascript', 'python', 'java', 'typescript', 'go', 'rust', 'swift', 'kotlin',
  'php', 'ruby', 'c++', 'c#', 'scala', 'clojure', 'haskell',
  
  // Frameworks & Libraries
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'gatsby',
  'node.js', 'express', 'fastapi', 'django', 'flask', 'spring', 'rails',
  
  // Technologies
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'ansible',
  'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
  'graphql', 'rest api', 'microservices', 'serverless',
  
  // Concepts
  'software development', 'web development', 'mobile development',
  'devops', 'ci/cd', 'machine learning', 'artificial intelligence',
  'data science', 'blockchain', 'cybersecurity', 'cloud computing',
  'agile', 'scrum', 'testing', 'automation',
  
  // Roles
  'developer', 'engineer', 'programmer', 'architect', 'cto', 'tech lead',
  'frontend', 'backend', 'fullstack', 'data engineer', 'ml engineer',
  
  // Event types
  'conference', 'meetup', 'workshop', 'hackathon', 'bootcamp', 'webinar',
  'tech talk', 'coding', 'programming', 'startup', 'product management'
];

const SPAM_KEYWORDS = [
  'get rich quick', 'make money fast', 'pyramid scheme', 'mlm',
  'cryptocurrency investment', 'forex trading', 'binary options',
  'work from home', 'passive income', 'affiliate marketing',
  'drop shipping', 'crypto mining', 'ponzi', 'guaranteed returns',
  'no experience required', 'easy money', 'financial freedom'
];

const LOW_QUALITY_INDICATORS = [
  'free consultation', 'sales pitch', 'product demo only',
  'lead generation', 'marketing webinar', 'promotional event',
  'recruitment event', 'job fair only'
];

// ============================================
// QUALITY ASSESSMENT FUNCTIONS
// ============================================

/**
 * Assess event quality across all metrics
 */
export function assessEventQuality(
  event: RawEvent,
  config: ImportConfig
): QualityAssessment {
  const metrics = calculateQualityMetrics(event);
  const score = calculateQualityScore(metrics, event);
  const reasons = generateQualityReasons(metrics, event);
  const shouldImport = score >= config.qualityThresholds.minQualityScore;

  return {
    score,
    metrics,
    reasons,
    shouldImport
  };
}

/**
 * Calculate individual quality metrics
 */
function calculateQualityMetrics(event: RawEvent): QualityMetrics {
  return {
    hasDescription: hasValidDescription(event),
    hasValidDates: hasValidDates(event),
    hasVenue: hasVenue(event),
    hasOrganizer: hasOrganizer(event),
    isNotSpam: !isSpamEvent(event),
    isTechRelevant: isTechRelevant(event),
    organizerVerified: event.organizer.verified === true,
    hasRegistration: Boolean(event.registrationUrl)
  };
}

/**
 * Calculate overall quality score (0-100)
 */
function calculateQualityScore(metrics: QualityMetrics, event: RawEvent): number {
  let score = 0;
  
  // Core requirements (60 points max)
  if (metrics.hasDescription) score += 15;
  if (metrics.hasValidDates) score += 15;
  if (metrics.hasOrganizer) score += 15;
  if (metrics.isNotSpam) score += 15;
  
  // Tech relevance (20 points max)
  if (metrics.isTechRelevant) score += 20;
  
  // Quality indicators (20 points max)
  if (metrics.hasVenue) score += 5;
  if (metrics.organizerVerified) score += 10;
  if (metrics.hasRegistration) score += 5;
  
  // Bonus points for high-quality indicators
  if (event.description.length > 500) score += 5;
  if (event.attendeeCount && event.attendeeCount > 50) score += 5;
  if (event.organizer.website) score += 3;
  
  // Penalty for low-quality indicators
  if (event.description.length < 100) score -= 10;
  if (isLowQualityEvent(event)) score -= 20;
  
  return Math.max(0, Math.min(100, score));
}

// ============================================
// INDIVIDUAL QUALITY CHECKS
// ============================================

function hasValidDescription(event: RawEvent): boolean {
  if (!event.description) return false;
  
  const description = event.description.trim();
  return description.length >= 50 && 
         description.length <= 10000 &&
         !isGibberish(description);
}

function hasValidDates(event: RawEvent): boolean {
  if (!event.startTime) return false;
  
  const startDate = new Date(event.startTime);
  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  // Event should be in the future but not more than 1 year away
  return startDate > now && startDate < oneYearFromNow;
}

function hasVenue(event: RawEvent): boolean {
  return Boolean(
    event.location?.name || 
    event.location?.address || 
    event.location?.isOnline
  );
}

function hasOrganizer(event: RawEvent): boolean {
  return Boolean(event.organizer?.name && event.organizer.name.trim().length > 0);
}

function isSpamEvent(event: RawEvent): boolean {
  const content = `${event.title} ${event.description}`.toLowerCase();
  
  return SPAM_KEYWORDS.some(keyword => content.includes(keyword)) ||
         hasExcessiveCapitalization(event.title) ||
         hasExcessiveEmojis(content) ||
         hasSpammyUrl(event.sourceUrl);
}

function isTechRelevant(event: RawEvent): boolean {
  const content = `${event.title} ${event.description} ${event.category || ''}`.toLowerCase();
  
  // Must contain at least 1 tech keyword, but give bonus for multiple
  const techKeywordCount = TECH_KEYWORDS.filter(keyword => 
    content.includes(keyword)
  ).length;
  
  // Also check organizer name for tech companies
  const organizerName = event.organizer.name.toLowerCase();
  const isTechOrganizer = TECH_KEYWORDS.some(keyword => organizerName.includes(keyword)) ||
    ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix', 'uber', 'airbnb'].some(company => 
      organizerName.includes(company)
    );
  
  return techKeywordCount >= 1 || isTechOrganizer;
}

function isLowQualityEvent(event: RawEvent): boolean {
  const content = `${event.title} ${event.description}`.toLowerCase();
  
  return LOW_QUALITY_INDICATORS.some(indicator => content.includes(indicator));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isGibberish(text: string): boolean {
  // Check for excessive repetition or random characters
  const words = text.split(/\s+/);
  const uniqueWords = new Set(words);
  
  // If less than 30% unique words, likely gibberish
  return uniqueWords.size / words.length < 0.3;
}

function hasExcessiveCapitalization(title: string): boolean {
  const uppercaseChars = title.match(/[A-Z]/g) || [];
  const totalChars = title.replace(/\s/g, '').length;
  
  // More than 60% uppercase is spammy
  return uppercaseChars.length / totalChars > 0.6;
}

function hasExcessiveEmojis(content: string): boolean {
  const emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
  
  const emojis = content.match(emojiRegex) || [];
  const words = content.split(/\s+/).length;
  
  // More than 1 emoji per 10 words is excessive
  return emojis.length > words / 10;
}

function hasSpammyUrl(url: string): boolean {
  const spammyDomains = ['bit.ly', 'tinyurl.com', 'short.link', 't.co'];
  return spammyDomains.some(domain => url.includes(domain));
}

function generateQualityReasons(metrics: QualityMetrics, event: RawEvent): string[] {
  const qualityChecks = [
    { check: metrics.hasDescription, reason: 'Missing or inadequate description' },
    { check: metrics.hasValidDates, reason: 'Invalid or missing dates' },
    { check: metrics.hasVenue, reason: 'Missing venue information' },
    { check: metrics.hasOrganizer, reason: 'Missing organizer information' },
    { check: metrics.isNotSpam, reason: 'Contains spam indicators' },
    { check: metrics.isTechRelevant, reason: 'Not tech-relevant' },
    { check: metrics.organizerVerified, reason: 'Organizer not verified' },
    { check: metrics.hasRegistration, reason: 'No registration URL' },
    { check: event.description.length >= 100, reason: 'Description too short' },
    { check: !isLowQualityEvent(event), reason: 'Contains low-quality indicators' }
  ];

  return qualityChecks
    .filter(({ check }) => !check)
    .map(({ reason }) => reason);
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Filter multiple events for quality (batch processing)
 */
export function filterEventsByQuality(
  events: RawEvent[],
  config: ImportConfig
): Array<{ event: RawEvent; assessment: QualityAssessment }> {
  return events
    .map(event => ({
      event,
      assessment: assessEventQuality(event, config)
    }))
    .filter(({ assessment }) => assessment.shouldImport);
}

/**
 * Get quality statistics for a batch of events
 */
export function getQualityStats(events: RawEvent[], config: ImportConfig) {
  const assessments = events.map(event => assessEventQuality(event, config));
  
  return {
    total: events.length,
    passed: assessments.filter(a => a.shouldImport).length,
    failed: assessments.filter(a => !a.shouldImport).length,
    averageScore: assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length,
    commonFailureReasons: getCommonFailureReasons(assessments.filter(a => !a.shouldImport))
  };
}

function getCommonFailureReasons(failedAssessments: QualityAssessment[]): Record<string, number> {
  const reasonCounts: Record<string, number> = {};
  
  failedAssessments.forEach(assessment => {
    assessment.reasons.forEach(reason => {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
  });
  
  return reasonCounts;
}

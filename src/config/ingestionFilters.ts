/**
 * Ingestion Filter Configuration
 * 
 * Global filter patterns for excluding irrelevant events from ingestion.
 * Supports keywords, regex patterns, and per-source overrides.
 */

export interface FilterPattern {
    /** Pattern to match (keyword or regex string) */
    pattern: string;
    /** Whether pattern is a regex (true) or exact keyword (false) */
    isRegex: boolean;
    /** Category for analytics/tracking */
    category: string;
    /** Human-readable reason for filtering */
    reason: string;
}

export interface FilterCategory {
    /** Category name */
    name: string;
    /** Patterns in this category */
    patterns: FilterPattern[];
    /** Whether this category is enabled */
    enabled: boolean;
}

/**
 * Global filter patterns organized by category
 */
export const FILTER_CATEGORIES: Record<string, FilterCategory> = {
    financial: {
        name: 'Financial Events',
        enabled: true,
        patterns: [
            {
                pattern: '^earnings:',
                isRegex: true,
                category: 'financial',
                reason: 'Earnings announcement - not a tech event',
            },
            {
                pattern: 'earnings call',
                isRegex: false,
                category: 'financial',
                reason: 'Earnings call - not a tech event',
            },
            {
                pattern: 'earnings report',
                isRegex: false,
                category: 'financial',
                reason: 'Earnings report - not a tech event',
            },
            {
                pattern: 'quarterly earnings',
                isRegex: false,
                category: 'financial',
                reason: 'Quarterly earnings - not a tech event',
            },
            {
                pattern: 'Q[1-4] earnings',
                isRegex: true,
                category: 'financial',
                reason: 'Quarterly earnings - not a tech event',
            },
            {
                pattern: 'annual meeting',
                isRegex: false,
                category: 'financial',
                reason: 'Annual meeting - likely shareholder/board meeting',
            },
            {
                pattern: 'investor day',
                isRegex: false,
                category: 'financial',
                reason: 'Investor day - financial event',
            },
            {
                pattern: 'analyst day',
                isRegex: false,
                category: 'financial',
                reason: 'Analyst day - financial event',
            },
        ],
    },
    nonTech: {
        name: 'Non-Tech Events',
        enabled: true,
        patterns: [
            // Note: These are conservative - only filter if clearly non-tech
            // We don't want to filter out "tech sports analytics" or similar
            {
                pattern: '^sports event',
                isRegex: true,
                category: 'non-tech',
                reason: 'Sports event - not tech-related',
            },
            {
                pattern: '^political rally',
                isRegex: true,
                category: 'non-tech',
                reason: 'Political rally - not tech-related',
            },
        ],
    },
    blogPosts: {
        name: 'Blog Posts',
        enabled: true,
        patterns: [
            // Filter if event has "Blog" as a tag (strong signal it's a blog post)
            // Note: This is checked via tags field in EventFilterService
            {
                pattern: '^blog$',
                isRegex: true,
                category: 'blog-post',
                reason: 'Tagged as "Blog" - likely a blog post, not an event',
            },
            // Filter if title clearly indicates it's a blog post
            {
                pattern: '^blog:',
                isRegex: true,
                category: 'blog-post',
                reason: 'Title starts with "Blog:" - likely a blog post',
            },
            {
                pattern: 'blog post:',
                isRegex: false,
                category: 'blog-post',
                reason: 'Contains "blog post:" - likely a blog post',
            },
        ],
    },
    testEvents: {
        name: 'Test Events',
        enabled: true,
        patterns: [
            {
                pattern: 'test event',
                isRegex: false,
                category: 'test-event',
                reason: 'Test event - not a real event',
            },
            {
                pattern: '^test:',
                isRegex: true,
                category: 'test-event',
                reason: 'Title starts with "Test:" - likely a test event',
            },
            {
                pattern: 'lorem ipsum',
                isRegex: false,
                category: 'test-event',
                reason: 'Contains placeholder text (Lorem Ipsum)',
            },
            {
                pattern: 'sample event',
                isRegex: false,
                category: 'test-event',
                reason: 'Sample event - not a real event',
            },
        ],
    },
};

/**
 * Default filter configuration
 */
export const DEFAULT_FILTER_CONFIG = {
    /** Case-insensitive matching */
    caseInsensitive: true,
    /** Check title field */
    checkTitle: true,
    /** Check description field */
    checkDescription: true,
    /** Check tags field */
    checkTags: true,
    /** Match any pattern (vs all patterns) */
    matchAny: true,
} as const;

/**
 * Get all enabled filter patterns
 */
export function getEnabledFilterPatterns(): FilterPattern[] {
    const patterns: FilterPattern[] = [];
    
    for (const category of Object.values(FILTER_CATEGORIES)) {
        if (category.enabled) {
            patterns.push(...category.patterns);
        }
    }
    
    return patterns;
}

/**
 * Get filter patterns for a specific category
 */
export function getFilterPatternsByCategory(categoryName: string): FilterPattern[] {
    const category = FILTER_CATEGORIES[categoryName];
    if (!category || !category.enabled) {
        return [];
    }
    return category.patterns;
}



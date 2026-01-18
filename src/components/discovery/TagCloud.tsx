'use client';

import React, { useMemo } from 'react';

interface TagCloudProps {
    events: Array<{
        id: string;
        tags?: Array<{
            id: string;
            name: string;
            color?: string;
            category?: string;
        }>;
    }>;
    onTagClick: (tagName: string) => void;
    selectedTags?: string[];
    maxTags?: number;
    className?: string;
    tagCounts?: Record<string, number>;
}

interface TagWithCount {
    value: string;
    displayName: string;
    count: number;
}

const BLOCKED_TAGS = new Set(['online', 'en']);

const TagCloud: React.FC<TagCloudProps> = ({
    events,
    onTagClick,
    selectedTags = [],
    maxTags = 20,
    className = '',
    tagCounts: providedTagCounts
}) => {
    const formatTagName = (name: string): string => {
        const trimmed = name.trim();
        if (trimmed.length <= 3 && /^[A-Z0-9]+$/.test(trimmed)) {
            return trimmed; // keep short acronyms like AI, ML
        }
        const normalized = trimmed.toLowerCase();
        const words = normalized.split(/[\s_-]+/).filter(Boolean);
        const titleCased = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return titleCased || trimmed;
    };

    const isDisplayableTag = (tag: { name: string | undefined } | undefined) => {
        if (!tag?.name) return false;
        const normalized = tag.name.trim().toLowerCase();
        if (!normalized) return false;
        if (BLOCKED_TAGS.has(normalized)) return false;
        const isJsonLike =
            normalized.startsWith('{') ||
            normalized.endsWith('}') ||
            normalized.includes('"key"') ||
            normalized.includes('"value"') ||
            normalized.includes('":');
        const hasKeyValueDelimiter = normalized.includes(':');
        return !isJsonLike && !hasKeyValueDelimiter;
    };

    // Calculate tag frequencies
    const tagCounts = useMemo(() => {
        if (providedTagCounts) {
            // Use provided server-side counts
            return Object.entries(providedTagCounts)
                .map(([value, count]) => {
                    // Try to find a display name from events if possible, or just capitalize
                    // Since server only returns normalized keys usually (or we normalized them)
                    // converting "ai" -> "AI" is hard without a map.
                    // But we can format it nicely.
                    return {
                        value,
                        displayName: formatTagName(value), // Simple formatting
                        count
                    };
                })
                .sort((a, b) => {
                    if (b.count !== a.count) return b.count - a.count;
                    return a.displayName.localeCompare(b.displayName);
                })
                .slice(0, maxTags);
        }

        // Fallback: Calculate from events locally
        const counts = new Map<string, TagWithCount>();

        events.forEach(event => {
            (event.tags || [])
                .filter(isDisplayableTag)
                .forEach(tag => {
                    const normalizedName = tag.name.trim().toLowerCase();
                    const displayName = formatTagName(tag.name);
                    const existing = counts.get(normalizedName);
                    if (existing) {
                        existing.count++;
                    } else {
                        counts.set(normalizedName, {
                            value: normalizedName,
                            displayName,
                            count: 1
                        });
                    }
                });
        });

        // Sort by count (descending) and take top N
        return Array.from(counts.values())
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.displayName.localeCompare(b.displayName);
            })
            .slice(0, maxTags);
    }, [events, maxTags, providedTagCounts]);

    if (tagCounts.length === 0) {
        return null;
    }

    // Debug logging for selected tags
    if (process.env.NODE_ENV === 'development' && selectedTags.length > 0) {
        console.log('[TagCloud] selectedTags:', selectedTags);
    }

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex flex-wrap gap-2">
                {tagCounts.map(tag => {
                    const isSelected = selectedTags.includes(tag.value);
                    return (
                        <button
                            type="button"
                            key={tag.value}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('[TagCloud] Tag clicked:', tag.value);
                                onTagClick(tag.value);
                            }}
                            className={`
                                px-2.5 py-1 text-[11px] font-medium rounded-md transition-all duration-200 border
                                ${isSelected
                                    ? 'bg-white text-black border-white shadow-sm'
                                    : 'bg-transparent text-muted-foreground border-white/10 hover:border-white/20 hover:text-foreground hover:bg-white/5'
                                }
                            `}
                            title={`${tag.displayName} (${tag.count} event${tag.count === 1 ? '' : 's'})`}
                        >
                            {tag.displayName}
                            <span className={`ml-1.5 opacity-50 ${isSelected ? 'text-black/60' : 'text-muted-foreground'}`}>
                                {tag.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TagCloud;

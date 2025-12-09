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
    maxTags?: number;
    className?: string;
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
    maxTags = 20,
    className = ''
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

    // Calculate tag frequencies from current events
    const tagCounts = useMemo(() => {
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
    }, [events, maxTags]);

    if (tagCounts.length === 0) {
        return null;
    }

    return (
        <div className={`space-y-3 ${className}`}>
            <ul className="space-y-1.5">
                {tagCounts.map(tag => (
                    <li key={tag.value}>
                        <button
                            onClick={() => onTagClick(tag.value)}
                            className={`
                                w-full px-1 py-1 flex items-center gap-3 text-left
                                text-muted-foreground hover:text-foreground
                                hover:bg-muted/30 rounded-md
                                transition-colors duration-150
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                            `}
                            title={`${tag.displayName} (${tag.count} event${tag.count === 1 ? '' : 's'})`}
                        >
                            <span className="w-5 h-5 rounded-full border border-border flex-shrink-0" />
                            <span className="text-sm font-medium">
                                {tag.displayName}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">
                                ({tag.count})
                            </span>
                        </button>
                    </li>
                ))}
            </ul>

            <p className="text-xs text-muted-foreground">
                Click a tag to filter events
            </p>
        </div>
    );
};

export default TagCloud;

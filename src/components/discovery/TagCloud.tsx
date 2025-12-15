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
                {tagCounts.map(tag => {
                    const isSelected = selectedTags.includes(tag.value);
                    return (
                        <li key={tag.value}>
                            <button
                                onClick={() => onTagClick(tag.value)}
                                className={`
                                    w-full px-1 py-1 flex items-center gap-3 text-left
                                    rounded-md transition-colors duration-150
                                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                                    ${isSelected
                                        ? 'text-foreground bg-muted/40 hover:bg-muted/50'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                    }
                                `}
                                title={`${tag.displayName} (${tag.count} event${tag.count === 1 ? '' : 's'})`}
                            >
                                <span className={`
                                    w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-200
                                    ${isSelected
                                        ? 'border-transparent bg-primary text-primary-foreground'
                                        : 'border-border bg-transparent'
                                    }
                                `}>
                                    {isSelected && (
                                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                    )}
                                </span>
                                <span className={`text-sm ${isSelected ? 'font-medium' : 'font-medium'}`}>
                                    {tag.displayName}
                                </span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                    ({tag.count})
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            <p className="text-xs text-muted-foreground">
                Click a tag to filter events
            </p>
        </div>
    );
};

export default TagCloud;

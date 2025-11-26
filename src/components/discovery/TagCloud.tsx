'use client';

import React, { useMemo } from 'react';
import { Tag } from '@phosphor-icons/react';

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
    name: string;
    count: number;
    color?: string;
    category?: string;
}

const TagCloud: React.FC<TagCloudProps> = ({
    events,
    onTagClick,
    maxTags = 20,
    className = ''
}) => {
    // Calculate tag frequencies from current events
    const tagCounts = useMemo(() => {
        const counts = new Map<string, TagWithCount>();

        events.forEach(event => {
            (event.tags || []).forEach(tag => {
                const existing = counts.get(tag.name);
                if (existing) {
                    existing.count++;
                } else {
                    counts.set(tag.name, {
                        name: tag.name,
                        count: 1,
                        color: tag.color,
                        category: tag.category
                    });
                }
            });
        });

        // Sort by count (descending) and take top N
        return Array.from(counts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, maxTags);
    }, [events, maxTags]);

    if (tagCounts.length === 0) {
        return null;
    }

    // Get category color based on category name
    const getCategoryColor = (category?: string): string => {
        const categoryColors: Record<string, string> = {
            'Programming': 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
            'Framework': 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
            'Tech': 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
            'Development': 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
            'Methodology': 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
            'Platform': 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
            'Business': 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
            'Industry': 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
            'Event-Type': 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
            'Difficulty': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
            'Soft-Skills': 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
            'Career-Stage': 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
            'Community': 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30',
        };

        return category && categoryColors[category]
            ? categoryColors[category]
            : 'bg-muted/60 text-foreground border-border/40';
    };

    // Calculate relative font size based on count
    const getFontSize = (count: number, maxCount: number): string => {
        const ratio = count / maxCount;
        if (ratio >= 0.8) return 'text-sm font-semibold';
        if (ratio >= 0.5) return 'text-sm font-medium';
        return 'text-xs font-normal';
    };

    const maxCount = tagCounts[0]?.count || 1;

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                <Tag size={18} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                    Popular Tags
                </h3>
            </div>

            <div className="flex flex-wrap gap-2">
                {tagCounts.map(tag => (
                    <button
                        key={tag.name}
                        onClick={() => onTagClick(tag.name)}
                        className={`
                            px-3 py-1.5 rounded-lg border
                            transition-all duration-200
                            hover:scale-105 hover:shadow-md
                            active:scale-95
                            ${getFontSize(tag.count, maxCount)}
                            ${getCategoryColor(tag.category)}
                        `}
                        title={`${tag.name} (${tag.count} event${tag.count === 1 ? '' : 's'})`}
                    >
                        <span className="flex items-center gap-1.5">
                            {tag.name}
                            <span className="text-xs opacity-70 font-normal">
                                {tag.count}
                            </span>
                        </span>
                    </button>
                ))}
            </div>

            <p className="text-xs text-muted-foreground mt-3">
                Click a tag to filter events
            </p>
        </div>
    );
};

export default TagCloud;

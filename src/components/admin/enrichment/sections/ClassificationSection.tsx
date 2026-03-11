'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TagSelector } from '../TagSelector';

import type { ClassificationSectionProps, EventFormatEnum } from '../types';

export function ClassificationSection({
    coreFields,
    setCoreFields,
    relationships,
    setRelationships,
    lookupData,
    eventTagRelations,
}: Omit<ClassificationSectionProps, 'expanded' | 'onToggle'>) {
    // Build list of all available tags for the dropdown
    // Primary source: lookupData.eventTags (contains ALL tags from event_tags table)
    // Fallback: eventTagRelations (only selected tags for this event, used if lookupData is incomplete)
    const allTags = React.useMemo(() => {
        const tagMap = new Map<string, { id: string; event_tag: string; category: string | null }>();

        // PRIMARY: Add ALL tags from lookup data (this should contain all tags in the database)
        if (lookupData.eventTags && Array.isArray(lookupData.eventTags)) {
            lookupData.eventTags.forEach(tag => {
                if (tag.id && tag.event_tag) {
                    tagMap.set(tag.id, {
                        id: tag.id,
                        event_tag: tag.event_tag,
                        category: tag.category ?? null,
                    });
                }
            });
        }

        // FALLBACK: Add tags from event data only if they're missing from lookup data
        // This handles edge cases where a tag might exist in the relation but not in lookupData
        if (eventTagRelations && Array.isArray(eventTagRelations)) {
            eventTagRelations.forEach(relation => {
                if (relation.event_tags && relation.tag_id && !tagMap.has(relation.tag_id)) {
                    tagMap.set(relation.tag_id, {
                        id: relation.tag_id,
                        event_tag: relation.event_tags.event_tag,
                        category: relation.event_tags.category ?? null,
                    });
                }
            });
        }

        return Array.from(tagMap.values());
    }, [lookupData.eventTags, eventTagRelations]);

    // State for creating new tags
    const [creatingTag, setCreatingTag] = useState(false);
    const [tagCreationError, setTagCreationError] = useState<string | null>(null);
    const [localTags, setLocalTags] = useState<Array<{ id: string; event_tag: string; category: string | null }>>([]);

    // Combine lookup tags with locally created tags
    const allTagsWithLocal = React.useMemo(() => {
        const tagMap = new Map<string, { id: string; event_tag: string; category: string | null }>();

        // Add all tags from lookup data
        if (lookupData.eventTags && Array.isArray(lookupData.eventTags)) {
            lookupData.eventTags.forEach(tag => {
                if (tag.id && tag.event_tag) {
                    tagMap.set(tag.id, {
                        id: tag.id,
                        event_tag: tag.event_tag,
                        category: tag.category ?? null,
                    });
                }
            });
        }

        // Add tags from event data
        if (eventTagRelations && Array.isArray(eventTagRelations)) {
            eventTagRelations.forEach(relation => {
                if (relation.event_tags && relation.tag_id && !tagMap.has(relation.tag_id)) {
                    tagMap.set(relation.tag_id, {
                        id: relation.tag_id,
                        event_tag: relation.event_tags.event_tag,
                        category: relation.event_tags.category ?? null,
                    });
                }
            });
        }

        // Add locally created tags
        localTags.forEach(tag => {
            tagMap.set(tag.id, tag);
        });

        return Array.from(tagMap.values());
    }, [lookupData.eventTags, eventTagRelations, localTags]);

    const createNewTag = async (tagName: string) => {
        const trimmedName = tagName.trim();
        if (!trimmedName) {
            setTagCreationError('Tag name is required');
            return;
        }

        // Check for duplicate
        const isDuplicate = allTagsWithLocal.some(
            tag => tag.event_tag.toLowerCase() === trimmedName.toLowerCase()
        );
        if (isDuplicate) {
            setTagCreationError('Tag already exists');
            return;
        }

        setCreatingTag(true);
        setTagCreationError(null);

        try {
            const response = await fetch('/api/admin/ingestion/enrichment/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagName: trimmedName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create tag');
            }

            if (data.success && data.tagId) {
                // Add new tag to local state
                const newTag = {
                    id: data.tagId,
                    event_tag: trimmedName,
                    category: null,
                };
                setLocalTags(prev => [...prev, newTag]);

                // Auto-select the new tag
                setRelationships(prev => ({
                    ...prev,
                    tagIds: [...prev.tagIds, data.tagId],
                }));
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create tag';
            setTagCreationError(errorMessage);
        } finally {
            setCreatingTag(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <h3 className="text-lg font-medium text-foreground-primary">Event Classification</h3>
            </div>
            <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Event Type</label>
                        <select
                            value={relationships.event_type_id || ''}
                            onChange={(e) => setRelationships(prev => ({ ...prev, event_type_id: e.target.value || null }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                        >
                            <option value="" className="bg-background-main">Select Event Type</option>
                            {lookupData.eventTypes.map(type => (
                                <option key={type.id} value={type.id} className="bg-background-main">{type.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Format</label>
                        <select
                            value={coreFields.event_format || ''}
                            onChange={(e) => {
                                const value = e.target.value as EventFormatEnum | '';
                                setCoreFields(prev => ({
                                    ...prev,
                                    event_format: value ? (value as EventFormatEnum) : null,
                                }));
                            }}

                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                        >
                            <option value="" className="bg-background-main">Select Format</option>
                            <option value="Online" className="bg-background-main">Online</option>
                            <option value="In-person" className="bg-background-main">In-person</option>
                            <option value="Hybrid" className="bg-background-main">Hybrid</option>
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Event Series</label>
                        <select
                            value={relationships.series_id || ''}
                            onChange={(e) => setRelationships(prev => ({ ...prev, series_id: e.target.value || null }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                        >
                            <option value="" className="bg-background-main">None</option>
                            {lookupData.eventSeries?.map(series => (
                                <option key={series.id} value={series.id} className="bg-background-main">{series.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Status</label>
                        <input
                            type="text"
                            placeholder="Status (free-form)"
                            value={coreFields.status}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Difficulty</label>
                        <select
                            value={coreFields.difficulty_level || ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, difficulty_level: e.target.value || null }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                        >
                            <option value="" className="bg-background-main">Select Difficulty</option>
                            <option value="beginner" className="bg-background-main">Beginner</option>
                            <option value="intermediate" className="bg-background-main">Intermediate</option>
                            <option value="advanced" className="bg-background-main">Advanced</option>
                        </select>
                    </div>
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Tags</label>
                    <TagSelector
                        selectedTagIds={relationships.tagIds}
                        tags={allTagsWithLocal}
                        onToggleTag={(tagId) => {
                            setRelationships(prev => {
                                const newTagIds = prev.tagIds.includes(tagId)
                                    ? prev.tagIds.filter(id => id !== tagId)
                                    : [...prev.tagIds, tagId];
                                return { ...prev, tagIds: newTagIds };
                            });
                        }}
                        onCreateTag={createNewTag}
                    />
                    {tagCreationError && (
                        <p className="text-xs text-rose-500 mt-1">{tagCreationError}</p>
                    )}
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Target Audiences</label>
                    <div className="grid gap-2">
                        <select
                            multiple
                            value={relationships.audienceIds}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setRelationships(prev => ({ ...prev, audienceIds: selected }));
                            }}
                            className="w-full bg-transparent border border-default rounded-md px-3 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors min-h-[80px]"
                        >
                            {lookupData.targetAudiences.map(audience => (
                                <option key={audience.id} value={audience.id} className="bg-background-main py-1">{audience.name}</option>
                            ))}
                        </select>
                        <textarea
                            placeholder="Additional details (free-form)"
                            value={coreFields.target_audience}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, target_audience: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                            rows={2}
                        />
                    </div>
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Prerequisites</label>
                    <div className="grid gap-2">
                        <select
                            multiple
                            value={relationships.prerequisiteIds}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setRelationships(prev => ({ ...prev, prerequisiteIds: selected }));
                            }}
                            className="w-full bg-transparent border border-default rounded-md px-3 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors min-h-[80px]"
                        >
                            {lookupData.prerequisites.map(prereq => (
                                <option key={prereq.id} value={prereq.id} className="bg-background-main py-1">{prereq.name}</option>
                            ))}
                        </select>
                        <textarea
                            placeholder="Additional details (free-form)"
                            value={coreFields.prerequisites}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, prerequisites: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                            rows={2}
                        />
                    </div>
                </div>
            </div>
        </div >
    );
}

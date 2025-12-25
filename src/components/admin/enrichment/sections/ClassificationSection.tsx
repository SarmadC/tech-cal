'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import type { ClassificationSectionProps, EventFormatEnum } from '../types';

export function ClassificationSection({
    expanded,
    onToggle,
    coreFields,
    setCoreFields,
    relationships,
    setRelationships,
    lookupData,
    eventTagRelations,
}: ClassificationSectionProps) {
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
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Event Classification</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onToggle}>
                        {expanded ? 'Collapse' : 'Expand'}
                    </Button>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    <select
                        value={relationships.event_type_id || ''}
                        onChange={(e) => setRelationships(prev => ({ ...prev, event_type_id: e.target.value || null }))}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="">Select Event Type</option>
                        {lookupData.eventTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                    <select
                        value={coreFields.event_format || ''}
                        onChange={(e) => {
                            const value = e.target.value as EventFormatEnum | '';
                            setCoreFields(prev => ({
                                ...prev,
                                event_format: value ? (value as EventFormatEnum) : null,
                            }));
                        }}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="">Select Format</option>
                        <option value="Online">Online</option>
                        <option value="In-person">In-person</option>
                        <option value="Hybrid">Hybrid</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Status (free-form)"
                        value={coreFields.status}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                    <select
                        value={coreFields.difficulty_level || ''}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, difficulty_level: e.target.value || null }))}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="">Select Difficulty</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                    <MultiSelectDropdown
                        label="Tags"
                        placeholder="Select tags..."
                        options={allTags.map(tag => ({
                            value: tag.id,
                            label: tag.event_tag,
                            category: tag.category ?? undefined,
                        }))}
                        selectedValues={relationships.tagIds}
                        onChange={(values) => setRelationships(prev => ({ ...prev, tagIds: values }))}
                    />
                    <div>
                        <label className="block text-sm font-medium mb-2">Target Audiences (multi-select + free-form)</label>
                        <select
                            multiple
                            value={relationships.audienceIds}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setRelationships(prev => ({ ...prev, audienceIds: selected }));
                            }}
                            className="w-full px-3 py-2 border rounded mb-2 min-h-[80px]"
                        >
                            {lookupData.targetAudiences.map(audience => (
                                <option key={audience.id} value={audience.id}>{audience.name}</option>
                            ))}
                        </select>
                        <textarea
                            placeholder="Target Audience (free-form text - can be used alongside selections above)"
                            value={coreFields.target_audience}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, target_audience: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Prerequisites (multi-select + free-form)</label>
                        <select
                            multiple
                            value={relationships.prerequisiteIds}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setRelationships(prev => ({ ...prev, prerequisiteIds: selected }));
                            }}
                            className="w-full px-3 py-2 border rounded mb-2 min-h-[80px]"
                        >
                            {lookupData.prerequisites.map(prereq => (
                                <option key={prereq.id} value={prereq.id}>{prereq.name}</option>
                            ))}
                        </select>
                        <textarea
                            placeholder="Prerequisites (free-form text - can be used alongside selections above)"
                            value={coreFields.prerequisites}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, prerequisites: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                            rows={2}
                        />
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

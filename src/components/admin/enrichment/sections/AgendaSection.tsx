'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import { cn } from '@/lib/utils';
import type { AgendaSectionProps } from '../types';
import { toDateTimeLocalValue, parseDateTimeLocalValue } from '../types';
import { format } from 'date-fns';

const parseTopicsInput = (value: string): string[] | undefined => {
    const topics = Array.from(
        new Set(
            value
                .split(/[,\n;]/)
                .map((topic) => topic.trim())
                .filter(Boolean)
        )
    );

    return topics.length > 0 ? topics : undefined;
};

export function AgendaSection({
    agendaItems,
    availableSpeakers,
    onAdd,
    onUpdate,
    onRemove,
    onSave,
    loading,
}: AgendaSectionProps) {
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

    const toggleItem = (index: number) => {
        setExpandedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const expandAll = () => {
        const allExpanded: Record<number, boolean> = {};
        agendaItems.forEach((_, index) => {
            allExpanded[index] = true;
        });
        setExpandedItems(allExpanded);
    };

    const collapseAll = () => {
        setExpandedItems({});
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return '';
        try {
            return format(new Date(dateStr), 'h:mm a');
        } catch {
            return '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <div>
                    <h3 className="text-lg font-medium text-foreground-primary">Agenda Items</h3>
                    <p className="text-xs text-foreground-muted mt-1">
                        Add agenda items with times, descriptions, and speakers
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-2">
                        <Button onClick={expandAll} size="sm" variant="ghost" className="h-6 px-2 text-xs text-foreground-tertiary">
                            Expand All
                        </Button>
                        <span className="text-border-default">|</span>
                        <Button onClick={collapseAll} size="sm" variant="ghost" className="h-6 px-2 text-xs text-foreground-tertiary">
                            Collapse All
                        </Button>
                    </div>
                    <Button onClick={() => {
                        onAdd();
                        // Automatically expand the new item (which will be at the end)
                        setExpandedItems(prev => ({
                            ...prev,
                            [agendaItems.length]: true
                        }));
                    }} size="sm" variant="secondary">
                        <MaterialIcon name="add" size={16} className="mr-2" />
                        Add Item
                    </Button>
                </div>
            </div>
            <div className="space-y-4">
                {agendaItems.map((item, index) => {
                    const isExpanded = expandedItems[index];

                    return (
                        <div key={index} className="rounded-lg border border-default bg-background-tertiary overflow-hidden transition-all duration-200">
                            {/* Header / Summary View */}
                            <div
                                className={cn(
                                    "px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors",
                                    isExpanded && "border-b border-default bg-white/5"
                                )}
                                onClick={() => toggleItem(index)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MaterialIcon
                                        name={isExpanded ? "expand-less" : "expand-more"}
                                        size={20}
                                        className="text-foreground-tertiary shrink-0"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground-primary truncate">
                                                {item.title || 'Untitled Session'}
                                            </span>
                                            {item.type && (
                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-foreground-muted">
                                                    {item.type}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
                                            {(item.startTime || item.endTime) ? (
                                                <span>
                                                    {formatTime(item.startTime)}
                                                    {item.endTime && ` - ${formatTime(item.endTime)}`}
                                                </span>
                                            ) : (
                                                <span className="italic text-foreground-tertiary">No time set</span>
                                            )}
                                            {item.location && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-foreground-tertiary/50" />
                                                    <span>{item.location}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(index);
                                        }}
                                        className="text-foreground-muted hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8"
                                    >
                                        <MaterialIcon name="delete" size={16} />
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-200 fade-in">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 grid gap-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Title</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Title"
                                                        value={item.title}
                                                        onChange={(e) => onUpdate(index, { title: e.target.value })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Type</label>
                                                    <select
                                                        value={item.type}
                                                        onChange={(e) => onUpdate(index, { type: e.target.value })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                                                    >
                                                        <option value="keynote" className="bg-background-main">Keynote</option>
                                                        <option value="session" className="bg-background-main">Session</option>
                                                        <option value="workshop" className="bg-background-main">Workshop</option>
                                                        <option value="panel" className="bg-background-main">Panel</option>
                                                        <option value="break" className="bg-background-main">Break</option>
                                                        <option value="other" className="bg-background-main">Other</option>
                                                    </select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Track</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Track (optional)"
                                                        value={item.track || ''}
                                                        onChange={(e) => onUpdate(index, { track: e.target.value })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Start Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={toDateTimeLocalValue(item.startTime)}
                                                        onChange={(e) => onUpdate(index, { startTime: parseDateTimeLocalValue(e.target.value) })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors [color-scheme:dark]"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">End Time</label>
                                                    <input
                                                        type="datetime-local"
                                                        value={toDateTimeLocalValue(item.endTime)}
                                                        onChange={(e) => onUpdate(index, { endTime: parseDateTimeLocalValue(e.target.value) })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Description</label>
                                                <textarea
                                                    placeholder="Description (optional)"
                                                    value={item.description || ''}
                                                    onChange={(e) => onUpdate(index, { description: e.target.value })}
                                                    className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                                                    rows={2}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Location</label>
                                                <input
                                                    type="text"
                                                    placeholder="Location within venue (optional)"
                                                    value={item.location || ''}
                                                    onChange={(e) => onUpdate(index, { location: e.target.value })}
                                                    className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Topics</label>
                                                <input
                                                    type="text"
                                                    placeholder="Comma-separated topics"
                                                    value={(item.topics ?? []).join(', ')}
                                                    onChange={(e) => onUpdate(index, { topics: parseTopicsInput(e.target.value) })}
                                                    className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Capacity</label>
                                                    <input
                                                        type="number"
                                                        placeholder="Capacity"
                                                        value={item.capacity ?? ''}
                                                        onChange={(e) => onUpdate(index, { capacity: e.target.value ? parseInt(e.target.value) : null })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Difficulty</label>
                                                    <select
                                                        value={item.difficultyLevel || ''}
                                                        onChange={(e) => onUpdate(index, { difficultyLevel: e.target.value || null })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                                                    >
                                                        <option value="" className="bg-background-main">Difficulty Level</option>
                                                        <option value="beginner" className="bg-background-main">Beginner</option>
                                                        <option value="intermediate" className="bg-background-main">Intermediate</option>
                                                        <option value="advanced" className="bg-background-main">Advanced</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Prerequisites</label>
                                                <textarea
                                                    placeholder="Prerequisites (optional)"
                                                    value={item.prerequisites || ''}
                                                    onChange={(e) => onUpdate(index, { prerequisites: e.target.value || null })}
                                                    className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                                                    rows={2}
                                                />
                                            </div>


                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Speakers</label>
                                                {availableSpeakers.length > 0 ? (
                                                    <MultiSelectDropdown
                                                        options={availableSpeakers.map(s => ({
                                                            label: `${s.name}${s.title ? ` - ${s.title}` : ''}${s.company ? ` (${s.company})` : ''}`,
                                                            value: s.id || `temp-${s.name}` // Fallback for new speakers without ID yet
                                                        }))}
                                                        selectedValues={item.speakerIds || []}
                                                        onChange={(newValues) => {
                                                            onUpdate(index, { speakerIds: newValues.length > 0 ? newValues : undefined });
                                                        }}
                                                        placeholder="Select speakers..."
                                                        className="w-full"
                                                    />
                                                ) : (
                                                    <p className="text-xs text-foreground-muted italic">
                                                        No speakers available. Add speakers in the Speakers section first.
                                                    </p>
                                                )}
                                            </div>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isRequired || false}
                                                    onChange={(e) => onUpdate(index, { isRequired: e.target.checked })}
                                                    className="rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                                                />
                                                <span className="text-sm text-foreground-tertiary">Is Required</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {agendaItems.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-default rounded-lg">
                        <p className="text-foreground-muted text-sm">
                            No agenda items yet. Add an item to get started.
                        </p>
                    </div>
                )}
            </div>
            <div className="pt-4 border-t border-default">
                <Button onClick={onSave} disabled={loading} className="w-full" variant="secondary">
                    {loading ? 'Saving...' : 'Save Agenda Items'}
                </Button>
            </div>
        </div>
    );
}

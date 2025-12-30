'use client';

import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import type { AgendaSectionProps } from '../types';
import { toDateTimeLocalValue, parseDateTimeLocalValue } from '../types';

export function AgendaSection({
    agendaItems,
    onAdd,
    onUpdate,
    onRemove,
    onSave,
    loading,
}: AgendaSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <div>
                    <h3 className="text-lg font-medium text-foreground-primary">Agenda Items</h3>
                    <p className="text-xs text-foreground-muted mt-1">
                        Add agenda items with times, descriptions, and speakers
                    </p>
                </div>
                <Button onClick={onAdd} size="sm" variant="secondary">
                    <MaterialIcon name="add" size={16} className="mr-2" />
                    Add Item
                </Button>
            </div>
            <div className="space-y-4">
                {agendaItems.map((item, index) => (
                    <div key={index} className="rounded-lg border border-default bg-background-tertiary p-4 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
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
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemove(index)}
                                className="text-foreground-muted hover:text-rose-400 hover:bg-rose-500/10"
                            >
                                <MaterialIcon name="delete" size={18} />
                            </Button>
                        </div>
                    </div>
                ))}
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

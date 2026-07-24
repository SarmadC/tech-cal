'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { SpeakersSectionProps } from '../types';
import { SpeakerPortraitReview } from './SpeakerPortraitReview';

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
}

export function SpeakersSection({
    eventSourceUrl,
    speakers,
    onAdd,
    onUpdate,
    onRemove,
    onSave,
    loading,
}: SpeakersSectionProps) {
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

    const toggleItem = (index: number) => {
        setExpandedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const expandAll = () => {
        const allExpanded: Record<number, boolean> = {};
        speakers.forEach((_, index) => {
            allExpanded[index] = true;
        });
        setExpandedItems(allExpanded);
    };

    const collapseAll = () => {
        setExpandedItems({});
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <div>
                    <h3 className="text-lg font-medium text-foreground-primary">Speakers</h3>
                    <p className="text-xs text-foreground-muted mt-1">
                        Add speakers with LinkedIn URLs and other details
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
                        // Automatically expand the new item
                        setExpandedItems(prev => ({
                            ...prev,
                            [speakers.length]: true
                        }));
                    }} size="sm" variant="secondary">
                        <MaterialIcon name="add" size={16} className="mr-2" />
                        Add Speaker
                    </Button>
                </div>
            </div>
            <div className="space-y-4">
                {speakers.map((speaker, index) => {
                    const isExpanded = expandedItems[index];
                    const speakerInitials = getInitials(speaker.name || 'Speaker') || 'S';

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
                                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-default bg-background-secondary flex items-center justify-center">
                                        {speaker.photoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={speaker.photoUrl}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-foreground-muted">
                                                {speakerInitials}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-foreground-primary truncate">
                                                {speaker.name || 'Unnamed Speaker'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5 truncate">
                                            {speaker.title && <span>{speaker.title}</span>}
                                            {speaker.title && speaker.company && <span className="text-foreground-tertiary">•</span>}
                                            {speaker.company && <span>{speaker.company}</span>}
                                            {!speaker.title && !speaker.company && (
                                                <span className="italic text-foreground-tertiary">No details</span>
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Speaker Name"
                                                        value={speaker.name}
                                                        onChange={(e) => onUpdate(index, { name: e.target.value })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                        required
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">LinkedIn URL</label>
                                                    <input
                                                        type="url"
                                                        placeholder="https://linkedin.com/in/..."
                                                        value={speaker.linkedinUrl || ''}
                                                        onChange={(e) => onUpdate(index, { linkedinUrl: e.target.value })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Title</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Title"
                                                        value={speaker.title || ''}
                                                        onChange={(e) => onUpdate(index, { title: e.target.value })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Company</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Company"
                                                        value={speaker.company || ''}
                                                        onChange={(e) => onUpdate(index, { company: e.target.value })}
                                                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Profile Pic URL</label>
                                                <input
                                                    type="url"
                                                    placeholder="https://example.com/speaker.jpg"
                                                    value={speaker.photoUrl || ''}
                                                    onChange={(e) => onUpdate(index, { photoUrl: e.target.value })}
                                                    className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                                                />
                                                <p className="text-xs text-foreground-muted">
                                                    Remote image URLs are copied to Supabase Storage when speakers are saved.
                                                </p>
                                            </div>
                                            <SpeakerPortraitReview speaker={speaker} sourcePageUrl={eventSourceUrl} />
                                            <div className="grid gap-2">
                                                <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Bio</label>
                                                <textarea
                                                    placeholder="Bio (optional)"
                                                    value={speaker.bio || ''}
                                                    onChange={(e) => onUpdate(index, { bio: e.target.value })}
                                                    className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                                                    rows={2}
                                                />
                                            </div>
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
                            )}
                        </div>
                    );
                })}
                {speakers.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-default rounded-lg">
                        <p className="text-foreground-muted text-sm">
                            No speakers yet. Add a speaker to get started.
                        </p>
                    </div>
                )}
            </div>
            <div className="pt-4 border-t border-default">
                <Button onClick={onSave} disabled={loading} className="w-full" variant="secondary">
                    {loading ? 'Saving...' : 'Save Speakers'}
                </Button>
            </div>
        </div>
    );
}

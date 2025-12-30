'use client';

import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import type { SpeakersSectionProps } from '../types';

export function SpeakersSection({
    speakers,
    onAdd,
    onUpdate,
    onRemove,
    onSave,
    loading,
}: SpeakersSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <div>
                    <h3 className="text-lg font-medium text-foreground-primary">Speakers</h3>
                    <p className="text-xs text-foreground-muted mt-1">
                        Add speakers with LinkedIn URLs and other details
                    </p>
                </div>
                <Button onClick={onAdd} size="sm" variant="secondary">
                    <MaterialIcon name="add" size={16} className="mr-2" />
                    Add Speaker
                </Button>
            </div>
            <div className="space-y-4">
                {speakers.map((speaker, index) => (
                    <div key={index} className="rounded-lg border border-default bg-background-tertiary p-4 space-y-4">
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
                ))}
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

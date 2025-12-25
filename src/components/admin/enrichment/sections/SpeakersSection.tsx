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
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div>
                    <h3 className="text-lg font-medium text-slate-200">Speakers</h3>
                    <p className="text-xs text-slate-500 mt-1">
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
                    <div key={index} className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
                                        <input
                                            type="text"
                                            placeholder="Speaker Name"
                                            value={speaker.name}
                                            onChange={(e) => onUpdate(index, { name: e.target.value })}
                                            className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-700"
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">LinkedIn URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://linkedin.com/in/..."
                                            value={speaker.linkedinUrl || ''}
                                            onChange={(e) => onUpdate(index, { linkedinUrl: e.target.value })}
                                            className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-700"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Title</label>
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            value={speaker.title || ''}
                                            onChange={(e) => onUpdate(index, { title: e.target.value })}
                                            className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-700"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Company</label>
                                        <input
                                            type="text"
                                            placeholder="Company"
                                            value={speaker.company || ''}
                                            onChange={(e) => onUpdate(index, { company: e.target.value })}
                                            className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-700"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Bio</label>
                                    <textarea
                                        placeholder="Bio (optional)"
                                        value={speaker.bio || ''}
                                        onChange={(e) => onUpdate(index, { bio: e.target.value })}
                                        className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-700 resize-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemove(index)}
                                className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            >
                                <MaterialIcon name="delete" size={18} />
                            </Button>
                        </div>
                    </div>
                ))}
                {speakers.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                        <p className="text-slate-500 text-sm">
                            No speakers yet. Add a speaker to get started.
                        </p>
                    </div>
                )}
            </div>
            <div className="pt-4 border-t border-white/5">
                <Button onClick={onSave} disabled={loading} className="w-full" variant="secondary">
                    {loading ? 'Saving...' : 'Save Speakers'}
                </Button>
            </div>
        </div>
    );
}

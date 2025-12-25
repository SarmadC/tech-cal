'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Speakers</CardTitle>
                        <CardDescription>
                            Add speakers with LinkedIn URLs and other details
                        </CardDescription>
                    </div>
                    <Button onClick={onAdd} size="sm">
                        Add Speaker
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {speakers.map((speaker, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Speaker Name *"
                                    value={speaker.name}
                                    onChange={(e) => onUpdate(index, { name: e.target.value })}
                                    className="px-3 py-2 border rounded"
                                    required
                                />
                                <input
                                    type="url"
                                    placeholder="LinkedIn URL"
                                    value={speaker.linkedinUrl || ''}
                                    onChange={(e) => onUpdate(index, { linkedinUrl: e.target.value })}
                                    className="px-3 py-2 border rounded"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Title (optional)"
                                    value={speaker.title || ''}
                                    onChange={(e) => onUpdate(index, { title: e.target.value })}
                                    className="px-3 py-2 border rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Company (optional)"
                                    value={speaker.company || ''}
                                    onChange={(e) => onUpdate(index, { company: e.target.value })}
                                    className="px-3 py-2 border rounded"
                                />
                            </div>
                            <textarea
                                placeholder="Bio (optional)"
                                value={speaker.bio || ''}
                                onChange={(e) => onUpdate(index, { bio: e.target.value })}
                                className="w-full px-3 py-2 border rounded"
                                rows={2}
                            />
                            <div className="flex justify-end">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => onRemove(index)}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ))}
                    {speakers.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                            No speakers yet. Add a speaker to get started.
                        </p>
                    )}
                </div>
                <div className="mt-4">
                    <Button onClick={onSave} disabled={loading} className="w-full">
                        {loading ? 'Saving...' : 'Save Speakers'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

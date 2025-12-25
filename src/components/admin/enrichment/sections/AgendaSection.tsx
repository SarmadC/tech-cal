'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Agenda Items</CardTitle>
                        <CardDescription>
                            Add agenda items with times, descriptions, and speakers
                        </CardDescription>
                    </div>
                    <Button onClick={onAdd} size="sm">
                        Add Item
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {agendaItems.map((item, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={item.title}
                                    onChange={(e) => onUpdate(index, { title: e.target.value })}
                                    className="px-3 py-2 border rounded"
                                />
                                <select
                                    value={item.type}
                                    onChange={(e) => onUpdate(index, { type: e.target.value })}
                                    className="px-3 py-2 border rounded"
                                >
                                    <option value="keynote">Keynote</option>
                                    <option value="session">Session</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="panel">Panel</option>
                                    <option value="break">Break</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="datetime-local"
                                    placeholder="Start Time"
                                    value={toDateTimeLocalValue(item.startTime)}
                                    onChange={(e) => onUpdate(index, { startTime: parseDateTimeLocalValue(e.target.value) })}
                                    className="px-3 py-2 border rounded"
                                />
                                <input
                                    type="datetime-local"
                                    placeholder="End Time"
                                    value={toDateTimeLocalValue(item.endTime)}
                                    onChange={(e) => onUpdate(index, { endTime: parseDateTimeLocalValue(e.target.value) })}
                                    className="px-3 py-2 border rounded"
                                />
                            </div>
                            <textarea
                                placeholder="Description (optional)"
                                value={item.description || ''}
                                onChange={(e) => onUpdate(index, { description: e.target.value })}
                                className="w-full px-3 py-2 border rounded"
                                rows={2}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="number"
                                    placeholder="Capacity"
                                    value={item.capacity ?? ''}
                                    onChange={(e) => onUpdate(index, { capacity: e.target.value ? parseInt(e.target.value) : null })}
                                    className="px-3 py-2 border rounded"
                                />
                                <select
                                    value={item.difficultyLevel || ''}
                                    onChange={(e) => onUpdate(index, { difficultyLevel: e.target.value || null })}
                                    className="px-3 py-2 border rounded"
                                >
                                    <option value="">Difficulty Level</option>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                            </div>
                            <textarea
                                placeholder="Prerequisites (optional)"
                                value={item.prerequisites || ''}
                                onChange={(e) => onUpdate(index, { prerequisites: e.target.value || null })}
                                className="w-full px-3 py-2 border rounded"
                                rows={2}
                            />
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={item.isRequired || false}
                                    onChange={(e) => onUpdate(index, { isRequired: e.target.checked })}
                                />
                                <span>Is Required</span>
                            </label>
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
                    {agendaItems.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                            No agenda items yet. Add an item to get started.
                        </p>
                    )}
                </div>
                <div className="mt-4">
                    <Button onClick={onSave} disabled={loading} className="w-full">
                        {loading ? 'Saving...' : 'Save Agenda Items'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

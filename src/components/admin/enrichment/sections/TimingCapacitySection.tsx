'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TimingCapacitySectionProps } from '../types';
import { toDateTimeLocalValue, parseDateTimeLocalValue } from '../types';

export function TimingCapacitySection({
    expanded,
    onToggle,
    coreFields,
    setCoreFields,
}: TimingCapacitySectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Timing & Capacity</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onToggle}>
                        {expanded ? 'Collapse' : 'Expand'}
                    </Button>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Registration Deadline</label>
                        <input
                            type="datetime-local"
                            placeholder="Registration Deadline"
                            value={toDateTimeLocalValue(coreFields.registration_deadline)}
                            onChange={(e) => {
                                const next = parseDateTimeLocalValue(e.target.value);
                                setCoreFields(prev => ({ ...prev, registration_deadline: next || null }));
                            }}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Capacity</label>
                        <input
                            type="number"
                            placeholder="Capacity"
                            value={coreFields.capacity ?? ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, capacity: e.target.value ? parseInt(e.target.value) : null }))}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Attendee Count</label>
                        <input
                            type="number"
                            placeholder="Attendee Count (read-only)"
                            value={coreFields.attendee_count ?? ''}
                            disabled
                            className="w-full px-3 py-2 border rounded bg-gray-100"
                        />
                    </div>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={coreFields.is_multi_day}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, is_multi_day: e.target.checked }))}
                        />
                        <span>Is Multi-day Event</span>
                    </label>
                </CardContent>
            )}
        </Card>
    );
}

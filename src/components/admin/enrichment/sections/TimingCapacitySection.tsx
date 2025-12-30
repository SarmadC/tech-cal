'use client';

import type { TimingCapacitySectionProps } from '../types';
import { toDateTimeLocalValue, parseDateTimeLocalValue } from '../types';

export function TimingCapacitySection({
    coreFields,
    setCoreFields,
}: Omit<TimingCapacitySectionProps, 'expanded' | 'onToggle'>) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <h3 className="text-lg font-medium text-foreground-secondary">Timing & Capacity</h3>
            </div>
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Registration Deadline</label>
                    <input
                        type="datetime-local"
                        placeholder="Registration Deadline"
                        value={toDateTimeLocalValue(coreFields.registration_deadline)}
                        onChange={(e) => {
                            const next = parseDateTimeLocalValue(e.target.value);
                            setCoreFields(prev => ({ ...prev, registration_deadline: next || null }));
                        }}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors [color-scheme:dark]"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Capacity</label>
                        <input
                            type="number"
                            placeholder="Capacity"
                            value={coreFields.capacity ?? ''}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, capacity: e.target.value ? parseInt(e.target.value) : null }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Attendee Count</label>
                        <input
                            type="number"
                            placeholder="Attendee Count"
                            value={coreFields.attendee_count ?? ''}
                            disabled
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-muted cursor-not-allowed"
                        />
                    </div>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={coreFields.is_multi_day}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, is_multi_day: e.target.checked }))}
                        className="rounded border-default bg-background-tertiary text-accent-primary focus:ring-0"
                    />
                    <span className="text-sm text-foreground-tertiary">Multi-day Event</span>
                </label>
            </div>
        </div>
    );
}

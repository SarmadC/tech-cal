'use client';

import { Button } from '@/components/ui/button';
import type { BasicInfoSectionProps } from '../types';
import { toDateTimeLocalValue, parseDateTimeLocalValue } from '../types';
import { TIMEZONE_OPTIONS } from '@/types/career';

// Helper function to get UTC offset for a timezone
function getUTCOffset(timezone: string): string {
    try {
        const now = new Date();

        // Try to use Intl.DateTimeFormat with timeZoneName for direct offset
        try {
            const formatter = new Intl.DateTimeFormat('en', {
                timeZone: timezone,
                timeZoneName: 'longOffset',
            });
            const parts = formatter.formatToParts(now);
            const offsetPart = parts.find(p => p.type === 'timeZoneName');
            if (offsetPart) {
                // Format like "GMT+05:00" or "GMT-08:00" -> convert to "UTC+5" or "UTC-8"
                let offset = offsetPart.value.replace('GMT', 'UTC');
                // Simplify ":00" to just the hour
                offset = offset.replace(':00', '');
                return offset;
            }
        } catch {
            // Fall through to manual calculation
        }

        // Manual calculation: compare UTC time with timezone time
        // Get what "now" looks like in UTC vs the target timezone
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();

        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const tzParts = tzFormatter.formatToParts(now);
        const tzHours = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
        const tzMinutes = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');

        // Calculate difference
        let offsetMinutes = (tzHours * 60 + tzMinutes) - (utcHours * 60 + utcMinutes);

        // Handle day rollover (if difference is > 12 hours, it's probably the wrong direction)
        if (offsetMinutes > 12 * 60) {
            offsetMinutes -= 24 * 60;
        } else if (offsetMinutes < -12 * 60) {
            offsetMinutes += 24 * 60;
        }

        const sign = offsetMinutes >= 0 ? '+' : '-';
        const absOffsetMinutes = Math.abs(offsetMinutes);
        const offsetHours = Math.floor(absOffsetMinutes / 60);
        const offsetMins = absOffsetMinutes % 60;

        if (offsetMins === 0) {
            return `UTC${sign}${offsetHours}`;
        }
        return `UTC${sign}${offsetHours}:${offsetMins.toString().padStart(2, '0')}`;
    } catch {
        return '';
    }
}

export function BasicInfoSection({
    coreFields,
    setCoreFields,
    onExpandDescription,
}: Omit<BasicInfoSectionProps, 'expanded' | 'onToggle'>) {
    // Check if current timezone is in the options list
    const currentTimezoneInList = TIMEZONE_OPTIONS.some(tz => tz.value === coreFields.timezone);
    const currentTimezone = coreFields.timezone && !currentTimezoneInList
        ? {
            value: coreFields.timezone,
            label: `${coreFields.timezone} (${getUTCOffset(coreFields.timezone)})`,
            region: 'Other'
        }
        : null;

    // Group timezones by region and add UTC offset to labels
    const timezoneGroups = TIMEZONE_OPTIONS.reduce((groups, tz) => {
        if (!groups[tz.region]) groups[tz.region] = [];
        const offset = getUTCOffset(tz.value);
        groups[tz.region].push({
            ...tz,
            label: offset ? `${tz.label} (${offset})` : tz.label
        });
        return groups;
    }, {} as Record<string, Array<{ value: string; label: string; region: string }>>);

    // Add current timezone to groups if it's not in the list
    if (currentTimezone) {
        if (!timezoneGroups['Other']) timezoneGroups['Other'] = [];
        timezoneGroups['Other'].push(currentTimezone);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-default pb-2">
                <h3 className="text-lg font-medium text-foreground-primary">Basic Information</h3>
            </div>
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Description</label>
                    <div className="relative">
                        <textarea
                            placeholder="Description"
                            value={coreFields.description}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted resize-none"
                            rows={4}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onExpandDescription}
                            className="absolute right-0 top-0 text-xs text-foreground-muted hover:text-foreground-tertiary"
                        >
                            Expand
                        </Button>
                    </div>
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Location</label>
                    <input
                        type="text"
                        placeholder="Location"
                        value={coreFields.location}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                    />
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Timezone</label>
                    <select
                        value={coreFields.timezone || ''}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, timezone: e.target.value || '' }))}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors"
                    >
                        <option value="" className="bg-background-main">Select timezone</option>
                        {Object.entries(timezoneGroups).map(([region, timezones]) => (
                            <optgroup key={region} label={region} className="bg-background-main text-foreground-tertiary">
                                {timezones.map(tz => (
                                    <option key={tz.value} value={tz.value} className="bg-background-main text-foreground-primary">
                                        {tz.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {currentTimezone && (
                        <p className="text-xs text-amber-500/80">
                            Current timezone &quot;{coreFields.timezone}&quot; is not in the standard list. Please select a valid IANA timezone.
                        </p>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Start Date & Time</label>
                        <input
                            type="datetime-local"
                            value={toDateTimeLocalValue(coreFields.start_time)}
                            onChange={(e) => {
                                const next = parseDateTimeLocalValue(e.target.value);
                                setCoreFields(prev => ({ ...prev, start_time: next || null }));
                            }}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors [color-scheme:dark]"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">End Date & Time</label>
                        <input
                            type="datetime-local"
                            value={toDateTimeLocalValue(coreFields.end_time)}
                            onChange={(e) => {
                                const next = parseDateTimeLocalValue(e.target.value);
                                setCoreFields(prev => ({ ...prev, end_time: next || null }));
                            }}
                            className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors [color-scheme:dark]"
                        />
                    </div>
                </div>
                <div className="grid gap-2">
                    <label className="text-xs font-medium text-foreground-tertiary uppercase tracking-wide">Language</label>
                    <input
                        type="text"
                        placeholder="Language"
                        value={coreFields.language}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full bg-transparent border-b border-default px-2 py-2 text-sm text-foreground-primary focus:border-accent-primary focus:outline-none transition-colors placeholder:text-foreground-muted"
                    />
                </div>
            </div>
        </div>
    );
}

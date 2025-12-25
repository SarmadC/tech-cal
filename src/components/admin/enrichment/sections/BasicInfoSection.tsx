'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    expanded,
    onToggle,
    coreFields,
    setCoreFields,
    onExpandDescription,
}: BasicInfoSectionProps) {
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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Basic Information</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onToggle}>
                        {expanded ? 'Collapse' : 'Expand'}
                    </Button>
                </div>
            </CardHeader>
            {expanded && (
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <textarea
                            placeholder="Description"
                            value={coreFields.description}
                            onChange={(e) => setCoreFields(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border rounded"
                            rows={4}
                        />
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onExpandDescription}
                                aria-haspopup="dialog"
                            >
                                Expand editor
                            </Button>
                        </div>
                    </div>
                    <input
                        type="text"
                        placeholder="Location"
                        value={coreFields.location}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                    <select
                        value={coreFields.timezone || ''}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, timezone: e.target.value || '' }))}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="">Select timezone</option>
                        {Object.entries(timezoneGroups).map(([region, timezones]) => (
                            <optgroup key={region} label={region}>
                                {timezones.map(tz => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {currentTimezone && (
                        <p className="text-xs text-muted-foreground">
                            Current timezone &quot;{coreFields.timezone}&quot; is not in the standard list. Please select a valid IANA timezone.
                        </p>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-2">Start Date & Time</label>
                        <input
                            type="datetime-local"
                            value={toDateTimeLocalValue(coreFields.start_time)}
                            onChange={(e) => {
                                const next = parseDateTimeLocalValue(e.target.value);
                                setCoreFields(prev => ({ ...prev, start_time: next || null }));
                            }}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">End Date & Time</label>
                        <input
                            type="datetime-local"
                            value={toDateTimeLocalValue(coreFields.end_time)}
                            onChange={(e) => {
                                const next = parseDateTimeLocalValue(e.target.value);
                                setCoreFields(prev => ({ ...prev, end_time: next || null }));
                            }}
                            className="w-full px-3 py-2 border rounded"
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="Language"
                        value={coreFields.language}
                        onChange={(e) => setCoreFields(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-2 border rounded"
                    />
                </CardContent>
            )}
        </Card>
    );
}

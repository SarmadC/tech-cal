'use client';

import { FC, useMemo, useState } from 'react';
import { CaretRight } from '@phosphor-icons/react';
import MobileSheet from '@/components/common/mobile/MobileSheet';
import MobileSectionHeader from '@/components/common/mobile/MobileSectionHeader';
import MobileQuickDatePicker from './mobile/MobileQuickDatePicker';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import { SmartFilterOptions } from '@/hooks/useSmartFilters';
import type { UpdateFilterHandler } from '@/hooks/useUnifiedServerFiltering';
import { calculateFilterCounts } from '@/utils/filterCountUtils';
import type { Event, EventType } from '@/types';

export interface MobileSearchFilterProps {
    filters: SmartFilterOptions;
    onUpdateFilter: <K extends keyof SmartFilterOptions>(key: K, value: SmartFilterOptions[K]) => void;
    onResetFilters: () => void;
    activeFilterCount: number;
    isOpen: boolean;
    onClose: () => void;
    events: Event[];
    categories: EventType[];
}

function formatDateRangeLabel(range: SmartFilterOptions['dateRange']): string {
    if (!range.start && !range.end) {
        return 'Any date';
    }

    const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });

    if (range.start && range.end) {
        const sameYear = range.start.getFullYear() === range.end.getFullYear();
        const sameMonth = sameYear && range.start.getMonth() === range.end.getMonth();

        if (sameMonth) {
            return `${range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${range.end.getDate()}, ${range.end.getFullYear()}`;
        }

        return `${formatDate(range.start)} - ${formatDate(range.end)}`;
    }

    if (range.start) {
        return `From ${formatDate(range.start)}`;
    }

    return `Until ${formatDate(range.end as Date)}`;
}

const MobileSearchFilter: FC<MobileSearchFilterProps> = ({
    filters,
    onUpdateFilter,
    onResetFilters,
    activeFilterCount,
    isOpen,
    onClose,
    events,
    categories,
}) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const counts = useMemo(() => calculateFilterCounts(events, categories), [events, categories]);
    const dateRangeLabel = formatDateRangeLabel(filters.dateRange);
    const datePickerCurrentDate = filters.dateRange.start ?? filters.dateRange.end ?? new Date();
    const locationValue = filters.locations[0] ?? '';

    return (
        <>
            <MobileSheet
                open={isOpen}
                title="Calendar filters"
                showHeader={false}
                onClose={onClose}
            >
                <div className="space-y-4">
                    {activeFilterCount > 0 ? (
                        <div className="flex items-center justify-between">
                            <p className="text-[0.76rem] font-medium tracking-[0.01em] text-[var(--mobile-app-muted)]">
                                {activeFilterCount} active
                            </p>
                            <button
                                type="button"
                                onClick={onResetFilters}
                                className="mobile-discovery-inlineAction"
                            >
                                Reset filters
                            </button>
                        </div>
                    ) : null}

                    <div className="space-y-4">
                        <MobileSectionHeader
                            title="Categories and format"
                            className="mb-4"
                        />

                        <DiscoverySidebar
                            filters={{
                                format: filters.format,
                                cost: filters.cost,
                                categories: filters.categories || [],
                                tags: filters.tags || [],
                                locations: filters.locations || [],
                            }}
                            onUpdateFilter={onUpdateFilter as unknown as UpdateFilterHandler}
                            categories={categories}
                            events={events}
                            counts={counts}
                            mobileMode={true}
                        />
                    </div>

                    <div className="space-y-4">
                        <MobileSectionHeader
                            title="Location and timing"
                            className="mb-4"
                        />

                        <div className="space-y-3.5">
                            <div className="space-y-1.5">
                                <label htmlFor="mobile-calendar-location" className="mobile-discovery-filterLabel">
                                    Location
                                </label>
                                <label htmlFor="mobile-calendar-location" className="mobile-discovery-filterField">
                                    <input
                                        id="mobile-calendar-location"
                                        type="text"
                                        value={locationValue}
                                        onChange={(event) => onUpdateFilter('locations', event.target.value ? [event.target.value] : [])}
                                        onBlur={(event) => {
                                            const trimmed = event.target.value.trim();
                                            onUpdateFilter('locations', trimmed ? [trimmed] : []);
                                        }}
                                        placeholder="City or region"
                                        maxLength={100}
                                        className="mobile-discovery-filterInput"
                                    />
                                </label>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="mobile-calendar-date-range" className="mobile-discovery-filterLabel">
                                    Date range
                                </label>
                                <button
                                    id="mobile-calendar-date-range"
                                    type="button"
                                    onClick={() => setIsDatePickerOpen(true)}
                                    className="mobile-discovery-filterField"
                                    aria-label="Select date range"
                                    data-empty={dateRangeLabel === 'Any date'}
                                >
                                    <span className="mobile-discovery-filterFieldValue">{dateRangeLabel}</span>
                                    <CaretRight size={14} className="mobile-discovery-filterFieldChevron" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </MobileSheet>

            <MobileQuickDatePicker
                currentDate={datePickerCurrentDate}
                onDateChange={() => { }}
                view="month"
                isOpen={isDatePickerOpen}
                onClose={() => setIsDatePickerOpen(false)}
                mode="range"
                dateRange={filters.dateRange}
                onDateRangeChange={(range) => onUpdateFilter('dateRange', range)}
            />
        </>
    );
};

export default MobileSearchFilter;

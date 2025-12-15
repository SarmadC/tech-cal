'use client';

import React, { useState } from 'react';
import MockEventDetailPanel from '@/components/calendar/MockEventDetailPanel';
import DiscoveryLayout from '@/components/discovery/DiscoveryLayout';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';
import DemoEventCard from './DemoEventCard';
import { MOCK_EVENTS, MOCK_CATEGORIES } from './MockData';
import { mockEvent, mockEventCategories } from '@/mocks/mockEvent';
import { UnifiedFilterOptions } from '@/hooks/useUnifiedServerFiltering';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateFilterCounts, normalizeEventFormat, isEventFree } from '@/utils/filterCountUtils';
import { createDefaultUnifiedFilters } from '@/hooks/useUnifiedServerFiltering';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Event } from '@/types';

export default function ProductDemoSection() {
    // Local state for the demo to feel interactive
    const [filters, setFilters] = useState<UnifiedFilterOptions>(
        createDefaultUnifiedFilters({
            pageSize: 10
        })
    );

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [bookmarkedEventIds, setBookmarkedEventIds] = useState<Set<string>>(() => new Set());
    const { showSuccess, showInfo } = useSnackbar();

    // Filter logic to make the demo functional!
    const activeFilterCount = [
        filters.searchTerm ? 1 : 0,
        filters.locations?.length ? 1 : 0,
        filters.format !== 'all' ? 1 : 0,
        filters.cost !== 'all' ? 1 : 0,
        filters.categories.length ? 1 : 0,
        filters.tags.length ? 1 : 0,
        (filters.dateRange.start || filters.dateRange.end) ? 1 : 0
    ].reduce((a, b) => a + b, 0);

    const filteredEvents = MOCK_EVENTS.filter(event => {
        // Search
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            const inTitle = event.title.toLowerCase().includes(term);
            const inDesc = event.description?.toLowerCase().includes(term);
            const inTags = (event.tags || []).some(tag => tag.name?.toLowerCase().includes(term));
            if (!inTitle && !inDesc && !inTags) {
                return false;
            }
        }
        // Format
        if (filters.format !== 'all') {
            const evtFormat = normalizeEventFormat(event.eventFormat);
            if (evtFormat !== filters.format) return false;
        }
        // Cost
        if (filters.cost !== 'all') {
            const isFree = isEventFree(event);
            if (filters.cost === 'free' && !isFree) return false;
            if (filters.cost === 'paid' && isFree) return false;
        }
        // Categories
        if (filters.categories.length > 0) {
            const eventCategoryId = event.eventTypeId || event.category?.id;
            if (!eventCategoryId || !filters.categories.includes(eventCategoryId)) {
                return false;
            }
        }
        // Tags
        if (filters.tags.length > 0) {
            const eventTags = (event.tags || []).map(tag => tag.name?.toLowerCase().trim()).filter(Boolean);
            const filterTags = filters.tags.map(tag => tag.toLowerCase().trim());
            // Event must have at least one of the selected tags
            const hasMatchingTag = filterTags.some(filterTag => 
                eventTags.some(eventTag => eventTag === filterTag)
            );
            if (!hasMatchingTag) {
                return false;
            }
        }
        return true;
    });

    const handleUpdateFilter = (key: keyof UnifiedFilterOptions, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const counts = calculateFilterCounts(MOCK_EVENTS, MOCK_CATEGORIES);

    const handleBookmark = (event: Event) => {
        const alreadyBookmarked = bookmarkedEventIds.has(event.id);

        setBookmarkedEventIds((prev) => {
            const next = new Set(prev);
            if (alreadyBookmarked) {
                next.delete(event.id);
            } else {
                next.add(event.id);
            }
            return next;
        });

        if (alreadyBookmarked) {
            showInfo(`Removed “${event.title}” from bookmarks (demo only).`, 3500);
        } else {
            showSuccess(`Saved “${event.title}” to bookmarks (demo only).`, 4000);
        }
    };

    return (
        <section className="product-demo-section relative overflow-hidden bg-background flex flex-col items-center justify-center px-4 py-24 md:py-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_0)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:60px_60px]" />
            <div className="absolute h-full w-full bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />

            <div className="container mx-auto px-0 sm:px-4 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        <span className="text-gradient-mono">Powerful Discovery</span>
                        <br />
                        <span className="text-muted-foreground text-3xl md:text-4xl font-normal">
                            Built for efficiency
                        </span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Experience the actual interface. Filter by stack, location, or price.
                        <br />
                        No clutter, just the events that matter to your career.
                    </p>
                </div>

            </div>

            {/* The Demo Interface Wrapper - Enhanced Glass Effect */}
            <div className="w-full max-w-[1400px] mx-auto relative group perspective-1000">
                {/* Glow Background */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-[35px] blur-xl opacity-30 dark:opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

                <div className="relative rounded-[32px] border border-border/70 dark:border-white/10 shadow-2xl bg-card/95 dark:bg-[#0a0a0a]/80 backdrop-blur-xl overflow-hidden transform transition-all duration-700 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(0,0,0,0.45)] dark:hover:shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-colors">

                    {/* Top Bar Accent */}
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-30 dark:opacity-60" />

                    {/* Reusing the Actual App Components */}
                    <div className="p-2 md:p-4 lg:p-6 opacity-95 hover:opacity-100 transition-opacity">
                        <DiscoveryLayout
                            isSidebarOpen={isSidebarOpen}
                            onSidebarClose={() => setIsSidebarOpen(false)}
                            sidebar={
                                <DiscoverySidebar
                                    filters={{
                                        format: filters.format,
                                        cost: filters.cost,
                                        categories: filters.categories,
                                        tags: filters.tags
                                    }}
                                    onUpdateFilter={handleUpdateFilter}
                                    categories={MOCK_CATEGORIES}
                                    events={filteredEvents}
                                    counts={counts}
                                />
                            }
                            header={
                                <DiscoveryHeader
                                    searchTerm={filters.searchTerm}
                                    onSearchChange={(val) => handleUpdateFilter('searchTerm', val)}
                                    location={filters.locations[0] || ''}
                                    onLocationChange={(val) => handleUpdateFilter('locations', val ? [val] : [])}
                                    dateRange={filters.dateRange}
                                    onDateRangeChange={(range) => handleUpdateFilter('dateRange', range)}
                                    onSearch={() => { }}
                                    onResetFilters={() => setFilters(createDefaultUnifiedFilters({ pageSize: 10 }))}
                                    activeFilterCount={activeFilterCount}
                                    onFilterClick={() => setIsSidebarOpen(true)}
                                    onNearMeClick={() => { }}
                                    isDetectingLocation={false}
                                />
                            }
                            resultCount={filteredEvents.length}
                            sortOption={
                                <Select
                                    value={filters.sortBy}
                                    onValueChange={(value) => handleUpdateFilter('sortBy', value)}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="popularity">Popularity</SelectItem>
                                    </SelectContent>
                                </Select>
                            }
                        >
                            {filteredEvents.map((event) => (
                                <DemoEventCard
                                    key={event.id}
                                    event={event}
                                    // Disable navigation for demo, open mock details instead
                                    onClick={() => setIsDetailOpen(true)}
                                    isBookmarked={bookmarkedEventIds.has(event.id)}
                                    onBookmark={() => handleBookmark(event)}
                                />
                            ))}
                        </DiscoveryLayout>
                    </div>
                </div>
            </div>

            <MockEventDetailPanel
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                event={mockEvent}
                categories={mockEventCategories}
            />
        </section>
    );
}

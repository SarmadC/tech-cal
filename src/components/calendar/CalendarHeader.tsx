'use client';

import { FC, useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // 1. IMPORT ROUTER HOOKS
import { MaterialIcon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { formatDateForURL } from '@/utils/dateUtils';
import QuickDatePicker from '@/components/calendar/QuickDatePicker';
import { Event } from '@/types/events';

type CalendarViewType = 'month' | 'week' | 'day';

export interface CalendarHeaderProps {
    currentDate: Date;
    onNavigate: (dir: 'prev' | 'next' | 'today') => void;
    // --- The 'view' prop is now derived from the URL, not passed from the parent ---
    // --- The 'onChangeView' prop is replaced by the new router logic ---
    onToggleFilters: () => void;
    isFilterPanelOpen: boolean;
    activeFilterCount: number;
    events?: Event[];
    // Sidebar toggle props
    onToggleSidebar?: () => void;
    isSidebarOpen?: boolean;
}

const CalendarHeader: FC<CalendarHeaderProps> = ({
    currentDate,
    onNavigate,
    onToggleFilters,
    isFilterPanelOpen,
    activeFilterCount,
    events = [],
    onToggleSidebar: _onToggleSidebar,
    isSidebarOpen: _isSidebarOpen = true
}) => {
    const router = useRouter(); // 2. INITIALIZE THE ROUTER
    const searchParams = useSearchParams(); // 3. GET CURRENT URL PARAMS

    // 4. DERIVE THE CURRENT VIEW from the URL, defaulting to 'month'
    const view = (searchParams.get('view') as CalendarViewType) || 'month';

    // 5. NEW HANDLER to change the view by navigating to a new URL
    const handleViewChange = useCallback((newView: CalendarViewType) => {
        // Preserve existing URL parameters and update the view
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', newView);
        router.push(`/calendar?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    // Active date context
    const monthYearLabel = useMemo(() => {
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [currentDate]);
    const hasAppliedFilters = activeFilterCount > 0;
    const isFilterButtonActive = isFilterPanelOpen || hasAppliedFilters;
    const filterButtonLabel = activeFilterCount > 0
        ? `Filters, ${activeFilterCount} active`
        : 'Filters';

    // Go to date quick picker
    // Quick date picker state
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const openDatePicker = useCallback(() => setIsDatePickerOpen(true), []);
    const closeDatePicker = useCallback(() => setIsDatePickerOpen(false), []);
    const handleQuickDateChange = useCallback((date: Date) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('date', formatDateForURL(date));
        router.push(`/calendar?${params.toString()}`, { scroll: false });
    }, [router, searchParams]);

    // Keyboard shortcuts: ←/→ to navigate, T for Today, M/W/D to switch views
    useEffect(() => {
        const isEditableTarget = (el: EventTarget | null) => {
            if (!(el instanceof HTMLElement)) return false;
            const tag = el.tagName;
            const editableTags = ['INPUT', 'TEXTAREA', 'SELECT'];
            return editableTags.includes(tag) || el.isContentEditable;
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target) || isDatePickerOpen) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    onNavigate('prev');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    onNavigate('next');
                    break;
                case 't':
                case 'T':
                    e.preventDefault();
                    onNavigate('today');
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    handleViewChange('month');
                    break;
                case 'w':
                case 'W':
                    e.preventDefault();
                    handleViewChange('week');
                    break;
                case 'd':
                case 'D':
                    e.preventDefault();
                    handleViewChange('day');
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNavigate, handleViewChange, isDatePickerOpen]);

    return (
        <header className="h-14 flex-shrink-0 px-4 flex items-center justify-between border-b border-border-subtle bg-background-secondary/50 backdrop-blur-sm z-50 transition-colors">
            {/* Left Group: Navigation & Context */}
            <div className="flex items-center gap-3">
                {/* Today Button - Ghost style */}
                <button
                    onClick={() => onNavigate('today')}
                    className="text-xs font-medium text-foreground-secondary hover:text-foreground-primary px-3 py-1.5 rounded-md border border-border-subtle hover:bg-background-tertiary transition-colors shadow-xs"
                    aria-label="Go to today"
                >
                    Today
                </button>

                {/* Navigation Arrows Group */}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onNavigate('prev')}
                        className="p-1 text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary rounded transition-colors"
                        aria-label="Previous period"
                    >
                        <MaterialIcon name="chevron_left" size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onNavigate('next')}
                        className="p-1 text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary rounded transition-colors"
                        aria-label="Next period"
                    >
                        <MaterialIcon name="chevron_right" size={20} />
                    </button>
                </div>

                {/* Date Label - Clickable for Picker */}
                <div className="relative ml-1">
                    <button
                        type="button"
                        onClick={openDatePicker}
                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-background-tertiary transition-colors group"
                        aria-expanded={isDatePickerOpen}
                        aria-haspopup="dialog"
                    >
                        <span className="text-sm font-medium text-foreground-primary group-hover:text-foreground-primary transition-colors">
                            {monthYearLabel}
                        </span>
                        <MaterialIcon name="expand-more" size={16} className="text-foreground-tertiary group-hover:text-foreground-secondary" />
                    </button>

                    {/* Date Picker Popover Positioned Relative to this button */}
                    {/* Note: QuickDatePicker manages its own positioning via a wrapper or fixed positioning. 
                        We keep it here to maintain logical proximity, though visually it might need adjustment if it's not a true popover.
                        The existing QuickDatePicker implementation seems to be a modal/popover. 
                     */}
                </div>
            </div>

            {/* Right Group: Tools & View Switcher */}
            <div className="flex items-center gap-4">
                {/* Filter Toggle */}
                <button
                    onClick={onToggleFilters}
                    className={`group relative flex h-9 min-w-9 items-center justify-center rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/20 ${hasAppliedFilters
                        ? 'border-accent-primary/25 bg-accent-primary/[0.08] text-accent-primary'
                        : isFilterButtonActive
                            ? 'border-border-default bg-background-secondary text-foreground-primary'
                            : 'border-border-subtle/70 bg-background-secondary/60 text-foreground-tertiary hover:border-border-default hover:bg-background-tertiary hover:text-foreground-primary'
                        }`}
                    aria-label={filterButtonLabel}
                    title={filterButtonLabel}
                >
                    <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"></path>
                        </svg>
                    </div>
                    {hasAppliedFilters && (
                        <span className="pointer-events-none absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-accent-primary/90" aria-hidden="true"></span>
                    )}
                </button>

                <div className="h-4 w-[1px] bg-border-subtle mx-1"></div>

                {/* View Switcher Segmented Control */}
                <div className="flex items-center p-0.5 bg-background-tertiary rounded-lg border border-border-subtle/50">
                    {(['month', 'week', 'day'] as CalendarViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => handleViewChange(v)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${view === v
                                ? 'bg-background-elevated text-foreground-primary shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-elevated/50'
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                <div className="h-4 w-[1px] bg-border-subtle mx-1 hidden md:block"></div>

                {/* Theme Actions */}
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                </div>
            </div>

            {/* Themed Quick Date Picker - Kept at root of header for z-index context if needed, 
                 though ideally it should use a portal. 
                 Passed anchor element usually? The current implementation likely handles its own positioning 
                 or is a centered modal. Let's check QuickDatePicker implementation if needed, 
                 but for now we place it here properly.
             */}
            <QuickDatePicker
                currentDate={currentDate}
                onDateChange={handleQuickDateChange}
                view={view}
                isOpen={isDatePickerOpen}
                onClose={closeDatePicker}
                events={events}
            />
        </header>
    );
};

export default CalendarHeader;

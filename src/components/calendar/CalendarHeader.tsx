'use client';

import { FC, useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; // 1. IMPORT ROUTER HOOKS
import { MaterialIcon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/common/UserMenu';
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
    const { user } = useAuth();
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

    const dateContextLabel = useMemo(() => {
        if (view === 'week') {
            // Show the focused date for context in week view
            return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        if (view === 'day') {
            return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        }
        // Month view: still show the date for context, compact
        return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }, [currentDate, view]);

    const isToday = useMemo(() => {
        const today = new Date();
        return currentDate.toDateString() === today.toDateString();
    }, [currentDate]);

    const todayButtonLabel = useMemo(() => {
        if (isToday) return 'Today';
        const shortDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `Today (${shortDate})`;
    }, [isToday, currentDate]);

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
        <header className="h-20 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-border-subtle">
            {/* Left Section: Month label */}
            <div className="flex items-center space-x-4">
                {/* Navigation arrows + Month/Year + date context */}
                <div className="hidden md:flex items-center gap-2" aria-live="polite">
                    <button
                        type="button"
                        onClick={() => onNavigate('prev')}
                        className="p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary"
                        aria-label="Previous period"
                    >
                        <MaterialIcon name="chevron_left" size={16} />
                    </button>
                    <div className="text-foreground-primary font-medium select-none">
                        <span>{monthYearLabel}</span>
                        <span className="text-foreground-secondary text-sm ml-2">• {dateContextLabel}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => onNavigate('next')}
                        className="p-1.5 rounded-lg text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary"
                        aria-label="Next period"
                    >
                        <MaterialIcon name="chevron_right" size={16} />
                    </button>
                </div>
            </div>

            {/* Center Section: Calendar Controls */}
            <div className="flex items-center space-x-2 md:space-x-4">
                {/* Today button */}
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => onNavigate('today')}
                        className="text-sm px-3 py-1.5 rounded-lg hover:bg-background-tertiary transition-colors"
                        aria-pressed={isToday}
                        aria-label={isToday ? 'Go to today' : `Go to today, ${todayButtonLabel}`}
                    >
                        {todayButtonLabel}
                    </button>
                </div>

                {/* Desktop View Switcher Buttons */}
                <div className="hidden md:flex items-center bg-background-tertiary p-1 rounded-lg">
                    {(['month', 'week', 'day'] as CalendarViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => handleViewChange(v)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${view === v
                                    ? 'bg-background-elevated text-foreground-primary shadow-sm'
                                    : 'text-foreground-secondary hover:text-foreground-primary'
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Section: Filters and User Menu (No changes here) */}
            <div className="flex items-center space-x-4">
                <button
                    onClick={onToggleFilters}
                    className={`filter-toggle-button ${isFilterPanelOpen ? 'active' : ''}`}
                    aria-label="Toggle smart filters"
                >
                    <MaterialIcon name="filter" size={16} />
                    {activeFilterCount > 0 && (
                        <div className="filter-count-badge">
                            {activeFilterCount}
                        </div>
                    )}
                </button>

                {/* Go to date button */}
                <div className="hidden md:flex items-center">
                    <button
                        type="button"
                        className="flex items-center gap-2 text-sm px-3 py-1.5 bg-background-tertiary rounded-lg hover:bg-background-elevated transition-colors"
                        onClick={openDatePicker}
                        aria-haspopup="dialog"
                        aria-expanded={isDatePickerOpen}
                        aria-label="Open go to date picker"
                    >
                        <MaterialIcon name="event" size={16} />
                        Go to date
                    </button>
                </div>

                {/* Themed Quick Date Picker Popover */}
                    <QuickDatePicker
                        currentDate={currentDate}
                        onDateChange={handleQuickDateChange}
                        view={view}
                        isOpen={isDatePickerOpen}
                        onClose={closeDatePicker}
                        events={events}
                    />

                <ThemeToggle />

                {user ? (
                    <UserMenu />
                ) : (
                    <Link href="/login">
                        <button className="text-sm px-4 py-2 bg-accent-primary !text-accent-primary-foreground rounded-lg hover:bg-accent-primary-hover transition-colors">
                            Sign In
                        </button>
                    </Link>
                )}
            </div>
        </header>
    );
};

export default CalendarHeader;
'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; // 1. IMPORT ROUTER HOOKS
import { LayoutDashboard, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/common/UserMenu';

type CalendarViewType = 'month' | 'week' | 'day';

export interface CalendarHeaderProps {
    currentDate: Date;
    onNavigate: (dir: 'prev' | 'next' | 'today') => void;
    // --- The 'view' prop is now derived from the URL, not passed from the parent ---
    // --- The 'onChangeView' prop is replaced by the new router logic ---
    onToggleFilters: () => void;
    isFilterPanelOpen: boolean;
    activeFilterCount: number;
}

const CalendarHeader: FC<CalendarHeaderProps> = ({
    currentDate: _currentDate,
    onNavigate,
    onToggleFilters,
    isFilterPanelOpen,
    activeFilterCount
}) => {
    const { user } = useAuth();
    const router = useRouter(); // 2. INITIALIZE THE ROUTER
    const searchParams = useSearchParams(); // 3. GET CURRENT URL PARAMS

    // 4. DERIVE THE CURRENT VIEW from the URL, defaulting to 'month'
    const view = (searchParams.get('view') as CalendarViewType) || 'month';

    // 5. NEW HANDLER to change the view by navigating to a new URL
    const handleViewChange = (newView: CalendarViewType) => {
        // This pushes a new URL to the browser history, triggering a re-render
        // of the server component (`calendar/page.tsx`) with the new search param.
        router.push(`/calendar?view=${newView}`);
    };

    return (
        <header className="h-20 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-border-subtle">
            {/* Left Section: Branding */}
            <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="p-2 text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary rounded-lg transition-colors" title="Go to Dashboard">
                    <LayoutDashboard className="w-5 h-5" />
                </Link>
            </div>

            {/* Center Section: Calendar Controls */}
            <div className="flex items-center space-x-2 md:space-x-4">
                {/* Keep only the Today button */}
                <div className="flex items-center space-x-1">
                    <button onClick={() => onNavigate('today')} className="text-sm px-3 py-1.5 border border-border-default rounded-lg hover:bg-background-tertiary transition-colors">Today</button>
                </div>

                {/* [MODIFIED] View Switcher Buttons */}
                <div className="hidden md:flex items-center bg-background-tertiary p-1 rounded-lg">
                    {(['month', 'week', 'day'] as CalendarViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => handleViewChange(v)} // 6. USE THE NEW HANDLER
                            className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${view === v // 7. The active state is now based on the URL-derived view
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
                    <Filter className="w-4 h-4" />
                    {activeFilterCount > 0 && (
                        <div className="filter-count-badge">
                            {activeFilterCount}
                        </div>
                    )}
                </button>
                {user ? (
                    <UserMenu />
                ) : (
                    <Link href="/login">
                        <button className="text-sm px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors">
                            Sign In
                        </button>
                    </Link>
                )}
            </div>
        </header>
    );
};

export default CalendarHeader;
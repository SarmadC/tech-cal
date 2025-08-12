// src/components/calendar/CalendarHeader.tsx
'use client';

import { FC } from 'react';
import Link from 'next/link';
// 1. IMPORT THE FILTER ICON
import { ChevronLeft, ChevronRight, LayoutDashboard, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/common/UserMenu';

type CalendarViewType = 'month' | 'week' | 'day';

export interface CalendarHeaderProps {
    // Existing props
    currentDate: Date;
    view: CalendarViewType;
    onNavigate: (dir: 'prev' | 'next' | 'today') => void;
    onChangeView: (view: CalendarViewType) => void;
    // 2. ADD NEW PROPS FOR FILTERS
    onToggleFilters: () => void;
    isFilterPanelOpen: boolean;
    activeFilterCount: number;
}

const CalendarHeader: FC<CalendarHeaderProps> = ({
    // Existing props
    currentDate,
    view,
    onNavigate,
    onChangeView,
    // New props
    onToggleFilters,
    isFilterPanelOpen,
    activeFilterCount
}) => {
    const { user } = useAuth();

    return (
        <header className="h-20 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-border-subtle">
            {/* Left Section: Branding and Title (No changes here) */}
            <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="p-2 text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary rounded-lg transition-colors" title="Go to Dashboard">
                    <LayoutDashboard className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-semibold text-foreground-primary hidden sm:block">
                    {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </h1>
            </div>

            {/* Center Section: Calendar Controls (No changes here) */}
            <div className="flex items-center space-x-2 md:space-x-4">
                <div className="flex items-center space-x-1">
                    <button onClick={() => onNavigate('prev')} className="p-2 text-foreground-secondary hover:bg-background-tertiary rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={() => onNavigate('today')} className="text-sm px-3 py-1.5 border border-border-default rounded-lg hover:bg-background-tertiary transition-colors">Today</button>
                    <button onClick={() => onNavigate('next')} className="p-2 text-foreground-secondary hover:bg-background-tertiary rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
                </div>
                <div className="hidden md:flex items-center bg-background-tertiary p-1 rounded-lg">
                    {(['month', 'week', 'day'] as CalendarViewType[]).map(v => (
                        <button
                            key={v}
                            onClick={() => onChangeView(v)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${view === v ? 'bg-background-elevated text-foreground-primary shadow-sm' : 'text-foreground-secondary hover:text-foreground-primary'}`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Section: Filters and User Menu */}
            <div className="flex items-center space-x-4">
                {/* 3. ADD THE NEW STATE-AWARE SMART FILTERS BUTTON */}
                <button
                    onClick={onToggleFilters}
                    // The `active` class is applied conditionally based on the panel's state
                    className={`filter-toggle-button ${isFilterPanelOpen ? 'active' : ''}`}
                    aria-label="Toggle smart filters"
                >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Smart Filters</span>
                    {/* The count badge only renders if there are active filters */}
                    {activeFilterCount > 0 && (
                        <div className="filter-count-badge">
                            {activeFilterCount}
                        </div>
                    )}
                </button>

                {/* The existing UserMenu component */}
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
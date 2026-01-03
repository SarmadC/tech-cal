'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';
import MobileQuickDatePicker from './MobileQuickDatePicker';

export interface MobileCalendarControlsProps {
    currentDate: Date;
    onToggleSearchFilter?: () => void;
    onToggleCalendarCollapse?: () => void;
    onDateChange?: (date: Date) => void;
    isCalendarCollapsed?: boolean;
    activeFilterCount?: number;
    className?: string;
}

const MobileCalendarControls: React.FC<MobileCalendarControlsProps> = ({
    currentDate,
    onToggleSearchFilter,
    onToggleCalendarCollapse,
    onDateChange,
    isCalendarCollapsed = false,
    activeFilterCount = 0,
    className = ''
}) => {
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPressRef = useRef(false);

    // Long-press handler for month button
    const handleMonthButtonPressStart = () => {
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            setIsMonthPickerOpen(true);
        }, 500); // 500ms for long press
    };

    const handleMonthButtonPressEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        // Reset flag after a short delay to allow click handler to check it
        setTimeout(() => {
            if (!isMonthPickerOpen) {
                isLongPressRef.current = false;
            }
        }, 100);
    };

    const handleMonthButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
        // If it was a long press, don't trigger collapse toggle
        if (isLongPressRef.current || isMonthPickerOpen) {
            e.preventDefault();
            e.stopPropagation();
            isLongPressRef.current = false;
            return;
        }
        // Otherwise, toggle calendar collapse
        onToggleCalendarCollapse?.();
    };

    const handleDateChange = (date: Date) => {
        onDateChange?.(date);
        setIsMonthPickerOpen(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
            }
        };
    }, []);

    return (
        <div className={`mobile-calendar-controls ${className}`} role="toolbar" aria-label="Calendar controls">
            <div className="mobile-calendar-controls-content">
                {/* Month Dropdown - Far Left */}
                <button
                    onClick={handleMonthButtonClick}
                    onTouchStart={handleMonthButtonPressStart}
                    onTouchEnd={handleMonthButtonPressEnd}
                    onMouseDown={handleMonthButtonPressStart}
                    onMouseUp={handleMonthButtonPressEnd}
                    onMouseLeave={handleMonthButtonPressEnd}
                    className={`mobile-month-dropdown ${isCalendarCollapsed ? 'collapsed' : ''}`}
                    aria-label={isCalendarCollapsed ? "Expand calendar" : "Collapse calendar"}
                >
                    <span className="month-text">{monthName}</span>
                    <MaterialIcon
                        name="expand-more"
                        size={20}
                        className="month-chevron"
                    />
                </button>

                {/* Spacer to push right elements to the right */}
                <div className="mobile-nav-spacer"></div>

                {/* Right side buttons */}
                <div className="mobile-nav-right-buttons">
                    {/* Search Filter Button */}
                    {onToggleSearchFilter && (
                        <button
                            onClick={onToggleSearchFilter}
                            className="mobile-search-filter-button"
                            aria-label="Open search and filters"
                        >
                            <MaterialIcon name="search" size={20} />
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="mobile-filter-count-badge">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Month Quick Date Picker */}
            {onDateChange && (
                <MobileQuickDatePicker
                    currentDate={currentDate}
                    onDateChange={handleDateChange}
                    view="month"
                    isOpen={isMonthPickerOpen}
                    onClose={() => setIsMonthPickerOpen(false)}
                />
            )}
        </div>
    );
};

export default MobileCalendarControls;


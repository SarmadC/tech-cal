'use client';

import { FC, useState, useCallback } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import MobileQuickDatePicker from './MobileQuickDatePicker';

export interface MobileNavigationControlsProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'month' | 'week' | 'day';
    onNavigate: (direction: 'prev' | 'next') => void;
    onGoToToday: () => void;
    className?: string;
}

const MobileNavigationControls: FC<MobileNavigationControlsProps> = ({
    currentDate,
    onDateChange,
    view,
    onNavigate: _onNavigate,
    onGoToToday,
    className = ''
}) => {
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleOpenDatePicker = useCallback(() => {
        setIsDatePickerOpen(true);
    }, []);

    const handleCloseDatePicker = useCallback(() => {
        setIsDatePickerOpen(false);
    }, []);

    const handleDateChange = useCallback((date: Date) => {
        onDateChange(date);
        setIsDatePickerOpen(false);
    }, [onDateChange]);

    const formatDateDisplay = (date: Date) => {
        switch (view) {
            case 'month':
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                });
            case 'week':
                const startOfWeek = new Date(date);
                const dayOfWeek = startOfWeek.getDay();
                const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            case 'day':
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                });
            default:
                return date.toLocaleDateString('en-US');
        }
    };

    const isToday = () => {
        const today = new Date();
        return currentDate.toDateString() === today.toDateString();
    };

    return (
        <>
            <div className={`mobile-navigation-controls ${className}`}>

                {/* Date Display & Quick Actions */}
                <div className="mobile-date-section">
                    <button
                        onClick={handleOpenDatePicker}
                        className="mobile-date-display-button"
                        aria-label="Open date picker"
                    >
                        <div className="mobile-date-display">
                            <span className="mobile-date-text">{formatDateDisplay(currentDate)}</span>
                            <MaterialIcon name="expand-more" size={16} />
                        </div>
                    </button>

                    {/* Go to Today Button */}
                    <Button
                        onClick={onGoToToday}
                        variant={isToday() ? "default" : "outline"}
                        size="sm"
                        className={`mobile-today-button ${isToday() ? 'active' : ''}`}
                        aria-label="Go to today"
                    >
                        <MaterialIcon name="calendar" size={16} />
                        <span className="mobile-today-text">Today</span>
                    </Button>
                </div>
            </div>

            {/* Quick Date Picker Modal */}
            <MobileQuickDatePicker
                currentDate={currentDate}
                onDateChange={handleDateChange}
                view={view}
                isOpen={isDatePickerOpen}
                onClose={handleCloseDatePicker}
            />
        </>
    );
};

export default MobileNavigationControls;

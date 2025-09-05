'use client';

import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { MaterialIcon } from '@/components/ui/Icon';

export interface QuickDatePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'month' | 'week' | 'day';
    isOpen: boolean;
    onClose: () => void;
}

const QuickDatePicker: FC<QuickDatePickerProps> = ({
    currentDate,
    onDateChange,
    view,
    isOpen,
    onClose
}) => {
    const [selectedDate, setSelectedDate] = useState(currentDate);
    const [isAnimating, setIsAnimating] = useState(false);
    const [direction, setDirection] = useState<'prev' | 'next' | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Update selected date when currentDate changes
    useEffect(() => {
        setSelectedDate(currentDate);
    }, [currentDate]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    const navigateDate = useCallback((direction: 'prev' | 'next') => {
        if (isAnimating) return;

        setDirection(direction);
        setIsAnimating(true);

        const newDate = new Date(selectedDate);
        
        switch (view) {
            case 'month':
                newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
                break;
            case 'day':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
                break;
        }

        setSelectedDate(newDate);

        // Reset animation state after transition
        setTimeout(() => {
            setIsAnimating(false);
            setDirection(null);
        }, 300);
    }, [selectedDate, view, isAnimating]);

    const handleDateSelect = useCallback((date: Date) => {
        onDateChange(date);
        onClose();
    }, [onDateChange, onClose]);

    const goToToday = useCallback(() => {
        const today = new Date();
        setSelectedDate(today);
        onDateChange(today);
        onClose();
    }, [onDateChange, onClose]);

    const formatDateDisplay = (date: Date) => {
        switch (view) {
            case 'month':
                return date.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                });
            case 'week':
                const startOfWeek = new Date(date);
                const dayOfWeek = startOfWeek.getDay();
                const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            case 'day':
                return date.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                });
            default:
                return date.toLocaleDateString('en-US');
        }
    };

    const generateQuickDates = () => {
        const dates = [];
        const today = new Date();
        
        // Add today
        dates.push({ date: new Date(today), label: 'Today', isToday: true });
        
        // Add tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        dates.push({ date: tomorrow, label: 'Tomorrow', isToday: false });
        
        // Add next week
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        dates.push({ date: nextWeek, label: 'Next Week', isToday: false });
        
        // Add next month
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        dates.push({ date: nextMonth, label: 'Next Month', isToday: false });
        
        return { dates, today };
    };

    if (!isOpen) return null;

    return (
        <div className="quick-date-picker-overlay">
            <div 
                ref={pickerRef}
                className={`quick-date-picker ${isAnimating ? 'animating' : ''} ${direction ? `slide-${direction}` : ''}`}
            >
                {/* Header */}
                <div className="quick-date-picker-header">
                    <button
                        onClick={onClose}
                        className="quick-date-picker-close"
                        aria-label="Close date picker"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                    <h3 className="quick-date-picker-title">Jump to Date</h3>
                    <button
                        onClick={goToToday}
                        className="quick-date-picker-today"
                        aria-label="Go to today"
                    >
                        Today
                    </button>
                </div>

                {/* Current Date Display */}
                <div className="quick-date-picker-current">
                    <div className="current-date-display">
                        {formatDateDisplay(selectedDate)}
                    </div>
                    
                    {/* Navigation Controls */}
                    <div className="date-navigation-controls">
                        <button
                            onClick={() => navigateDate('prev')}
                            className="date-nav-button"
                            disabled={isAnimating}
                            aria-label={`Previous ${view}`}
                        >
                            <MaterialIcon name="arrow_back" size={24} />
                        </button>
                        
                        <button
                            onClick={() => navigateDate('next')}
                            className="date-nav-button"
                            disabled={isAnimating}
                            aria-label={`Next ${view}`}
                        >
                            <MaterialIcon name="chevron_right" size={24} />
                        </button>
                    </div>
                </div>

                {/* Quick Date Options */}
                <div className="quick-date-options">
                    <h4 className="quick-date-section-title">Quick Select</h4>
                    <div className="quick-date-list">
                        {(() => {
                            const { dates, today } = generateQuickDates();
                            return dates.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleDateSelect(item.date)}
                                    className={`quick-date-option ${item.isToday ? 'today' : ''}`}
                                >
                                    <div className="quick-date-option-content">
                                        <span className="quick-date-option-label">{item.label}</span>
                                        <span className="quick-date-option-date">
                                            {item.date.toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric',
                                                year: item.date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                                            })}
                                        </span>
                                    </div>
                                    <MaterialIcon name="chevron_right" size={16} />
                                </button>
                            ));
                        })()}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="quick-date-picker-actions">
                    <button
                        onClick={onClose}
                        className="quick-date-picker-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleDateSelect(selectedDate)}
                        className="quick-date-picker-confirm"
                    >
                        Go to {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickDatePicker;

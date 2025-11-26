'use client';

import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';

export interface MobileQuickDatePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'month' | 'week' | 'day';
    isOpen: boolean;
    onClose: () => void;
}

const MobileQuickDatePicker: FC<MobileQuickDatePickerProps> = ({
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

    const overlayContent = (
        <div className="mobile-quick-date-picker-overlay">
            <div 
                ref={pickerRef}
                className={`mobile-quick-date-picker ${isAnimating ? 'animating' : ''} ${direction ? `slide-${direction}` : ''}`}
            >
                {/* Header */}
                <div className="mobile-quick-date-picker-header">
                    <button
                        onClick={onClose}
                        className="mobile-quick-date-picker-close"
                        aria-label="Close date picker"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                    <h3 className="mobile-quick-date-picker-title">Jump to Date</h3>
                    <Button
                        onClick={goToToday}
                        variant="outline"
                        size="sm"
                        className="mobile-quick-date-picker-today"
                    >
                        <MaterialIcon name="calendar" size={16} />
                        Today
                    </Button>
                </div>

                {/* Current Date Display */}
                <div className="mobile-quick-date-picker-current">
                    <div className="mobile-current-date-display">
                        {formatDateDisplay(selectedDate)}
                    </div>
                    
                    {/* Navigation Controls */}
                    <div className="mobile-date-navigation-controls">
                        <Button
                            onClick={() => navigateDate('prev')}
                            variant="outline"
                            size="sm"
                            disabled={isAnimating}
                            className="mobile-date-nav-button"
                            aria-label={`Previous ${view}`}
                        >
                            <MaterialIcon name="arrow_back" size={20} />
                        </Button>
                        
                        <Button
                            onClick={() => navigateDate('next')}
                            variant="outline"
                            size="sm"
                            disabled={isAnimating}
                            className="mobile-date-nav-button"
                            aria-label={`Next ${view}`}
                        >
                            <MaterialIcon name="chevron_right" size={20} />
                        </Button>
                    </div>
                </div>

                {/* Quick Date Options */}
                <div className="mobile-quick-date-options">
                    <h4 className="mobile-quick-date-section-title">Quick Select</h4>
                    <div className="mobile-quick-date-list">
                        {(() => {
                            const { dates, today } = generateQuickDates();
                            return dates.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleDateSelect(item.date)}
                                    className={`mobile-quick-date-option ${item.isToday ? 'today' : ''}`}
                                >
                                    <div className="mobile-quick-date-option-content">
                                        <span className="mobile-quick-date-option-label">{item.label}</span>
                                        <span className="mobile-quick-date-option-date">
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
                <div className="mobile-quick-date-picker-actions">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="mobile-quick-date-picker-cancel"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleDateSelect(selectedDate)}
                        className="mobile-quick-date-picker-confirm"
                    >
                        Go to {view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}
                    </Button>
                </div>
            </div>
        </div>
    );

    // Use portal to render at document.body level to avoid stacking context issues
    if (typeof document !== 'undefined') {
        return createPortal(overlayContent, document.body);
    }

    return overlayContent;
};

export default MobileQuickDatePicker;

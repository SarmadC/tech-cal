'use client';

import { FC, useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, MagnifyingGlassIcon, FunnelIcon, CaretUpIcon } from '@phosphor-icons/react';

interface MobileNavigationEnhancementsProps {
    onSearchToggle?: () => void;
    onFilterToggle?: () => void;
    onTodayClick?: () => void;
    showSearch?: boolean;
    showFilters?: boolean;
    className?: string;
}

const MobileNavigationEnhancements: FC<MobileNavigationEnhancementsProps> = ({
    onSearchToggle,
    onFilterToggle,
    onTodayClick,
    showSearch = false,
    showFilters = false,
    className = ''
}) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={`mobile-nav-enhancements ${className}`}>
            {/* Floating Action Buttons */}
            <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3">
                {/* Search Toggle */}
                {onSearchToggle && (
                    <button
                        onClick={onSearchToggle}
                        className={`p-3 rounded-full shadow-lg transition-all duration-300 ${
                            showSearch 
                                ? 'bg-blue-600 text-white font-dm-sans' 
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                        title="Search events"
                    >
                        <MagnifyingGlassIcon className="w-5 h-5" />
                    </button>
                )}

                {/* Filter Toggle */}
                {onFilterToggle && (
                    <button
                        onClick={onFilterToggle}
                        className={`p-3 rounded-full shadow-lg transition-all duration-300 ${
                            showFilters 
                                ? 'bg-blue-600 text-white font-dm-sans' 
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                        title="Filter events"
                    >
                        <FunnelIcon className="w-5 h-5" />
                    </button>
                )}

                {/* Today Button */}
                {onTodayClick && (
                    <button
                        onClick={onTodayClick}
                        className="p-3 bg-blue-600 text-white font-dm-sans rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                        title="Go to today"
                    >
                        <CalendarIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Scroll to Top Button */}
            {isScrolled && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-20 left-4 z-40 p-3 bg-gray-800 text-gray-300 rounded-full shadow-lg hover:bg-gray-700 transition-all duration-300"
                    title="Scroll to top"
                >
                    <CaretUpIcon className="w-5 h-5" />
                </button>
            )}

            {/* Quick Stats Bar */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-2">
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>Today</span>
                        </div>
                        <div className="text-gray-500">•</div>
                        <div>3 events</div>
                    </div>
                    <div className="text-xs text-gray-500">
                        {new Date().toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileNavigationEnhancements;

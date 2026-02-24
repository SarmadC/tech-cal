'use client';

import { FC } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export interface DiscoveryHeaderProps {
    // Keep minimal props for consistency with CalendarHeader interface
    className?: string;
}

const DiscoveryHeader: FC<DiscoveryHeaderProps> = ({
    className = ''
}) => {
    return (
        <header className={`h-20 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-border-subtle ${className}`}>
            {/* Left Section: Discovery Title */}
            <div className="flex items-center space-x-4">
                <div className="text-foreground-primary font-semibold text-xl select-none">
                    Discover
                </div>
            </div>

            {/* Right Section: Theme Toggle */}
            <div className="flex items-center space-x-4">
                <ThemeToggle />
            </div>
        </header>
    );
};

export default DiscoveryHeader;

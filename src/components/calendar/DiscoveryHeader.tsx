'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from '@/components/common/UserMenu';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export interface DiscoveryHeaderProps {
    // Keep minimal props for consistency with CalendarHeader interface
    className?: string;
}

const DiscoveryHeader: FC<DiscoveryHeaderProps> = ({
    className = ''
}) => {
    const { user } = useAuth();

    return (
        <header className={`h-20 flex-shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-border-subtle ${className}`}>
            {/* Left Section: Discovery Title */}
            <div className="flex items-center space-x-4">
                <div className="text-foreground-primary font-semibold text-xl select-none">
                    Discover
                </div>
            </div>

            {/* Right Section: Theme Toggle and User Menu */}
            <div className="flex items-center space-x-4">
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

export default DiscoveryHeader;

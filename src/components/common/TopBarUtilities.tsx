'use client';

import UserMenu from '@/components/common/UserMenu';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * Minimal top-right utility cluster for authenticated app pages.
 * Provides ThemeToggle + UserMenu without redundant navigation links.
 */
export default function TopBarUtilities({ className = '' }: { className?: string }) {
    return (
        <div className={`hidden md:flex items-center justify-end p-4 gap-3 absolute top-0 right-0 z-50 ${className}`}>
            <ThemeToggle />
            <UserMenu />
        </div>
    );
}

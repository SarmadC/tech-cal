'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MaterialIcon } from '@/components/ui/Icon';

const LABEL_MAP: Record<string, string> = {
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    discover: 'Discover',
    events: 'Events',
    profile: 'Profile',
    billing: 'Billing',
    settings: 'Settings'
};

const getBackLabel = (path: string) => {
    const base = path.split('?')[0].split('/').filter(Boolean)[0];
    if (!base) return 'Home';
    return LABEL_MAP[base] ?? base.charAt(0).toUpperCase() + base.slice(1);
};

export default function SettingsNavigation() {
    const [backHref, setBackHref] = useState('/dashboard');
    const [backLabel, setBackLabel] = useState('Dashboard');

    useEffect(() => {
        const stored = sessionStorage.getItem('lastNonSettingsPath');
        const nextHref = stored && !stored.startsWith('/dashboard/settings') ? stored : '/dashboard';
        setBackHref(nextHref);
        setBackLabel(getBackLabel(nextHref));
    }, []);

    return (
        <div className="border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <Link 
                            href={backHref}
                            className="inline-flex items-center text-sm transition-colors"
                            style={{ 
                                color: 'var(--foreground-secondary)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--foreground-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--foreground-secondary)';
                            }}
                        >
                            <MaterialIcon name="arrow_back" size={20} className="mr-2" />
                            Back to {backLabel}
                        </Link>
                        <div className="h-6 w-px" style={{ backgroundColor: 'var(--border-default)' }} />
                        <nav className="flex items-center space-x-2 text-sm">
                            <Link 
                                href={backHref}
                                className="transition-colors"
                                style={{ color: 'var(--foreground-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--foreground-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--foreground-secondary)';
                                }}
                            >
                                {backLabel}
                            </Link>
                            <MaterialIcon name="chevron_right" size={16} color="var(--foreground-tertiary)" />
                            <span className="font-medium" style={{ color: 'var(--foreground-primary)' }}>Settings</span>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    );
}

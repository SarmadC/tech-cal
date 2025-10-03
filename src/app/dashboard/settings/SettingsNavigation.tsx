'use client';

import Link from 'next/link';
import { MaterialIcon } from '@/components/ui/Icon';

export default function SettingsNavigation() {
    return (
        <div className="border-b" style={{ borderColor: 'var(--border-default)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--background-secondary)' }}>
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <Link 
                            href="/dashboard" 
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
                            Back to Dashboard
                        </Link>
                        <div className="h-6 w-px" style={{ backgroundColor: 'var(--border-default)' }} />
                        <nav className="flex items-center space-x-2 text-sm">
                            <Link 
                                href="/dashboard" 
                                className="transition-colors"
                                style={{ color: 'var(--foreground-secondary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--foreground-primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--foreground-secondary)';
                                }}
                            >
                                Dashboard
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

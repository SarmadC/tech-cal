// src/app/dashboard/settings/SettingsTabs.tsx
'use client' // This entire file is now a client component

import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; // Standard, top-level import
import ProfileSettingsForm from './ProfileSettingsForm';
import CareerProfileManager from '@/components/profile/CareerProfileManager';
import CalendarIntegrationSettings from '@/components/dashboard/CalendarIntegrationSettings';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { MaterialIcon } from '@/components/ui/Icon';
import { AppProfile } from '@/types';

// The component itself is unchanged
export default function SettingsTabs({ profile }: { profile: AppProfile | null }) {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'profile';

    const tabs = [
        { id: 'profile', label: 'Profile' },
        { id: 'career', label: 'Career Profile' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'billing', label: 'Billing' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'career':
                return <CareerProfileManager />;
            case 'integrations':
                return <CalendarIntegrationSettings />;
            case 'appearance':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>Theme</h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
                                Choose between light and dark themes or let the system decide.
                            </p>
                            <div 
                                className="flex items-center justify-between p-4 border rounded-lg"
                                style={{ 
                                    borderColor: 'var(--border-default)',
                                    backgroundColor: 'var(--background-main)'
                                }}
                            >
                                <div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--foreground-primary)' }}>Dark mode</p>
                                    <p className="text-xs" style={{ color: 'var(--foreground-tertiary)' }}>Toggle between light and dark themes</p>
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                );
            case 'billing':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>Subscription</h3>
                            <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
                                Manage your subscription and billing information.
                            </p>
                            
                            <div 
                                className="border rounded-lg p-6"
                                style={{ 
                                    backgroundColor: 'var(--background-main)',
                                    borderColor: 'var(--border-default)'
                                }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-base font-medium" style={{ color: 'var(--foreground-primary)' }}>Free Plan</h4>
                                        <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>Current plan</p>
                                    </div>
                                    <span 
                                        className="px-3 py-1 text-xs font-medium rounded-full"
                                        style={{ 
                                            backgroundColor: 'var(--success-light)',
                                            color: 'var(--success)'
                                        }}
                                    >
                                        Active
                                    </span>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                        <MaterialIcon name="check" size={16} className="mr-2" color="var(--success)" />
                                        Unlimited calendar views
                                    </div>
                                    <div className="flex items-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                        <MaterialIcon name="check" size={16} className="mr-2" color="var(--success)" />
                                        Event tracking and management
                                    </div>
                                    <div className="flex items-center text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                        <MaterialIcon name="check" size={16} className="mr-2" color="var(--success)" />
                                        Basic career impact analytics
                                    </div>
                                </div>
                                
                                <div 
                                    className="mt-6 pt-4 border-t"
                                    style={{ borderColor: 'var(--border-default)' }}
                                >
                                    <button 
                                        className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                        style={{ 
                                            backgroundColor: 'var(--accent-primary) !important',
                                            color: 'var(--accent-primary-foreground) !important',
                                            border: 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover) !important';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--accent-primary) !important';
                                        }}
                                    >
                                        Upgrade to Pro
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>Billing Information</h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--foreground-secondary)' }}>
                                Your billing details and payment history.
                            </p>
                            
                            <div 
                                className="border rounded-lg p-6"
                                style={{ 
                                    backgroundColor: 'var(--background-main)',
                                    borderColor: 'var(--border-default)'
                                }}
                            >
                                <div className="text-center py-8">
                                    <MaterialIcon name="credit-card" size={48} className="mx-auto mb-4" color="var(--foreground-tertiary)" />
                                    <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                                        No billing information on file
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--foreground-tertiary)' }}>
                                        Billing details will appear here when you upgrade to a paid plan
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
            default:
                return <ProfileSettingsForm profile={profile} />;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Mobile Tab Navigation */}
            <div className="lg:hidden">
                <nav 
                    className="flex space-x-1 p-1 rounded-lg border"
                    style={{ 
                        backgroundColor: 'var(--background-secondary)',
                        borderColor: 'var(--border-default)'
                    }}
                >
                    {tabs.map(tab => (
                        <Link
                            key={tab.id}
                            href={`/dashboard/settings?tab=${tab.id}`}
                            className="flex-1 px-3 py-2 rounded-md text-sm font-medium text-center transition-colors"
                            style={{
                                backgroundColor: activeTab === tab.id ? 'var(--background-main)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--foreground-primary)' : 'var(--foreground-secondary)',
                                boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.color = 'var(--foreground-primary)';
                                    e.currentTarget.style.backgroundColor = 'var(--background-main)';
                                    e.currentTarget.style.opacity = '0.5';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.color = 'var(--foreground-secondary)';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.opacity = '1';
                                }
                            }}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block lg:w-1/4">
                <nav className="sticky top-8 space-y-1">
                    {tabs.map(tab => (
                        <Link
                            key={tab.id}
                            href={`/dashboard/settings?tab=${tab.id}`}
                            className="flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors group"
                            style={{
                                backgroundColor: activeTab === tab.id ? 'var(--accent-primary-light)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--foreground-secondary)'
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.backgroundColor = 'var(--background-secondary)';
                                    e.currentTarget.style.color = 'var(--foreground-primary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--foreground-secondary)';
                                }
                            }}
                        >
                            <span className="truncate">{tab.label}</span>
                            {activeTab === tab.id && (
                                <div 
                                    className="ml-auto w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: 'var(--accent-primary)' }}
                                />
                            )}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                <div 
                    className="rounded-2xl overflow-hidden"
                    style={{ 
                        backgroundColor: 'var(--background-secondary)',
                        border: '1px solid var(--border-default)'
                    }}
                >
                    <div className="p-6 lg:p-8">
                    {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}
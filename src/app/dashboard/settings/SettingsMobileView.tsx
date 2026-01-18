'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MaterialIcon, IconName } from '@/components/ui/Icon';
import { AppProfile } from '@/types';
import SettingsMobileIntegration from './SettingsMobileIntegration';
import SettingsMobileProfile from './SettingsMobileProfile';
import SettingsMobileAppearance from './SettingsMobileAppearance';
import SettingsMobileBilling from './SettingsMobileBilling';
import SettingsMobileCareer from './SettingsMobileCareer';
import UnifiedMobileNavbar from '@/components/common/UnifiedMobileNavbar';
import { APP_MOBILE_NAV_ITEMS } from '@/constants/navigation';
import { useCareerProfile } from '@/hooks/useCareerProfile';
import { calculateCareerProfileCompletion } from '@/utils/careerProfileUtils';

interface SettingItem {
    id: string;
    label: string;
    icon: IconName;
    value: string;
}

interface SettingGroup {
    id: string;
    label: string;
    items: SettingItem[];
}

interface SettingsMobileViewProps {
    profile: AppProfile | null;
}

export default function SettingsMobileView({ profile }: SettingsMobileViewProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const activeTab = searchParams.get('tab');

    // Fetch career profile data
    const { careerProfile, optionalSections } = useCareerProfile();
    const completionPercentage = calculateCareerProfileCompletion(careerProfile, optionalSections);

    // Grouped Settings Data
    const settingGroups: SettingGroup[] = [
        {
            id: 'account',
            label: 'ACCOUNT',
            items: [
                { id: 'profile', label: 'Profile', icon: 'person', value: 'Managed' },
                { id: 'career', label: 'Career Profile', icon: 'work', value: `${completionPercentage}% Complete` },
                { id: 'billing', label: 'Billing', icon: 'credit-card', value: 'Free Plan' },
            ]
        },
        {
            id: 'preferences',
            label: 'PREFERENCES',
            items: [
                { id: 'integrations', label: 'Integrations', icon: 'extension', value: '2 Connected' },
                { id: 'appearance', label: 'Appearance', icon: 'palette', value: 'Dark System' },
            ]
        }
    ];

    // Flatten tabs for content rendering lookup
    const allTabs = settingGroups.flatMap(g => g.items);

    const handleTabClick = (tabId: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('tab', tabId);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleBackToMenu = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('tab');
        router.push(`${pathname}?${params.toString()}`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'career':
                return <SettingsMobileCareer />;
            case 'integrations':
                return <SettingsMobileIntegration />;
            case 'appearance':
                return <SettingsMobileAppearance />;
            case 'billing':
                return <SettingsMobileBilling />;
            case 'profile':
            default:
                return <SettingsMobileProfile profile={profile} />;
        }
    };

    // --- Helper Components for Premium UI ---

    const Avatar = ({ url, name }: { url?: string | null; name: string | null }) => {
        if (url) {
            return <img src={url} alt="Profile" className="w-[20px] h-[20px] rounded-full object-cover border border-white/10" />;
        }
        // Linear-style gradient avatar fallback
        const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';
        return (
            <div className="w-[20px] h-[20px] rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white border border-white/10">
                {initials}
            </div>
        );
    };

    const CircularProgress = ({ percentage }: { percentage: number }) => {
        const radius = 6;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        return (
            <div className="flex items-center gap-2">
                <span className="text-[13px] text-zinc-400 tabular-nums">{percentage}%</span>
                <svg width="16" height="16" viewBox="0 0 16 16" className="rotate-[-90deg]">
                    <circle cx="8" cy="8" r={radius} stroke="#333" strokeWidth="2" fill="none" />
                    <circle
                        cx="8"
                        cy="8"
                        r={radius}
                        stroke="#818CF8" // Indigo-400
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        );
    };

    // Master View
    if (!activeTab) {
        return (
            <div className="min-h-screen bg-[var(--mono-bg-main)] text-[var(--mono-text-primary)] font-sans transition-colors duration-200">
                <UnifiedMobileNavbar
                    navItems={APP_MOBILE_NAV_ITEMS}
                    className="sticky top-0 z-50 bg-[var(--mono-bg-main)]/80 backdrop-blur-xl border-b border-[var(--mono-border-default)]"
                    showLogo={false}
                />
                <div className="p-4">
                    {/* Unified Top Navigation */}
                    <div className="mb-8 pt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Avatar url={profile?.avatarUrl} name={profile?.fullName || ''} />
                            <span className="text-sm font-semibold opacity-90">{profile?.fullName || 'User'}</span>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight mb-8 px-1">Settings</h1>

                    <div className="space-y-10">
                        {settingGroups.map((group) => (
                            <div key={group.id}>
                                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                                    {group.label}
                                </h3>

                                <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)]">
                                    {group.items.map((item, index) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabClick(item.id)}
                                            className="w-full flex items-center justify-between px-4 h-[56px] transition-all relative group active:bg-[var(--mono-bg-hover)] hover:bg-[var(--mono-bg-hover)]/50"
                                        >
                                            {/* Delicate Divider */}
                                            {index !== 0 && (
                                                <div className="absolute top-0 right-0 h-[1px] bg-[var(--mono-border-default)] left-[16px]" />
                                            )}

                                            <div className="flex items-center gap-3">
                                                {/* Avatar handling for Profile, Icon for others */}
                                                {item.id === 'profile' ? (
                                                    <Avatar url={profile?.avatarUrl} name={profile?.fullName || ''} />
                                                ) : (
                                                    <MaterialIcon name={item.icon} size={20} className="text-[var(--mono-text-secondary)]" />
                                                )}

                                                <span className="text-[15px] font-medium opacity-90">{item.label}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Specialized Value Visualization */}
                                                {item.id === 'career' ? (
                                                    <CircularProgress percentage={completionPercentage} />
                                                ) : (
                                                    <span className={`text-[13px] ${item.value === 'Free Plan' ? 'text-amber-500/90' :
                                                        item.value === 'Managed' ? 'text-blue-400/90' : 'text-[var(--mono-text-tertiary)]'
                                                        }`}>
                                                        {item.value}
                                                    </span>
                                                )}
                                                <MaterialIcon name="chevron_right" size={16} className="text-[var(--mono-text-tertiary)]" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center pb-8 border-t border-[var(--mono-border-default)] pt-8 mx-4">
                        <p className="text-[11px] text-[var(--mono-text-tertiary)] uppercase tracking-wider font-medium">TechCal v1.2.0 • Build 492</p>
                    </div>
                </div>
            </div>
        );
    }

    // Detail View
    const currentTabLabel = allTabs.find(t => t.id === activeTab)?.label;

    return (
        <div className="min-h-screen bg-[var(--mono-bg-main)] text-[var(--mono-text-primary)] transition-colors duration-200">
            {/* Frosted Glass Header */}
            <div className="sticky top-0 z-10 bg-[var(--mono-bg-main)]/80 backdrop-blur-xl border-b border-[var(--mono-border-default)]">
                <div className="flex items-center h-14 px-4 gap-3">
                    <button
                        onClick={handleBackToMenu}
                        className="p-1 -ml-1 text-[var(--mono-text-secondary)] hover:text-[var(--mono-text-primary)] transition-colors"
                    >
                        <MaterialIcon name="arrow_back" size={20} />
                    </button>
                    <span className="font-semibold text-[15px]">{currentTabLabel}</span>
                </div>
            </div>

            <div className="p-4">
                <div className="integration-settings-wrapper">
                    <style jsx global>{`
                        .integration-settings-wrapper * {
                            transition: none !important;
                            animation: none !important;
                        }
                    `}</style>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

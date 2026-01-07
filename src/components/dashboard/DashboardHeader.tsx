'use client';

import { useMemo, useState } from 'react';
import { DownloadSimple, ShareNetwork, Check } from '@phosphor-icons/react';
import { exportToPDF, generateShareLink, copyToClipboard } from '@/utils/exportUtils';
import type { AppProfile } from '@/types';

interface DashboardHeaderProps {
    profile: AppProfile | null;
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
    const [copied, setCopied] = useState(false);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        const name = profile?.fullName?.split(' ')[0] || 'there';
        if (hour < 12) return `Good morning, ${name}`;
        if (hour < 17) return `Good afternoon, ${name}`;
        return `Good evening, ${name}`;
    }, [profile]);

    const date = useMemo(() => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    const handleExport = () => {
        exportToPDF();
    };

    const handleShare = async () => {
        const link = generateShareLink({});
        const success = await copyToClipboard(link);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white mb-1">
                        {greeting}
                    </h1>
                    <p className="text-sm text-zinc-500">
                        {date}
                    </p>
                </div>

                {/* Export Actions - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-2">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span>Copied</span>
                            </>
                        ) : (
                            <>
                                <ShareNetwork className="w-4 h-4" weight="regular" />
                                <span>Share</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                    >
                        <DownloadSimple className="w-4 h-4" weight="regular" />
                        <span>Export</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

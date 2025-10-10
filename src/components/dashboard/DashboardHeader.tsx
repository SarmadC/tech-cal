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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            {greeting}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {date}
          </p>
        </div>
        
        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <ShareNetwork className="w-4 h-4" weight="duotone" />
                <span>Share</span>
              </>
            )}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
          >
            <DownloadSimple className="w-4 h-4" weight="bold" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}

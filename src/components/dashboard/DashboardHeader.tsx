'use client';

import { useMemo } from 'react';
import type { AppProfile } from '@/types';

interface DashboardHeaderProps {
  profile: AppProfile | null;
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = profile?.fullName?.split(' ')[0] || 'there';
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  }, [profile]);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{greeting}</h1>
      </div>
    </div>
  );
}

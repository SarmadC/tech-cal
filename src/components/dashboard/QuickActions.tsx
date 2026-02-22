import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CalendarIcon, StarIcon, MedalIcon } from '@phosphor-icons/react';
import { DashboardCard } from './DashboardCard';

interface QuickAction {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: 'default' | 'outline';
}

const quickActions: QuickAction[] = [
  {
    href: '/calendar',
    icon: CalendarIcon,
    label: 'Browse Events',
    variant: 'default'
  },
  {
    href: '/events',
    icon: StarIcon,
    label: 'Discover New Events',
    variant: 'outline'
  },
  {
    href: '/dashboard/settings',
    icon: MedalIcon,
    label: 'Manage Profile',
    variant: 'outline'
  }
];

/**
 * Quick Actions component for dashboard
 */
export function QuickActions({ className = '' }: { className?: string }) {
  return (
    <DashboardCard title="Quick Actions" className={className}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant={action.variant}
            className="h-12"
          >
            <Link href={action.href} className="flex items-center justify-center gap-2">
              <action.icon className="w-5 h-5" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </DashboardCard>
  );
}

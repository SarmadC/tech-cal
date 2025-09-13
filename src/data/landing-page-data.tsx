// src/data/landing-page-data.tsx
import {
  LightningIcon,
  CalendarCheckIcon,
  UsersThreeIcon,
  ChartBarIcon,
} from '@phosphor-icons/react';

export const eventsData = [
  { company: 'Google', date: 'May 14', title: 'Google I/O 2025', type: 'Conference' },
  { company: 'Apple', date: 'Jun 10', title: 'WWDC 2025', type: 'Developer Conference' },
  { company: 'Microsoft', date: 'May 21', title: 'Microsoft Build', type: 'Developer Conference' },
  { company: 'Meta', date: 'Apr 22', title: 'Meta Con', type: 'Framework Conference' },
  { company: 'Vercel', date: 'Oct 25', title: 'Next.js Conf', type: 'Framework Conference' },
  { company: 'OpenAI', date: 'Mar 15', title: 'OpenAI DevDay', type: 'AI Conference' },
  { company: 'Amazon', date: 'Nov 27', title: 'AWS re:Invent', type: 'Cloud Conference' },
  { company: 'Docker', date: 'Sep 18', title: 'DockerCon', type: 'DevOps Conference' },
  { company: 'GitHub', date: 'Nov 08', title: 'GitHub Universe', type: 'Developer Conference' }
];

export const heroStats = [
  { number: '100+', label: 'Event Sources' },
  { number: '24/7', label: 'Real-time Updates' },
  { number: '100+', label: 'Active Users' }
];

export const features = [
    {
        icon: <LightningIcon size={24} />,
        title: 'Lightning Alerts',
        description: 'Be notified when new events drop—no feeds to babysit.'
    },
    {
        icon: <ChartBarIcon size={24} />,
        title: 'Smart Insights',
        description: 'See the events that actually move your career forward.'
    },
    {
        icon: <UsersThreeIcon size={24} />,
        title: 'Team Intelligence',
        description: 'Share must‑attend events and keep schedules aligned.'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        title: 'One‑tap Add',
        description: 'Add to your calendar in one tap—works with everything.'
    }
];
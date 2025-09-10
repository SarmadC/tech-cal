// src/data/landing-page-data.tsx
import {
  FunnelSimpleIcon,
  LightningIcon,
  CalendarCheckIcon,
  SquaresFourIcon,
  UsersThreeIcon,
  ChartBarIcon,
} from '@phosphor-icons/react';

export const eventsData = [
  { company: 'Google', date: 'May 14', title: 'Google I/O 2025', type: 'Conference' },
  { company: 'Apple', date: 'Jun 10', title: 'WWDC 2025', type: 'Developer Conference' },
  { company: 'Microsoft', date: 'May 21', title: 'Microsoft Build', type: 'Developer Conference' },
  { company: 'Meta', date: 'Apr 22', title: 'React Conf', type: 'Framework Conference' },
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
        icon: <FunnelSimpleIcon size={24} />,
        title: 'Smart Filtering',
        description: 'AI-powered relevance scoring ensures you only see events that matter to your tech stack and interests.'
    },
    {
        icon: <LightningIcon size={24} />,
        title: 'Real-time Updates',
        description: 'Get instant notifications when new events are announced or existing ones are updated.'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        title: 'Calendar Sync',
        description: 'One-click sync with Google Calendar, Outlook, and Apple Calendar. Your schedule, always updated.'
    },
    {
        icon: <SquaresFourIcon size={24} />,
        title: 'Custom Views',
        description: 'Weekly, monthly, or list view. Dark mode. Personalized themes. Make it yours.'
    },
    {
        icon: <UsersThreeIcon size={24} />,
        title: 'Team Collaboration',
        description: 'Share curated event lists with your team. Never let your colleagues miss important conferences.'
    },
    {
        icon: <ChartBarIcon size={24} />,
        title: 'Analytics Dashboard',
        description: 'Track attendance trends, popular topics, and upcoming opportunities in your field.'
    }
];
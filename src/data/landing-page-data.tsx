// src/data/landing-page-data.tsx
import {
  Database,
  Funnel,
  ArrowsClockwise,
  Lightning,
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
        icon: <Database size={24} />,
        title: 'Event Aggregation Engine',
        description: 'Aggregates from 100+ event sources—RSS feeds, APIs, and ICS calendars—with real-time updates.'
    },
    {
        icon: <Funnel size={24} />,
        title: 'Smart Filtering System',
        description: 'Server-side filtering with 300+ filter options, full-text search, and multi-query optimization.'
    },
    {
        icon: <ArrowsClockwise size={24} />,
        title: 'Calendar Integration API',
        description: 'One-tap Google Calendar sync with automatic event detail enrichment and reminders.'
    },
    {
        icon: <Lightning size={24} />,
        title: 'Real-time Data Pipeline',
        description: 'Continuous event ingestion with quality control, deduplication, and instant availability.'
    }
];
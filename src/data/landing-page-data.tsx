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
        title: 'Every event, one feed',
        description: 'Pulls from 100+ sources, including RSS feeds, APIs, and ICS calendars, so you see every relevant event in one place.'
    },
    {
        icon: <Funnel size={24} />,
        title: 'Find exactly what fits',
        description: 'Filter by stack, topic, format, location, and more. Full-text search across 120+ tags gets you there fast.'
    },
    {
        icon: <ArrowsClockwise size={24} />,
        title: 'Sync to Google Calendar in one tap',
        description: 'Add any event to Google Calendar with one click. Details, reminders, and timezone adjustments included.'
    },
    {
        icon: <Lightning size={24} />,
        title: 'Always fresh, always current',
        description: 'Events are refreshed weekly, de-duplicated automatically, and quality-checked before they reach your feed.'
    }
];

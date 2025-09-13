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
        title: 'Stay Ahead of the Curve',
        description: 'Get lightning-fast alerts the moment new events drop. No more checking Twitter, Discord, and Slack—we bring everything to you instantly.'
    },
    {
        icon: <ChartBarIcon size={24} />,
        title: 'Smart Insights',
        description: 'Discover which events matter most to your career. See trending topics, track your industry\'s pulse, and spot opportunities before everyone else.'
    },
    {
        icon: <UsersThreeIcon size={24} />,
        title: 'Team Intelligence',
        description: 'Turn your team into a powerhouse of knowledge. Share must-attend events, coordinate conference schedules, and ensure your team stays ahead.'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        title: 'Seamless Integration',
        description: 'One click, infinite possibilities. Sync with Google Calendar, Outlook, or Apple Calendar—your events flow seamlessly into your existing workflow.'
    }
];
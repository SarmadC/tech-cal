// src/data/landing-page-data.ts

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
        icon: (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" />
            </svg>
        ),
        title: 'Smart Filtering',
        description: 'AI-powered relevance scoring ensures you only see events that matter to your tech stack and interests.'
    },
    {
        icon: (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
        ),
        title: 'Real-time Updates',
        description: 'Get instant notifications when new events are announced or existing ones are updated.'
    },
    {
        icon: (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14l2 2 4-4" />
            </svg>
        ),
        title: 'Calendar Sync',
        description: 'One-click sync with Google Calendar, Outlook, and Apple Calendar. Your schedule, always updated.'
    },
    {
        icon: (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
            </svg>
        ),
        title: 'Custom Views',
        description: 'Weekly, monthly, or list view. Dark mode. Personalized themes. Make it yours.'
    },
    {
        icon: (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        title: 'Team Collaboration',
        description: 'Share curated event lists with your team. Never let your colleagues miss important conferences.'
    },
    {
        icon: (
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
        ),
        title: 'Analytics Dashboard',
        description: 'Track attendance trends, popular topics, and upcoming opportunities in your field.'
    }
];
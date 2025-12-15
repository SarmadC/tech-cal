import { Event, EventType } from '@/types';

export const MOCK_CATEGORIES: EventType[] = [
    { id: 'conference', name: 'Conference', description: 'Industry conferences', color: '#6366f1' },
    { id: 'product', name: 'Product', description: 'Product launches and updates', color: '#10b981' },
];

export const MOCK_EVENTS = [
    {
        id: '1',
        title: 'Google I/O 2025',
        description: 'Google\'s annual developer conference featuring the latest technology announcements.',
        startTime: '2025-05-14T09:00:00Z',
        endTime: '2025-05-14T17:00:00Z',
        location: 'Mountain View, CA',
        organizer: 'Google',
        status: 'published',
        eventFormat: 'Hybrid',
        priceMin: 0,
        sourceUrl: 'https://io.google/2025',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'google',
            name: 'Google',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg'
        },
        tags: [
            { id: 't1', name: 'Android', category: 'tech', color: 'blue' },
            { id: 't2', name: 'AI', category: 'tech', color: 'green' },
            { id: 't3', name: 'Web', category: 'tech', color: 'indigo' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        title: 'WWDC 2025',
        description: 'Apple\'s Worldwide Developers Conference.',
        startTime: '2025-06-10T09:00:00Z',
        endTime: '2025-06-14T17:00:00Z',
        location: 'Cupertino, CA',
        organizer: 'Apple',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$1599',
        priceMin: 1599,
        sourceUrl: 'https://developer.apple.com/wwdc',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'apple',
            name: 'Apple',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
        },
        tags: [
            { id: 't4', name: 'iOS', category: 'mobile', color: 'black' },
            { id: 't5', name: 'Swift', category: 'lang', color: 'orange' },
            { id: 't6', name: 'macOS', category: 'os', color: 'gray' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '3',
        title: 'React Universe Conf',
        description: 'The biggest React conference in the world.',
        startTime: '2025-07-08T09:00:00Z',
        endTime: '2025-07-09T17:00:00Z',
        location: 'Amsterdam, Netherlands',
        organizer: 'React Universe',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '€600',
        priceMin: 600,
        sourceUrl: 'https://reactuniverseconf.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'react-universe',
            name: 'React Universe',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg'
        },
        tags: [
            { id: 't7', name: 'React', category: 'framework', color: 'cyan' },
            { id: 't8', name: 'JavaScript', category: 'lang', color: 'yellow' },
            { id: 't9', name: 'UI/UX', category: 'design', color: 'pink' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '4',
        title: 'AWS re:Invent 2025',
        description: 'The largest cloud computing conference.',
        startTime: '2025-11-27T09:00:00Z',
        endTime: '2025-12-01T17:00:00Z',
        location: 'Las Vegas, NV',
        organizer: 'AWS',
        status: 'published',
        eventFormat: 'Hybrid',
        priceRange: '$1899',
        priceMin: 1899,
        sourceUrl: 'https://reinvent.awsevents.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'aws',
            name: 'AWS',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg'
        },
        tags: [
            { id: 't10', name: 'Cloud', category: 'infrastructure', color: 'orange' },
            { id: 't11', name: 'Serverless', category: 'arch', color: 'purple' },
            { id: 't12', name: 'Architecture', category: 'arch', color: 'blue' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '5',
        title: 'OpenAI DevDay',
        description: 'Join us for the latest on AI models and tools.',
        startTime: '2025-11-06T09:00:00Z',
        endTime: '2025-11-06T17:00:00Z',
        location: 'San Francisco, CA',
        organizer: 'OpenAI',
        status: 'published',
        eventFormat: 'In-person',
        priceMin: 0,
        sourceUrl: 'https://openai.com/devday',
        eventTypeId: 'product',
        category: { id: 'product', name: 'Product', color: '#10b981', description: 'Product Launch' },
        organization: {
            id: 'openai',
            name: 'OpenAI',
            logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/openai.svg'
        },
        tags: [
            { id: 't2', name: 'AI', category: 'tech', color: 'green' },
            { id: 't13', name: 'LLM', category: 'ai', color: 'teal' },
            { id: 't14', name: 'GPT', category: 'ai', color: 'emerald' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '6',
        title: 'Vercel Ship',
        description: 'Shipping the future of the web.',
        startTime: '2025-05-22T09:00:00Z',
        endTime: '2025-05-22T17:00:00Z',
        location: 'Online',
        organizer: 'Vercel',
        status: 'published',
        eventFormat: 'Online',
        priceMin: 0,
        sourceUrl: 'https://vercel.com/ship',
        eventTypeId: 'product',
        category: { id: 'product', name: 'Product', color: '#10b981', description: 'Product Launch' },
        organization: {
            id: 'vercel',
            name: 'Vercel',
            logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/vercel.svg'
        },
        tags: [
            { id: 't3', name: 'Web', category: 'tech', color: 'indigo' },
            { id: 't15', name: 'Next.js', category: 'framework', color: 'black' },
            { id: 't16', name: 'Frontend', category: 'dev', color: 'blue' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '7',
        title: 'TypeScript Mastery Workshop',
        description: 'Hands-on workshop covering advanced TypeScript patterns, type safety, and modern development practices.',
        startTime: '2025-08-15T09:00:00Z',
        endTime: '2025-08-15T17:00:00Z',
        location: 'London, UK',
        organizer: 'TypeScript Foundation',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$299',
        priceMin: 299,
        sourceUrl: 'https://typescriptworkshop.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'typescript-foundation',
            name: 'TypeScript Foundation',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg'
        },
        tags: [
            { id: 't17', name: 'TypeScript', category: 'lang', color: 'blue' },
            { id: 't8', name: 'JavaScript', category: 'lang', color: 'yellow' },
            { id: 't18', name: 'Workshop', category: 'format', color: 'purple' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '8',
        title: 'Tech Founders Networking Night',
        description: 'Connect with fellow tech founders, investors, and innovators. An evening of networking, pitches, and collaboration.',
        startTime: '2025-09-20T18:00:00Z',
        endTime: '2025-09-20T22:00:00Z',
        location: 'New York, NY',
        organizer: 'Tech Founders Network',
        status: 'published',
        eventFormat: 'In-person',
        priceMin: 0,
        sourceUrl: 'https://techfounders.network',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'tech-founders-network',
            name: 'Tech Founders Network',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg'
        },
        tags: [
            { id: 't19', name: 'Networking', category: 'community', color: 'pink' },
            { id: 't20', name: 'Startups', category: 'business', color: 'orange' },
            { id: 't21', name: 'Entrepreneurship', category: 'business', color: 'green' }
        ],
        createdAt: new Date().toISOString()
    },
    {
        id: '9',
        title: 'DevOps World 2025',
        description: 'The premier conference for DevOps, CI/CD, and infrastructure automation. Learn from industry leaders.',
        startTime: '2025-10-10T09:00:00Z',
        endTime: '2025-10-12T17:00:00Z',
        location: 'Berlin, Germany',
        organizer: 'DevOps World',
        status: 'published',
        eventFormat: 'Hybrid',
        priceRange: '$450',
        priceMin: 450,
        sourceUrl: 'https://devopsworld.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'devops-world',
            name: 'DevOps World',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Kubernetes_logo_without_workmark.svg'
        },
        tags: [
            { id: 't22', name: 'DevOps', category: 'ops', color: 'red' },
            { id: 't23', name: 'CI/CD', category: 'ops', color: 'blue' },
            { id: 't24', name: 'Infrastructure', category: 'infrastructure', color: 'gray' }
        ],
        createdAt: new Date().toISOString()
    }
] as unknown as Event[];

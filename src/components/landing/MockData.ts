import { AgendaItem, CareerImpactScore, Event, EventType } from '@/types';

export const MOCK_CATEGORIES: EventType[] = [
    { id: 'conference', name: 'Conference', description: 'Industry conferences', color: '#6366f1' },
    { id: 'product', name: 'Product', description: 'Product launches and updates', color: '#10b981' },
];

const createDemoImpact = (overall: number, reason: string): CareerImpactScore => ({
    overall,
    confidence: 0.81,
    components: {
        skillRelevance: Math.max(40, overall - 6),
        careerStageMatch: Math.max(35, overall - 10),
        networkingValue: Math.max(30, overall - 8),
        industryRelevance: Math.max(45, overall - 5),
        timingBonus: Math.max(20, Math.min(35, overall - 50)),
    },
    explanation: {
        reasons: [reason],
        matchedSkills: ['Engineering Leadership', 'Product Strategy'],
        speakerHighlights: [],
        careerImpactCategory: overall >= 80 ? 'high' : overall >= 60 ? 'moderate' : 'low',
        confidenceFactors: ['Curated agenda quality', 'Attendee demand'],
    },
    metadata: {
        algorithmVersion: 'landing-demo-v1',
        calculatedAt: new Date().toISOString(),
        careerProfileHash: 'demo-profile',
        eventDataHash: `demo-${overall}`,
    },
});

const addMinutes = (isoDate: string, minutes: number): string =>
    new Date(new Date(isoDate).getTime() + minutes * 60_000).toISOString();

const createDemoAgenda = (event: Event, seed: number): AgendaItem[] => {
    const isVirtualEvent = event.location.toLowerCase() === 'online' || event.eventFormat === 'Online';
    const primaryTopic = event.tags?.[0]?.name || 'Platform';
    const secondaryTopic = event.tags?.[1]?.name || 'Engineering';

    const stageLocations = isVirtualEvent
        ? ['Main Stream', 'Live Lab A', 'Live Lab B', 'Community Lounge']
        : ['Main Hall', 'Workshop Room A', 'Workshop Room B', 'Networking Lounge'];

    const agendaTemplates = [
        {
            title: `${event.organizer} Opening Keynote`,
            track: 'Main Stage',
            type: 'Keynote',
            location: stageLocations[0],
            offset: 0,
            duration: 40,
            description: `Big-picture product and engineering roadmap focused on ${primaryTopic}.`,
        },
        {
            title: `${primaryTopic} Deep Dive`,
            track: 'Engineering',
            type: 'Talk',
            location: stageLocations[1],
            offset: 50,
            duration: 45,
            description: `Hands-on walkthrough of implementation patterns for ${primaryTopic}.`,
        },
        {
            title: `${secondaryTopic} Strategy Session`,
            track: 'Product',
            type: 'Panel',
            location: stageLocations[2],
            offset: 50,
            duration: 45,
            description: `Cross-functional session on shipping outcomes with ${secondaryTopic}.`,
        },
        {
            title: 'Networking Break',
            track: 'Community',
            type: 'Networking',
            location: stageLocations[3],
            offset: 105,
            duration: 25,
            description: 'Meet speakers, attendees, and hiring teams in an informal setting.',
        },
        {
            title: 'Architecture Case Study',
            track: 'Engineering',
            type: 'Workshop',
            location: stageLocations[1],
            offset: 135,
            duration: 55,
            description: 'Real-world architecture review with practical tradeoff discussions.',
        },
        {
            title: 'Closing AMA',
            track: 'Main Stage',
            type: 'Q&A',
            location: stageLocations[0],
            offset: 200,
            duration: 35,
            description: 'Live Q&A with product and engineering leaders.',
        },
    ] as const;

    return agendaTemplates.map((item, index) => {
        const startTime = addMinutes(event.startTime, item.offset);
        const endTime = addMinutes(startTime, item.duration);

        return {
            id: `demo-agenda-${event.id}-${seed}-${index + 1}`,
            title: item.title,
            startTime,
            endTime,
            type: item.type,
            description: item.description,
            location: item.location,
            track: item.track,
            dayNumber: 1,
            sortOrder: index + 1,
            durationMinutes: item.duration,
        };
    });
};

const RAW_MOCK_EVENTS = [
    {
        id: '1',
        title: 'Google I/O 2026',
        description: 'Google\'s annual developer conference featuring the latest technology announcements.',
        startTime: '2026-05-14T09:00:00Z',
        endTime: '2026-05-14T17:00:00Z',
        location: 'Mountain View, CA',
        organizer: 'Google',
        status: 'published',
        eventFormat: 'Hybrid',
        priceMin: 0,
        sourceUrl: 'https://io.google/2026',
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
        careerImpact: createDemoImpact(87, 'Strong alignment with platform engineering and AI roadmap exposure.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        title: 'WWDC 2026',
        description: 'Apple\'s Worldwide Developers Conference.',
        startTime: '2026-06-10T09:00:00Z',
        endTime: '2026-06-14T17:00:00Z',
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
        careerImpact: createDemoImpact(82, 'High-value ecosystem updates and senior practitioner sessions.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '3',
        title: 'React Universe Conf',
        description: 'The biggest React conference in the world.',
        startTime: '2026-07-08T09:00:00Z',
        endTime: '2026-07-09T17:00:00Z',
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
        careerImpact: createDemoImpact(79, 'Deep frontend specialization and team-level implementation patterns.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '4',
        title: 'AWS re:Invent 2026',
        description: 'The largest cloud computing conference.',
        startTime: '2026-11-27T09:00:00Z',
        endTime: '2026-12-01T17:00:00Z',
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
        careerImpact: createDemoImpact(85, 'Broad cloud architecture coverage with high networking potential.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '5',
        title: 'OpenAI DevDay',
        description: 'Join us for the latest on AI models and tools.',
        startTime: '2026-11-06T09:00:00Z',
        endTime: '2026-11-06T17:00:00Z',
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
        careerImpact: createDemoImpact(90, 'Direct exposure to state-of-the-art AI tooling and platform strategy.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '6',
        title: 'Vercel Ship',
        description: 'Shipping the future of the web.',
        startTime: '2026-05-22T09:00:00Z',
        endTime: '2026-05-22T17:00:00Z',
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
        careerImpact: createDemoImpact(76, 'Shipping-focused product sessions with practical frontend takeaways.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '7',
        title: 'TypeScript Mastery Workshop',
        description: 'Hands-on workshop covering advanced TypeScript patterns, type safety, and modern development practices.',
        startTime: '2026-08-15T09:00:00Z',
        endTime: '2026-08-15T17:00:00Z',
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
        careerImpact: createDemoImpact(74, 'Hands-on skills uplift with directly applicable engineering patterns.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '8',
        title: 'Tech Founders Networking Night',
        description: 'Connect with fellow tech founders, investors, and innovators. An evening of networking, pitches, and collaboration.',
        startTime: '2026-09-20T18:00:00Z',
        endTime: '2026-09-20T22:00:00Z',
        location: 'New York, NY',
        organizer: 'LinkedIn',
        status: 'published',
        eventFormat: 'In-person',
        priceMin: 0,
        sourceUrl: 'https://techfounders.network',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'tech-founders-network',
            name: 'LinkedIn',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg'
        },
        tags: [
            { id: 't19', name: 'Networking', category: 'community', color: 'pink' },
            { id: 't20', name: 'Startups', category: 'business', color: 'orange' },
            { id: 't21', name: 'Entrepreneurship', category: 'business', color: 'green' }
        ],
        careerImpact: createDemoImpact(72, 'High networking density for hiring, partnerships, and distribution.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '9',
        title: 'DevOps World 2026',
        description: 'The premier conference for DevOps, CI/CD, and infrastructure automation. Learn from industry leaders.',
        startTime: '2026-10-10T09:00:00Z',
        endTime: '2026-10-12T17:00:00Z',
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
        careerImpact: createDemoImpact(80, 'Operational maturity and automation insights for scaling teams.'),
        createdAt: new Date().toISOString()
    }
];

export const MOCK_EVENTS = RAW_MOCK_EVENTS.map((event, index) => {
    const eventWithShape = event as unknown as Event;
    const agenda = createDemoAgenda(eventWithShape, index);

    return {
        ...event,
        agenda,
        speakerLineup: agenda.flatMap((item) => item.speakers || []),
        timezone: eventWithShape.timezone ?? 'UTC',
        updatedAt: eventWithShape.updatedAt ?? eventWithShape.createdAt,
        livestreamUrl: eventWithShape.livestreamUrl ?? null,
        registrationUrl: eventWithShape.registrationUrl ?? null,
    };
}) as unknown as Event[];

import { AgendaItem, CareerImpactScore, Event, EventType } from '@/types';
import type { ManagerJustificationData } from '@/types/managerJustification';

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
        startTime: '2026-05-14T16:00:00Z',
        endTime: '2026-05-14T23:59:59Z',
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
        startTime: '2026-06-10T16:00:00Z',
        endTime: '2026-06-14T23:59:59Z',
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
        startTime: '2026-07-08T14:00:00Z',
        endTime: '2026-07-09T22:00:00Z',
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
        startTime: '2026-11-27T17:00:00Z',
        endTime: '2026-12-01T23:59:59Z',
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
        startTime: '2026-11-06T17:00:00Z',
        endTime: '2026-11-06T23:59:59Z',
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
        startTime: '2026-05-22T16:00:00Z',
        endTime: '2026-05-22T23:59:59Z',
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
        startTime: '2026-09-20T22:00:00Z',
        endTime: '2026-09-21T02:00:00Z',
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
        startTime: '2026-10-10T08:00:00Z',
        endTime: '2026-10-12T16:00:00Z',
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
    },
    // ── Additional events to make the demo calendar dense and impressive ──────
    {
        id: '10',
        title: 'Microsoft Build 2026',
        description: 'Microsoft\'s annual developer conference covering Azure, AI, and the future of development.',
        startTime: '2026-05-19T16:00:00Z',
        endTime: '2026-05-21T23:59:59Z',
        location: 'Seattle, WA',
        organizer: 'Microsoft',
        status: 'published',
        eventFormat: 'Hybrid',
        priceMin: 0,
        sourceUrl: 'https://build.microsoft.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'microsoft',
            name: 'Microsoft',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg'
        },
        tags: [
            { id: 't25', name: 'Azure', category: 'cloud', color: 'blue' },
            { id: 't2', name: 'AI', category: 'tech', color: 'green' },
            { id: 't3', name: 'Web', category: 'tech', color: 'indigo' }
        ],
        careerImpact: createDemoImpact(83, 'Broad platform coverage with Azure AI and dev tooling deep dives.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '11',
        title: 'PyCon US 2026',
        description: 'The largest annual gathering for the community that uses and develops the Python language.',
        startTime: '2026-05-14T15:00:00Z',
        endTime: '2026-05-18T22:00:00Z',
        location: 'Pittsburgh, PA',
        organizer: 'Python Software Foundation',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$400',
        priceMin: 400,
        sourceUrl: 'https://us.pycon.org',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'python',
            name: 'Python Software Foundation',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg'
        },
        tags: [
            { id: 't26', name: 'Python', category: 'lang', color: 'yellow' },
            { id: 't2', name: 'AI', category: 'tech', color: 'green' },
            { id: 't18', name: 'Workshop', category: 'format', color: 'purple' }
        ],
        careerImpact: createDemoImpact(78, 'Community networking and Python ecosystem sessions across ML and backend.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '12',
        title: 'JSConf EU 2026',
        description: 'Europe\'s premier JavaScript conference bringing together the global JS community.',
        startTime: '2026-05-22T08:00:00Z',
        endTime: '2026-05-23T16:00:00Z',
        location: 'Berlin, Germany',
        organizer: 'JSConf',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '€600',
        priceMin: 600,
        sourceUrl: 'https://jsconf.eu',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'jsconf',
            name: 'JSConf',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png'
        },
        tags: [
            { id: 't8', name: 'JavaScript', category: 'lang', color: 'yellow' },
            { id: 't3', name: 'Web', category: 'tech', color: 'indigo' },
            { id: 't7', name: 'React', category: 'framework', color: 'cyan' }
        ],
        careerImpact: createDemoImpact(77, 'Cutting-edge JS patterns and community connections for frontend engineers.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '13',
        title: 'Stripe Sessions 2026',
        description: 'Annual conference for developers and founders building on the Stripe platform.',
        startTime: '2026-05-07T16:00:00Z',
        endTime: '2026-05-08T00:00:00Z',
        location: 'San Francisco, CA',
        organizer: 'Stripe',
        status: 'published',
        eventFormat: 'Hybrid',
        priceMin: 0,
        sourceUrl: 'https://stripe.com/sessions',
        eventTypeId: 'product',
        category: { id: 'product', name: 'Product', color: '#10b981', description: 'Product Launch' },
        organization: {
            id: 'stripe',
            name: 'Stripe',
            logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/stripe.svg'
        },
        tags: [
            { id: 't20', name: 'Startups', category: 'business', color: 'orange' },
            { id: 't27', name: 'Fintech', category: 'industry', color: 'purple' },
            { id: 't3', name: 'Web', category: 'tech', color: 'indigo' }
        ],
        careerImpact: createDemoImpact(73, 'Payments infrastructure insights and founder networking at high density.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '14',
        title: 'KubeCon + CloudNativeCon Europe 2026',
        description: 'The Cloud Native Computing Foundation\'s flagship conference for Kubernetes and cloud native ecosystems.',
        startTime: '2026-05-04T08:00:00Z',
        endTime: '2026-05-07T16:00:00Z',
        location: 'London, UK',
        organizer: 'CNCF',
        status: 'published',
        eventFormat: 'Hybrid',
        priceRange: '$800',
        priceMin: 800,
        sourceUrl: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-europe',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'cncf',
            name: 'CNCF',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Kubernetes_logo_without_workmark.svg'
        },
        tags: [
            { id: 't28', name: 'Kubernetes', category: 'infrastructure', color: 'blue' },
            { id: 't10', name: 'Cloud', category: 'infrastructure', color: 'orange' },
            { id: 't24', name: 'Infrastructure', category: 'infrastructure', color: 'gray' }
        ],
        careerImpact: createDemoImpact(85, 'Core Kubernetes and cloud-native operational skills at scale.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '15',
        title: 'GitHub Universe 2026',
        description: 'GitHub\'s flagship developer conference — Copilot AI, platform updates, and developer productivity.',
        startTime: '2026-05-28T16:00:00Z',
        endTime: '2026-05-29T23:59:59Z',
        location: 'San Francisco, CA',
        organizer: 'GitHub',
        status: 'published',
        eventFormat: 'Hybrid',
        priceMin: 0,
        sourceUrl: 'https://githubuniverse.com',
        eventTypeId: 'product',
        category: { id: 'product', name: 'Product', color: '#10b981', description: 'Product Launch' },
        organization: {
            id: 'github',
            name: 'GitHub',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg'
        },
        tags: [
            { id: 't2', name: 'AI', category: 'tech', color: 'green' },
            { id: 't29', name: 'DevTools', category: 'tools', color: 'black' },
            { id: 't8', name: 'JavaScript', category: 'lang', color: 'yellow' }
        ],
        careerImpact: createDemoImpact(81, 'Copilot and CI/CD evolution — high signal for senior devs and team leads.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '16',
        title: 'Figma Config 2026',
        description: 'The annual design & dev conference from Figma celebrating the future of product design.',
        startTime: '2026-05-08T16:00:00Z',
        endTime: '2026-05-09T23:59:59Z',
        location: 'San Francisco, CA',
        organizer: 'Figma',
        status: 'published',
        eventFormat: 'Hybrid',
        priceMin: 0,
        sourceUrl: 'https://config.figma.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'figma',
            name: 'Figma',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg'
        },
        tags: [
            { id: 't9', name: 'UI/UX', category: 'design', color: 'pink' },
            { id: 't30', name: 'Design Systems', category: 'design', color: 'orange' },
            { id: 't16', name: 'Frontend', category: 'dev', color: 'blue' }
        ],
        careerImpact: createDemoImpact(71, 'Design-dev collaboration and component system patterns for product-minded engineers.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '17',
        title: 'Deno Conf 2026',
        description: 'The community conference for Deno, the secure JavaScript and TypeScript runtime.',
        startTime: '2026-05-12T17:00:00Z',
        endTime: '2026-05-13T01:00:00Z',
        location: 'Online',
        organizer: 'Deno Land',
        status: 'published',
        eventFormat: 'Online',
        priceMin: 0,
        sourceUrl: 'https://deno.com/conf',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'deno',
            name: 'Deno Land',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Deno.svg'
        },
        tags: [
            { id: 't8', name: 'JavaScript', category: 'lang', color: 'yellow' },
            { id: 't17', name: 'TypeScript', category: 'lang', color: 'blue' },
            { id: 't15', name: 'Next.js', category: 'framework', color: 'black' }
        ],
        careerImpact: createDemoImpact(68, 'Modern JS runtime ecosystem exposure with practical backend patterns.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '18',
        title: 'GraphQL Summit 2026',
        description: 'The world\'s largest GraphQL conference — APIs, federation, and real-time data.',
        startTime: '2026-05-26T15:00:00Z',
        endTime: '2026-05-27T23:00:00Z',
        location: 'Austin, TX',
        organizer: 'Apollo GraphQL',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$500',
        priceMin: 500,
        sourceUrl: 'https://summit.graphql.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'apollo',
            name: 'Apollo GraphQL',
            logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/apollographql.svg'
        },
        tags: [
            { id: 't31', name: 'GraphQL', category: 'api', color: 'pink' },
            { id: 't3', name: 'Web', category: 'tech', color: 'indigo' },
            { id: 't8', name: 'JavaScript', category: 'lang', color: 'yellow' }
        ],
        careerImpact: createDemoImpact(74, 'API design and federation patterns highly relevant for platform/backend roles.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '19',
        title: 'StrangeLoop 2026',
        description: 'A multi-disciplinary conference exploring emerging languages, technologies, science, and ideas.',
        startTime: '2026-05-21T14:00:00Z',
        endTime: '2026-05-22T22:00:00Z',
        location: 'St. Louis, MO',
        organizer: 'Strange Loop',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$350',
        priceMin: 350,
        sourceUrl: 'https://thestrangeloop.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'strangeloop',
            name: 'Strange Loop',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg'
        },
        tags: [
            { id: 't17', name: 'TypeScript', category: 'lang', color: 'blue' },
            { id: 't32', name: 'Systems', category: 'arch', color: 'gray' },
            { id: 't11', name: 'Serverless', category: 'arch', color: 'purple' }
        ],
        careerImpact: createDemoImpact(76, 'High intellectual density — emerging languages, distributed systems, and CS theory.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '20',
        title: 'Netlify Compose 2026',
        description: 'The composable web conference — edge, serverless, and the new frontend architecture.',
        startTime: '2026-05-15T15:00:00Z',
        endTime: '2026-05-15T23:00:00Z',
        location: 'Online',
        organizer: 'Netlify',
        status: 'published',
        eventFormat: 'Online',
        priceMin: 0,
        sourceUrl: 'https://netlify.com/compose',
        eventTypeId: 'product',
        category: { id: 'product', name: 'Product', color: '#10b981', description: 'Product Launch' },
        organization: {
            id: 'netlify',
            name: 'Netlify',
            logo: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/netlify.svg'
        },
        tags: [
            { id: 't16', name: 'Frontend', category: 'dev', color: 'blue' },
            { id: 't11', name: 'Serverless', category: 'arch', color: 'purple' },
            { id: 't3', name: 'Web', category: 'tech', color: 'indigo' }
        ],
        careerImpact: createDemoImpact(70, 'Edge deployment and composable architecture — high relevance for fullstack engineers.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '21',
        title: 'Monktoberfest 2026',
        description: 'RedMonk\'s annual developer relations and community conference for the software industry.',
        startTime: '2026-05-05T13:00:00Z',
        endTime: '2026-05-06T21:00:00Z',
        location: 'Portland, ME',
        organizer: 'RedMonk',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$800',
        priceMin: 800,
        sourceUrl: 'https://monktoberfest.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'redmonk',
            name: 'RedMonk',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg'
        },
        tags: [
            { id: 't19', name: 'Networking', category: 'community', color: 'pink' },
            { id: 't20', name: 'Startups', category: 'business', color: 'orange' },
            { id: 't29', name: 'DevTools', category: 'tools', color: 'black' }
        ],
        careerImpact: createDemoImpact(69, 'Developer relations and community strategy — valued for senior IC and leadership tracks.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '22',
        title: 'SREcon 2026 Americas',
        description: 'A gathering of engineers who care deeply about site reliability, systems engineering, and working with complex distributed systems.',
        startTime: '2026-05-27T16:00:00Z',
        endTime: '2026-05-27T23:59:59Z',
        location: 'Santa Clara, CA',
        organizer: 'USENIX',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$1050',
        priceMin: 1050,
        sourceUrl: 'https://usenix.org/srecon',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'usenix',
            name: 'USENIX',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Kubernetes_logo_without_workmark.svg'
        },
        tags: [
            { id: 't33', name: 'SRE', category: 'ops', color: 'red' },
            { id: 't24', name: 'Infrastructure', category: 'infrastructure', color: 'gray' },
            { id: 't32', name: 'Systems', category: 'arch', color: 'gray' }
        ],
        careerImpact: createDemoImpact(82, 'Site reliability at production scale — essential for SRE and platform engineering roles.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '23',
        title: 'Collision 2026',
        description: 'One of North America\'s fastest-growing tech conferences bringing together startups, investors, and tech leaders.',
        startTime: '2026-06-01T13:00:00Z',
        endTime: '2026-06-03T21:00:00Z',
        location: 'Toronto, Canada',
        organizer: 'Collision',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$799',
        priceMin: 799,
        sourceUrl: 'https://collisionconf.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'collision',
            name: 'Collision',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg'
        },
        tags: [
            { id: 't19', name: 'Networking', category: 'community', color: 'pink' },
            { id: 't20', name: 'Startups', category: 'business', color: 'orange' },
            { id: 't2', name: 'AI', category: 'tech', color: 'green' }
        ],
        careerImpact: createDemoImpact(75, 'High-density startup and investor networking — excellent for founders and senior hiring.'),
        createdAt: new Date().toISOString()
    },
    {
        id: '24',
        title: 'GopherCon 2026',
        description: 'The world\'s largest conference dedicated to the Go programming language community.',
        startTime: '2026-05-29T14:00:00Z',
        endTime: '2026-05-30T22:00:00Z',
        location: 'Chicago, IL',
        organizer: 'GopherCon',
        status: 'published',
        eventFormat: 'In-person',
        priceRange: '$600',
        priceMin: 600,
        sourceUrl: 'https://gophercon.com',
        eventTypeId: 'conference',
        category: { id: 'conference', name: 'Conference', color: '#6366f1', description: 'Tech Conference' },
        organization: {
            id: 'gophercon',
            name: 'GopherCon',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Go_Logo_Blue.svg'
        },
        tags: [
            { id: 't34', name: 'Go', category: 'lang', color: 'cyan' },
            { id: 't24', name: 'Infrastructure', category: 'infrastructure', color: 'gray' },
            { id: 't10', name: 'Cloud', category: 'infrastructure', color: 'orange' }
        ],
        careerImpact: createDemoImpact(72, 'Go ecosystem and performance patterns — strong for backend platform and infra roles.'),
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

function buildMockJustificationData(event: (typeof RAW_MOCK_EVENTS)[number]): ManagerJustificationData {
    const impact = event.careerImpact;
    return {
        event: {
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            timezone: 'UTC',
            location: event.location,
            eventFormat: event.eventFormat as ManagerJustificationData['event']['eventFormat'],
            organizer: event.organizer,
            priceRange: 'priceRange' in event ? (event.priceRange as string) : null,
            priceMin: event.priceMin,
            registrationUrl: null,
            description: event.description,
            tags: event.tags.map((t) => t.name),
            speakers: [],
            difficulty: 'intermediate',
            targetAudience: 'Software engineers and technical practitioners',
        },
        profile: {
            currentRole: 'Senior Software Engineer',
            seniority: 'Senior',
            industry: 'Technology',
            primarySkills: ['TypeScript', 'React', 'Node.js', 'System Design'],
            skillsToLearn: event.tags.slice(0, 2).map((t) => t.name),
            careerGoals: ['Technical Leadership', 'System Architecture', 'Team Growth'],
        },
        impact: {
            overall: impact.overall,
            confidence: impact.confidence,
            components: impact.components,
            topReasons: impact.explanation.reasons,
            matchedSkills: impact.explanation.matchedSkills,
            matchedGoals: ['Technical Leadership', 'System Architecture'],
        },
    };
}

export const MOCK_MANAGER_JUSTIFICATION_MAP: Map<string, ManagerJustificationData> = new Map(
    RAW_MOCK_EVENTS.map((event) => [event.id, buildMockJustificationData(event)])
);

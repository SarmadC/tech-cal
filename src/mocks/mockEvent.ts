import { AgendaItem, Event, EventType } from '@/types';

const baseDate = '2025-02-05';

export const mockEventCategories: EventType[] = [
    {
        id: 'mock-summit',
        name: 'AI Product Summit',
        color: '#7c3aed',
        description: 'Product strategy, research, and engineering collaboration',
        icon: 'Sparkle'
    },
    {
        id: 'mock-workshop',
        name: 'Hands-on Workshop',
        color: '#0ea5e9',
        description: 'Small-group labs and tutorials',
        icon: 'ChalkboardSimple'
    }
];

const mockAgenda: AgendaItem[] = [
    {
        id: 'agenda-1',
        title: 'Welcome & Opening Remarks',
        startTime: `${baseDate}T09:00:00-08:00`,
        endTime: `${baseDate}T09:20:00-08:00`,
        type: 'Keynote',
        description: 'Setting the tone for the summit with product north stars.',
        track: 'Main Stage',
        location: 'Grand Hall',
        sortOrder: 1,
        speakers: [
            {
                id: 's-1',
                name: 'Taylor Reed',
                title: 'Head of Product',
                company: 'Northstar Labs'
            }
        ]
    },
    {
        id: 'agenda-2',
        title: 'Customer Journey Mapping with AI',
        startTime: `${baseDate}T09:25:00-08:00`,
        endTime: `${baseDate}T10:05:00-08:00`,
        type: 'Talk',
        description: 'Practical patterns for synthesizing feedback across channels.',
        track: 'Main Stage',
        location: 'Grand Hall',
        sortOrder: 2,
        speakers: [
            { id: 's-2', name: 'Priya Nair', title: 'UX Research Lead', company: 'Flowly' }
        ]
    },
    {
        id: 'agenda-3',
        title: 'Architecture Clinic: Realtime Insights',
        startTime: `${baseDate}T10:15:00-08:00`,
        endTime: `${baseDate}T11:30:00-08:00`,
        type: 'Workshop',
        description: 'Hands-on lab implementing realtime dashboards with event streams.',
        track: 'Workshop Lab',
        location: 'Innovation Studio',
        sortOrder: 3,
        speakers: [
            { id: 's-3', name: 'Alex Kim', title: 'Staff Engineer', company: 'Northstar Labs' },
            { id: 's-4', name: 'Morgan Lee', title: 'Data Platform PM', company: 'Northstar Labs' }
        ]
    },
    {
        id: 'agenda-4',
        title: 'Lunch & Partner Demos',
        startTime: `${baseDate}T11:45:00-08:00`,
        endTime: `${baseDate}T12:45:00-08:00`,
        type: 'Networking',
        description: 'Tasteful bites, informal demos, and hallway conversations.',
        track: 'Commons',
        location: 'Atrium',
        sortOrder: 4
    },
    {
        id: 'agenda-5',
        title: 'From Signal to Shipping',
        startTime: `${baseDate}T13:00:00-08:00`,
        endTime: `${baseDate}T13:50:00-08:00`,
        type: 'Panel',
        description: 'How teams move from user signal to shipped product safely.',
        track: 'Main Stage',
        location: 'Grand Hall',
        sortOrder: 5,
        speakers: [
            { id: 's-5', name: 'Jordan Chen', title: 'Director of Engineering', company: 'Qubic' },
            { id: 's-6', name: 'Samira Patel', title: 'Design Systems Lead', company: 'Helio' }
        ]
    },
    {
        id: 'agenda-6',
        title: 'AI Safety Field Guide',
        startTime: `${baseDate}T14:00:00-08:00`,
        endTime: `${baseDate}T14:45:00-08:00`,
        type: 'Talk',
        description: 'Guardrails, evaluations, and rollout playbooks for AI features.',
        track: 'Main Stage',
        location: 'Grand Hall',
        sortOrder: 6,
        speakers: [
            { id: 's-7', name: 'Leah Ortiz', title: 'Safety PM', company: 'Relay' }
        ]
    },
    {
        id: 'agenda-7',
        title: 'Shiproom Simulator',
        startTime: `${baseDate}T15:00:00-08:00`,
        endTime: `${baseDate}T16:15:00-08:00`,
        type: 'Workshop',
        description: 'Scenario-driven release practice with incident drills.',
        track: 'Workshop Lab',
        location: 'Innovation Studio',
        sortOrder: 7
    },
    {
        id: 'agenda-8',
        title: 'Closing Social',
        startTime: `${baseDate}T16:30:00-08:00`,
        endTime: `${baseDate}T17:30:00-08:00`,
        type: 'Networking',
        description: 'Light bites, music, and hosted conversations with speakers.',
        track: 'Commons',
        location: 'Sky Lounge',
        sortOrder: 8
    }
];

export const mockEvent: Event = {
    id: 'mock-event-001',
    createdAt: `${baseDate}T07:45:00-08:00`,
    updatedAt: `${baseDate}T08:00:00-08:00`,
    title: 'Northstar AI Product Summit',
    description: 'A one-day deep dive into shipping trustworthy AI-powered product experiences with realtime telemetry, safety guardrails, and design-led workflows.',
    organizer: 'Northstar Labs',
    location: 'San Francisco, CA + Livestream',
    status: 'confirmed',
    startTime: `${baseDate}T09:00:00-08:00`,
    endTime: `${baseDate}T17:30:00-08:00`,
    timezone: 'America/Los_Angeles',
    sourceUrl: 'https://northstar.example.com/summit',
    livestreamUrl: 'https://northstar.example.com/summit/livestream',
    registrationUrl: 'https://northstar.example.com/summit/register',
    eventTypeId: mockEventCategories[0].id,
    category: mockEventCategories[0],
    tags: [
        { id: 'tag-ai', name: 'AI', color: '#8b5cf6', category: 'topic' },
        { id: 'tag-product', name: 'Product Strategy', color: '#2563eb', category: 'topic' },
        { id: 'tag-safety', name: 'Safety', color: '#f59e0b', category: 'topic' }
    ],
    organization: {
        id: 'org-northstar',
        name: 'Northstar Labs',
        logo: '/logo.svg'
    },
    color: '#7c3aed',
    eventImageUrl: '/images/demo-event.jpg',
    priceRange: '$0',
    capacity: 400,
    attendeeCount: 275,
    difficulty: 'intermediate',
    eventFormat: 'Hybrid',
    targetAudience: 'Product managers, engineers, designers',
    prerequisites: 'Basic familiarity with AI feature delivery',
    agendaUrl: 'https://northstar.example.com/summit/agenda',
    speakerLineup: mockAgenda.flatMap(item => item.speakers || []),
    agenda: mockAgenda
};





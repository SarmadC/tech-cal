import { describe, it, expect } from 'vitest';
import { calculateBaseScore } from '@/lib/recommendation/baseScorer';
import type { Event, AgendaItem } from '@/types';
import type { CareerProfile } from '@/types/career';

// Sample career profile
const sampleCareerProfile: CareerProfile = {
  userId: 'test-user-123',
  profileId: 'test-profile-123',
  lastUpdated: new Date().toISOString(),
  currentRole: 'Software Engineer',
  seniority: 'mid-level',
  industry: 'Technology',
  companySize: 'medium',
  primarySkills: ['JavaScript'],
  skillsToLearn: ['Rust', 'WebAssembly'],
  interests: ['Performance'],
  careerGoals: ['skill-development'],
  timeframe: 'medium-term',
  learningStyle: ['hands-on'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: [],
  preferredEventTypes: []
};

// Base event without agenda
const baseEvent: Event = {
  id: 'e1',
  title: 'Generic Tech Conference',
  description: 'A conference about general technology topics.',
  startTime: '2025-11-01T10:00:00Z',
  endTime: '2025-11-01T17:00:00Z',
  location: 'Online',
  status: 'confirmed',
  sourceUrl: 'https://example.com',
  livestreamUrl: null,
  eventTypeId: '1',
  createdAt: new Date().toISOString(),
  organizer: 'Tech Corp',
  tags: []
};

describe('Agenda Scoring', () => {
  it('should score higher when agenda items match user skills', () => {
    // Score without agenda
    const scoreWithoutAgenda = calculateBaseScore(baseEvent, sampleCareerProfile);

    // Create event with relevant agenda
    const agendaItems: AgendaItem[] = [
      {
        id: 'a1',
        title: 'Introduction to Rust',
        description: 'Learn the basics of Rust programming language.',
        startTime: '2025-11-01T10:00:00Z',
        endTime: '2025-11-01T11:00:00Z',
        type: 'session'
      },
      {
        id: 'a2',
        title: 'WebAssembly Performance',
        description: 'Optimizing performance with WebAssembly.',
        startTime: '2025-11-01T11:00:00Z',
        endTime: '2025-11-01T12:00:00Z',
        type: 'session'
      }
    ];

    const eventWithAgenda: Event = {
      ...baseEvent,
      agenda: agendaItems
    };

    // Score with agenda
    const scoreWithAgenda = calculateBaseScore(eventWithAgenda, sampleCareerProfile);

    console.log('Score without agenda:', scoreWithoutAgenda.overall);
    console.log('Score with agenda:', scoreWithAgenda.overall);
    console.log('Reasons with agenda:', scoreWithAgenda.alignmentReasons.map(r => r.reason));

    expect(scoreWithAgenda.overall).toBeGreaterThan(scoreWithoutAgenda.overall);
    
    // Verify specific matches
    const hasRustMatch = scoreWithAgenda.alignmentReasons.some(r => r.reason.includes('Rust'));
    expect(hasRustMatch).toBe(true);
  });

  it('should score higher when agenda items match user goals', () => {
    const goalProfile: CareerProfile = {
      ...sampleCareerProfile,
      careerGoals: ['leadership-growth']
    };

    const scoreWithoutAgenda = calculateBaseScore(baseEvent, goalProfile);

    const agendaItems: AgendaItem[] = [
      {
        id: 'a3',
        title: 'Engineering Leadership Panel',
        description: 'Discussion on growing into engineering management.',
        startTime: '2025-11-01T13:00:00Z',
        endTime: '2025-11-01T14:00:00Z',
        type: 'panel'
      }
    ];

    const eventWithAgenda: Event = {
      ...baseEvent,
      agenda: agendaItems
    };

    const scoreWithAgenda = calculateBaseScore(eventWithAgenda, goalProfile);

    expect(scoreWithAgenda.overall).toBeGreaterThan(scoreWithoutAgenda.overall);
    const hasLeadershipMatch = scoreWithAgenda.alignmentReasons.some(r => r.type === 'goal');
    expect(hasLeadershipMatch).toBe(true);
  });
});

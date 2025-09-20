import { expect } from 'vitest';
import { Event, EventType, EventTag } from '@/types';
import { CareerProfile, SeniorityLevel, CompanySize, CareerGoal, CareerTimeframe, LearningStyle, AvailableTime, BudgetRange, NetworkingGoal, CareerEventType } from '@/types/career';

/**
 * Test utilities for CareerImpactService
 */
export class CareerImpactTestUtils {
  /**
   * Create a mock event for testing
   */
  static createMockEvent(overrides: Partial<Event> = {}): Event {
    const baseEvent: Event = {
      id: 'test-event-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: null,
      title: 'Test Workshop: Advanced React Patterns',
      description: 'Learn advanced React patterns including hooks, context, and performance optimization techniques. This hands-on workshop covers modern React development practices.',
      organizer: 'Tech Academy',
      location: 'San Francisco, CA',
      status: 'confirmed',
      startTime: '2024-02-15T09:00:00Z',
      endTime: '2024-02-15T17:00:00Z',
      timezone: 'America/Los_Angeles',
      sourceUrl: 'https://example.com/event',
      livestreamUrl: null,
      registrationUrl: 'https://example.com/register',
      eventTypeId: 'workshop',
      category: {
        id: 'workshop',
        name: 'Workshop',
        description: 'Hands-on learning sessions',
        color: '#3B82F6'
      } as EventType,
      tags: [
        { id: 'react', name: 'React', color: '#61DAFB', category: 'technology' },
        { id: 'javascript', name: 'JavaScript', color: '#F7DF1E', category: 'technology' }
      ] as EventTag[],
      organization: {
        id: 'tech-academy',
        name: 'Tech Academy',
        logo: 'https://example.com/logo.png'
      },
      color: '#3B82F6',
      eventImageUrl: 'https://example.com/image.jpg',
      priceRange: '$100-200',
      capacity: 50,
      attendeeCount: 45,
      difficulty: 'intermediate',
      targetAudience: 'Frontend developers',
      prerequisites: 'Basic React knowledge',
      agendaUrl: 'https://example.com/agenda',
      speakerLineup: [
        { id: 'speaker-1', name: 'John Doe', title: 'Senior React Developer', company: 'Tech Corp', bio: 'Expert in React development', photoUrl: 'https://example.com/john.jpg' },
        { id: 'speaker-2', name: 'Jane Smith', title: 'React Architect', company: 'Startup Inc', bio: 'React architecture specialist', photoUrl: 'https://example.com/jane.jpg' }
      ],
      agenda: []
    };

    return { ...baseEvent, ...overrides };
  }

  /**
   * Create a mock career profile for testing
   */
  static createMockCareerProfile(overrides: Partial<CareerProfile> = {}): CareerProfile {
    const baseProfile: CareerProfile = {
      userId: 'user-123',
      profileId: 'profile-123',
      lastUpdated: '2024-01-01T00:00:00Z',
      currentRole: 'Frontend Developer',
      seniority: 'mid-level' as SeniorityLevel,
      industry: 'Technology',
      companySize: 'medium' as CompanySize,
      primarySkills: ['React', 'JavaScript', 'TypeScript', 'CSS'],
      skillsToLearn: ['Node.js', 'GraphQL', 'AWS'],
      interests: ['Web Development', 'UI/UX', 'Performance Optimization'],
      careerGoals: ['skill-development' as CareerGoal, 'career-advancement' as CareerGoal],
      timeframe: 'short-term' as CareerTimeframe,
      learningStyle: ['hands-on' as LearningStyle, 'interactive' as LearningStyle],
      availableTime: 'moderate' as AvailableTime,
      budget: 'moderate' as BudgetRange,
      networkingGoals: ['industry-connections' as NetworkingGoal, 'mentorship' as NetworkingGoal],
      preferredEventTypes: ['workshop' as CareerEventType, 'conference' as CareerEventType]
    };

    return { ...baseProfile, ...overrides };
  }

  /**
   * Create a high-impact event for testing
   */
  static createHighImpactEvent(): Event {
    return this.createMockEvent({
      id: 'high-impact-event',
      title: 'Senior Developer Leadership Conference',
      description: 'Learn leadership skills, team management, and career advancement strategies for senior developers. Features keynote speakers from top tech companies.',
      category: { id: 'conference', name: 'Conference', description: 'Professional conferences', color: '#10B981' } as EventType,
      priceRange: '$500-1000',
      attendeeCount: 500,
      speakerLineup: [
        { id: 'ceo-1', name: 'Tech CEO', title: 'CEO', company: 'Tech Giant', bio: 'Industry leader', photoUrl: 'https://example.com/ceo.jpg' },
        { id: 'cto-1', name: 'Tech CTO', title: 'CTO', company: 'Startup', bio: 'Technical executive', photoUrl: 'https://example.com/cto.jpg' }
      ]
    });
  }

  /**
   * Create a low-impact event for testing
   */
  static createLowImpactEvent(): Event {
    return this.createMockEvent({
      id: 'low-impact-event',
      title: 'Casual Coffee Meetup',
      description: 'Informal networking event for local developers.',
      category: { id: 'social', name: 'Social', description: 'Social events', color: '#F59E0B' } as EventType,
      priceRange: 'Free',
      attendeeCount: 15,
      speakerLineup: [],
      location: 'Local Coffee Shop'
    });
  }

  /**
   * Create a senior-level career profile for testing
   */
  static createSeniorCareerProfile(): CareerProfile {
    return this.createMockCareerProfile({
      currentRole: 'Senior Software Engineer',
      seniority: 'senior' as SeniorityLevel,
      primarySkills: ['React', 'Node.js', 'AWS', 'Docker', 'Kubernetes'],
      skillsToLearn: ['Leadership', 'System Design', 'Team Management'],
      careerGoals: ['leadership-growth' as CareerGoal, 'career-advancement' as CareerGoal],
      availableTime: 'flexible' as AvailableTime,
      budget: 'high' as BudgetRange
    });
  }

  /**
   * Create a junior-level career profile for testing
   */
  static createJuniorCareerProfile(): CareerProfile {
    return this.createMockCareerProfile({
      currentRole: 'Junior Developer',
      seniority: 'junior' as SeniorityLevel,
      primarySkills: ['JavaScript', 'HTML', 'CSS'],
      skillsToLearn: ['React', 'TypeScript', 'Testing'],
      careerGoals: ['skill-development' as CareerGoal],
      availableTime: 'limited' as AvailableTime,
      budget: 'low' as BudgetRange
    });
  }

  /**
   * Create multiple events for batch testing
   */
  static createBatchEvents(): Event[] {
    return [
      this.createHighImpactEvent(),
      this.createLowImpactEvent(),
      this.createMockEvent({
        id: 'webinar-event',
        title: 'Introduction to Machine Learning',
        category: { id: 'webinar', name: 'Webinar', description: 'Online presentations', color: '#8B5CF6' } as EventType,
        livestreamUrl: 'https://example.com/livestream',
        attendeeCount: 1000
      }),
      this.createMockEvent({
        id: 'training-event',
        title: 'AWS Certification Training',
        category: { id: 'training', name: 'Training', description: 'Professional training', color: '#EF4444' } as EventType,
        priceRange: '$300-500',
        attendeeCount: 200
      })
    ];
  }

  /**
   * Assert that a score is within expected range
   */
  static assertScoreInRange(score: number, min: number = 0, max: number = 100): void {
    if (score < min || score > max) {
      throw new Error(`Score ${score} is outside expected range [${min}, ${max}]`);
    }
  }

  /**
   * Assert that confidence is within expected range
   */
  static assertConfidenceInRange(confidence: number, min: number = 0, max: number = 1): void {
    if (confidence < min || confidence > max) {
      throw new Error(`Confidence ${confidence} is outside expected range [${min}, ${max}]`);
    }
  }

  /**
   * Assert that impact category is valid
   */
  static assertValidImpactCategory(category: string): void {
    const validCategories = ['transformative', 'high', 'moderate', 'low'];
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid impact category: ${category}. Must be one of: ${validCategories.join(', ')}`);
    }
  }

  /**
   * Consolidated assertion for complete career impact score validation
   */
  static assertValidCareerImpactScore(result: { overall: number; confidence: number; components: unknown; explanation: { careerImpactCategory: string }; metadata: unknown }): void {
    this.assertScoreInRange(result.overall);
    this.assertConfidenceInRange(result.confidence);
    expect(result.components).toBeDefined();
    expect(result.explanation).toBeDefined();
    expect(result.metadata).toBeDefined();
    this.assertValidImpactCategory(result.explanation.careerImpactCategory);
  }

  /**
   * Create a mock component score for testing
   */
  static createMockComponentScore(overrides: Partial<{ score: number; confidence: number; explanation: string }> = {}) {
    return {
      score: 75,
      maxScore: 100,
      explanation: 'Test component score',
      confidence: 0.8,
      details: { test: true },
      ...overrides
    };
  }
}

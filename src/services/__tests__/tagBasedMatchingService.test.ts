import { describe, it, expect } from 'vitest';
import { TagBasedMatchingService } from '../tagBasedMatchingService';
import type { Event, EventTag } from '@/types';
import type { CareerProfile } from '@/types/career';

describe('TagBasedMatchingService Role Integration', () => {
  const createTestEvent = (title: string, tags: EventTag[] = []): Event => ({
    id: 'test-event',
    title,
    description: '',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    location: 'Test Location',
    organizer: 'Test Organizer',
    status: 'confirmed',
    sourceUrl: 'https://example.com',
    eventTypeId: 'test-type',
    priceRange: 'Free',
    registrationUrl: '',
    livestreamUrl: null,
    attendeeCount: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags
  });

  const createTestProfile = (overrides: Partial<CareerProfile> = {}): CareerProfile => ({
    userId: 'test-user-id',
    profileId: 'test-profile-id',
    lastUpdated: new Date().toISOString(),
    currentRole: 'Frontend Engineer',
    seniority: 'mid-level',
    industry: 'Technology',
    companySize: 'medium',
    primarySkills: [],
    skillsToLearn: [],
    interests: [],
    careerGoals: [],
    timeframe: 'medium-term',
    learningStyle: [],
    availableTime: 'moderate',
    budget: 'moderate',
    networkingGoals: [],
    preferredEventTypes: [],
    ...overrides,
  });

  it('should match role keywords in event tags', () => {
    const profile = createTestProfile({
      currentRole: 'Frontend Engineer'
    });
    
    const event = createTestEvent('Frontend Development Workshop', [
      { id: '1', name: 'frontend', color: '#3B82F6', category: 'Programming' },
      { id: '2', name: 'react', color: '#61DAFB', category: 'Framework' }
    ]);
    
    const result = TagBasedMatchingService.calculateTagSimilarity(event, profile);
    
    expect(result.score).toBeGreaterThan(0);
    expect(result.explanation).toContain('Frontend Engineer');
  });

  it('should match Data Scientist role', () => {
    const profile = createTestProfile({
      currentRole: 'Data Scientist'
    });
    
    const event = createTestEvent('Data Science Summit', [
      { id: '1', name: 'data science', color: '#10B981', category: 'Tech' }
    ]);
    
    const match = TagBasedMatchingService.calculateTagSimilarity(event, profile);
    
    expect(match.explanation).toContain('Data Scientist');
  });

  it('should not match when role keywords are not present', () => {
    const profile = createTestProfile({
      currentRole: 'Frontend Engineer'
    });
    
    const event = createTestEvent('Backend API Workshop', [
      { id: '1', name: 'backend', color: '#8B5CF6', category: 'Programming' }
    ]);
    
    const result = TagBasedMatchingService.calculateTagSimilarity(event, profile);
    
    expect(result.explanation).not.toContain('Frontend Engineer');
  });

  it('should add role boost in profile boost calculation', () => {
    const profile = createTestProfile({
      currentRole: 'Data Scientist'
    });
    
    const event = createTestEvent('Machine Learning Workshop', [
      { id: '1', name: 'data science', color: '#10B981', category: 'Tech' }
    ]);
    
    const match = TagBasedMatchingService.calculateTagSimilarity(event, profile);
    const { boost, reasons } = TagBasedMatchingService.calculateProfileBoost(event, profile, match);
    
    expect(boost).toBeGreaterThan(0);
    expect(reasons).toContain('Matches your Data Scientist role');
  });
});
import { describe, it, expect } from 'vitest';
import { calculateBaseScore } from '../baseScorer';
import type { Event } from '@/types';
import type { CareerProfile } from '@/types/career';

// Access the private matchesWholeWord function via the module
// Since it's not exported, we'll test it indirectly through calculateBaseScore

describe('matchesWholeWord (indirect testing via calculateBaseScore)', () => {
  const createTestEvent = (title: string, description: string = ''): Event => ({
    id: 'test-event-1',
    title,
    description,
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
  });

  const createTestProfile = (overrides: Partial<CareerProfile> = {}): CareerProfile => ({
    userId: 'test-user-id',
    profileId: 'test-profile-id',
    lastUpdated: new Date().toISOString(),
    currentRole: 'Developer',
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

  describe('Skills matching with word boundaries', () => {
    it('should NOT match "Java" skill to "JavaScript" event', () => {
      const profile = createTestProfile({
        skillsToLearn: ['Java'],
      });
      const event = createTestEvent('JavaScript Fundamentals', 'Learn JavaScript from scratch');
      
      const result = calculateBaseScore(event, profile);
      
      // Should NOT match (Java !== JavaScript)
      expect(result.matchedSkills).not.toContain('Java');
      expect(result.overall).toBe(0); // No other matches
    });

    it('should match "Java" skill to "Java" event', () => {
      const profile = createTestProfile({
        skillsToLearn: ['Java'],
      });
      const event = createTestEvent('Java Programming Bootcamp', 'Learn Java programming');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match
      expect(result.matchedSkills).toContain('Java');
      expect(result.components.skillRelevance).toBeGreaterThan(0);
    });

    it('should match "React" skill to "React" event', () => {
      const profile = createTestProfile({
        primarySkills: ['React'],
      });
      const event = createTestEvent('React Best Practices', 'Advanced React patterns');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match
      expect(result.matchedSkills).toContain('React');
      expect(result.components.skillRelevance).toBeGreaterThan(0);
    });

    it('should NOT match "React" skill to "Reactive" event', () => {
      const profile = createTestProfile({
        primarySkills: ['React'],
      });
      const event = createTestEvent('Reactive Programming', 'Learn reactive programming patterns');
      
      const result = calculateBaseScore(event, profile);
      
      // Should NOT match (React !== Reactive)
      expect(result.matchedSkills).not.toContain('React');
    });

    it('should NOT match "Test" skill to "Testing" in title', () => {
      const profile = createTestProfile({
        primarySkills: ['Test'],
      });
      const event = createTestEvent('Latest Testing Frameworks', 'Testing best practices');
      
      const result = calculateBaseScore(event, profile);
      
      // Should NOT match (Test !== Testing, Latest)
      expect(result.matchedSkills).not.toContain('Test');
    });

    it('should NOT match "Data" skill to "Database" event', () => {
      const profile = createTestProfile({
        interests: ['Data'],
      });
      const event = createTestEvent('Database Administration', 'Learn database management');
      
      const result = calculateBaseScore(event, profile);
      
      // Should NOT match (Data !== Database)
      expect(result.alignmentReasons.some(r => r.reason.includes('Data'))).toBe(false);
    });
  });

  describe('Multi-word skills matching', () => {
    it('should match "React Native" skill to "React Native" event', () => {
      const profile = createTestProfile({
        skillsToLearn: ['React Native'],
      });
      const event = createTestEvent('React Native Tutorial', 'Build apps with React Native');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match
      expect(result.matchedSkills).toContain('React Native');
      expect(result.components.skillRelevance).toBeGreaterThan(0);
    });

    it('should NOT match "React Native" to "Reactive Native" event', () => {
      const profile = createTestProfile({
        skillsToLearn: ['React Native'],
      });
      const event = createTestEvent('Reactive Native Applications', 'Build reactive apps');
      
      const result = calculateBaseScore(event, profile);
      
      // Should NOT match
      expect(result.matchedSkills).not.toContain('React Native');
    });

    it('should match "Machine Learning" skill correctly', () => {
      const profile = createTestProfile({
        skillsToLearn: ['Machine Learning'],
      });
      const event = createTestEvent('Machine Learning Workshop', 'Intro to Machine Learning');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match
      expect(result.matchedSkills).toContain('Machine Learning');
    });
  });

  describe('Special characters in skills', () => {
    it('should match "C++" skill to "C++" event', () => {
      const profile = createTestProfile({
        skillsToLearn: ['C++'],
      });
      const event = createTestEvent('C++ Programming', 'Learn C++ from basics');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match (regex escaping handles ++)
      expect(result.matchedSkills).toContain('C++');
    });

    it('should match "Node.js" skill to "Node.js" event', () => {
      const profile = createTestProfile({
        primarySkills: ['Node.js'],
      });
      const event = createTestEvent('Node.js Backend Development', 'Build APIs with Node.js');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match (regex escaping handles .)
      expect(result.matchedSkills).toContain('Node.js');
    });
  });

  describe('Case insensitivity', () => {
    it('should match regardless of case in event text', () => {
      const profile = createTestProfile({
        skillsToLearn: ['python'],
      });
      const event = createTestEvent('Learn PYTHON Today', 'PYTHON programming course');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match (case-insensitive)
      expect(result.matchedSkills.length).toBeGreaterThan(0);
    });
  });

  describe('Keyword matching in goals and learning styles', () => {
    it('should match career goal keywords with word boundaries', () => {
      const profile = createTestProfile({
        careerGoals: ['skill-development'],
      });
      const event = createTestEvent('Workshop on Advanced Topics', 'A comprehensive workshop');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match 'workshop' keyword from skill-development
      expect(result.matchedGoals).toContain('skill-development');
    });

    it('should NOT match partial goal keywords', () => {
      const profile = createTestProfile({
        careerGoals: ['skill-development'],
      });
      // "workshopping" should NOT match "workshop"
      const event = createTestEvent('Workshopping Ideas', 'Idea workshopping session');
      
      const result = calculateBaseScore(event, profile);
      
      // Should NOT match (workshopping !== workshop)
      expect(result.matchedGoals).not.toContain('skill-development');
    });

    it('should match learning style keywords with word boundaries', () => {
      const profile = createTestProfile({
        learningStyle: ['hands-on'],
      });
      const event = createTestEvent('Hands-on Coding Lab', 'Practical hands-on experience');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match
      expect(result.alignmentReasons.some(r => r.type === 'learning-style')).toBe(true);
    });
  });

  describe('Networking keywords', () => {
    it('should match networking keywords with word boundaries', () => {
      const profile = createTestProfile({
        networkingGoals: ['find-peers'],
      });
      const event = createTestEvent('Networking Event', 'Professional networking mixer');
      
      const result = calculateBaseScore(event, profile);
      
      // Should match
      expect(result.components.networkingValue).toBeGreaterThan(0);
    });

    it('should NOT match partial networking keywords', () => {
      const profile = createTestProfile({
        networkingGoals: ['find-peers'],
      });
      // "networks" should NOT match "networking"
      const event = createTestEvent('Computer Networks', 'Learn about computer networks');
      
      const result = calculateBaseScore(event, profile);
      
      // Should NOT match
      expect(result.components.networkingValue).toBe(0);
    });
  });
});


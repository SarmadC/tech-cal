import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useQuickEditForm } from '../useQuickEditForm';
import { CareerProfile } from '@/types/career';

// Mock CareerProfile for testing
const mockProfile: CareerProfile = {
  userId: 'user-123',
  profileId: 'profile-user-123',
  lastUpdated: '2024-01-01T00:00:00.000Z',
  currentRole: 'Software Engineer',
  seniority: 'mid-level',
  industry: 'Technology/Software',
  companySize: 'medium',
  primarySkills: ['React', 'TypeScript'],
  skillsToLearn: ['GraphQL'],
  interests: ['AI'],
  careerGoals: ['skill-development'],
  timeframe: 'immediate',
  learningStyle: ['hands-on'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: [],
  preferredEventTypes: []
};

describe('useQuickEditForm', () => {
  it('should initialize with correct draft and state', () => {
    const { result } = renderHook(() => 
      useQuickEditForm({
        initialProfile: mockProfile,
        section: 'role',
        validate: () => true
      })
    );

    // Check initial draft - hook merges section defaults with full profile
    expect(result.current.draft).toMatchObject({
      currentRole: 'Software Engineer',
      seniority: 'mid-level',
      industry: 'Technology/Software',
      companySize: 'medium',
      primarySkills: ['React', 'TypeScript'],
      skillsToLearn: ['GraphQL'],
      interests: ['AI'],
      careerGoals: ['skill-development'],
      timeframe: 'immediate',
      learningStyle: ['hands-on'],
      availableTime: 'moderate',
      budget: 'moderate',
      networkingGoals: [],
      preferredEventTypes: []
    });

    // Check initial state
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBeNull();
  });

  it('should update draft and set dirty state', () => {
    const { result } = renderHook(() => 
      useQuickEditForm({
        initialProfile: mockProfile,
        section: 'role',
        validate: () => true
      })
    );

    // Update draft
    act(() => {
      result.current.updateDraft({ 
        currentRole: 'Senior Software Engineer',
        seniority: 'senior' 
      });
    });

    // Check updated draft - hook merges updates with existing draft
    expect(result.current.draft).toMatchObject({
      currentRole: 'Senior Software Engineer',
      seniority: 'senior',
      industry: 'Technology/Software',
      companySize: 'medium',
      primarySkills: ['React', 'TypeScript'],
      skillsToLearn: ['GraphQL'],
      interests: ['AI'],
      careerGoals: ['skill-development'],
      timeframe: 'immediate',
      learningStyle: ['hands-on'],
      availableTime: 'moderate',
      budget: 'moderate',
      networkingGoals: [],
      preferredEventTypes: []
    });

    // Check dirty state
    expect(result.current.isDirty).toBe(true);
  });

  it('should save draft correctly with successful save', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => 
      useQuickEditForm({
        initialProfile: mockProfile,
        section: 'role',
        validate: () => true,
        onSave: mockOnSave
      })
    );

    // Update draft
    act(() => {
      result.current.updateDraft({ 
        currentRole: 'Senior Software Engineer',
        seniority: 'senior' 
      });
    });

    // Save draft
    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveDraft();
    });

    // Verify save
    expect(saveResult).toBe(true);
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      currentRole: 'Senior Software Engineer',
      seniority: 'senior'
    }));

    // Check state after save
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it('should handle save validation failure', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const failValidation = () => false;

    const { result } = renderHook(() => 
      useQuickEditForm({
        initialProfile: mockProfile,
        section: 'role',
        validate: failValidation,
        onSave: mockOnSave
      })
    );

    // Update draft
    act(() => {
      result.current.updateDraft({ 
        currentRole: 'Senior Software Engineer',
        seniority: 'senior' 
      });
    });

    // Attempt save
    let saveResult;
    await act(async () => {
      saveResult = await result.current.saveDraft();
    });

    // Verify validation failure
    expect(saveResult).toBe(false);
    expect(mockOnSave).not.toHaveBeenCalled();
    expect(result.current.saveError).toBe('Validation failed. Please check your inputs.');
    expect(result.current.isDirty).toBe(true);
  });

  it('should save the latest draft when save is triggered immediately after a change', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useQuickEditForm({
        initialProfile: mockProfile,
        section: 'networking',
        validate: () => true,
        onSave: mockOnSave
      })
    );

    let saveResult;
    await act(async () => {
      result.current.updateDraft({
        networkingGoals: ['find-mentors'],
        preferredEventTypes: ['workshop']
      });
      saveResult = await result.current.saveDraft();
    });

    expect(saveResult).toBe(true);
    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      networkingGoals: ['find-mentors'],
      preferredEventTypes: ['workshop']
    }));
  });
});

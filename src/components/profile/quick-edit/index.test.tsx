import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/utils/test-utils';
import { CareerProfile } from '@/types/career';

import QuickEditModal from './index';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('@/contexts/SnackbarContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/SnackbarContext')>();
  return {
    ...actual,
    useSnackbar: () => ({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    }),
  };
});

const mockProfile: CareerProfile = {
  userId: 'user-123',
  profileId: 'profile-user-123',
  lastUpdated: '2024-01-01T00:00:00.000Z',
  currentRole: 'Software Engineer',
  seniority: 'mid-level',
  industry: 'Technology/Software',
  companySize: 'medium',
  primarySkills: ['React'],
  skillsToLearn: ['GraphQL'],
  interests: ['AI'],
  careerGoals: ['skill-development'],
  timeframe: 'immediate',
  learningStyle: ['hands-on'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: [],
  preferredEventTypes: [],
};

describe('QuickEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves networking goals and event formats through the parent profile handler', async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn().mockResolvedValue(undefined);
    const onProfileSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <QuickEditModal
        isOpen
        onClose={vi.fn()}
        section="networking"
        currentProfile={mockProfile}
        onSaveProfile={onSaveProfile}
        onProfileSaved={onProfileSaved}
      />
    );

    await user.click(screen.getByLabelText('Connect with mentors'));
    await user.click(screen.getByLabelText('Workshops'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSaveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          networkingGoals: ['find-mentors'],
          preferredEventTypes: ['workshop'],
        })
      );
    });

    expect(onProfileSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        networkingGoals: ['find-mentors'],
        preferredEventTypes: ['workshop'],
      })
    );
    expect(mockShowSuccess).toHaveBeenCalledWith('Profile section updated successfully!');
    expect(mockShowError).not.toHaveBeenCalled();
  });
});

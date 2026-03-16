import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/utils/test-utils';

import { MobileCareerOnboarding } from './MobileCareerOnboarding';

vi.mock('@/contexts/SnackbarContext', () => ({
  SnackbarProvider: ({ children }: { children: unknown }) => children,
  useSnackbar: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showConfirmation: (
      _title: string,
      _message: string,
      onConfirm: () => void
    ) => onConfirm(),
  }),
}));

describe('MobileCareerOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.scrollTo = vi.fn();
  });

  it('clears saved onboarding progress when skipped from the mobile header', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();

    localStorage.setItem('career-onboarding-step', '1');
    localStorage.setItem('career-onboarding-data', JSON.stringify({
      step1_role: {
        currentRole: 'Software Engineer',
      },
    }));

    render(<MobileCareerOnboarding onComplete={vi.fn()} onSkip={onSkip} />);

    await user.click(screen.getByLabelText('Skip onboarding'));

    await waitFor(() => {
      expect(onSkip).toHaveBeenCalled();
      expect(localStorage.getItem('career-onboarding-step')).toBeNull();
      expect(localStorage.getItem('career-onboarding-data')).toBeNull();
    });
  });

  it('clamps legacy optional-step resumes to step 3 and opens inline preferences', async () => {
    render(
      <MobileCareerOnboarding
        onComplete={vi.fn()}
        initialStep={5}
        initialData={{
          step1_role: {
            currentRole: 'Software Engineer',
            seniority: 'mid-level',
          } as never,
          step2_skills: {
            primarySkills: ['React', 'TypeScript'],
            skillsToLearn: [],
            interests: [],
          } as never,
          step3_goals: {
            careerGoals: ['networking'],
            timeframe: 'medium-term',
          } as never,
          step4_preferences: {
            learningStyle: ['hands-on'],
          } as never,
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Step 3 of 3')).toHaveLength(2);
      expect(screen.getByText('Learning style')).toBeInTheDocument();
      expect(screen.getByText('Who do you want to meet?')).toBeInTheDocument();
      expect(screen.getByText('Event formats')).toBeInTheDocument();
      expect(screen.queryByText('Team preferences')).not.toBeInTheDocument();
    });
  });

  it('keeps optional preferences collapsed by default on step 3', async () => {
    render(
      <MobileCareerOnboarding
        onComplete={vi.fn()}
        initialStep={3}
        initialData={{
          step1_role: {
            currentRole: 'Software Engineer',
            seniority: 'mid-level',
          } as never,
          step2_skills: {
            primarySkills: ['React', 'TypeScript'],
            skillsToLearn: [],
            interests: [],
          } as never,
          step3_goals: {
            careerGoals: ['networking'],
            timeframe: 'medium-term',
          } as never,
          step4_preferences: {
            learningStyle: ['hands-on'],
          } as never,
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add preferences/i })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Learning style')).not.toBeInTheDocument();
    });
  });
});

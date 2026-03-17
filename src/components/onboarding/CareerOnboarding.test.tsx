import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen } from '@/utils/test-utils';

import CareerOnboarding from './CareerOnboarding';

const taxonomyMock = {
  skillOptions: [
    { value: 'React', label: 'React', category: 'FRONTEND_TECHNOLOGIES' },
    { value: 'Product Strategy', label: 'Product Strategy', category: 'PRODUCT_STRATEGY' },
    { value: 'Go-to-Market', label: 'Go-to-Market', category: 'PRODUCT_STRATEGY' },
    { value: 'Fundraising', label: 'Fundraising', category: 'BUSINESS_OPERATIONS' },
  ],
  interestOptions: [
    { value: 'Startup & Entrepreneurship', label: 'Startup & Entrepreneurship' },
  ],
  source: 'fallback',
  isLoading: false,
  getCurrentSkillSuggestions: () => ['Product Strategy', 'Go-to-Market'],
  getLearningSkillSuggestions: () => ['Fundraising', 'Business Operations'],
};

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

vi.mock('@/hooks/useOnboardingTaxonomy', () => ({
  useOnboardingTaxonomy: () => taxonomyMock,
}));

const baseDraft = {
  step1_role: {
    currentRole: 'Software Engineer',
    seniority: 'mid-level',
  },
  step2_skills: {
    primarySkills: ['React', 'TypeScript'],
    skillsToLearn: [],
    interests: [],
    skillTags: [
      {
        skill: 'React',
        proficiency: 'advanced',
        yearsOfExperience: 5,
        lastUsed: new Date().toISOString(),
        category: 'Frontend',
        order: 0,
      },
      {
        skill: 'TypeScript',
        proficiency: 'advanced',
        yearsOfExperience: 5,
        lastUsed: new Date().toISOString(),
        category: 'Frontend',
        order: 1,
      },
    ],
  },
};

describe('CareerOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('enforces the goal cap and requires a timeline before completing step 3', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    localStorage.setItem('career-onboarding-step', '3');
    localStorage.setItem('career-onboarding-data', JSON.stringify(baseDraft));

    render(<CareerOnboarding onComplete={onComplete} />);

    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();

    const completeButton = screen.getByRole('button', { name: /complete/i });
    expect(completeButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /learn new skills/i }));
    await user.click(screen.getByRole('button', { name: /change roles/i }));

    expect(screen.getByRole('button', { name: /develop leadership/i })).toBeDisabled();
    expect(completeButton).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /short-term/i }));

    expect(completeButton).toBeEnabled();

    await user.click(completeButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('includes the new founder role in the onboarding role picker', () => {
    localStorage.setItem('career-onboarding-step', '1');

    render(<CareerOnboarding onComplete={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'Founder' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Business Operations Manager' })).toBeInTheDocument();
  });

  it('shows non-technical suggestions in the onboarding skill selector', async () => {
    const user = userEvent.setup();

    localStorage.setItem('career-onboarding-step', '2');
    localStorage.setItem('career-onboarding-data', JSON.stringify({
      step1_role: {
        currentRole: 'Founder',
        seniority: 'founder',
      },
      step2_skills: {
        primarySkills: [],
        skillsToLearn: [],
        interests: [],
      },
    }));

    render(<CareerOnboarding onComplete={vi.fn()} />);

    await user.click(screen.getByPlaceholderText('Search current skills...'));

    expect(screen.getByText('Product Strategy')).toBeInTheDocument();
    expect(screen.getByText('Go-to-Market')).toBeInTheDocument();
  });

  it('rehydrates legacy optional-step drafts into step 3 with inline preferences open', () => {
    localStorage.setItem('career-onboarding-step', '5');
    localStorage.setItem('career-onboarding-data', JSON.stringify({
      ...baseDraft,
      step3_goals: {
        careerGoals: ['networking'],
        timeframe: 'medium-term',
      },
      step4_preferences: {
        learningStyle: ['hands-on'],
      },
      step5_networking: {
        networkingGoals: ['find-peers'],
        preferredEventTypes: [],
      },
    }));

    render(<CareerOnboarding onComplete={vi.fn()} />);

    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    expect(screen.queryByLabelText('Step 4: Learning')).not.toBeInTheDocument();
    expect(screen.getByText('Learning style')).toBeInTheDocument();
    expect(screen.getByText('Who do you want to meet?')).toBeInTheDocument();
    expect(screen.getByText('Event formats')).toBeInTheDocument();
    expect(screen.queryByText('Team preferences')).not.toBeInTheDocument();
  });

  it('keeps optional preferences collapsed by default on step 3', () => {
    localStorage.setItem('career-onboarding-step', '3');
    localStorage.setItem('career-onboarding-data', JSON.stringify({
      ...baseDraft,
      step3_goals: {
        careerGoals: ['networking'],
        timeframe: 'medium-term',
      },
      step4_preferences: {
        learningStyle: ['hands-on'],
      },
    }));

    render(<CareerOnboarding onComplete={vi.fn()} />);

    expect(screen.getByRole('button', { name: /add preferences/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Learning style')).not.toBeInTheDocument();
  });
});

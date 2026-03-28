import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MobileCareerOnboardingBootstrap } from '@kurecal/domain';
import OnboardingScreen from '../app/onboarding';
import { renderWithProviders } from './renderWithProviders';

const mockRouterReplace: any = jest.fn();
const mockUseMobileAuth: any = jest.fn();
const mockUseLocalSearchParams: any = jest.fn();
const mockMobileApi: any = {
  getCareerOnboarding: jest.fn(),
  completeCareerOnboarding: jest.fn(),
  skipCareerOnboarding: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@/lib/mobileApi', () => ({
  getMobileApiClient: () => mockMobileApi,
}));

jest.mock('@/hooks/useMobileAuth', () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

const bootstrap: MobileCareerOnboardingBootstrap = {
  hasCompletedOnboarding: false,
  profileExists: false,
  draft: {},
  optionalSections: null,
  optionalSectionSnoozes: null,
  optionalSectionTimestamps: null,
  taxonomy: {
    skillOptions: [
      { value: 'TypeScript', label: 'TypeScript' },
      { value: 'React', label: 'React' },
      { value: 'Swift', label: 'Swift' },
    ],
    interestOptions: [{ value: 'AI', label: 'AI' }],
    roleSuggestions: {
      'Software Engineer': {
        current: ['TypeScript', 'React'],
        learn: ['Swift'],
      },
    },
    source: 'fallback',
  },
  roleTaxonomy: {
    Engineering: ['Software Engineer'],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseMobileAuth.mockReturnValue({
    profile: null,
    refreshProfile: jest.fn(async () => undefined),
  });
  mockUseLocalSearchParams.mockReturnValue({});
  mockMobileApi.getCareerOnboarding.mockResolvedValue({ success: true, data: bootstrap });
  mockMobileApi.completeCareerOnboarding.mockResolvedValue({ success: true, data: { completed: true } });
  mockMobileApi.skipCareerOnboarding.mockResolvedValue({ success: true, data: { skipped: true } });
});

describe('mobile onboarding screen', () => {
  it('progresses from welcome to the role step', async () => {
    renderWithProviders(<OnboardingScreen />);

    expect(await screen.findByText('Career onboarding')).toBeTruthy();
    fireEvent.press(screen.getByText('Start onboarding'));

    expect(await screen.findByText("What's your role?")).toBeTruthy();
  });

  it('blocks progression when required step-one fields are missing', async () => {
    renderWithProviders(<OnboardingScreen />);

    fireEvent.press(await screen.findByText('Start onboarding'));
    fireEvent.press(screen.getByText('Continue'));

    expect(await screen.findByText('Current role is required.')).toBeTruthy();
  });

  it('keeps step one on role selection until continue is pressed', async () => {
    renderWithProviders(<OnboardingScreen />);

    fireEvent.press(await screen.findByText('Start onboarding'));
    fireEvent.press(screen.getByText('Software Engineer'));

    expect(
      screen.getByText("We'll prioritize product engineering, systems, and developer tooling events for you.")
    ).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
    expect(screen.queryByText("What's your seniority?")).toBeNull();

    fireEvent.press(screen.getByText('Continue'));

    expect(await screen.findByText("What's your seniority?")).toBeTruthy();
  });

  it('goes back to the previous counted step instead of restarting onboarding', async () => {
    renderWithProviders(<OnboardingScreen />);

    fireEvent.press(await screen.findByText('Start onboarding'));
    fireEvent.press(screen.getByText('Software Engineer'));
    fireEvent.press(screen.getByText('Continue'));

    expect(await screen.findByText("What's your seniority?")).toBeTruthy();

    fireEvent.press(screen.getByText('Back'));

    expect(await screen.findByText("What's your role?")).toBeTruthy();
    expect(screen.queryByText('Career onboarding')).toBeNull();
    expect(screen.getByText('Software Engineer')).toBeTruthy();
  });

  it('completes onboarding and routes to discover', async () => {
    renderWithProviders(<OnboardingScreen />);

    fireEvent.press(await screen.findByText('Start onboarding'));
    fireEvent.press(screen.getByText('Software Engineer'));
    fireEvent.press(screen.getByText('Continue'));
    expect(await screen.findByText("What's your seniority?")).toBeTruthy();
    fireEvent.press(screen.getByText('Mid-level'));
    fireEvent.press(screen.getByText('Continue'));

    fireEvent.press(await screen.findByText('TypeScript'));
    fireEvent.press(screen.getByText('React'));
    fireEvent.press(screen.getByText('Continue'));

    await screen.findByText('Learn New Skills');
    fireEvent.press(screen.getByTestId('goal-option-skill-development'));
    await waitFor(() => expect(screen.getAllByText('✓').length).toBeGreaterThan(0));
    fireEvent.press(screen.getByText('Complete'));

    await waitFor(() => expect(mockMobileApi.completeCareerOnboarding).toHaveBeenCalled());
    expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/discover');
  });

  it('keeps step three flat: selected skills render once and interests stay collapsed by default', async () => {
    renderWithProviders(<OnboardingScreen />);

    fireEvent.press(await screen.findByText('Start onboarding'));
    fireEvent.press(screen.getByText('Software Engineer'));
    fireEvent.press(screen.getByText('Continue'));
    fireEvent.press(await screen.findByText('Mid-level'));
    fireEvent.press(screen.getByText('Continue'));

    const currentSkillInput = screen.getByPlaceholderText('Search or add a topic');
    fireEvent.changeText(currentSkillInput, 'TypeScript');
    fireEvent(currentSkillInput, 'submitEditing');
    fireEvent.press(screen.getByText('React'));

    expect(screen.getAllByText('TypeScript')).toHaveLength(1);
    expect(screen.queryByPlaceholderText('Add an interest')).toBeNull();

    fireEvent.press(screen.getByText('What are you interested in?'));
    expect(await screen.findByPlaceholderText('Add an interest')).toBeTruthy();
  });

  it('stays open on manual resume even if onboarding is already marked completed', async () => {
    mockUseLocalSearchParams.mockReturnValue({ resume: '1' });
    mockMobileApi.getCareerOnboarding.mockResolvedValue({
      success: true,
      data: {
        ...bootstrap,
        hasCompletedOnboarding: true,
      },
    });

    renderWithProviders(<OnboardingScreen />);

    expect(await screen.findByText('Career onboarding')).toBeTruthy();
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/(tabs)/discover');
  });
});

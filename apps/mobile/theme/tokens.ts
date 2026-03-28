export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

type LegacyColorAliases = {
  page: string;
  ink: string;
  paper: string;
  muted: string;
  tide: string;
};

const shared = {
  radius: {
    lg: 28,
    md: 22,
    sm: 16,
    pill: 999,
  },
  spacing: {
    page: 16,
    section: 16,
    stack: 12,
    tabBarBottom: 118,
  },
  typography: {
    sans: 'DMSans',
    mono: 'SpaceMono',
    display: 32,
    title: 22,
    subtitle: 15,
    body: 15,
    caption: 12,
    micro: 11,
  },
  shadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
};

export const themeTokens = {
  dark: {
    mode: 'dark' as const,
    colors: {
      shell: '#050607',
      shellElevated: '#0B0D10',
      header: 'rgba(9, 11, 14, 0.94)',
      headerBorder: 'rgba(255, 255, 255, 0.08)',
      surface: '#101318',
      surfaceStrong: '#151A22',
      surfaceMuted: '#0E1116',
      border: 'rgba(255, 255, 255, 0.08)',
      borderStrong: 'rgba(255, 255, 255, 0.14)',
      divider: 'rgba(255, 255, 255, 0.06)',
      textPrimary: '#F8FAFC',
      textSecondary: '#B3BBC7',
      textTertiary: '#7B8493',
      textInverse: '#050607',
      accent: '#60A5FA',
      accentSoft: 'rgba(96, 165, 250, 0.16)',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      info: '#60A5FA',
      pill: '#161B22',
      pillActive: '#F8FAFC',
      pillActiveText: '#050607',
      tabBar: 'rgba(8, 10, 12, 0.96)',
      tabBarBorder: 'rgba(255, 255, 255, 0.08)',
      overlay: 'rgba(3, 7, 18, 0.56)',
      input: '#0E1116',
      link: '#93C5FD',
      discoverShell: '#08090A',
      discoverHeader: 'rgba(11, 13, 16, 0.9)',
      discoverToolbar: '#0E1013',
      discoverToolbarStrong: '#15181D',
      discoverToolbarBorder: 'rgba(255, 255, 255, 0.08)',
      discoverToolbarBorderStrong: 'rgba(255, 255, 255, 0.13)',
      discoverTextMuted: 'rgba(255, 255, 255, 0.58)',
      discoverTextSoft: 'rgba(255, 255, 255, 0.74)',
    },
    gradients: {
      page: ['#10131A', '#050607'] as const,
      accent: ['rgba(96,165,250,0.22)', 'rgba(96,165,250,0.02)'] as const,
      hero: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.00)'] as const,
    },
  },
  light: {
    mode: 'light' as const,
    colors: {
      shell: '#F4F7FB',
      shellElevated: '#FFFFFF',
      header: 'rgba(255, 255, 255, 0.94)',
      headerBorder: 'rgba(15, 23, 42, 0.08)',
      surface: '#FFFFFF',
      surfaceStrong: '#F8FAFC',
      surfaceMuted: '#EEF2F7',
      border: 'rgba(15, 23, 42, 0.08)',
      borderStrong: 'rgba(15, 23, 42, 0.16)',
      divider: 'rgba(15, 23, 42, 0.06)',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textTertiary: '#7C8A9F',
      textInverse: '#F8FAFC',
      accent: '#2563EB',
      accentSoft: 'rgba(37, 99, 235, 0.12)',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
      info: '#2563EB',
      pill: '#E9EEF5',
      pillActive: '#0F172A',
      pillActiveText: '#F8FAFC',
      tabBar: 'rgba(255, 255, 255, 0.96)',
      tabBarBorder: 'rgba(15, 23, 42, 0.08)',
      overlay: 'rgba(15, 23, 42, 0.18)',
      input: '#F8FAFC',
      link: '#1D4ED8',
      discoverShell: '#F4F7FB',
      discoverHeader: 'rgba(255, 255, 255, 0.92)',
      discoverToolbar: 'rgba(255, 255, 255, 0.88)',
      discoverToolbarStrong: 'rgba(255, 255, 255, 0.96)',
      discoverToolbarBorder: 'rgba(15, 23, 42, 0.08)',
      discoverToolbarBorderStrong: 'rgba(15, 23, 42, 0.14)',
      discoverTextMuted: 'rgba(15, 23, 42, 0.58)',
      discoverTextSoft: 'rgba(15, 23, 42, 0.76)',
    },
    gradients: {
      page: ['#FFFFFF', '#F4F7FB'] as const,
      accent: ['rgba(37,99,235,0.14)', 'rgba(37,99,235,0.02)'] as const,
      hero: ['rgba(15,23,42,0.04)', 'rgba(15,23,42,0.00)'] as const,
    },
  },
};

export type AppThemeColors = (typeof themeTokens)[ThemeMode]['colors'] & LegacyColorAliases;
export type AppThemeTokens = Omit<(typeof themeTokens)[ThemeMode], 'colors'> & {
  colors: AppThemeColors;
} & typeof shared;

function withLegacyAliases(theme: (typeof themeTokens)[ThemeMode]) {
  return {
    ...theme,
    colors: {
      ...theme.colors,
      page: theme.colors.input,
      ink: theme.colors.textPrimary,
      paper: theme.colors.surface,
      muted: theme.colors.textSecondary,
      tide: theme.colors.textTertiary,
    },
  };
}

export function getThemeTokens(mode: ThemeMode): AppThemeTokens {
  const themed = withLegacyAliases(themeTokens[mode]);

  return {
    ...shared,
    ...themed,
  };
}

// Temporary compatibility export for components not yet migrated to the theme hook.
export const tokens = getThemeTokens('dark');

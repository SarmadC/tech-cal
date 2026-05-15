export type ThemePreference = "system" | "light" | "dark";
export type ThemeMode = "light" | "dark";

type LegacyColorAliases = {
  page: string;
  ink: string;
  paper: string;
  muted: string;
  tide: string;
};

const shared = {
  radius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    page: 20,
    section: 12,
    stack: 8,
    tabBarBottom: 96,
  },
  typography: {
    sans: "DMSans",
    mono: "SpaceMono",
    display: 24,
    title: 18,
    subtitle: 14,
    body: 14,
    caption: 12,
    micro: 11,
    headlineSm: 18,
    bodyMd: 14,
    bodySm: 13,
    labelCaps: 11,
    labelMuted: 12,
  },
  shadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
};

export const themeTokens = {
  dark: {
    mode: "dark" as const,
    colors: {
      shell: "#0D0E0F",
      shellElevated: "#121314",
      header: "rgba(18, 19, 20, 0.96)",
      headerBorder: "rgba(255, 255, 255, 0.07)",
      surface: "#121314",
      surfaceStrong: "#1B1C1D",
      surfaceMuted: "#1F2021",
      border: "rgba(255, 255, 255, 0.07)",
      borderStrong: "rgba(255, 255, 255, 0.12)",
      divider: "rgba(255, 255, 255, 0.06)",
      textPrimary: "#E3E2E3",
      textSecondary: "#C6C5D5",
      textTertiary: "#908F9E",
      textInverse: "#121314",
      accent: "#BDC2FF",
      accentSoft: "rgba(189, 194, 255, 0.12)",
      success: "#34D399",
      warning: "#FBBF24",
      danger: "#FFB4AB",
      info: "#BDC2FF",
      pill: "#1F2021",
      pillActive: "#5E6AD2",
      pillActiveText: "#FDFAFF",
      tabBar: "rgba(18, 19, 20, 0.98)",
      tabBarBorder: "rgba(255, 255, 255, 0.07)",
      overlay: "rgba(0, 0, 0, 0.62)",
      input: "#1B1C1D",
      link: "#BDC2FF",
      discoverShell: "#0D0E0F",
      discoverHeader: "rgba(18, 19, 20, 0.96)",
      discoverToolbar: "#121314",
      discoverToolbarStrong: "#1B1C1D",
      discoverToolbarBorder: "rgba(255, 255, 255, 0.07)",
      discoverToolbarBorderStrong: "rgba(255, 255, 255, 0.12)",
      discoverTextMuted: "rgba(227, 226, 227, 0.52)",
      discoverTextSoft: "rgba(227, 226, 227, 0.72)",
    },
    gradients: {
      page: ["#121314", "#0D0E0F"] as const,
      accent: ["rgba(189,194,255,0.08)", "rgba(189,194,255,0.00)"] as const,
      hero: ["rgba(255,255,255,0.035)", "rgba(255,255,255,0.00)"] as const,
    },
  },
  light: {
    mode: "light" as const,
    colors: {
      shell: "#F4F4F5",
      shellElevated: "#FFFFFF",
      header: "rgba(255, 255, 255, 0.94)",
      headerBorder: "rgba(15, 23, 42, 0.08)",
      surface: "#FFFFFF",
      surfaceStrong: "#F4F4F5",
      surfaceMuted: "#E7E7EA",
      border: "rgba(15, 23, 42, 0.08)",
      borderStrong: "rgba(15, 23, 42, 0.16)",
      divider: "rgba(15, 23, 42, 0.06)",
      textPrimary: "#0F172A",
      textSecondary: "#475569",
      textTertiary: "#7C8A9F",
      textInverse: "#F8FAFC",
      accent: "#4854BB",
      accentSoft: "rgba(72, 84, 187, 0.12)",
      success: "#059669",
      warning: "#D97706",
      danger: "#DC2626",
      info: "#2563EB",
      pill: "#E9EEF5",
      pillActive: "#4854BB",
      pillActiveText: "#F8FAFC",
      tabBar: "rgba(255, 255, 255, 0.96)",
      tabBarBorder: "rgba(15, 23, 42, 0.08)",
      overlay: "rgba(15, 23, 42, 0.18)",
      input: "#FFFFFF",
      link: "#4854BB",
      discoverShell: "#F4F4F5",
      discoverHeader: "rgba(255, 255, 255, 0.92)",
      discoverToolbar: "rgba(255, 255, 255, 0.88)",
      discoverToolbarStrong: "rgba(255, 255, 255, 0.96)",
      discoverToolbarBorder: "rgba(15, 23, 42, 0.08)",
      discoverToolbarBorderStrong: "rgba(15, 23, 42, 0.14)",
      discoverTextMuted: "rgba(15, 23, 42, 0.58)",
      discoverTextSoft: "rgba(15, 23, 42, 0.76)",
    },
    gradients: {
      page: ["#FFFFFF", "#F4F4F5"] as const,
      accent: ["rgba(72,84,187,0.10)", "rgba(72,84,187,0.00)"] as const,
      hero: ["rgba(15,23,42,0.04)", "rgba(15,23,42,0.00)"] as const,
    },
  },
};

export type AppThemeColors = (typeof themeTokens)[ThemeMode]["colors"] &
  LegacyColorAliases;

export type AppThemeTokens = Omit<(typeof themeTokens)[ThemeMode], "colors"> & {
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

export const tokens = getThemeTokens("dark");

// src/utils/chartConfigs.ts
import type { ChartConfig } from '@/components/ui/chart';

/**
 * Centralized chart configurations to eliminate duplication
 * All chart components should use these standardized configs
 */

// Base color palette for consistency - using explicit values for better browser compatibility
export const CHART_COLORS = {
  primary: "hsl(220, 70%, 50%)",      // Blue
  secondary: "hsl(160, 60%, 45%)",    // Green
  tertiary: "hsl(30, 80%, 55%)",      // Orange (not yellow)
  quaternary: "hsl(280, 65%, 60%)",   // Purple
  quinary: "hsl(340, 75%, 55%)",      // Pink
  gray: "hsl(var(--muted-foreground))",
  success: "hsl(220, 70%, 50%)",      // Blue
  warning: "hsl(160, 60%, 45%)",      // Green
  error: "hsl(30, 80%, 55%)",         // Orange
} as const;

// Activity trend chart configuration
export const ACTIVITY_CHART_CONFIG = {
  events: {
    label: "Events Tracked",
    color: CHART_COLORS.primary,
  },
  cumulative: {
    label: "Cumulative",
    color: CHART_COLORS.secondary,
  },
} satisfies ChartConfig;

// Event distribution chart configuration
export const DISTRIBUTION_CHART_CONFIG = {
  conference: {
    label: "Conferences",
    color: CHART_COLORS.primary,
  },
  workshop: {
    label: "Workshops",
    color: CHART_COLORS.secondary,
  },
  meetup: {
    label: "Meetups",
    color: CHART_COLORS.tertiary,
  },
  webinar: {
    label: "Webinars",
    color: CHART_COLORS.quaternary,
  },
  networking: {
    label: "Networking",
    color: CHART_COLORS.quinary,
  },
  hackathon: {
    label: "Hackathons",
    color: CHART_COLORS.gray,
  },
  other: {
    label: "Other",
    color: "hsl(0, 0%, 60%)", // Use a visible gray color instead of muted-foreground
  },
} satisfies ChartConfig;

// Career analytics chart configuration
export const CAREER_ANALYTICS_CONFIG = {
  impact: {
    label: "Impact Score",
    color: CHART_COLORS.primary,
  },
  skills: {
    label: "Skills Developed",
    color: CHART_COLORS.tertiary,
  },
} satisfies ChartConfig;

// Generic trend chart configuration
export const TREND_CHART_CONFIG = {
  value: {
    label: "Value",
    color: CHART_COLORS.primary,
  },
  target: {
    label: "Target",
    color: CHART_COLORS.secondary,
  },
} satisfies ChartConfig;

// Utility function to get chart color by index
export function getChartColor(index: number): string {
  const colors = Object.values(CHART_COLORS);
  return colors[index % colors.length];
}

// Utility function to create custom chart config
export function createChartConfig(
  dataKeys: string[],
  colorScheme: 'primary' | 'secondary' | 'tertiary' | 'custom' = 'primary'
): ChartConfig {
  const config: ChartConfig = {};
  
  dataKeys.forEach((key, index) => {
    config[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: colorScheme === 'custom' 
        ? getChartColor(index)
        : CHART_COLORS[colorScheme === 'primary' ? 'primary' : 
                       colorScheme === 'secondary' ? 'secondary' : 'tertiary']
    };
  });
  
  return config;
}

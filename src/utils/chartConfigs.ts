// src/utils/chartConfigs.ts
import type { ChartConfig } from '@/components/ui/chart';

/**
 * Centralized chart configurations to eliminate duplication
 * All chart components should use these standardized configs
 */

// Base color palette for consistency
export const CHART_COLORS = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  tertiary: "hsl(var(--chart-3))",
  quaternary: "hsl(var(--chart-4))",
  quinary: "hsl(var(--chart-5))",
  gray: "hsl(var(--muted-foreground))",
  success: "hsl(var(--chart-1))",
  warning: "hsl(var(--chart-2))",
  error: "hsl(var(--chart-3))",
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
    color: CHART_COLORS.gray,
  },
} satisfies ChartConfig;

// Career analytics chart configuration
export const CAREER_ANALYTICS_CONFIG = {
  impact: {
    label: "Impact Score",
    color: CHART_COLORS.primary,
  },
  growth: {
    label: "Growth Trend",
    color: CHART_COLORS.secondary,
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

import type { IconName } from '@/components/ui/Icon';

const COMMUNITY_CIRCLE_PALETTE = [
  {
    bg: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
  },
  {
    bg: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    bg: 'bg-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    bg: 'bg-pink-500',
    text: 'text-pink-700 dark:text-pink-300',
  },
] as const;

const COMMUNITY_CIRCLE_ICON_MAP: [string[], IconName][] = [
  [['product', 'manager', 'pm'], 'work'],
  [['engineering', 'engineer', 'backend', 'infra'], 'code'],
  [['frontend', 'web', 'ui', 'css', 'html'], 'code'],
  [['ai', 'ml', 'machine learning', 'data', 'llm'], 'sparkle'],
  [['design', 'ux', 'figma', 'creative', 'visual'], 'palette'],
  [['startup', 'founder', 'entrepreneur', 'vc'], 'trophy'],
  [['mobile', 'ios', 'android', 'flutter'], 'devices'],
  [['security', 'cyber', 'hack', 'devsecops'], 'globe'],
  [['cloud', 'devops', 'platform', 'infra', 'sre'], 'extension'],
  [['open source', 'foss', 'linux', 'community'], 'globe'],
  [['gaming', 'game', 'unity', 'unreal'], 'game-controller'],
  [['audio', 'podcast', 'voice', 'speaker'], 'microphone'],
  [['photo', 'camera', 'video', 'media', 'film'], 'camera'],
  [['science', 'research', 'lab', 'bio', 'chem'], 'flask'],
  [['book', 'learn', 'education', 'course'], 'books'],
  [['health', 'wellness', 'mental', 'fitness'], 'heart'],
  [['web3', 'crypto', 'blockchain', 'nft', 'defi'], 'globe'],
  [['marketing', 'growth', 'seo', 'content'], 'trending-up'],
  [['hardware', 'embedded', 'iot', 'robotics'], 'extension'],
];

const COMMUNITY_CIRCLE_COLOR_MAP: [string[], number][] = [
  [['ai', 'ml', 'machine learning', 'data', 'llm'], 0],
  [['mobile', 'ios', 'android', 'flutter'], 1],
  [['open source', 'foss', 'linux', 'community'], 2],
  [['marketing', 'growth', 'seo', 'content', 'devrel'], 3],
  [['product', 'manager', 'pm'], 7],
  [['design', 'ux', 'figma', 'creative', 'visual'], 4],
  [['cloud', 'devops', 'platform', 'infra', 'sre', 'security', 'cyber', 'devsecops'], 6],
  [['science', 'research', 'lab', 'bio', 'chem', 'health', 'wellness', 'mental', 'fitness'], 5],
] as const;

const COMMUNITY_CIRCLE_DISPLAY_SUFFIXES = ['circle', 'builders', 'guild'] as const;
const COMMUNITY_CIRCLE_DISPLAY_ALIASES = new Map<string, string>([
  ['product systems', 'product'],
]);

export function getCommunityCircleColor(name: string): string {
  const paletteIndex = getCommunityCirclePaletteIndex(formatCommunityCircleName(name));
  return COMMUNITY_CIRCLE_PALETTE[paletteIndex].bg;
}

export function getCommunityCircleTextColor(name: string): string {
  const paletteIndex = getCommunityCirclePaletteIndex(formatCommunityCircleName(name));
  return COMMUNITY_CIRCLE_PALETTE[paletteIndex].text;
}

export function formatCommunityCircleName(name: string): string {
  const originalName = name.trim().replace(/\s+/g, ' ');

  if (!originalName) {
    return name;
  }

  let normalizedName = originalName;
  let nextName = stripCommunityDisplaySuffix(normalizedName);

  while (nextName && nextName !== normalizedName) {
    normalizedName = nextName;
    nextName = stripCommunityDisplaySuffix(normalizedName);
  }

  return normalizedName || originalName;
}

export function partitionCommunityCirclesForDisplay<T extends { name: string; isJoined: boolean }>(
  circles: readonly T[]
): {
  joinedCircles: T[];
  discoverCircles: T[];
} {
  const displayNameOwners = new Map<string, boolean>();
  const joinedCircles: T[] = [];
  const discoverCircles: T[] = [];

  for (const circle of circles) {
    const displayName = getCommunityCircleDisplayKey(circle.name);
    const existingIsJoined = displayNameOwners.get(displayName);

    if (existingIsJoined === true) {
      continue;
    }

    if (circle.isJoined) {
      if (existingIsJoined === false) {
        const discoverIndex = discoverCircles.findIndex(
          (candidate) =>
            formatCommunityCircleName(candidate.name).toLowerCase() === displayName
        );

        if (discoverIndex >= 0) {
          discoverCircles.splice(discoverIndex, 1);
        }
      }

      joinedCircles.push(circle);
      displayNameOwners.set(displayName, true);
      continue;
    }

    if (existingIsJoined === undefined) {
      discoverCircles.push(circle);
      displayNameOwners.set(displayName, false);
    }
  }

  return { joinedCircles, discoverCircles };
}

function getCommunityCirclePaletteIndex(name: string): number {
  const normalizedName = name.toLowerCase();

  for (const [keywords, paletteIndex] of COMMUNITY_CIRCLE_COLOR_MAP) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      return paletteIndex;
    }
  }

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return Math.abs(hash) % COMMUNITY_CIRCLE_PALETTE.length;
}

export function getCommunityCircleIcon(name: string, dbIcon?: string): IconName {
  if (dbIcon && dbIcon !== 'people') {
    return dbIcon as IconName;
  }

  const normalizedName = formatCommunityCircleName(name).toLowerCase();
  for (const [keywords, icon] of COMMUNITY_CIRCLE_ICON_MAP) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      return icon;
    }
  }

  return 'users-three';
}

export function formatCommunityEventTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export function formatCommunityEventDay(
  dateStr: string
): { day: string; month: string } {
  const date = new Date(dateStr);

  return {
    day: date.getDate().toString(),
    month: new Intl.DateTimeFormat('en-US', { month: 'short' })
      .format(date)
      .toUpperCase(),
  };
}

export function formatCommunityCompactCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCommunityRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - Date.parse(dateStr);
  const mins = Math.max(0, Math.floor(diffMs / 60000));

  if (mins < 1) {
    return 'just now';
  }

  if (mins < 60) {
    return `${mins}m ago`;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function stripCommunityDisplaySuffix(name: string): string {
  return name
    .replace(
      new RegExp(`\\s+(?:${COMMUNITY_CIRCLE_DISPLAY_SUFFIXES.join('|')})$`, 'i'),
      ''
    )
    .trim();
}

function getCommunityCircleDisplayKey(name: string): string {
  const displayName = formatCommunityCircleName(name).toLowerCase();

  return COMMUNITY_CIRCLE_DISPLAY_ALIASES.get(displayName) || displayName;
}

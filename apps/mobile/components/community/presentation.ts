import type {
  MobileCommunityNetworkingEvent,
  MobileCommunityNetworkingFollowUpCard,
  MobileCommunityNetworkingPersonCard,
  MobileFollowStatus,
  MobilePublicProfileCareer,
} from "@kurecal/domain";
import type { ThemeMode } from "@/theme/tokens";

const COMMUNITY_CIRCLE_PALETTES = [
  {
    light: { background: "#DBEAFE", foreground: "#1D4ED8" },
    dark: { background: "rgba(96, 165, 250, 0.18)", foreground: "#93C5FD" },
  },
  {
    light: { background: "#E9D5FF", foreground: "#7C3AED" },
    dark: { background: "rgba(168, 85, 247, 0.18)", foreground: "#C4B5FD" },
  },
  {
    light: { background: "#D1FAE5", foreground: "#047857" },
    dark: { background: "rgba(16, 185, 129, 0.18)", foreground: "#6EE7B7" },
  },
  {
    light: { background: "#FEF3C7", foreground: "#B45309" },
    dark: { background: "rgba(245, 158, 11, 0.18)", foreground: "#FCD34D" },
  },
  {
    light: { background: "#FFE4E6", foreground: "#BE123C" },
    dark: { background: "rgba(244, 63, 94, 0.18)", foreground: "#FDA4AF" },
  },
  {
    light: { background: "#CFFAFE", foreground: "#0F766E" },
    dark: { background: "rgba(6, 182, 212, 0.18)", foreground: "#67E8F9" },
  },
  {
    light: { background: "#E0E7FF", foreground: "#4338CA" },
    dark: { background: "rgba(99, 102, 241, 0.18)", foreground: "#A5B4FC" },
  },
  {
    light: { background: "#FCE7F3", foreground: "#BE185D" },
    dark: { background: "rgba(236, 72, 153, 0.18)", foreground: "#F9A8D4" },
  },
] as const;

const NETWORKING_PROFILE_TONES = [
  {
    light: {
      coverStart: "#E5EEFF",
      coverEnd: "#F8FBFF",
      cloud: "rgba(37, 99, 235, 0.16)",
      glow: "rgba(255, 255, 255, 0.86)",
      line: "rgba(37, 99, 235, 0.16)",
      ring: "#FFFFFF",
    },
    dark: {
      coverStart: "#122033",
      coverEnd: "#0B1220",
      cloud: "rgba(96, 165, 250, 0.20)",
      glow: "rgba(148, 163, 184, 0.12)",
      line: "rgba(148, 163, 184, 0.18)",
      ring: "#0F172A",
    },
  },
  {
    light: {
      coverStart: "#ECFDF5",
      coverEnd: "#F8FFFB",
      cloud: "rgba(5, 150, 105, 0.16)",
      glow: "rgba(255, 255, 255, 0.82)",
      line: "rgba(5, 150, 105, 0.16)",
      ring: "#FFFFFF",
    },
    dark: {
      coverStart: "#0F221D",
      coverEnd: "#091713",
      cloud: "rgba(52, 211, 153, 0.20)",
      glow: "rgba(110, 231, 183, 0.10)",
      line: "rgba(110, 231, 183, 0.16)",
      ring: "#0B1512",
    },
  },
  {
    light: {
      coverStart: "#FFF4E7",
      coverEnd: "#FFF9F1",
      cloud: "rgba(217, 119, 6, 0.16)",
      glow: "rgba(255, 255, 255, 0.82)",
      line: "rgba(217, 119, 6, 0.16)",
      ring: "#FFFFFF",
    },
    dark: {
      coverStart: "#291A10",
      coverEnd: "#180F09",
      cloud: "rgba(251, 191, 36, 0.18)",
      glow: "rgba(251, 191, 36, 0.08)",
      line: "rgba(251, 191, 36, 0.14)",
      ring: "#16100B",
    },
  },
  {
    light: {
      coverStart: "#F5ECFF",
      coverEnd: "#FBF7FF",
      cloud: "rgba(124, 58, 237, 0.16)",
      glow: "rgba(255, 255, 255, 0.86)",
      line: "rgba(124, 58, 237, 0.14)",
      ring: "#FFFFFF",
    },
    dark: {
      coverStart: "#1C1631",
      coverEnd: "#120E21",
      cloud: "rgba(167, 139, 250, 0.20)",
      glow: "rgba(196, 181, 253, 0.10)",
      line: "rgba(196, 181, 253, 0.16)",
      ring: "#0F0B18",
    },
  },
  {
    light: {
      coverStart: "#FFECEE",
      coverEnd: "#FFF7F8",
      cloud: "rgba(220, 38, 38, 0.14)",
      glow: "rgba(255, 255, 255, 0.84)",
      line: "rgba(220, 38, 38, 0.14)",
      ring: "#FFFFFF",
    },
    dark: {
      coverStart: "#2A1216",
      coverEnd: "#170A0D",
      cloud: "rgba(248, 113, 113, 0.18)",
      glow: "rgba(248, 113, 113, 0.08)",
      line: "rgba(248, 113, 113, 0.14)",
      ring: "#160B0D",
    },
  },
] as const;

const NETWORKING_PROFILE_TONE_KEYWORDS: Array<[string[], number]> = [
  [["design", "product", "ux", "research"], 0],
  [["engineering", "platform", "developer", "backend", "frontend", "infra"], 1],
  [["founder", "startup", "growth", "marketing", "sales"], 2],
  [["ai", "data", "ml", "security", "cloud"], 3],
] as const;

const COMMUNITY_CIRCLE_ICON_MAP: Array<[string[], string]> = [
  [["product", "manager", "pm"], "briefcase"],
  [["engineering", "engineer", "backend", "infra"], "code"],
  [["frontend", "web", "ui", "css", "html"], "code"],
  [["ai", "ml", "machine learning", "data", "llm"], "magic"],
  [["design", "ux", "figma", "creative", "visual"], "paint-brush"],
  [["startup", "founder", "entrepreneur", "vc"], "rocket"],
  [["mobile", "ios", "android", "flutter"], "mobile"],
  [["security", "cyber", "hack", "devsecops"], "shield"],
  [["cloud", "devops", "platform", "sre"], "cloud"],
  [["open source", "foss", "linux", "community"], "globe"],
  [["gaming", "game", "unity", "unreal"], "gamepad"],
  [["audio", "podcast", "voice", "speaker"], "microphone"],
  [["photo", "camera", "video", "media", "film"], "camera"],
  [["science", "research", "lab", "bio", "chem"], "flask"],
  [["book", "learn", "education", "course"], "book"],
  [["health", "wellness", "mental", "fitness"], "heart"],
  [["web3", "crypto", "blockchain", "nft", "defi"], "bitcoin"],
  [["marketing", "growth", "seo", "content"], "line-chart"],
  [["hardware", "embedded", "iot", "robotics"], "cogs"],
] as const;

const COMMUNITY_CIRCLE_COLOR_MAP: Array<[string[], number]> = [
  [["ai", "ml", "machine learning", "data", "llm"], 0],
  [["mobile", "ios", "android", "flutter"], 1],
  [["open source", "foss", "linux", "community"], 2],
  [["marketing", "growth", "seo", "content", "devrel"], 3],
  [["product", "manager", "pm"], 7],
  [["design", "ux", "figma", "creative", "visual"], 4],
  [
    [
      "cloud",
      "devops",
      "platform",
      "infra",
      "sre",
      "security",
      "cyber",
      "devsecops",
    ],
    6,
  ],
  [
    [
      "science",
      "research",
      "lab",
      "bio",
      "chem",
      "health",
      "wellness",
      "mental",
      "fitness",
    ],
    5,
  ],
] as const;

const COMMUNITY_CIRCLE_DISPLAY_SUFFIXES = [
  "circle",
  "builders",
  "guild",
] as const;
const COMMUNITY_CIRCLE_DISPLAY_ALIASES = new Map<string, string>([
  ["product systems", "product"],
]);

export function parseCommunityPostContent(content: string): {
  title: string;
  body: string;
  excerpt: string;
} {
  const normalized = content.trim();
  const segments = normalized
    .split("\n")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length > 1) {
    return {
      title: segments[0],
      body: segments.slice(1).join("\n"),
      excerpt: segments.slice(1).join(" ").trim(),
    };
  }

  return {
    title: "",
    body: normalized,
    excerpt: "",
  };
}

export function formatCommunityRelativeTime(value: string): string {
  const diffMs = Date.now() - Date.parse(value);
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatCommunityTabCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

const SAFE_EXTERNAL_PROTOCOLS = new Set(["http:", "https:"]);

export function getSafeExternalUrl(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function formatCommunityCompactCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCommunityEventTime(value: string | null): string {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCommunityEventDay(value: string | null): {
  day: string;
  month: string;
} {
  if (!value) {
    return { day: "--", month: "TBD" };
  }

  const date = new Date(value);
  return {
    day: date.getDate().toString(),
    month: new Intl.DateTimeFormat("en-US", { month: "short" })
      .format(date)
      .toUpperCase(),
  };
}

export function formatCommunityCircleName(name: string): string {
  const originalName = name.trim().replace(/\s+/g, " ");

  if (!originalName) {
    return name;
  }

  let normalized = originalName;
  let next = stripCommunityDisplaySuffix(normalized);

  while (next && next !== normalized) {
    normalized = next;
    next = stripCommunityDisplaySuffix(normalized);
  }

  return normalized || originalName;
}

export function getCommunityCircleTone(name: string, mode: ThemeMode) {
  const normalized = formatCommunityCircleName(name).toLowerCase();

  for (const [keywords, paletteIndex] of COMMUNITY_CIRCLE_COLOR_MAP) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return COMMUNITY_CIRCLE_PALETTES[paletteIndex][mode];
    }
  }

  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
  }

  return COMMUNITY_CIRCLE_PALETTES[
    Math.abs(hash) % COMMUNITY_CIRCLE_PALETTES.length
  ][mode];
}

export function getCommunityCircleIcon(
  name: string,
  icon?: string | null,
): string {
  if (icon?.trim()) {
    return icon;
  }

  const normalized = formatCommunityCircleName(name).toLowerCase();
  for (const [keywords, iconName] of COMMUNITY_CIRCLE_ICON_MAP) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return iconName;
    }
  }

  return "users";
}

export function partitionCommunityCirclesForDisplay<
  T extends { name: string; isJoined: boolean },
>(circles: readonly T[]): { joinedCircles: T[]; discoverCircles: T[] } {
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
            formatCommunityCircleName(candidate.name).toLowerCase() ===
            displayName,
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

export function countThreadComments<T extends { replies?: T[] | null }>(
  comments: readonly T[],
): number {
  return comments.reduce((total, comment) => {
    const replies = comment.replies ?? [];
    return total + 1 + countThreadComments(replies);
  }, 0);
}

export function buildAvatarInitials(value: string | null | undefined): string {
  const cleaned = value?.trim();
  if (!cleaned) {
    return "U";
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function getNetworkingProfileTone(value: {
  mode: ThemeMode;
  currentRole?: string | null;
  industry?: string | null;
  seed?: string | null;
  isMutualFollow?: boolean;
  followsViewer?: boolean;
  isInNetwork?: boolean;
}) {
  let paletteIndex = 0;

  if (value.isMutualFollow) {
    paletteIndex = 0;
  } else if (value.followsViewer) {
    paletteIndex = 4;
  } else if (value.isInNetwork) {
    paletteIndex = 1;
  } else {
    const normalized = [value.currentRole, value.industry, value.seed]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const keywordMatch = NETWORKING_PROFILE_TONE_KEYWORDS.find(([keywords]) =>
      keywords.some((keyword) => normalized.includes(keyword)),
    );

    if (keywordMatch) {
      paletteIndex = keywordMatch[1];
    } else {
      let hash = 0;
      for (let index = 0; index < normalized.length; index += 1) {
        hash = normalized.charCodeAt(index) + ((hash << 5) - hash);
      }

      paletteIndex = Math.abs(hash) % NETWORKING_PROFILE_TONES.length;
    }
  }

  return NETWORKING_PROFILE_TONES[paletteIndex][value.mode];
}

export function formatNetworkingEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatNetworkingEventWeekdayTime(value: string): string {
  const date = new Date(value);
  const dayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  const time = formatCommunityEventTime(value);
  return `${dayLabel} · ${time}`;
}

export function formatSpeakerPreviewLabel(
  speakers: ReadonlyArray<{ name: string }>,
): string {
  if (speakers.length === 0) {
    return "";
  }

  if (speakers.length === 1) {
    return speakers[0].name;
  }

  if (speakers.length === 2) {
    return `${speakers[0].name}, ${speakers[1].name}`;
  }

  return `${speakers[0].name}, ${speakers[1].name} + ${speakers.length - 2} more`;
}

export type CommunitySpeakerTarget =
  | { kind: "profile"; username: string }
  | { kind: "external"; url: string };

export function getCommunitySpeakerTarget(value: {
  matchedProfileUsername?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  websiteUrl?: string | null;
}): CommunitySpeakerTarget | null {
  if (value.matchedProfileUsername) {
    return { kind: "profile", username: value.matchedProfileUsername };
  }

  if (value.linkedinUrl) {
    return { kind: "external", url: value.linkedinUrl };
  }

  if (value.twitterUrl) {
    return { kind: "external", url: value.twitterUrl };
  }

  if (value.websiteUrl) {
    return { kind: "external", url: value.websiteUrl };
  }

  return null;
}

export function formatNetworkingLocation(
  location: string | null,
  format: string | null,
): string {
  if (format === "virtual") {
    return "Virtual";
  }

  if (format === "hybrid" && location) {
    return `${location} · Hybrid`;
  }

  return location || "Location TBA";
}

export function getNetworkingDisplayName(value: {
  fullName: string | null;
  username: string;
}): string {
  return value.fullName || `@${value.username}`;
}

export function formatCompanySizeLabel(
  value: string | null | undefined,
): string | null {
  switch (value) {
    case "startup":
      return "Startup";
    case "small":
      return "Small team";
    case "medium":
      return "Mid-size team";
    case "large":
      return "Large org";
    case "enterprise":
      return "Enterprise";
    case "freelance":
      return "Independent";
    default:
      return null;
  }
}

export function getNetworkingRoleSummary(value: {
  currentRole: string | null;
  headline: string | null;
}): string | null {
  return value.currentRole?.trim() || value.headline?.trim() || null;
}

export function getNetworkingWorkSummary(value: {
  company?: string | null;
  industry: string | null;
  companySize: string | null;
}): string | null {
  const parts = [
    value.company?.trim(),
    value.industry?.trim(),
    formatCompanySizeLabel(value.companySize),
  ].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.slice(0, 2).join(" · ");
}

export function getNetworkingProfileSnippet(value: {
  bio?: string | null;
  currentRole?: string | null;
  headline?: string | null;
  company?: string | null;
  industry?: string | null;
  whyNow: string;
}): string {
  const bio = value.bio?.trim();
  if (bio) {
    return bio;
  }

  const role = value.currentRole?.trim() || value.headline?.trim() || null;
  const company = value.company?.trim() || null;
  const industry = value.industry?.trim() || null;

  if (role && company) {
    return `${role} at ${company}.`;
  }

  if (role && industry) {
    return `${role} in ${industry}.`;
  }

  if (role) {
    return role;
  }

  return value.whyNow;
}

export function formatMutualConnectionsLabel(value: number): string {
  return `${formatCommunityTabCount(value)} mutual connection${value === 1 ? "" : "s"}`;
}

export function formatViewerContextLabel(
  viewerContext: MobileCommunityNetworkingEvent["viewerContext"],
): string {
  return viewerContext === "attending" ? "Attending" : "Saved";
}

export function getNetworkingRelationshipLabels(value: {
  isInNetwork: boolean;
  followsViewer: boolean;
  isMutualFollow: boolean;
}): string[] {
  if (value.isMutualFollow) {
    return ["Mutual follow"];
  }

  const labels: string[] = [];

  if (value.followsViewer) {
    labels.push("Follows you");
  }

  if (value.isInNetwork) {
    labels.push("You follow");
  }

  return labels.slice(0, 2);
}

export function getEventOpportunityCopy(
  event: MobileCommunityNetworkingEvent,
): string {
  if (event.relationshipAttendeeCount > 0) {
    return `${formatCommunityTabCount(event.relationshipAttendeeCount)} people you already know are visible here.`;
  }

  if (event.networkAttendingCount > 0) {
    return `${formatCommunityTabCount(event.networkAttendingCount)} people you follow are visible here.`;
  }

  return `${formatCommunityTabCount(event.visibleAttendeeCount)} public attendee profiles to browse before you go.`;
}

export function getMeetPeopleCopy(
  person: MobileCommunityNetworkingPersonCard,
): string {
  if (person.sharedUpcomingEventCount === 1) {
    return "You overlap on 1 upcoming event.";
  }

  return `You overlap on ${formatCommunityTabCount(person.sharedUpcomingEventCount)} upcoming events.`;
}

export function getFollowUpCopy(
  person: MobileCommunityNetworkingFollowUpCard,
): string {
  if (person.sharedPastEventCount === 1) {
    return "You recently shared 1 event.";
  }

  return `You recently shared ${formatCommunityTabCount(person.sharedPastEventCount)} events.`;
}

export function formatFollowUpRecency(value: string | null): string {
  if (!value) {
    return "Recently";
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "Recently";
  }

  const dayDiff = Math.max(
    1,
    Math.round((Date.now() - timestamp) / (24 * 60 * 60 * 1000)),
  );

  if (dayDiff <= 1) {
    return "Yesterday";
  }

  if (dayDiff < 7) {
    return `${dayDiff} days ago`;
  }

  const weekDiff = Math.round(dayDiff / 7);
  if (weekDiff <= 1) {
    return "Last week";
  }

  return `${weekDiff} weeks ago`;
}

export function applyFollowStateToRelationship<
  T extends {
    isInNetwork: boolean;
    followsViewer: boolean;
    isMutualFollow: boolean;
  },
>(value: T, nextIsFollowing: boolean): T {
  return {
    ...value,
    isInNetwork: nextIsFollowing,
    isMutualFollow: nextIsFollowing && value.followsViewer,
  };
}

export function applyFollowStateToStatus(
  value: MobileFollowStatus | null | undefined,
  nextIsFollowing: boolean,
): MobileFollowStatus {
  return {
    isFollowing: nextIsFollowing,
    isFollowedBy: value?.isFollowedBy ?? false,
    isBlockedByUser: value?.isBlockedByUser ?? false,
    hasBlockedUser: value?.hasBlockedUser ?? false,
  };
}

export function getPublicProfileCareerSummary(
  careerProfile: MobilePublicProfileCareer | null,
  headline?: string | null,
): string | null {
  const headlineValue = headline?.trim();
  if (headlineValue) {
    return headlineValue;
  }

  const parts = [
    careerProfile?.currentRole?.trim(),
    careerProfile?.seniority?.trim(),
    careerProfile?.industry?.trim(),
  ].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" · ");
}

function stripCommunityDisplaySuffix(name: string): string {
  return name
    .replace(
      new RegExp(
        `\\s+(?:${COMMUNITY_CIRCLE_DISPLAY_SUFFIXES.join("|")})$`,
        "i",
      ),
      "",
    )
    .trim();
}

function getCommunityCircleDisplayKey(name: string): string {
  const displayName = formatCommunityCircleName(name).toLowerCase();
  return COMMUNITY_CIRCLE_DISPLAY_ALIASES.get(displayName) || displayName;
}

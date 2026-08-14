import type { MobilePublicProfile } from "@kurecal/domain";
import type { ComponentProps, ReactNode } from "react";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import {
  HeaderActionButton,
  MobilePage,
} from "../../src/components/chrome/MobilePage";
import { MobileBackButton } from "../../src/components/chrome/MobileBackButton";
import { ScreenState } from "../../src/components/chrome/ScreenState";
import { CommunityRichPostContent } from "../../src/components/CommunityRichPostContent";
import { CommunityAvatar } from "../../src/components/community/CommunityAvatar";
import { CommunityAttachedEventRow } from "../../src/components/community/CommunityAttachedEventRow";
import { ProfileCompactHeader } from "../../src/components/profile/ProfileCompactHeader";
import { ProfileMutualGround } from "../../src/components/profile/ProfileMutualGround";
import { useAuth } from "../../src/context/AuthProvider";
import { showActionSheet } from "../../src/lib/actionSheet";
import { getMobileApiBaseUrl } from "../../src/lib/env";
import { haptics } from "../../src/lib/haptics";
import { formatCommunityRelativeTime } from "../../src/lib/communityPresentation";
import {
  followMobileUser,
  loadMobilePublicProfile,
  removeMobileAvatar,
  unfollowMobileUser,
  uploadMobileAvatar,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

type ProfileEvent = MobilePublicProfile["recentAttendingEvents"][number];
type ProfilePost = NonNullable<MobilePublicProfile["communityPosts"]>[number];
type ProfileTab = "activity" | "about" | "events";

const PROFILE_TABS: Array<{ key: ProfileTab; label: string }> = [
  { key: "activity", label: "Activity" },
  { key: "about", label: "About" },
  { key: "events", label: "Events" },
];
const MAX_AVATAR_IMAGE_BYTES = 8 * 1024 * 1024;

const NETWORKING_GOAL_LABELS: Record<string, string> = {
  "find-mentors": "Mentorship",
  "find-mentees": "Mentoring",
  "find-peers": "Peer learning",
  "find-collaborators": "Collaboration",
  "find-customers": "Business development",
  "find-employers": "Job opportunities",
  "find-employees": "Hiring",
  "industry-insights": "Industry chats",
  "thought-leadership": "Speaking",
};

const CAREER_GOAL_LABELS: Record<string, string> = {
  "skill-development": "Learn new skills",
  "role-transition": "Change roles",
  "leadership-growth": "Develop leadership",
  networking: "Build my network",
};

const SKILL_LABELS: Record<string, string> = {
  "artificial intelligence & machine learning": "AI/ML",
  "artificial intelligence and machine learning": "AI/ML",
  "machine learning": "ML",
  "power bi": "Power BI",
  sql: "SQL",
};

function formatNetworkingGoal(goal: string): string {
  return NETWORKING_GOAL_LABELS[goal] ?? humanizeProfileValue(goal);
}

function formatCareerGoal(goal: string): string {
  return CAREER_GOAL_LABELS[goal] ?? humanizeProfileValue(goal);
}

function humanizeProfileValue(value: string): string {
  const words = value.trim().replace(/[-_]+/g, " ");
  return words
    ? `${words.charAt(0).toLocaleUpperCase()}${words.slice(1)}`
    : value;
}

function getFocusSummary(profile: MobilePublicProfile): string | null {
  const career = profile.careerProfile;
  if (!career) return null;

  const goals = new Set(career.careerGoals);
  const topics = career.interests.slice(0, 2).map(compactFocusTopic);
  const topicText = topics.length
    ? topics.join(" and ")
    : compactFocusTopic(career.currentRole?.trim() || "my field");
  const city = profile.location?.split(",")[0]?.trim() || null;
  const professionalCommunity =
    /data|analyst|analytics|bi|machine learning|ai/i.test(
      [career.currentRole, ...career.interests].filter(Boolean).join(" "),
    )
      ? "data community"
      : "professional community";
  const community = city
    ? `${city}’s ${professionalCommunity}`
    : `the ${professionalCommunity}`;

  if (goals.has("skill-development") && goals.has("networking")) {
    return `Growing practical ${topicText} skills while connecting with ${community}.`;
  }
  if (goals.has("skill-development")) {
    return `Growing practical ${topicText} skills.`;
  }
  if (goals.has("role-transition")) {
    return `Exploring my next career step in ${topicText}.`;
  }
  if (goals.has("leadership-growth")) {
    return `Growing as a leader in ${topicText}.`;
  }
  if (goals.has("networking")) {
    return `Connecting with ${community} around ${topicText}.`;
  }

  return career.interests.length
    ? `Exploring ideas and opportunities across ${topics.join(" and ")}.`
    : null;
}

function compactFocusTopic(label: string): string {
  const normalized = label.trim().toLocaleLowerCase();
  if (
    normalized === "ai/ml" ||
    normalized.includes("artificial intelligence")
  ) {
    return "AI";
  }
  if (normalized.includes("data science") || normalized === "analytics") {
    return "analytics";
  }
  return compactSkillLabel(label);
}

function getPublicSkills(profile: MobilePublicProfile): string[] {
  const career = profile.careerProfile;
  return uniqueProfileItems([
    ...(career?.primarySkills ?? []),
    ...(career?.skillsToLearn ?? []),
  ]).map(compactSkillLabel);
}

function getPublicOpenTo(profile: MobilePublicProfile): string[] {
  return uniqueProfileItems(
    (profile.careerProfile?.networkingGoals ?? []).map(formatNetworkingGoal),
  ).slice(0, 3);
}

function compactSkillLabel(label: string): string {
  const normalized = label.trim().toLocaleLowerCase();
  return SKILL_LABELS[normalized] ?? label;
}

function uniqueProfileItems(
  values: Array<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const key = trimmed.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result;
}

function buildLinkedinTarget(
  linkedinUrl: string | null | undefined,
  name: string,
): string {
  if (linkedinUrl?.trim()) return linkedinUrl.trim();
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)}`;
}

function buildProfileShareUrl(username: string): string {
  const base = getMobileApiBaseUrl().replace(/\/+$/, "");
  return `${base}/u/${encodeURIComponent(username)}`;
}

function isEmailAddress(value: string | null | undefined): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function getProfileDisplayName(profile: MobilePublicProfile): string {
  const fullName = profile.fullName?.trim();
  if (fullName && !isEmailAddress(fullName)) return fullName;
  return profile.username.trim() || "Profile";
}

function getIdentityHeadline(profile: MobilePublicProfile): string | null {
  const headline = profile.headline?.trim();
  if (!headline) return null;

  const role = profile.careerProfile?.currentRole?.trim().toLocaleLowerCase();
  // The work-context line owns role information; do not repeat it in the headline.
  if (role && headline.toLocaleLowerCase().startsWith(role)) return null;

  return headline;
}

async function shareProfile(
  displayName: string,
  username: string,
): Promise<void> {
  const shareUrl = buildProfileShareUrl(username);
  try {
    await Share.share({
      url: shareUrl,
      message: `${displayName} on Kurecal - ${shareUrl}`,
    });
  } catch (error) {
    Alert.alert(
      "Share failed",
      error instanceof Error ? error.message : "Please try again.",
    );
  }
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string | string[] }>();
  const resolvedUsername = Array.isArray(username) ? username[0] : username;
  return <PublicProfileView username={resolvedUsername} />;
}

export function PublicProfileView({
  showSettingsAction = false,
  username,
}: {
  showSettingsAction?: boolean;
  username: string | undefined;
}) {
  const { tokens } = useAppTheme();
  const { refreshProfile } = useAuth();
  const resolvedUsername = username;
  const requestSequenceRef = useRef(0);
  const requestedUsernameRef = useRef<string | null>(null);

  const [profile, setProfile] = useState<MobilePublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("activity");
  const [avatarPending, setAvatarPending] = useState(false);

  const loadProfile = useCallback(async () => {
    const trimmed = resolvedUsername?.trim();
    if (!trimmed) {
      requestSequenceRef.current += 1;
      requestedUsernameRef.current = null;
      setProfile(null);
      setFollowing(false);
      setError("Username is required.");
      setLoading(false);
      return;
    }

    const normalizedRequest = trimmed.toLocaleLowerCase();
    if (requestedUsernameRef.current !== normalizedRequest) {
      requestedUsernameRef.current = normalizedRequest;
      setProfile(null);
      setError(null);
      setFollowing(false);
      setHeaderCompact(false);
    }

    const requestId = ++requestSequenceRef.current;
    setLoading(true);

    try {
      const nextProfile = await loadMobilePublicProfile(trimmed);
      if (requestId !== requestSequenceRef.current) return;
      setProfile(nextProfile);
      setFollowing(nextProfile.relationship?.isFollowing ?? false);
      setError(null);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load this public profile.",
      );
    } finally {
      if (requestId === requestSequenceRef.current) setLoading(false);
    }
  }, [resolvedUsername]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const nextEvent = useMemo(() => {
    if (!profile) return null;
    const now = Date.now();
    return (
      profile.recentAttendingEvents
        .filter(
          (event) =>
            (event.activityType === "attending" ||
              event.activityType === "speaking") &&
            new Date(event.endTime ?? event.startTime).getTime() >= now,
        )
        .sort(
          (left, right) =>
            new Date(left.startTime).getTime() -
            new Date(right.startTime).getTime(),
        )[0] ?? null
    );
  }, [profile]);

  const publicOpenTo = useMemo(
    () => (profile ? getPublicOpenTo(profile) : []),
    [profile],
  );
  const publicSkills = useMemo(
    () => (profile ? getPublicSkills(profile) : []),
    [profile],
  );

  const careerProfileIncomplete = Boolean(
    profile?.isViewerOwner &&
      (!profile.careerProfile ||
        !profile.careerProfile.currentRole?.trim() ||
        profile.careerProfile.primarySkills.length < 2 ||
        profile.careerProfile.careerGoals.length === 0),
  );

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = event.nativeEvent.contentOffset.y > 80;
    setHeaderCompact((current) => (current === next ? current : next));
  }

  async function handleToggleFollow() {
    if (!profile || followPending) return;
    const nextFollowing = !following;
    setFollowPending(true);
    setFollowing(nextFollowing);
    try {
      if (nextFollowing) await followMobileUser(profile.id);
      else await unfollowMobileUser(profile.id);
    } catch (nextError) {
      setFollowing(!nextFollowing);
      Alert.alert(
        "Unable to update follow",
        nextError instanceof Error ? nextError.message : "Please try again.",
      );
    } finally {
      setFollowPending(false);
    }
  }

  function setVisibleAvatarUrl(avatarUrl: string | null) {
    setProfile((current) => (current ? { ...current, avatarUrl } : current));
  }

  async function handleChooseAvatar() {
    if (!profile?.isViewerOwner || avatarPending) return;

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.84,
        selectionLimit: 1,
      });
    } catch (nextError) {
      Alert.alert(
        "Photos unavailable",
        nextError instanceof Error
          ? nextError.message
          : "Unable to open your photo library.",
      );
      return;
    }

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_IMAGE_BYTES) {
      Alert.alert("Photo too large", "Choose an image smaller than 8 MB.");
      return;
    }

    const previousAvatarUrl = profile.avatarUrl;
    setAvatarPending(true);
    setVisibleAvatarUrl(asset.uri);
    try {
      const nextState = await uploadMobileAvatar({
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        uri: asset.uri,
      });
      setVisibleAvatarUrl(nextState.profile.avatarUrl);
      haptics.success();
      void AccessibilityInfo.announceForAccessibility("Profile photo updated");
      void refreshProfile();
    } catch (nextError) {
      setVisibleAvatarUrl(previousAvatarUrl);
      haptics.warning();
      Alert.alert(
        "Photo not updated",
        nextError instanceof Error
          ? nextError.message
          : "Unable to update your profile photo. Please try again.",
      );
    } finally {
      setAvatarPending(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profile?.isViewerOwner || avatarPending) return;
    const previousAvatarUrl = profile.avatarUrl;
    setAvatarPending(true);
    setVisibleAvatarUrl(null);
    try {
      const nextState = await removeMobileAvatar();
      setVisibleAvatarUrl(nextState.profile.avatarUrl);
      haptics.success();
      void AccessibilityInfo.announceForAccessibility("Profile photo removed");
      void refreshProfile();
    } catch (nextError) {
      setVisibleAvatarUrl(previousAvatarUrl);
      haptics.warning();
      Alert.alert(
        "Photo not removed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to remove your profile photo. Please try again.",
      );
    } finally {
      setAvatarPending(false);
    }
  }

  function confirmRemoveAvatar() {
    Alert.alert(
      "Remove profile photo?",
      "Your initials will be shown instead.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove photo",
          style: "destructive",
          onPress: () => {
            void handleRemoveAvatar();
          },
        },
      ],
    );
  }

  function openAvatarActions() {
    if (!profile?.isViewerOwner || avatarPending) return;
    haptics.selection();
    showActionSheet({
      title: "Profile photo",
      options: [
        {
          label: profile.avatarUrl ? "Choose new photo" : "Choose photo",
          onPress: () => {
            void handleChooseAvatar();
          },
        },
        ...(profile.avatarUrl
          ? [
              {
                label: "Remove photo",
                destructive: true,
                onPress: confirmRemoveAvatar,
              },
            ]
          : []),
      ],
    });
  }

  return (
    <MobilePage headerHidden title="Profile">
      {loading && !profile ? (
        <ScreenState
          mode="loading"
          title="Loading profile"
          description="Pulling profile details, recent events, and follow context."
        />
      ) : null}

      {error && !profile ? (
        <ScreenState
          mode="error"
          title="Profile unavailable"
          description={error}
          action={
            <HeaderActionButton
              label="Retry"
              onPress={() => {
                void loadProfile();
              }}
            />
          }
        />
      ) : null}

      {profile ? (
        <>
          <ProfileCompactHeader
            avatarUrl={profile.avatarUrl}
            displayName={getProfileDisplayName(profile)}
            username={profile.username}
            visible={headerCompact}
            action={
              showSettingsAction || profile.isViewerOwner ? (
                <IconHeaderButton
                  accessibilityLabel="More profile options"
                  iconName="ellipsis-h"
                  onPress={() => router.push("/settings/all")}
                />
              ) : (
                <CompactFollowButton
                  following={following}
                  onPress={() => {
                    void handleToggleFollow();
                  }}
                />
              )
            }
          />
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { backgroundColor: tokens.colors.shell },
            ]}
            onScroll={handleScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[1]}
          >
            <View style={styles.profileIntro}>
              <ProfileHero
                avatarPending={avatarPending}
                profile={profile}
                onAvatarPress={openAvatarActions}
                onShare={() => {
                  void shareProfile(
                    getProfileDisplayName(profile),
                    profile.username,
                  );
                }}
                onSettings={() => router.push("/settings/all")}
              />

              {!profile.isViewerOwner ? (
                <ProfileActions
                  displayName={getProfileDisplayName(profile)}
                  following={following}
                  followPending={followPending}
                  linkedinUrl={profile.linkedinUrl ?? null}
                  onToggleFollow={() => {
                    void handleToggleFollow();
                  }}
                  username={profile.username}
                />
              ) : null}

              {careerProfileIncomplete ? (
                <CareerNudge
                  onPress={() =>
                    router.push({
                      pathname: "/onboarding",
                      params: { resume: "1" },
                    } as never)
                  }
                />
              ) : null}

              {!profile.isViewerOwner ? (
                <ProfileMutualGround
                  mutualCount={profile.mutualConnectionsCount}
                  sharedEventsCount={profile.sharedEventsCount}
                  sharedTopics={profile.sharedTopics ?? []}
                  sharedCircles={profile.sharedCircles}
                  sharedCirclesCount={profile.sharedCirclesCount}
                  recommendedBy={profile.recommendedBy}
                  sharedCareerGoals={profile.sharedCareerGoals}
                />
              ) : null}
            </View>

            <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />

            <View style={styles.tabContent}>
              {activeTab === "activity" ? (
                <>
                  {nextEvent &&
                  (profile.showAttendance || profile.isViewerOwner) ? (
                    <ProfileEventActivity
                      displayName={getProfileDisplayName(profile)}
                      event={nextEvent}
                      onPress={() => router.push(`/event/${nextEvent.id}`)}
                    />
                  ) : null}
                  <ProfilePosts
                    isOwner={profile.isViewerOwner}
                    posts={profile.communityPosts ?? []}
                    showEmpty={
                      !nextEvent ||
                      (!profile.showAttendance && !profile.isViewerOwner)
                    }
                  />
                </>
              ) : null}

              {activeTab === "about" ? (
                <>
                  {getFocusSummary(profile) ? (
                    <FocusNow profile={profile} />
                  ) : null}
                  {publicOpenTo.length ? <OpenTo items={publicOpenTo} /> : null}
                  {publicSkills.length ? (
                    <SkillsPreview items={publicSkills} />
                  ) : null}
                </>
              ) : null}

              {activeTab === "events" ? (
                <ProfileEvents
                  events={profile.recentAttendingEvents}
                  isOwner={profile.isViewerOwner}
                  isVisible={profile.showAttendance || profile.isViewerOwner}
                  onPress={(eventId) => router.push(`/event/${eventId}`)}
                />
              ) : null}
            </View>
          </ScrollView>
        </>
      ) : null}
    </MobilePage>
  );
}

function ProfileHero({
  avatarPending,
  profile,
  onAvatarPress,
  onShare,
  onSettings,
}: {
  avatarPending: boolean;
  profile: MobilePublicProfile;
  onAvatarPress: () => void;
  onShare: () => void;
  onSettings: () => void;
}) {
  const { tokens } = useAppTheme();
  const displayName = getProfileDisplayName(profile);
  const identityHeadline = getIdentityHeadline(profile);
  const career = profile.careerProfile;
  const currentRole = career?.currentRole?.trim() || null;
  const companyName = career?.companyName?.trim() || null;
  const workContext = currentRole
    ? companyName
      ? `${currentRole} at ${companyName}`
      : currentRole
    : null;
  const identityMeta = [
    workContext ?? identityHeadline,
    profile.location?.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  const nameMatchesHandle =
    displayName.trim().toLocaleLowerCase() ===
    profile.username.trim().toLocaleLowerCase();

  return (
    <View style={styles.hero}>
      <View style={styles.profileNavRow}>
        <MobileBackButton label="Go back" />
        <Text
          numberOfLines={1}
          style={[
            styles.profileNavHandle,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.mono,
            },
          ]}
        >
          {profile.username ? `@${profile.username}` : "Profile"}
        </Text>
        {profile.isViewerOwner ? (
          <IconHeaderButton
            accessibilityLabel="More profile options"
            iconName="ellipsis-h"
            onPress={onSettings}
          />
        ) : (
          <IconHeaderButton
            accessibilityLabel="Share profile"
            iconName="share-alt"
            onPress={onShare}
          />
        )}
      </View>

      <View style={styles.heroHeader}>
        {profile.isViewerOwner ? (
          <Pressable
            accessibilityHint="Opens profile photo options"
            accessibilityLabel={
              profile.avatarUrl ? "Change profile photo" : "Add profile photo"
            }
            accessibilityRole="button"
            accessibilityState={{
              busy: avatarPending,
              disabled: avatarPending,
            }}
            disabled={avatarPending}
            onPress={onAvatarPress}
            style={({ pressed }) => [
              styles.avatarEditor,
              { opacity: pressed || avatarPending ? 0.74 : 1 },
            ]}
          >
            <CommunityAvatar
              avatarUrl={profile.avatarUrl}
              name={displayName}
              size={68}
            />
            <View
              style={[
                styles.avatarEditBadge,
                {
                  backgroundColor: tokens.colors.accent,
                  borderColor: tokens.colors.shell,
                },
              ]}
            >
              {avatarPending ? (
                <ActivityIndicator
                  color={tokens.colors.textInverse}
                  size="small"
                />
              ) : (
                <FontAwesome
                  color={tokens.colors.textInverse}
                  name="camera"
                  size={10}
                />
              )}
            </View>
          </Pressable>
        ) : (
          <CommunityAvatar
            avatarUrl={profile.avatarUrl}
            name={displayName}
            size={68}
          />
        )}
        <View style={styles.identityCopy}>
          {!nameMatchesHandle ? (
            <Text
              numberOfLines={2}
              style={{
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
                fontSize: 18,
                fontWeight: "600",
                letterSpacing: 0,
                lineHeight: 24,
              }}
            >
              {displayName}
            </Text>
          ) : null}
          {identityMeta ? (
            <Text
              numberOfLines={1}
              style={{
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
                fontSize: 14,
                fontWeight: "400",
                lineHeight: 20,
              }}
            >
              {identityMeta}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function CareerNudge({ onPress }: { onPress: () => void }) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Complete career profile"
      onPress={onPress}
      style={({ pressed }) => [
        styles.careerNudge,
        { borderColor: tokens.colors.borderStrong, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <FontAwesome color={tokens.colors.accent} name="briefcase" size={13} />
      <Text
        style={{
          color: tokens.colors.textSecondary,
          flex: 1,
          fontFamily: tokens.typography.sans,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        Complete career profile
      </Text>
      <FontAwesome
        color={tokens.colors.textTertiary}
        name="chevron-right"
        size={11}
      />
    </Pressable>
  );
}

function FocusNow({ profile }: { profile: MobilePublicProfile }) {
  const { tokens } = useAppTheme();
  const summary = getFocusSummary(profile);
  const goals = (profile.careerProfile?.careerGoals ?? [])
    .slice(0, 2)
    .map(formatCareerGoal);
  if (!summary) return null;
  return (
    <ProfileZone title="Focused on">
      <Text
        style={[
          styles.focusSummary,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {summary}
      </Text>
      {goals.length ? (
        <View style={styles.focusTags}>
          {goals.map((goal) => (
            <ProfileTag key={goal} label={goal} tone="muted" />
          ))}
        </View>
      ) : null}
    </ProfileZone>
  );
}

function OpenTo({ items }: { items: string[] }) {
  return (
    <ProfileZone title="Open to">
      <View style={styles.focusTags}>
        {items.slice(0, 3).map((item) => (
          <ProfileTag key={item} label={item} tone="accent" />
        ))}
      </View>
    </ProfileZone>
  );
}

function ProfileTabs({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.profileTabs,
        {
          backgroundColor: tokens.colors.shell,
          borderBottomColor: tokens.colors.divider,
        },
      ]}
    >
      {PROFILE_TABS.map((tab) => {
        const selected = tab.key === activeTab;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.profileTab,
              pressed ? styles.activityPressed : null,
            ]}
          >
            <Text
              style={[
                styles.profileTabText,
                {
                  color: selected
                    ? tokens.colors.textPrimary
                    : tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                  fontWeight: selected ? "700" : "500",
                },
              ]}
            >
              {tab.label}
            </Text>
            <View
              style={[
                styles.profileTabIndicator,
                {
                  backgroundColor: selected
                    ? tokens.colors.accent
                    : "transparent",
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function ProfileEventActivity({
  displayName,
  event,
  onPress,
}: {
  displayName: string;
  event: ProfileEvent;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  const action =
    event.activityType === "speaking" ? "is speaking at" : "is attending";
  return (
    <View
      style={[
        styles.eventActivity,
        { borderBottomColor: tokens.colors.divider },
      ]}
    >
      <View style={styles.eventActivityContext}>
        <FontAwesome
          color={tokens.colors.accent}
          name="calendar-check-o"
          size={14}
        />
        <Text
          style={[
            styles.eventActivityContextText,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          <Text style={styles.eventActivityName}>{displayName}</Text> {action}
        </Text>
      </View>
      <ProfileEventCard event={event} onPress={onPress} />
    </View>
  );
}

function ProfileEvents({
  events,
  isOwner,
  isVisible,
  onPress,
}: {
  events: ProfileEvent[];
  isOwner: boolean;
  isVisible: boolean;
  onPress: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();

  if (!isVisible || events.length === 0) {
    const message = !isVisible
      ? "Event activity is private."
      : isOwner
        ? "Your public event activity will appear here."
        : "No public event activity yet.";
    return (
      <View style={styles.postsEmpty}>
        <FontAwesome
          color={tokens.colors.textTertiary}
          name="calendar-o"
          size={15}
        />
        <Text
          style={[
            styles.postsEmptyText,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.eventList}>
      {events.map((event) => (
        <ProfileEventCard
          event={event}
          key={`${event.activityType}-${event.id}`}
          onPress={() => onPress(event.id)}
        />
      ))}
    </View>
  );
}

function ProfileEventCard({
  event,
  onPress,
}: {
  event: ProfileEvent;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();

  const date = new Date(event.startTime);
  const month = new Intl.DateTimeFormat(undefined, { month: "short" })
    .format(date)
    .toUpperCase();
  const day = new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(
    date,
  );
  const activityLabel =
    event.activityType === "speaking"
      ? "Speaking"
      : event.activityType === "attended"
        ? "Attended"
        : event.activityType === "saved"
          ? "Saved"
          : "Attending";
  const meta = [activityLabel, event.location?.trim()]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable
      accessibilityLabel={`Open event ${event.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.eventCard,
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderColor: tokens.colors.borderStrong,
          borderRadius: tokens.radius.md,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
    >
      <View style={styles.upcomingDate}>
        <Text
          style={[
            styles.upcomingMonth,
            {
              color: tokens.colors.accent,
              fontFamily: tokens.typography.mono,
            },
          ]}
        >
          {month}
        </Text>
        <Text
          style={[
            styles.upcomingDay,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {day}
        </Text>
      </View>
      <View style={styles.upcomingCopy}>
        <Text
          numberOfLines={2}
          style={[
            styles.upcomingTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event.title}
        </Text>
        {meta ? (
          <Text
            numberOfLines={1}
            style={[
              styles.upcomingMeta,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {meta}
          </Text>
        ) : null}
      </View>
      <FontAwesome color={tokens.colors.accent} name="arrow-right" size={13} />
    </Pressable>
  );
}

function ProfilePosts({
  isOwner,
  posts,
  showEmpty,
}: {
  isOwner: boolean;
  posts: NonNullable<MobilePublicProfile["communityPosts"]>;
  showEmpty: boolean;
}) {
  const { tokens } = useAppTheme();

  if (posts.length === 0) {
    if (!showEmpty) return null;
    return (
      <View style={styles.postsEmpty}>
        <FontAwesome
          color={tokens.colors.textTertiary}
          name="comments-o"
          size={15}
        />
        <Text
          style={[
            styles.postsEmptyText,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {isOwner
            ? "Your community activity will appear here."
            : "No public community activity yet."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.postStack}>
      {posts.map((post, index) => (
        <ProfileActivityItem
          key={post.id}
          isLast={index === posts.length - 1}
          post={post}
        />
      ))}
    </View>
  );
}

function ProfileActivityItem({
  isLast,
  post,
}: {
  isLast: boolean;
  post: ProfilePost;
}) {
  const { tokens } = useAppTheme();
  const openPost = () =>
    router.push({
      pathname: "/community/[slug]/post/[postId]",
      params: { slug: post.circle.slug, postId: post.id },
    });
  const sharePost = async () => {
    const base = getMobileApiBaseUrl().replace(/\/+$/, "");
    const url = `${base}/community/${encodeURIComponent(post.circle.slug)}/post/${encodeURIComponent(post.id)}`;
    try {
      await Share.share({ message: url, url });
    } catch (error) {
      Alert.alert(
        "Share failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <View
      style={[
        styles.activityItem,
        !isLast
          ? {
              borderBottomColor: tokens.colors.divider,
              borderBottomWidth: StyleSheet.hairlineWidth,
            }
          : null,
      ]}
    >
      <View style={styles.activityHeader}>
        <View style={styles.activityContextRow}>
          <FontAwesome
            color={tokens.colors.textTertiary}
            name="circle-o"
            size={8}
          />
          <Text
            style={[
              styles.activityContext,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Posted in
          </Text>
          <Pressable
            accessibilityLabel={`Open ${post.circle.name}`}
            accessibilityRole="link"
            hitSlop={6}
            onPress={() => router.push(`/community/${post.circle.slug}`)}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.activityCircleLink,
                {
                  color: tokens.colors.accent,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {post.circle.name}
            </Text>
          </Pressable>
        </View>
        <Text
          style={[
            styles.activityTime,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {formatCommunityRelativeTime(post.createdAt)}
        </Text>
      </View>

      <Pressable
        accessibilityLabel={`Open post ${post.title || "activity"}`}
        accessibilityRole="button"
        onPress={openPost}
        style={({ pressed }) => (pressed ? styles.activityPressed : undefined)}
      >
        <CommunityRichPostContent
          content={post.content}
          linkPreviews={post.linkPreviews}
          media={post.media}
          mediaPresentation="preview"
          mentions={post.mentions}
          numberOfLines={3}
          textVariant="post"
          title={post.title}
        />
      </Pressable>

      {post.event ? (
        <View style={styles.activityAttachment}>
          <Text
            style={[
              styles.activityAttachmentLabel,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Attached event
          </Text>
          <CommunityAttachedEventRow
            event={post.event}
            variant="selected"
            onPress={() => router.push(`/event/${post.event?.id}`)}
          />
        </View>
      ) : null}

      <View style={styles.activityFooter}>
        <View style={styles.activityReplyMeta}>
          <FontAwesome
            color={tokens.colors.textTertiary}
            name="comment-o"
            size={12}
          />
          <Text
            style={[
              styles.activityFooterText,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
          </Text>
        </View>
        <View style={styles.activityFooterActions}>
          <Pressable
            accessibilityLabel="Share post"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => void sharePost()}
            style={({ pressed }) =>
              pressed ? styles.activityPressed : undefined
            }
          >
            <FontAwesome
              color={tokens.colors.textTertiary}
              name="share"
              size={12}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={`Open ${post.commentCount} replies`}
            accessibilityRole="button"
            onPress={openPost}
            style={({ pressed }) =>
              pressed ? styles.activityPressed : undefined
            }
          >
            <Text
              style={[
                styles.activityFooterLink,
                {
                  color: tokens.colors.accent,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Join discussion
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SkillsPreview({ items }: { items: string[] }) {
  const { tokens } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 4);
  return (
    <ProfileZone
      action={
        items.length > 4 ? (
          <Pressable
            accessibilityLabel={
              expanded ? "Show fewer skills" : "Show all skills"
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setExpanded((current) => !current)}
          >
            <Text
              style={[
                styles.sectionAction,
                {
                  color: tokens.colors.accent,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {expanded ? "Show less" : "See all"}
            </Text>
          </Pressable>
        ) : null
      }
      title="Skills"
    >
      <Text
        style={[
          styles.skillsLine,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {visible.join(" · ")}
      </Text>
    </ProfileZone>
  );
}

function ProfileTag({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "accent" | "default" | "muted";
}) {
  const { tokens } = useAppTheme();
  const colors =
    tone === "accent"
      ? {
          backgroundColor: tokens.colors.accentSoft,
          borderColor: tokens.colors.accent,
          color: tokens.colors.accent,
        }
      : tone === "muted"
        ? {
            backgroundColor: tokens.colors.surfaceStrong,
            borderColor: tokens.colors.border,
            color: tokens.colors.textSecondary,
          }
        : {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.borderStrong,
            color: tokens.colors.textPrimary,
          };
  return (
    <View style={[styles.profileTag, colors]}>
      <Text
        numberOfLines={1}
        style={{
          color: colors.color,
          fontFamily: tokens.typography.sans,
          fontSize: 11,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ProfileActions({
  displayName,
  following,
  followPending,
  linkedinUrl,
  onToggleFollow,
  username,
}: {
  displayName: string;
  following: boolean;
  followPending: boolean;
  linkedinUrl: string | null;
  onToggleFollow: () => void;
  username: string;
}) {
  const { tokens } = useAppTheme();
  const linkedinTarget = buildLinkedinTarget(
    linkedinUrl,
    displayName || username,
  );

  async function handleConnect() {
    try {
      const canOpen = await Linking.canOpenURL(linkedinTarget);
      if (!canOpen) {
        Alert.alert(
          "Unable to open LinkedIn",
          "No app or browser can handle the LinkedIn link.",
        );
        return;
      }
      await Linking.openURL(linkedinTarget);
    } catch (error) {
      Alert.alert(
        "Unable to open LinkedIn",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  async function handleShare() {
    const shareUrl = buildProfileShareUrl(username);
    try {
      await Share.share({
        url: shareUrl,
        message: `${displayName} on Kurecal - ${shareUrl}`,
      });
    } catch (error) {
      Alert.alert(
        "Share failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return (
    <View style={styles.actionRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${following ? "Disconnect from" : "Connect with"} ${displayName}`}
        disabled={followPending}
        onPress={onToggleFollow}
        style={({ pressed }) => [
          styles.primaryAction,
          {
            backgroundColor: tokens.colors.accent,
            borderRadius: tokens.radius.md,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textInverse,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            fontWeight: "600",
            lineHeight: 18,
          }}
        >
          {followPending ? "Connecting…" : following ? "Connected" : "Connect"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Connect with ${displayName} on LinkedIn`}
        onPress={handleConnect}
        style={({ pressed }) => [
          styles.compactSecondaryAction,
          {
            borderColor: tokens.colors.borderStrong,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <FontAwesome
          name="linkedin"
          size={15}
          color={tokens.colors.textSecondary}
        />
      </Pressable>
      <IconActionButton
        accessibilityLabel="Share profile"
        iconName="link"
        onPress={handleShare}
      />
    </View>
  );
}

function CompactFollowButton({
  following,
  onPress,
}: {
  following: boolean;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={following ? "Disconnect" : "Connect"}
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactCta,
        {
          backgroundColor: tokens.colors.accent,
          borderRadius: tokens.radius.md,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: tokens.colors.textInverse,
          fontFamily: tokens.typography.sans,
          fontSize: 12,
          fontWeight: "600",
          lineHeight: 16,
        }}
      >
        {following ? "Connected" : "Connect"}
      </Text>
    </Pressable>
  );
}

function IconHeaderButton({
  accessibilityLabel,
  iconName,
  onPress,
}: {
  accessibilityLabel: string;
  iconName: ComponentProps<typeof FontAwesome>["name"];
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && styles.iconButtonPressed,
      ]}
    >
      <FontAwesome
        name={iconName}
        size={17}
        color={tokens.colors.textSecondary}
      />
    </Pressable>
  );
}

function IconActionButton({
  accessibilityLabel,
  iconName,
  onPress,
}: {
  accessibilityLabel: string;
  iconName: ComponentProps<typeof FontAwesome>["name"];
  onPress?: () => void;
}) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryAction,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderStrong,
          borderRadius: tokens.radius.md,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <FontAwesome
        name={iconName}
        size={20}
        color={tokens.colors.textPrimary}
      />
    </Pressable>
  );
}

function ProfileZone({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  const { tokens } = useAppTheme();
  return (
    <View style={styles.flatSection}>
      <View style={styles.sectionTitleRow}>
        <Text
          style={{
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            fontWeight: "600",
            lineHeight: 16,
          }}
        >
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarEditBadge: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    bottom: -1,
    height: 23,
    justifyContent: "center",
    position: "absolute",
    right: -1,
    width: 23,
  },
  avatarEditor: {
    height: 68,
    position: "relative",
    width: 68,
  },
  activityAttachment: {
    gap: 6,
  },
  activityAttachmentLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.7,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  activityCircleLink: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  activityContext: {
    fontSize: 11,
    lineHeight: 15,
  },
  activityContextRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 5,
    minWidth: 0,
  },
  activityFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 28,
  },
  activityFooterActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  activityFooterLink: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  activityFooterText: {
    fontSize: 11,
    lineHeight: 15,
  },
  activityHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  activityItem: {
    gap: 12,
    paddingBottom: 18,
    paddingTop: 4,
  },
  activityPressed: {
    opacity: 0.7,
  },
  activityReplyMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  activityTime: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  compactCta: {
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  eventActivity: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingBottom: 18,
  },
  eventActivityContext: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  eventActivityContextText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  eventActivityName: {
    fontWeight: "700",
  },
  eventCard: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    padding: 10,
  },
  eventList: {
    gap: 10,
  },
  flatSection: {
    gap: 10,
    paddingTop: 4,
  },
  hero: {
    gap: 12,
  },
  profileIntro: {
    gap: 12,
    paddingBottom: 12,
  },
  profileNavRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 32,
  },
  profileNavHandle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    marginHorizontal: 12,
    textAlign: "center",
  },
  heroHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  identityCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  iconButtonPressed: {
    opacity: 0.62,
  },
  focusSummary: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  primaryAction: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 10,
  },
  secondaryAction: {
    alignItems: "center",
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  skillsLine: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 21,
  },
  postsEmpty: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    minHeight: 44,
  },
  postsEmptyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  postStack: {
    gap: 18,
  },
  upcomingCard: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 84,
    padding: 12,
  },
  upcomingDate: {
    alignItems: "center",
    width: 38,
  },
  upcomingMonth: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  upcomingDay: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 28,
  },
  upcomingCopy: {
    flex: 1,
    gap: 3,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  upcomingMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  careerNudge: {
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  compactSecondaryAction: {
    alignItems: "center",
    borderRadius: 4,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  focusTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  profileTag: {
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  profileTab: {
    alignItems: "flex-start",
    minHeight: 42,
    paddingTop: 12,
  },
  profileTabIndicator: {
    borderRadius: 2,
    bottom: 0,
    height: 2,
    position: "absolute",
    width: "100%",
  },
  profileTabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 28,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  profileTabText: {
    fontSize: 12,
    lineHeight: 16,
  },
  tabContent: {
    gap: 18,
    paddingTop: 18,
  },
});

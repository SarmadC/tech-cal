import { FontAwesome } from "@expo/vector-icons";
import type {
  CommunityPostType,
  MobileCommunityCircle,
  MobileCommunityEventCard,
  MobileCommunityFeedPost,
  MobileCommunityHome,
  MobileCommunityNetworkingEvent,
  MobileCommunityNetworkingFollowUpCard,
  MobileCommunityNetworkingPersonCard,
  MobileCommunityNetworkingSharedEvent,
} from "@kurecal/domain";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  DURATIONS,
  SPRING_CONFIG,
  useReduceMotion,
  useScalePress,
} from "../../src/hooks/useAnimation";

import { KureButton } from "../../src/components/chrome/KureButton";
import { MobilePage } from "../../src/components/chrome/MobilePage";
import { ScreenState } from "../../src/components/chrome/ScreenState";
import { TabMenuOverlay } from "../../src/components/chrome/TabMenuOverlay";
import { CommunityAttachedEventRow } from "../../src/components/community/CommunityAttachedEventRow";
import { CommunityNetworkingPersonCard } from "../../src/components/community/CommunityNetworkingPersonCard";
import { CommunityNetworkingSpeakerCard } from "../../src/components/community/CommunityNetworkingSpeakerCard";
import { CommunityRoomSheet } from "../../src/components/community/CommunityRoomSheet";
import { CommunityFeedCard } from "../../src/components/CommunityFeedCard";
import { formatCommunityTabCount } from "../../src/components/community/presentation";
import {
  createMobileCommunityPost,
  deleteCommunityPostImage,
  followMobileUser,
  joinMobileCommunityCircle,
  leaveMobileCommunityCircle,
  loadMobileCommunityEvents,
  loadMobileCommunityHome,
  unfollowMobileUser,
  uploadCommunityPostImage,
  type CommunityPostImageUploadResult,
} from "../../src/lib/mobileApi";
import { useAppTheme } from "../../src/providers/ThemeProvider";

type LoadMode = "initial" | "refresh";
type CommunityTab = "rooms" | "circles" | "people";
type RoomLens = "for_you" | "going" | "saved" | "nearby" | "past";
type PeopleLens = "for_you" | "going" | "follows_you" | "mutuals" | "recent";

const COMMUNITY_TABS: Array<{ id: CommunityTab; label: string }> = [
  { id: "rooms", label: "Rooms" },
  { id: "circles", label: "Circles" },
  { id: "people", label: "People" },
];

const ROOM_LENSES: Array<{ id: RoomLens; label: string }> = [
  { id: "for_you", label: "For You" },
  { id: "going", label: "Going" },
  { id: "saved", label: "Saved" },
  { id: "nearby", label: "Nearby" },
  { id: "past", label: "Past" },
];

const PEOPLE_LENSES: Array<{ id: PeopleLens; label: string }> = [
  { id: "for_you", label: "For You" },
  { id: "going", label: "Going" },
  { id: "follows_you", label: "Follows You" },
  { id: "mutuals", label: "Mutuals" },
  { id: "recent", label: "Recent" },
];

const POST_TYPE_OPTIONS: Array<{ label: string; value: CommunityPostType }> = [
  { label: "Update", value: "update" },
  { label: "Question", value: "question" },
  { label: "Intro", value: "intro" },
  { label: "Showcase", value: "showcase" },
  { label: "Event note", value: "event_note" },
  { label: "Announcement", value: "announcement" },
];

const MAX_POST_IMAGES = 4;
const MAX_POST_IMAGE_EDGE = 8_000;

interface CommunityPostImageAttachment extends CommunityPostImageUploadResult {
  localUri: string;
}

interface ComposerEventOption extends MobileCommunityEventCard {
  circle: Pick<MobileCommunityCircle, "id" | "name" | "slug">;
}

function getCommunityLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "The community hub could not be loaded right now.";
}

function getPrimaryEvent(
  person:
    | MobileCommunityNetworkingPersonCard
    | MobileCommunityNetworkingFollowUpCard,
): MobileCommunityNetworkingSharedEvent | null {
  return person.strongestSharedEvent ?? person.sharedEvents[0] ?? null;
}

function getDisplayName(value: {
  fullName: string | null;
  username?: string;
}): string {
  return (
    value.fullName ||
    (value.username ? `@${value.username}` : "Community member")
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatShortRelativeTime(value: string | null): string {
  if (!value) {
    return "Recently";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMs = timestamp - Date.now();
  const absMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
  const suffix = diffMs >= 0 ? "" : " ago";

  if (absMinutes < 60) {
    return diffMs >= 0 ? `Starts in ${absMinutes}m` : `${absMinutes}m${suffix}`;
  }

  const hours = Math.round(absMinutes / 60);
  if (hours < 24) {
    return diffMs >= 0 ? `Starts in ${hours}h` : `${hours}h${suffix}`;
  }

  const days = Math.round(hours / 24);
  if (days === 1) {
    return diffMs >= 0 ? "Tomorrow" : "Yesterday";
  }

  return diffMs >= 0 ? `Starts in ${days}d` : `${days}d${suffix}`;
}

function getCompactTime(startTime: string | null): string {
  if (!startTime) return "Soon";
  const diffMs = new Date(startTime).getTime() - Date.now();
  const absMinutes = Math.max(1, Math.round(Math.abs(diffMs) / 60_000));
  if (absMinutes < 60) return `${absMinutes}m`;
  const hours = Math.round(absMinutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function getRoomCompactMeta(event: MobileCommunityNetworkingEvent): string {
  const isActive =
    (event.recentTrackerCount ?? 0) > 0 || event.visibleAttendeeCount > 0;
  if (isActive) {
    const count = event.visibleAttendeeCount || event.networkAttendingCount;
    return count > 0
      ? `Active · ${formatCommunityTabCount(count)} here`
      : "Active now";
  }
  return getCompactTime(event.startTime);
}

function _filterRooms(
  events: MobileCommunityNetworkingEvent[],
  lens: RoomLens,
): MobileCommunityNetworkingEvent[] {
  switch (lens) {
    case "going":
      return events.filter((event) => event.viewerContext === "attending");
    case "saved":
      return events.filter((event) => event.viewerContext === "saved");
    case "nearby":
      return events.filter(
        (event) => event.format !== "virtual" && Boolean(event.location),
      );
    case "past":
      return [];
    default:
      return events;
  }
}

function _filterPeople(
  home: MobileCommunityHome,
  lens: PeopleLens,
): {
  peopleToMeet: MobileCommunityNetworkingPersonCard[];
  followUps: MobileCommunityNetworkingFollowUpCard[];
} {
  switch (lens) {
    case "going":
      return {
        peopleToMeet: home.peopleToMeet.filter((person) =>
          person.sharedEvents.some(
            (event) => event.viewerContext === "attending",
          ),
        ),
        followUps: [],
      };
    case "follows_you":
      return {
        peopleToMeet: home.peopleToMeet.filter(
          (person) => person.followsViewer || person.isMutualFollow,
        ),
        followUps: home.followUpNow.filter(
          (person) => person.followsViewer || person.isMutualFollow,
        ),
      };
    case "mutuals":
      return {
        peopleToMeet: home.peopleToMeet.filter(
          (person) => person.isMutualFollow,
        ),
        followUps: home.followUpNow.filter((person) => person.isMutualFollow),
      };
    case "recent":
      return {
        peopleToMeet: [],
        followUps: home.followUpNow,
      };
    default:
      return {
        peopleToMeet: home.peopleToMeet,
        followUps: home.followUpNow,
      };
  }
}

export default function CommunityScreen() {
  const requestSequenceRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const homeRef = useRef<MobileCommunityHome | null>(null);

  const [home, setHome] = useState<MobileCommunityHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingCircleId, setPendingCircleId] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerCircleId, setComposerCircleId] = useState<string | null>(null);
  const [composerPostType, setComposerPostType] =
    useState<CommunityPostType | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerWorking, setComposerWorking] = useState(false);
  const [composerAttachedEvent, setComposerAttachedEvent] =
    useState<ComposerEventOption | null>(null);
  const [composerEventPickerEvents, setComposerEventPickerEvents] = useState<
    ComposerEventOption[]
  >([]);
  const [composerEventPickerLoading, setComposerEventPickerLoading] =
    useState(false);
  const [composerEventPickerOpen, setComposerEventPickerOpen] = useState(false);
  const [composerEventPickerQuery, setComposerEventPickerQuery] = useState("");
  const [composerSelectedMedia, setComposerSelectedMedia] = useState<
    CommunityPostImageAttachment[]
  >([]);
  const [composerUploadingMedia, setComposerUploadingMedia] = useState(false);
  const composerSelectedMediaRef = useRef<CommunityPostImageAttachment[]>([]);
  const composerPublishedMediaPathsRef = useRef<Set<string>>(new Set());
  const [headerControlsVisible, setHeaderControlsVisible] = useState(true);
  const [roomSheetEventId, setRoomSheetEventId] = useState<string | null>(null);

  function handleOpenRoom(eventId: string) {
    setRoomSheetEventId(eventId);
  }

  const loadCommunity = useCallback(async (mode: LoadMode = "initial") => {
    const requestId = ++requestSequenceRef.current;
    const existingHome = homeRef.current;

    if (mode !== "refresh" && !existingHome) {
      setLoading(true);
    }

    try {
      const nextHome = await loadMobileCommunityHome();
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      setHome(nextHome);
      homeRef.current = nextHome;
      setError(null);
      setInlineError(null);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      const message = getCommunityLoadErrorMessage(nextError);
      if (mode === "refresh" || existingHome) {
        setInlineError(message);
      } else {
        setError(message);
      }
    } finally {
      if (requestId === requestSequenceRef.current && mode !== "refresh") {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        void loadCommunity("initial");
      } else {
        void loadCommunity("refresh");
      }
    }, [loadCommunity]),
  );

  const joinedCircles = useMemo(
    () => home?.circles?.filter((circle) => circle.isJoined) ?? [],
    [home],
  );

  const composerCircle = useMemo(
    () =>
      joinedCircles.find((circle) => circle.id === composerCircleId) ?? null,
    [composerCircleId, joinedCircles],
  );
  const composerFallbackCircle = joinedCircles[0] ?? null;
  const composerPublishCircle =
    composerCircle ?? composerAttachedEvent?.circle ?? composerFallbackCircle;

  useEffect(() => {
    composerSelectedMediaRef.current = composerSelectedMedia;
  }, [composerSelectedMedia]);

  useEffect(
    () => () => {
      const unpublishedPaths = composerSelectedMediaRef.current
        .map((item) => item.path)
        .filter((path) => !composerPublishedMediaPathsRef.current.has(path));

      if (unpublishedPaths.length) {
        void Promise.allSettled(
          unpublishedPaths.map((path) => deleteCommunityPostImage(path)),
        );
      }
    },
    [],
  );

  function cleanupUnpublishedComposerMedia() {
    const unpublishedPaths = composerSelectedMedia
      .map((item) => item.path)
      .filter((path) => !composerPublishedMediaPathsRef.current.has(path));

    if (unpublishedPaths.length) {
      void Promise.allSettled(
        unpublishedPaths.map((path) => deleteCommunityPostImage(path)),
      );
    }

    composerPublishedMediaPathsRef.current = new Set();
  }

  function resetComposer() {
    setComposerCircleId(null);
    setComposerPostType(null);
    setComposerTitle("");
    setComposerBody("");
    setComposerWorking(false);
    setComposerAttachedEvent(null);
    setComposerEventPickerEvents([]);
    setComposerEventPickerLoading(false);
    setComposerEventPickerOpen(false);
    setComposerEventPickerQuery("");
    setComposerSelectedMedia([]);
    setComposerUploadingMedia(false);
  }

  function handleOpenComposer() {
    setIsComposerOpen(true);
  }

  function handleCloseComposer() {
    if (composerWorking || composerUploadingMedia) {
      return;
    }

    cleanupUnpublishedComposerMedia();
    setIsComposerOpen(false);
  }

  function handleComposerAfterClose() {
    resetComposer();
    composerPublishedMediaPathsRef.current = new Set();
  }

  function handleChangeComposerCircle(circleId: string) {
    setComposerCircleId((current) => (current === circleId ? null : circleId));
    setComposerEventPickerEvents([]);
    setComposerEventPickerQuery("");
    setComposerEventPickerOpen(false);
  }

  async function handleToggleFollow(userId: string, isFollowing: boolean) {
    setPendingUserId(userId);

    try {
      if (isFollowing) {
        await unfollowMobileUser(userId);
      } else {
        await followMobileUser(userId);
      }

      await loadCommunity("refresh");
    } catch (nextError) {
      Alert.alert(
        isFollowing ? "Disconnect failed" : "Connect failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to update connection status.",
      );
    } finally {
      setPendingUserId((current) => (current === userId ? null : current));
    }
  }

  async function handleToggleCircle(circle: MobileCommunityCircle) {
    setPendingCircleId(circle.id);

    try {
      if (circle.isJoined) {
        await leaveMobileCommunityCircle(circle.id);
      } else {
        await joinMobileCommunityCircle(circle.id);
      }

      await loadCommunity("refresh");
    } catch (nextError) {
      Alert.alert(
        circle.isJoined ? "Leave failed" : "Join failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to update circle membership.",
      );
    } finally {
      setPendingCircleId((current) => (current === circle.id ? null : current));
    }
  }

  async function handlePickComposerImages() {
    if (composerWorking || composerUploadingMedia) {
      return;
    }

    const remainingSlots = MAX_POST_IMAGES - composerSelectedMedia.length;
    if (remainingSlots <= 0) {
      Alert.alert("Image limit reached", `You can attach up to ${MAX_POST_IMAGES} images.`);
      return;
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: true,
        mediaTypes: ["images"],
        orderedSelection: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.86,
        selectionLimit: remainingSlots,
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

    if (result.canceled) {
      return;
    }

    const assets = result.assets
      .filter((asset) => asset.uri && asset.width > 0 && asset.height > 0)
      .slice(0, remainingSlots);

    if (!assets.length) {
      return;
    }

    if (
      assets.some(
        (asset) => asset.width > MAX_POST_IMAGE_EDGE || asset.height > MAX_POST_IMAGE_EDGE,
      )
    ) {
      Alert.alert("Image too large", "Choose images under 8000 pixels wide or tall.");
      return;
    }

    const uploads: CommunityPostImageAttachment[] = [];
    setComposerUploadingMedia(true);
    try {
      for (const asset of assets) {
        const uploaded = await uploadCommunityPostImage({
          fileName: asset.fileName,
          height: asset.height,
          mimeType: asset.mimeType,
          uri: asset.uri,
          width: asset.width,
        });
        uploads.push({ ...uploaded, localUri: asset.uri });
      }
      setComposerSelectedMedia((current) =>
        [...current, ...uploads].slice(0, MAX_POST_IMAGES),
      );
    } catch (nextError) {
      await Promise.allSettled(
        uploads.map((item) => deleteCommunityPostImage(item.path)),
      );
      Alert.alert(
        "Upload failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to upload the selected image.",
      );
    } finally {
      setComposerUploadingMedia(false);
    }
  }

  async function handleRemoveComposerImage(path: string) {
    try {
      await deleteCommunityPostImage(path);
      setComposerSelectedMedia((current) =>
        current.filter((item) => item.path !== path),
      );
    } catch (nextError) {
      Alert.alert(
        "Remove failed",
        nextError instanceof Error
          ? nextError.message
          : "Unable to remove the selected image.",
      );
    }
  }

  async function handleOpenComposerEventPicker() {
    if (composerWorking || composerUploadingMedia) {
      return;
    }

    const circlesToLoad = composerCircle ? [composerCircle] : joinedCircles;
    if (!circlesToLoad.length) {
      Alert.alert("Join a circle", "Join a circle before attaching an event.");
      return;
    }

    setComposerEventPickerQuery("");
    setComposerEventPickerOpen(true);
    setComposerEventPickerLoading(true);

    try {
      const eventMap = new Map<string, ComposerEventOption>();
      const eventDataByCircle = await Promise.all(
        circlesToLoad.map(async (circle) => ({
          circle,
          events: await loadMobileCommunityEvents(circle.slug),
        })),
      );

      eventDataByCircle.forEach(({ circle, events }) => {
        [
          ...events.nextUp,
          ...events.thisMonth,
          ...events.popularWithMembers,
          ...events.past,
        ].forEach((event) => {
          eventMap.set(event.id, {
            ...event,
            circle: {
              id: circle.id,
              name: circle.name,
              slug: circle.slug,
            },
          });
        });
      });
      setComposerEventPickerEvents(Array.from(eventMap.values()));
    } catch (nextError) {
      Alert.alert(
        "Events unavailable",
        nextError instanceof Error
          ? nextError.message
          : "Unable to load events for this circle.",
      );
      setComposerEventPickerOpen(false);
    } finally {
      setComposerEventPickerLoading(false);
    }
  }

  async function handleCreatePost() {
    const body = composerBody.trim();
    const title = composerTitle.trim();

    if (!composerPublishCircle) {
      Alert.alert("Join a circle", "Join a circle before creating a post.");
      return;
    }

    if (!title) {
      Alert.alert("Add a title", "Give your post a title before publishing.");
      return;
    }

    setComposerWorking(true);

    try {
      const media = composerSelectedMedia.map((item) => ({
        path: item.path,
        width: item.width,
        height: item.height,
      }));

      await createMobileCommunityPost({
        circleId: composerPublishCircle.id,
        circleSlug: composerPublishCircle.slug,
        title,
        content: body,
        postType: composerPostType ?? undefined,
        eventId: composerAttachedEvent?.id,
        media,
      });
      media.forEach((item) => {
        composerPublishedMediaPathsRef.current.add(item.path);
      });
      setIsComposerOpen(false);
      await loadCommunity("refresh");
    } catch (nextError) {
      Alert.alert(
        "Post failed",
        nextError instanceof Error ? nextError.message : "Unable to post.",
      );
    } finally {
      setComposerWorking(false);
    }
  }

  return (
    <>
      <MobilePage
        headerHidden
        showAccentGlow={false}
        title="Community"
        onControlsVisibilityChange={setHeaderControlsVisible}
      >
        <View style={styles.contentWrap}>
          {loading && !home ? (
            <ScreenState
              mode="loading"
              title="Loading community"
              description="Pulling rooms, people, and current community activity."
            />
          ) : null}

          {error && !home ? (
            <ScreenState
              mode="error"
              title="Community unavailable"
              description={error}
              action={
                <KureButton
                  disabled={loading}
                  onPress={() => void loadCommunity("initial")}
                >
                  {loading ? "Retrying..." : "Try again"}
                </KureButton>
              }
            />
          ) : null}

          {home ? (
            <>
              {inlineError ? <InlineAlert message={inlineError} /> : null}
              <CommunityHome
                home={home}
                joinedCircles={joinedCircles}
                pendingCircleId={pendingCircleId}
                pendingUserId={pendingUserId}
                onCreatePress={handleOpenComposer}
                onOpenRoom={handleOpenRoom}
                onToggleCircle={handleToggleCircle}
                onToggleFollow={handleToggleFollow}
              />
            </>
          ) : null}
        </View>
        <CommunityRoomSheet
          eventId={roomSheetEventId}
          onClose={() => setRoomSheetEventId(null)}
        />
        <HomeComposerModal
          attachedEvent={composerAttachedEvent}
          body={composerBody}
          circle={composerCircle}
          circles={joinedCircles}
          fallbackCircle={composerFallbackCircle}
          eventPickerEvents={composerEventPickerEvents}
          eventPickerLoading={composerEventPickerLoading}
          eventPickerOpen={composerEventPickerOpen}
          eventPickerQuery={composerEventPickerQuery}
          isWorking={composerWorking}
          isUploadingMedia={composerUploadingMedia}
          media={composerSelectedMedia}
          postType={composerPostType}
          title={composerTitle}
          visible={isComposerOpen}
          onChangeBody={setComposerBody}
          onChangeCircle={handleChangeComposerCircle}
          onChangeEventPickerQuery={setComposerEventPickerQuery}
          onChangePostType={setComposerPostType}
          onChangeTitle={setComposerTitle}
          onClose={handleCloseComposer}
          onAfterClose={handleComposerAfterClose}
          onOpenEventPicker={() => {
            void handleOpenComposerEventPicker();
          }}
          onPickImages={() => {
            void handlePickComposerImages();
          }}
          onRemoveEvent={() => setComposerAttachedEvent(null)}
          onRemoveImage={(path) => {
            void handleRemoveComposerImage(path);
          }}
          onSelectEvent={(event) => {
            setComposerAttachedEvent(event);
            setComposerEventPickerOpen(false);
            setComposerEventPickerQuery("");
          }}
          onSubmit={() => {
            void handleCreatePost();
          }}
        />
      </MobilePage>
      {(!loading || !!home) && headerControlsVisible && (
        <TabMenuOverlay
          rightAccessory={<CommunityCreateButton onCreatePress={handleOpenComposer} />}
        />
      )}
    </>
  );
}

function CommunityHome({
  home,
  joinedCircles,
  onCreatePress,
  onOpenRoom,
  onToggleCircle,
  onToggleFollow,
  pendingCircleId,
  pendingUserId,
}: {
  home: MobileCommunityHome;
  joinedCircles: MobileCommunityCircle[];
  onCreatePress: () => void;
  onOpenRoom: (eventId: string) => void;
  onToggleCircle: (circle: MobileCommunityCircle) => void;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
  pendingCircleId: string | null;
  pendingUserId: string | null;
}) {
  const feed = home.feed ?? [];
  const activeRooms = home.upcomingMoments.slice(0, 3);
  const peopleToMeet = home.peopleToMeet.slice(0, 3);
  const followUps = home.followUpNow.slice(0, 2);

  return (
    <>
      <PostFeedSection
        feed={feed}
        hasJoinedCircles={joinedCircles.length > 0}
        onCreatePress={onCreatePress}
      />

      <CircleShortcutSection
        circles={home.circles ?? []}
        pendingCircleId={pendingCircleId}
        onToggleCircle={onToggleCircle}
      />

      {activeRooms.length > 0 ? (
        <SecondarySectionHeader title="Active rooms" meta={`${activeRooms.length} live`} />
      ) : null}
      {activeRooms.length > 0 ? (
        <RoomList events={activeRooms} onOpenRoom={onOpenRoom} />
      ) : null}

      {peopleToMeet.length > 0 || followUps.length > 0 ? (
        <SecondarySectionHeader
          title="People nearby"
          meta={`${peopleToMeet.length + followUps.length} suggested`}
        />
      ) : null}
      {peopleToMeet.length > 0 ? (
        <View style={styles.stack}>
          {peopleToMeet.map((person) => (
            <CommunityNetworkingPersonCard
              key={person.id}
              isFollowing={person.isInNetwork}
              isPending={pendingUserId === person.id}
              mode="meet"
              person={person}
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onOpenProfile={() => router.push(`/profile/${person.username}`)}
              onToggleFollow={() =>
                onToggleFollow(person.id, person.isInNetwork)
              }
            />
          ))}
        </View>
      ) : null}
      {followUps.length > 0 ? (
        <View style={styles.stack}>
          {followUps.map((person) => (
            <EncounterCard
              key={person.id}
              person={person}
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onOpenProfile={() => router.push(`/profile/${person.username}`)}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}

function CommunityCreateButton({
  onCreatePress,
}: {
  onCreatePress: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onCreatePress}
      style={({ pressed }) => [
        styles.createButton,
        {
          backgroundColor: tokens.colors.pillActive,
          borderRadius: tokens.radius.xs,
        },
        pressed && styles.pressed,
      ]}
    >
      <FontAwesome name="pencil" size={12} color={tokens.colors.pillActiveText} />
      <Text
        style={[
          styles.createButtonText,
          {
            color: tokens.colors.pillActiveText,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        Create
      </Text>
    </Pressable>
  );
}

function PostFeedSection({
  feed,
  hasJoinedCircles,
  onCreatePress,
}: {
  feed: MobileCommunityFeedPost[];
  hasJoinedCircles: boolean;
  onCreatePress: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.feedSection}>
      {feed.length > 0 ? (
        <View style={styles.feedSurface}>
          {feed.map((post, index) => (
            <View
              key={post.id}
              style={[
                styles.feedRow,
                index < feed.length - 1 && {
                  borderBottomColor: tokens.colors.divider,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <CommunityFeedCard
                post={post}
                variant="thread"
                onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
                onPress={() =>
                  router.push({
                    pathname: "/community/[slug]/post/[postId]",
                    params: { slug: post.circle.slug, postId: post.id },
                  })
                }
              />
            </View>
          ))}
        </View>
      ) : (
        <View
          style={[
            styles.emptyFeed,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.sm,
            },
          ]}
        >
          <Text
            style={[
              styles.emptyFeedTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            No community posts yet
          </Text>
          <Text
            style={[
              styles.emptyFeedBody,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {hasJoinedCircles
              ? "Start a thread in one of your circles."
              : "Join a circle to start posting, or browse public circles below."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onCreatePress}
            style={({ pressed }) => [
              styles.emptyFeedAction,
              {
                borderColor: tokens.colors.border,
                borderRadius: tokens.radius.xs,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.emptyFeedActionText,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Create post
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CircleShortcutSection({
  circles,
  onToggleCircle,
  pendingCircleId,
}: {
  circles: MobileCommunityCircle[];
  onToggleCircle: (circle: MobileCommunityCircle) => void;
  pendingCircleId: string | null;
}) {
  const visibleCircles = circles.slice(0, 5);

  if (visibleCircles.length === 0) {
    return null;
  }

  return (
    <>
      <SecondarySectionHeader title="Circles" meta={`${visibleCircles.length} shown`} />
      <View style={styles.stack}>
        {visibleCircles.map((circle) => (
          <CircleCard
            key={circle.id}
            circle={circle}
            isPending={pendingCircleId === circle.id}
            onToggleCircle={onToggleCircle}
          />
        ))}
      </View>
    </>
  );
}

function SecondarySectionHeader({
  meta,
  title,
}: {
  meta?: string;
  title: string;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.secondaryHeader}>
      <Text
        style={[
          styles.secondaryTitle,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {title}
      </Text>
      {meta ? (
        <Text
          style={[
            styles.secondaryMeta,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

function HomeComposerModal({
  attachedEvent,
  body,
  circle,
  circles,
  eventPickerEvents,
  eventPickerLoading,
  eventPickerOpen,
  eventPickerQuery,
  fallbackCircle,
  isWorking,
  isUploadingMedia,
  media,
  onChangeBody,
  onChangeCircle,
  onChangeEventPickerQuery,
  onChangePostType,
  onChangeTitle,
  onAfterClose,
  onClose,
  onOpenEventPicker,
  onPickImages,
  onRemoveEvent,
  onRemoveImage,
  onSelectEvent,
  onSubmit,
  postType,
  title,
  visible,
}: {
  attachedEvent: ComposerEventOption | null;
  body: string;
  circle: MobileCommunityCircle | null;
  circles: MobileCommunityCircle[];
  eventPickerEvents: ComposerEventOption[];
  eventPickerLoading: boolean;
  eventPickerOpen: boolean;
  eventPickerQuery: string;
  fallbackCircle: MobileCommunityCircle | null;
  isWorking: boolean;
  isUploadingMedia: boolean;
  media: CommunityPostImageAttachment[];
  onChangeBody: (value: string) => void;
  onChangeCircle: (circleId: string) => void;
  onChangeEventPickerQuery: (value: string) => void;
  onChangePostType: (value: CommunityPostType | null) => void;
  onChangeTitle: (value: string) => void;
  onAfterClose: () => void;
  onClose: () => void;
  onOpenEventPicker: () => void;
  onPickImages: () => void;
  onRemoveEvent: () => void;
  onRemoveImage: (path: string) => void;
  onSelectEvent: (event: ComposerEventOption) => void;
  onSubmit: () => void;
  postType: CommunityPostType | null;
  title: string;
  visible: boolean;
}) {
  const { tokens } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [initialVisible] = useState(visible);
  const animationProgress = useMemo(() => new Animated.Value(initialVisible ? 1 : 0), [initialVisible]);
  const [shouldRender, setShouldRender] = useState(visible);
  // Derived state: mount immediately when visible becomes true (no effect needed)
  if (visible && !shouldRender) setShouldRender(true);
  const hasOpenedRef = useRef(false);
  const onAfterCloseRef = useRef(onAfterClose);
  const [isPostTypeOpen, setIsPostTypeOpen] = useState(false);
  const effectiveCircle = circle ?? attachedEvent?.circle ?? fallbackCircle;
  const canSubmit = Boolean(
    effectiveCircle && title.trim() && !isWorking && !isUploadingMedia,
  );
  const eventQuery = eventPickerQuery.trim().toLowerCase();
  const filteredEvents = eventQuery
    ? eventPickerEvents.filter((event) =>
        [event.title, event.location, event.format]
          .filter((field): field is string => Boolean(field))
          .some((field) => field.toLowerCase().includes(eventQuery)),
      )
    : eventPickerEvents;
  const scrimOpacity = useMemo(
    () => animationProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    [animationProgress],
  );
  const sheetTranslateY = useMemo(
    () => animationProgress.interpolate({ inputRange: [0, 1], outputRange: [windowHeight, 0] }),
    [animationProgress, windowHeight],
  );

  useEffect(() => {
    onAfterCloseRef.current = onAfterClose;
  }, [onAfterClose]);

  useEffect(() => {
    if (visible) {
      hasOpenedRef.current = true;
      setIsPostTypeOpen(false);
      animationProgress.stopAnimation();

      if (reduceMotion) {
        animationProgress.setValue(1);
        return;
      }

      Animated.timing(animationProgress, {
        toValue: 1,
        duration: DURATIONS.standard,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!shouldRender) {
      return;
    }

    setIsPostTypeOpen(false);
    animationProgress.stopAnimation();

    if (reduceMotion) {
      animationProgress.setValue(0);
      setShouldRender(false);
      if (hasOpenedRef.current) {
        onAfterCloseRef.current();
      }
      return;
    }

    Animated.spring(animationProgress, {
      toValue: 0,
      ...SPRING_CONFIG,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setShouldRender(false);
      if (hasOpenedRef.current) {
        onAfterCloseRef.current();
      }
    });
  }, [animationProgress, reduceMotion, shouldRender, visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      transparent
      visible={shouldRender}
      onRequestClose={onClose}
    >
      <View style={styles.modalScrim}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close composer"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            style={[styles.modalBackdrop, { opacity: scrimOpacity }]}
          />
        </Pressable>
        <Animated.View
          style={[
            styles.composerModal,
            {
              backgroundColor: tokens.colors.surfaceStrong,
              borderColor: tokens.colors.border,
              borderRadius: tokens.radius.lg,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.composerHeader}>
            <Text
              style={[
                styles.composerTitle,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Create post
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose}>
              <FontAwesome
                name="close"
                size={18}
                color={tokens.colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.composerScroll}
            contentContainerStyle={styles.composerScrollContent}
          >
            {circles.length === 0 ? (
              <View
                style={[
                  styles.composerNotice,
                  {
                    backgroundColor: tokens.colors.surfaceMuted,
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.composerNoticeText,
                    {
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  Join a circle before creating a community post.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.composerLabel}>Circle (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.composerChipRow}
                >
                  {circles.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: circle?.id === item.id }}
                      onPress={() => onChangeCircle(item.id)}
                      style={[
                        styles.composerChip,
                        {
                          backgroundColor:
                            circle?.id === item.id
                              ? tokens.colors.pillActive
                              : tokens.colors.surfaceMuted,
                          borderRadius: tokens.radius.xs,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.composerChipText,
                          {
                            color:
                              circle?.id === item.id
                                ? tokens.colors.pillActiveText
                                : tokens.colors.textPrimary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.composerLabel}>Type</Text>
                <View style={styles.postTypeSelectWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select post type"
                    onPress={() => setIsPostTypeOpen((current) => !current)}
                    style={({ pressed }) => [
                      styles.postTypeSelect,
                      {
                        backgroundColor: tokens.colors.surfaceMuted,
                        borderRadius: tokens.radius.xs,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.postTypeSelectLabel,
                        {
                          color: postType
                            ? tokens.colors.textPrimary
                            : tokens.colors.textTertiary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {POST_TYPE_OPTIONS.find((option) => option.value === postType)
                        ?.label ?? "Select type"}
                    </Text>
                    <FontAwesome
                      name={isPostTypeOpen ? "chevron-up" : "chevron-down"}
                      size={11}
                      color={tokens.colors.textSecondary}
                    />
                  </Pressable>
                  {isPostTypeOpen ? (
                    <View
                      style={[
                        styles.postTypeMenu,
                        {
                          backgroundColor: tokens.colors.surfaceMuted,
                          borderColor: tokens.colors.border,
                          borderRadius: tokens.radius.xs,
                        },
                      ]}
                    >
                      {POST_TYPE_OPTIONS.map((option) => {
                        const isSelected = option.value === postType;

                        return (
                          <Pressable
                            key={option.value}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            onPress={() => {
                              onChangePostType(isSelected ? null : option.value);
                              setIsPostTypeOpen(false);
                            }}
                            style={({ pressed }) => [
                              styles.postTypeOption,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.postTypeOptionLabel,
                                {
                                  color: isSelected
                                    ? tokens.colors.accent
                                    : tokens.colors.textPrimary,
                                  fontFamily: tokens.typography.sans,
                                },
                              ]}
                            >
                              {option.label}
                            </Text>
                            {isSelected ? (
                              <FontAwesome
                                name="check"
                                size={11}
                                color={tokens.colors.accent}
                              />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

              <TextInput
                placeholder="Title"
                placeholderTextColor={tokens.colors.textTertiary}
                value={title}
                onChangeText={onChangeTitle}
                style={[
                  styles.composerInput,
                  {
                    borderColor: tokens.colors.border,
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              />
              <TextInput
                multiline
                placeholder="Optional details"
                placeholderTextColor={tokens.colors.textTertiary}
                textAlignVertical="top"
                value={body}
                onChangeText={onChangeBody}
                style={[
                  styles.composerBodyInput,
                  {
                    borderColor: tokens.colors.border,
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              />
              <View style={styles.composerToolbar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isUploadingMedia ? "Uploading image" : "Add image"
                  }
                  disabled={
                    isWorking ||
                    isUploadingMedia ||
                    media.length >= MAX_POST_IMAGES
                  }
                  onPress={onPickImages}
                  style={({ pressed }) => [
                    styles.composerToolButton,
                    {
                      backgroundColor: tokens.colors.surfaceMuted,
                      borderRadius: tokens.radius.xs,
                      opacity:
                        isWorking ||
                        isUploadingMedia ||
                        media.length >= MAX_POST_IMAGES
                          ? 0.48
                          : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <FontAwesome
                    name="image"
                    size={15}
                    color={tokens.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.composerToolLabel,
                      {
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {isUploadingMedia ? "Uploading" : "Image"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    attachedEvent ? "Change attached event" : "Attach event"
                  }
                  disabled={isWorking || isUploadingMedia || !circles.length}
                  onPress={onOpenEventPicker}
                  style={({ pressed }) => [
                    styles.composerToolButton,
                    {
                      backgroundColor: tokens.colors.surfaceMuted,
                      borderRadius: tokens.radius.xs,
                      opacity:
                        isWorking || isUploadingMedia || !circles.length
                          ? 0.48
                          : 1,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <FontAwesome
                    name="calendar-plus-o"
                    size={15}
                    color={tokens.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.composerToolLabel,
                      {
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  >
                    {attachedEvent ? "Change event" : "Event"}
                  </Text>
                </Pressable>
              </View>

              {attachedEvent ? (
                <View style={styles.attachmentPreview}>
                  <CommunityAttachedEventRow
                    event={attachedEvent}
                    variant="selected"
                    onPress={onOpenEventPicker}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={onRemoveEvent}
                    style={({ pressed }) => [
                      styles.attachmentRemoveAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.attachmentRemoveText,
                        {
                          color: tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      Remove event
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {media.length ? (
                <View style={styles.mediaPreviewRow}>
                  {media.map((item) => (
                    <View key={item.path} style={styles.mediaPreviewItem}>
                      <Image
                        source={{ uri: item.localUri }}
                        style={styles.mediaPreviewImage}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onRemoveImage(item.path)}
                        style={({ pressed }) => [
                          styles.mediaRemoveButton,
                          {
                            backgroundColor: tokens.colors.surfaceStrong,
                            borderColor: tokens.colors.border,
                            borderRadius: tokens.radius.xs,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.mediaRemoveLabel,
                            {
                              color: tokens.colors.textPrimary,
                              fontFamily: tokens.typography.sans,
                            },
                          ]}
                        >
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}

              {eventPickerOpen ? (
                <View
                  style={[
                    styles.eventPickerPanel,
                    {
                      backgroundColor: tokens.colors.surfaceMuted,
                      borderColor: tokens.colors.border,
                      borderRadius: tokens.radius.sm,
                    },
                  ]}
                >
                  <TextInput
                    value={eventPickerQuery}
                    onChangeText={onChangeEventPickerQuery}
                    placeholder="Search events"
                    placeholderTextColor={tokens.colors.textTertiary}
                    style={[
                      styles.eventPickerSearch,
                      {
                        borderColor: tokens.colors.border,
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                  />
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    style={styles.eventPickerList}
                  >
                    {eventPickerLoading ? (
                      <Text
                        style={[
                          styles.eventPickerState,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        Loading events...
                      </Text>
                    ) : null}
                    {!eventPickerLoading && !eventPickerEvents.length ? (
                      <Text
                        style={[
                          styles.eventPickerState,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        No linked events are available for this circle.
                      </Text>
                    ) : null}
                    {!eventPickerLoading &&
                    eventPickerEvents.length > 0 &&
                    filteredEvents.length === 0 ? (
                      <Text
                        style={[
                          styles.eventPickerState,
                          {
                            color: tokens.colors.textSecondary,
                            fontFamily: tokens.typography.sans,
                          },
                        ]}
                      >
                        {`No events match "${eventPickerQuery.trim()}".`}
                      </Text>
                    ) : null}
                    {filteredEvents.map((event, index) => (
                      <CommunityAttachedEventRow
                        key={event.id}
                        event={event}
                        variant="picker"
                        showDivider={index < filteredEvents.length - 1}
                        onPress={() => onSelectEvent(event)}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              </>
            )}
          </ScrollView>

          <View style={styles.composerActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              disabled={isWorking || isUploadingMedia}
              style={({ pressed }) => [
                styles.secondaryAction,
                {
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.xs,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.secondaryActionText,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.primaryAction,
                {
                  backgroundColor: tokens.colors.pillActive,
                  borderRadius: tokens.radius.xs,
                  opacity: canSubmit ? 1 : 0.48,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.primaryActionText,
                  {
                    color: tokens.colors.pillActiveText,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {isWorking ? "Posting..." : isUploadingMedia ? "Uploading..." : "Post"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function _CirclesTab({
  circles,
  onToggleCircle,
  pendingCircleId,
}: {
  circles: MobileCommunityCircle[];
  onToggleCircle: (circle: MobileCommunityCircle) => void;
  pendingCircleId: string | null;
}) {
  const joinedCircles = circles.filter((circle) => circle.isJoined);
  const discoverCircles = circles.filter((circle) => !circle.isJoined);

  return (
    <>
      <Text style={styles.helperText}>
        Follow focused groups for event threads, members, and community posts.
      </Text>

      {joinedCircles.length > 0 ? (
        <>
          <SectionTitle title="Your Circles" />
          <View style={styles.stack}>
            {joinedCircles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                isPending={pendingCircleId === circle.id}
                onToggleCircle={onToggleCircle}
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle
        title={joinedCircles.length > 0 ? "Discover" : "Discover Circles"}
      />
      {discoverCircles.length > 0 ? (
        <View style={styles.stack}>
          {discoverCircles.map((circle) => (
            <CircleCard
              key={circle.id}
              circle={circle}
              isPending={pendingCircleId === circle.id}
              onToggleCircle={onToggleCircle}
            />
          ))}
        </View>
      ) : joinedCircles.length > 0 ? (
        <SectionEmptyNote title="You have joined every circle available right now" />
      ) : (
        <SectionEmptyNote title="No circles available yet" />
      )}
    </>
  );
}

function CircleCard({
  circle,
  isPending,
  onToggleCircle,
}: {
  circle: MobileCommunityCircle;
  isPending: boolean;
  onToggleCircle: (circle: MobileCommunityCircle) => void;
}) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const actionLabel = isPending
    ? "Saving..."
    : circle.isJoined
      ? "Leave"
      : "Join";

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={[
          styles.circleCard,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.md,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${circle.name}`}
          onPress={() => router.push(`/community/${circle.slug}`)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.circleMainPressable}
        >
          <View
            style={[
              styles.circleIcon,
              {
                backgroundColor: tokens.colors.surfaceMuted,
                borderRadius: tokens.radius.sm,
              },
            ]}
          >
            <FontAwesome
              name={circle.isJoined ? "check-circle" : "circle-o"}
              size={18}
              color={
                circle.isJoined
                  ? tokens.colors.accent
                  : tokens.colors.textTertiary
              }
            />
          </View>
          <View style={styles.circleCopy}>
            <Text
              numberOfLines={1}
              style={[
                styles.cardTitle,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {circle.name}
            </Text>
            <Text
              numberOfLines={2}
              style={[
                styles.cardMeta,
                {
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {circle.description || "A community circle"} ·{" "}
              {formatCommunityTabCount(circle.memberCount)} members
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isPending}
          onPress={() => onToggleCircle(circle)}
          style={({ pressed }) => [
            styles.circleAction,
            {
              backgroundColor: circle.isJoined
                ? tokens.colors.surfaceMuted
                : tokens.colors.pillActive,
              borderRadius: tokens.radius.xs,
              opacity: isPending ? 0.65 : 1,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.circleActionText,
              {
                color: circle.isJoined
                  ? tokens.colors.textPrimary
                  : tokens.colors.pillActiveText,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function _RoomsTab({
  activeRooms,
  followUps,
  lens,
  onChangeLens,
  onOpenRoom,
}: {
  activeRooms: MobileCommunityNetworkingEvent[];
  followUps: MobileCommunityNetworkingFollowUpCard[];
  lens: RoomLens;
  onChangeLens: (lens: RoomLens) => void;
  onOpenRoom: (eventId: string) => void;
}) {
  const pastFollowUp = followUps[0];
  const pastEvent = pastFollowUp ? getPrimaryEvent(pastFollowUp) : null;

  return (
    <>
      <LensRail
        activeId={lens}
        items={ROOM_LENSES}
        onSelect={(id) => onChangeLens(id as RoomLens)}
      />
      <Text style={styles.helperText}>
        Rooms open around events you track, attend, or match with.
      </Text>

      {lens === "past" ? (
        pastEvent ? (
          <PastRoomCard event={pastEvent} person={pastFollowUp} />
        ) : (
          <SectionEmptyNote title="No past rooms with follow-up yet" />
        )
      ) : activeRooms.length > 0 ? (
        <RoomList events={activeRooms} onOpenRoom={onOpenRoom} />
      ) : (
        <SectionEmptyNote title="No rooms in this view yet" />
      )}
    </>
  );
}

function RoomList({
  events,
  onOpenRoom,
}: {
  events: MobileCommunityNetworkingEvent[];
  onOpenRoom: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.roomList,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      {events.map((event, index) => (
        <RoomRow
          key={event.id}
          event={event}
          isLast={index === events.length - 1}
          onOpenRoom={onOpenRoom}
        />
      ))}
    </View>
  );
}

function RoomRow({
  event,
  isLast,
  onOpenRoom,
}: {
  event: MobileCommunityNetworkingEvent;
  isLast: boolean;
  onOpenRoom: (eventId: string) => void;
}) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress();
  const isWarm =
    event.viewerContext === "attending" || event.visibleAttendeeCount > 0;
  const meta = getRoomCompactMeta(event);

  return (
    <Pressable
      accessibilityLabel={`Open room for ${event.title}`}
      accessibilityRole="button"
      onPress={() => onOpenRoom(event.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        !isLast && {
          borderBottomWidth: 1,
          borderBottomColor: tokens.colors.divider,
        },
      ]}
    >
      <Animated.View
        style={[styles.roomRow, { transform: [{ scale }] }]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.roomRowTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event.title}
        </Text>
        <View style={styles.roomRowMeta}>
          <View
            style={[
              styles.roomStatusDot,
              {
                backgroundColor: isWarm
                  ? tokens.colors.accent
                  : tokens.colors.textTertiary,
              },
            ]}
          />
          <Text
            style={[
              styles.roomRowMetaText,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {meta}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function _PeopleTab({
  followUps,
  home,
  lens,
  onChangeLens,
  onToggleFollow,
  pendingUserId,
  peopleToMeet,
}: {
  followUps: MobileCommunityNetworkingFollowUpCard[];
  home: MobileCommunityHome;
  lens: PeopleLens;
  onChangeLens: (lens: PeopleLens) => void;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
  pendingUserId: string | null;
  peopleToMeet: MobileCommunityNetworkingPersonCard[];
}) {
  const speakers = home.speakerMatches ?? [];

  return (
    <>
      <LensRail
        activeId={lens}
        items={PEOPLE_LENSES}
        onSelect={(id) => onChangeLens(id as PeopleLens)}
      />

      <SectionTitle title="People Around Your Events" />
      {peopleToMeet.length > 0 ? (
        <View style={styles.stack}>
          {peopleToMeet.slice(0, 5).map((person) => (
            <CommunityNetworkingPersonCard
              key={person.id}
              isFollowing={person.isInNetwork}
              isPending={pendingUserId === person.id}
              mode="meet"
              person={person}
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onOpenProfile={() => router.push(`/profile/${person.username}`)}
              onToggleFollow={() =>
                onToggleFollow(person.id, person.isInNetwork)
              }
            />
          ))}
        </View>
      ) : (
        <SectionEmptyNote title="No event-based people in this view yet" />
      )}

      {speakers.length > 0 ? (
        <>
          <SectionTitle title="Speakers Worth Knowing" />
          <View style={styles.stack}>
            {speakers.slice(0, 3).map((match, index) => (
              <CommunityNetworkingSpeakerCard
                key={`${match.speaker.id}:${match.event.id}`}
                eventTitle={match.event.title}
                isPastEvent={match.isPastEvent}
                matchIndex={index}
                matchReason={match.matchReason}
                speaker={match.speaker}
                onOpenSpeaker={() =>
                  router.push({
                    pathname: "/speaker/[id]",
                    params: {
                      id: match.speaker.id,
                      eventId: match.event.id,
                      eventTitle: match.event.title,
                    },
                  })
                }
              />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle title="Recent Encounters" />
      {followUps.length > 0 ? (
        <View style={styles.stack}>
          {followUps.slice(0, 4).map((person) => (
            <EncounterCard
              key={person.id}
              person={person}
              onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
              onOpenProfile={() => router.push(`/profile/${person.username}`)}
            />
          ))}
        </View>
      ) : (
        <SectionEmptyNote title="No recent encounters yet" />
      )}
    </>
  );
}

function EncounterCard({
  onOpenEvent,
  onOpenProfile,
  person,
}: {
  onOpenEvent: (eventId: string) => void;
  onOpenProfile: () => void;
  person: MobileCommunityNetworkingFollowUpCard;
}) {
  const { tokens } = useAppTheme();
  const event = getPrimaryEvent(person);
  const displayName = getDisplayName(person);

  return (
    <View
      style={[
        styles.encounterCard,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <AvatarImage avatarUrl={person.avatarUrl} name={displayName} size={48} />
      <View style={styles.encounterCopy}>
        <Text
          style={[
            styles.activityTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          You crossed paths with {displayName}
        </Text>
        <Text
          style={[
            styles.cardMeta,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {event
            ? `${event.title} · ${formatShortRelativeTime(event.startTime)}`
            : person.whyNow}
        </Text>
        <View style={styles.encounterActions}>
          <Pressable accessibilityRole="button" onPress={onOpenProfile}>
            <Text
              style={[
                styles.inlineAction,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Send follow-up
            </Text>
          </Pressable>
          {event ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenEvent(event.id)}
            >
              <Text
                style={[
                  styles.inlineAction,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                Open recap
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PastRoomCard({
  event,
  person,
}: {
  event: MobileCommunityNetworkingSharedEvent;
  person: MobileCommunityNetworkingFollowUpCard;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.roomList,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
          padding: 12,
          gap: 8,
        },
      ]}
    >
      <Text
        style={[
          styles.cardTitle,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {event.title}
      </Text>
      <Text
        style={[
          styles.cardMeta,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {formatShortRelativeTime(event.startTime)} · follow-up available
      </Text>
      <Text style={[styles.helperText, { paddingHorizontal: 0 }]}>
        Follow up with {getDisplayName(person)} while the context is still warm.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/event/${event.id}`)}
        style={({ pressed }) => [
          styles.primaryAction,
          {
            backgroundColor: tokens.colors.surfaceMuted,
            borderRadius: tokens.radius.sm,
          },
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.primaryActionText,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          Open Recap
        </Text>
      </Pressable>
    </View>
  );
}

function AvatarImage({
  avatarUrl,
  name,
  size,
}: {
  avatarUrl: string | null;
  name: string;
  size: number;
}) {
  const { tokens } = useAppTheme();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tokens.colors.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontWeight: "800",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

function LensRail({
  activeId,
  items,
  onSelect,
}: {
  activeId: string;
  items: Array<{ id: string; label: string }>;
  onSelect: (id: string) => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.lensRow}
    >
      {items.map((item) => (
        <LensChip
          key={item.id}
          isActive={activeId === item.id}
          item={item}
          tokens={tokens}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </ScrollView>
  );
}

function LensChip({
  isActive,
  item,
  onPress,
  tokens,
}: {
  isActive: boolean;
  item: { id: string; label: string };
  onPress: () => void;
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  const { scale, onPressIn, onPressOut } = useScalePress();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={[
          styles.lensChip,
          {
            backgroundColor: isActive
              ? tokens.colors.pillActive
              : tokens.colors.surfaceMuted,
            borderRadius: tokens.radius.xs,
          },
          { transform: [{ scale }] },
        ]}
      >
        <Text
          style={{
            color: isActive
              ? tokens.colors.pillActiveText
              : tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { tokens } = useAppTheme();

  return (
    <Text
      style={[
        styles.sectionTitle,
        {
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
        },
      ]}
    >
      {title}
    </Text>
  );
}

function SectionEmptyNote({ title }: { title: string }) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.emptyNote,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <Text
        style={[
          styles.emptyText,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

function InlineAlert({ message }: { message: string }) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.inlineAlert,
        {
          backgroundColor: tokens.colors.surfaceMuted,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      <FontAwesome name="warning" size={13} color={tokens.colors.warning} />
      <Text
        style={[
          styles.inlineAlertText,
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

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  cardMeta: {
    color: "#908f9e",
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  composerActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
  },
  composerBodyInput: {
    borderWidth: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    minHeight: 112,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerChip: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  composerChipRow: {
    gap: 6,
    paddingRight: 12,
  },
  composerChipText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  composerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  composerInput: {
    borderWidth: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerLabel: {
    color: "#908f9e",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  composerModal: {
    borderWidth: 1,
    gap: 10,
    maxHeight: "88%",
    padding: 12,
    width: "100%",
    maxWidth: 430,
  },
  composerNotice: {
    borderWidth: 1,
    padding: 10,
  },
  composerNoticeText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  composerScroll: {
    flexShrink: 1,
  },
  composerScrollContent: {
    gap: 10,
  },
  composerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  composerToolbar: {
    flexDirection: "row",
    gap: 8,
  },
  composerToolButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  composerToolLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  attachmentPreview: {
    gap: 8,
  },
  attachmentRemoveAction: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  attachmentRemoveText: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  circleAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    minWidth: 62,
    paddingHorizontal: 12,
  },
  circleActionText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  circleCard: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  circleCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  circleIcon: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  circleMainPressable: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    gap: 10,
    marginTop: 44,
    paddingBottom: 24,
  },
  createButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  emptyFeed: {
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  emptyFeedAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  emptyFeedActionText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  emptyFeedBody: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  emptyFeedTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  emptyNote: {
    borderWidth: 1,
    padding: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  eventPickerList: {
    maxHeight: 220,
  },
  eventPickerPanel: {
    borderWidth: 1,
    gap: 8,
    padding: 8,
  },
  eventPickerSearch: {
    borderWidth: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  eventPickerState: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    paddingVertical: 8,
  },
  encounterActions: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },
  encounterCard: {
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  encounterCopy: {
    flex: 1,
    gap: 6,
  },
  feedRow: {
    paddingVertical: 2,
  },
  feedSection: {
    gap: 8,
  },
  feedSurface: {
    backgroundColor: "transparent",
  },
  helperText: {
    color: "#6B7280",
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "500",
    lineHeight: 20,
    paddingHorizontal: 2,
  },
  inlineAction: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  inlineAlert: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  lensChip: {
    minHeight: 30,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  lensRow: {
    gap: 6,
    paddingRight: 12,
  },
  pressed: {
    opacity: 0.82,
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    flex: 1,
  },
  mediaPreviewImage: {
    aspectRatio: 1,
    width: "100%",
  },
  mediaPreviewItem: {
    borderRadius: 4,
    flexBasis: "48%",
    overflow: "hidden",
    position: "relative",
  },
  mediaPreviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaRemoveButton: {
    borderWidth: 1,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    right: 6,
  },
  mediaRemoveLabel: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  postTypeMenu: {
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
  },
  postTypeOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  postTypeOptionLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  postTypeSelect: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 36,
    paddingHorizontal: 10,
  },
  postTypeSelectLabel: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  postTypeSelectWrap: {
    gap: 0,
  },
  primaryAction: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  roomList: {
    borderWidth: 1,
    overflow: "hidden",
  },
  roomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roomRowMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    flexShrink: 0,
  },
  roomRowMetaText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  roomRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  roomStatusDot: {
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  secondaryAction: {
    alignItems: "center",
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  secondaryMeta: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  secondaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.9,
    lineHeight: 16,
    paddingTop: 6,
  },
  stack: {
    gap: 8,
  },
});

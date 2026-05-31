import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  CommunityPostType,
  MobileCommunityCirclePage,
  MobileCommunityEventCard,
  MobileCommunityMentionCandidate,
  MobileCommunityUpcomingEvent,
  MobileEventCard,
} from '@kurecal/domain';

import { CommunityFeedCard } from '../../src/components/CommunityFeedCard';
import { DiscoverEventCard } from '../../src/components/discover/DiscoverEventCard';
import { EventSummaryCard } from '../../src/components/EventSummaryCard';
import { ScreenStateView } from '../../src/components/ScreenStateView';
import {
  countCommunityComments,
} from '../../src/lib/communityPresentation';
import {
  createMobileCommunityPost,
  deleteCommunityPostImage,
  joinMobileCommunityCircle,
  leaveMobileCommunityCircle,
  loadMobileCommunityCircle,
  loadMobileCommunityEvents,
  loadMobileCommunityMentionSuggestions,
  uploadCommunityPostImage,
  type CommunityPostImageUploadResult,
} from '../../src/lib/mobileApi';

const MENTION_TRIGGER_PATTERN = /(^|[\s\n])@([A-Za-z0-9_.-]{1,30})$/;
const MENTION_TOKEN_PATTERN = /(^|[^A-Za-z0-9_.-])@([A-Za-z0-9_][A-Za-z0-9_.-]*)(?=$|[^A-Za-z0-9_.-])/g;
const MAX_POST_IMAGES = 4;
const MAX_POST_IMAGE_EDGE = 8_000;
const POST_TYPE_OPTIONS: Array<{ label: string; value: CommunityPostType }> = [
  { label: 'Update', value: 'update' },
  { label: 'Question', value: 'question' },
  { label: 'Intro', value: 'intro' },
  { label: 'Showcase', value: 'showcase' },
  { label: 'Event note', value: 'event_note' },
  { label: 'Announcement', value: 'announcement' },
];
const design = {
  accent: '#bdc2ff',
  accentText: '#121f8b',
  background: '#121314',
  border: '#454652',
  danger: '#ffb4ab',
  muted: '#908f9e',
  surface: '#1b1c1d',
  surfaceHigh: '#292a2b',
  surfaceLowest: '#0d0e0f',
  text: '#e3e2e3',
  textVariant: '#c6c5d5',
};

function toDiscoverEventCard(event: MobileCommunityUpcomingEvent): MobileEventCard {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    startTime: event.startTime,
    location: event.location,
    format: null,
    imageUrl: null,
    organizerLogoUrl: event.organizerLogoUrl ?? null,
    organizerName: event.location,
  };
}

interface CommunityPostImageAttachment extends CommunityPostImageUploadResult {
  localUri: string;
}

function mentionUserIdsInDraft(
  content: string,
  mentions: MobileCommunityMentionCandidate[]
): string[] {
  const usernameToMention = new Map(
    mentions.map((mention) => [mention.username.toLowerCase(), mention])
  );
  const userIds = new Set<string>();

  for (const match of content.matchAll(MENTION_TOKEN_PATTERN)) {
    const username = match[2]?.toLowerCase();
    const mention = username ? usernameToMention.get(username) : null;
    if (mention) {
      userIds.add(mention.id);
    }
  }

  return Array.from(userIds);
}

export default function CommunityCircleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const circleSlug = Array.isArray(slug) ? slug[0] : slug;
  const [data, setData] = useState<MobileCommunityCirclePage | null>(null);
  const [draft, setDraft] = useState('');
  const [postType, setPostType] = useState<CommunityPostType>('update');
  const [attachedEvent, setAttachedEvent] =
    useState<MobileCommunityEventCard | null>(null);
  const [eventPickerEvents, setEventPickerEvents] = useState<MobileCommunityEventCard[]>([]);
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [eventPickerLoading, setEventPickerLoading] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<
    MobileCommunityMentionCandidate[]
  >([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<
    MobileCommunityMentionCandidate[]
  >([]);
  const [selectedMedia, setSelectedMedia] = useState<CommunityPostImageAttachment[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const selectedMediaRef = useRef<CommunityPostImageAttachment[]>([]);
  const publishedMediaPathsRef = useRef<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const mentionSearchIdRef = useRef(0);

  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  useEffect(
    () => () => {
      const unpublishedPaths = selectedMediaRef.current
        .map((item) => item.path)
        .filter((path) => !publishedMediaPathsRef.current.has(path));
      if (unpublishedPaths.length) {
        void Promise.allSettled(
          unpublishedPaths.map((path) => deleteCommunityPostImage(path))
        );
      }
    },
    []
  );

  const loadCircle = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!circleSlug) {
        setError('Circle slug is missing');
        setLoading(false);
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const nextData = await loadMobileCommunityCircle(circleSlug);
        setData(nextData);
        setError(null);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load circle'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [circleSlug]
  );

  useFocusEffect(
    useCallback(() => {
      void loadCircle();
    }, [loadCircle])
  );

  async function handleToggleMembership() {
    if (!data || working) {
      return;
    }

    setWorking(true);

    try {
      if (data.isJoined) {
        await leaveMobileCommunityCircle(data.circle.id);
      } else {
        await joinMobileCommunityCircle(data.circle.id);
      }

      await loadCircle('refresh');
    } catch (nextError) {
      Alert.alert(
        data.isJoined ? 'Leave failed' : 'Join failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update membership.'
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleCreatePost() {
    if (
      !data ||
      (!draft.trim() && !attachedEvent && selectedMedia.length === 0) ||
      working ||
      uploadingMedia
    ) {
      return;
    }

    setWorking(true);

    try {
      const media = selectedMedia.map((item) => ({
        path: item.path,
        width: item.width,
        height: item.height,
      }));

      await createMobileCommunityPost({
        circleId: data.circle.id,
        circleSlug: data.circle.slug,
        content: draft,
        postType,
        eventId: attachedEvent?.id,
        mentions: mentionUserIdsInDraft(draft, selectedMentions).map((userId) => ({
          userId,
        })),
        media,
      });
      media.forEach((item) => {
        publishedMediaPathsRef.current.add(item.path);
      });
      setDraft('');
      setPostType('update');
      setAttachedEvent(null);
      setSelectedMedia([]);
      setSelectedMentions([]);
      setMentionSuggestions([]);
      void loadCircle('refresh');
    } catch (nextError) {
      Alert.alert(
        'Post failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to publish post.'
      );
    } finally {
      setWorking(false);
    }
  }

  function handleDraftChange(nextDraft: string) {
    setDraft(nextDraft);

    const match = nextDraft.match(MENTION_TRIGGER_PATTERN);
    const token = match?.[2] ?? '';
    if (!token) {
      mentionSearchIdRef.current += 1;
      setMentionSuggestions([]);
      setMentionLoading(false);
      return;
    }

    const searchId = mentionSearchIdRef.current + 1;
    mentionSearchIdRef.current = searchId;
    setMentionLoading(true);
    void loadMobileCommunityMentionSuggestions(token)
      .then((suggestions) => {
        if (mentionSearchIdRef.current === searchId) {
          setMentionSuggestions(suggestions);
        }
      })
      .catch(() => {
        if (mentionSearchIdRef.current === searchId) {
          setMentionSuggestions([]);
        }
      })
      .finally(() => {
        if (mentionSearchIdRef.current === searchId) {
          setMentionLoading(false);
        }
      });
  }

  function handleSelectMention(mention: MobileCommunityMentionCandidate) {
    const match = draft.match(MENTION_TRIGGER_PATTERN);
    if (!match || match.index === undefined) {
      return;
    }

    const leading = match[1] ?? '';
    const nextDraft = `${draft.slice(0, match.index)}${leading}@${mention.username} `;
    setDraft(nextDraft);
    setMentionSuggestions([]);
    setMentionLoading(false);
    setSelectedMentions((current) => {
      if (current.some((item) => item.id === mention.id)) {
        return current;
      }
      return [...current, mention];
    });
  }

  async function handleRemoveImage(path: string) {
    try {
      await deleteCommunityPostImage(path);
      setSelectedMedia((current) => current.filter((media) => media.path !== path));
    } catch (nextError) {
      Alert.alert(
        'Remove failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to remove the selected image.'
      );
    }
  }

  async function handlePickImages() {
    if (working || uploadingMedia) {
      return;
    }

    const remainingSlots = MAX_POST_IMAGES - selectedMedia.length;
    if (remainingSlots <= 0) {
      Alert.alert('Image limit reached', `You can attach up to ${MAX_POST_IMAGES} images.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos unavailable', 'Allow photo access to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      orderedSelection: true,
      quality: 0.86,
      selectionLimit: remainingSlots,
    });

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
        (asset) => asset.width > MAX_POST_IMAGE_EDGE || asset.height > MAX_POST_IMAGE_EDGE
      )
    ) {
      Alert.alert('Image too large', 'Choose images under 8000 pixels wide or tall.');
      return;
    }

    const uploads: CommunityPostImageAttachment[] = [];
    setUploadingMedia(true);
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
      setSelectedMedia((current) => [...current, ...uploads].slice(0, MAX_POST_IMAGES));
    } catch (nextError) {
      await Promise.allSettled(
        uploads.map((item) => deleteCommunityPostImage(item.path))
      );
      Alert.alert(
        'Upload failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to upload the selected image.'
      );
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleOpenEventPicker() {
    if (!data || working) {
      return;
    }

    setIsEventPickerOpen(true);
    setEventPickerLoading(true);

    try {
      const eventData = await loadMobileCommunityEvents(data.circle.slug);
      const eventMap = new Map<string, MobileCommunityEventCard>();
      [
        ...eventData.nextUp,
        ...eventData.thisMonth,
        ...eventData.popularWithMembers,
        ...eventData.past,
      ].forEach((event) => {
        eventMap.set(event.id, event);
      });
      setEventPickerEvents(Array.from(eventMap.values()));
    } catch (nextError) {
      Alert.alert(
        'Events unavailable',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load events for this circle.'
      );
      setIsEventPickerOpen(false);
    } finally {
      setEventPickerLoading(false);
    }
  }

  if (loading && !data) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="loading"
              title="Loading circle"
              description="Pulling the latest posts, members, and upcoming moments."
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.stateWrap}>
            <ScreenStateView
              mode="error"
              title="Circle unavailable"
              description={error}
              onRetry={() => {
                void loadCircle();
              }}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const header = data?.header ?? {
    eyebrow: 'Circle',
    title: 'Community circle',
    subtitle: 'Discussion room',
  };
  const canPublish = Boolean(draft.trim() || attachedEvent || selectedMedia.length);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadCircle('refresh');
              }}
              tintColor={design.accent}
            />
          }
        >
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <View style={styles.heroCard}>
            <View style={styles.hero}>
              <View style={styles.heroTitleRow}>
                <View style={styles.heroCopy}>
                  <Text style={styles.eyebrow}>{header.eyebrow}</Text>
                  <Text style={styles.title}>{header.title}</Text>
                </View>
                <Text style={styles.membershipChip}>
                  {data?.isJoined ? 'Joined' : 'Discover'}
                </Text>
              </View>
              {header.subtitle ? (
                <Text style={styles.subtitle}>{header.subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => {
                void handleToggleMembership();
              }}
              style={({ pressed }) => [
                styles.primaryAction,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <Text style={styles.primaryActionLabel}>
                {working
                  ? 'Working...'
                  : data?.isJoined
                    ? 'Leave circle'
                    : 'Join circle'}
              </Text>
            </Pressable>
          </View>

          {data?.isJoined ? (
            <View style={styles.composerCard}>
              <View style={styles.postTypeRail}>
                {POST_TYPE_OPTIONS.map((option) => {
                  const isSelected = option.value === postType;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setPostType(option.value)}
                      style={({ pressed }) => [
                        styles.postTypeChip,
                        isSelected ? styles.postTypeChipSelected : null,
                        pressed ? styles.cardPressed : null,
                      ]}
                      accessibilityLabel={`Set thread type to ${option.label}`}
                    >
                      <Text
                        style={[
                          styles.postTypeChipLabel,
                          isSelected ? styles.postTypeChipLabelSelected : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.editorShell}>
                <View style={styles.editorToolbar}>
                  <Pressable
                    onPress={() => {
                      void handlePickImages();
                    }}
                    style={({ pressed }) => [
                      styles.editorToolButton,
                      pressed ? styles.cardPressed : null,
                    ]}
                    disabled={
                      working ||
                      uploadingMedia ||
                      selectedMedia.length >= MAX_POST_IMAGES
                    }
                    accessibilityLabel={uploadingMedia ? 'Uploading image' : 'Add image'}
                  >
                    <FontAwesome name="image" size={18} color={design.textVariant} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void handleOpenEventPicker();
                    }}
                    style={({ pressed }) => [
                      styles.editorToolButton,
                      pressed ? styles.cardPressed : null,
                    ]}
                    disabled={working || uploadingMedia}
                    accessibilityLabel={
                      attachedEvent ? 'Change attached event' : 'Attach event'
                    }
                  >
                    <FontAwesome
                      name="calendar-plus-o"
                      size={18}
                      color={design.textVariant}
                    />
                  </Pressable>
                  <View style={styles.editorDivider} />
                  <View style={styles.editorToolButton}>
                    <Text style={styles.editorToolGlyph}>@</Text>
                  </View>
                  <View style={styles.editorToolButton}>
                    <FontAwesome name="link" size={17} color={design.textVariant} />
                  </View>
                </View>
                <TextInput
                  multiline
                  value={draft}
                  onChangeText={handleDraftChange}
                  placeholder="Body text (optional)"
                  placeholderTextColor={design.textVariant}
                  style={styles.input}
                />
              </View>
              {mentionSuggestions.length || mentionLoading ? (
                <View style={styles.mentionMenu}>
                  {mentionLoading ? (
                    <Text style={styles.mentionState}>Searching...</Text>
                  ) : null}
                  {mentionSuggestions.map((mention) => (
                    <Pressable
                      key={mention.id}
                      onPress={() => handleSelectMention(mention)}
                      style={({ pressed }) => [
                        styles.mentionRow,
                        pressed ? styles.cardPressed : null,
                      ]}
                    >
                      <View style={styles.mentionAvatar}>
                        <Text style={styles.mentionAvatarLabel}>
                          {(mention.fullName || mention.username).slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.mentionTextWrap}>
                        <Text style={styles.mentionName}>
                          {mention.fullName || `@${mention.username}`}
                        </Text>
                        <Text style={styles.mentionUsername}>@{mention.username}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {attachedEvent ? (
                <View style={styles.attachmentPreview}>
                  <EventSummaryCard
                    event={{
                      id: attachedEvent.id,
                      slug: attachedEvent.slug,
                      title: attachedEvent.title,
                      startTime: attachedEvent.startTime,
                      location: attachedEvent.location,
                      formatLabel: attachedEvent.format,
                    }}
                    tone="highlight"
                  />
                  <Pressable
                    onPress={() => setAttachedEvent(null)}
                    style={({ pressed }) => [
                      styles.attachmentRemoveAction,
                      pressed ? styles.cardPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryActionLabel}>Remove event</Text>
                  </Pressable>
                </View>
              ) : null}
              {selectedMedia.length ? (
                <View style={styles.mediaPreviewRow}>
                  {selectedMedia.map((item) => (
                    <View key={item.path} style={styles.mediaPreviewItem}>
                      <Image source={{ uri: item.localUri }} style={styles.mediaPreviewImage} />
                      <Pressable
                        onPress={() => {
                          void handleRemoveImage(item.path);
                        }}
                        style={({ pressed }) => [
                          styles.mediaRemoveButton,
                          pressed ? styles.cardPressed : null,
                        ]}
                      >
                        <Text style={styles.mediaRemoveLabel}>Remove</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.composerFooter}>
                <Pressable
                  onPress={() => {
                    void handleCreatePost();
                  }}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    styles.publishAction,
                    (!canPublish || working || uploadingMedia) ? styles.disabledAction : null,
                    pressed ? styles.cardPressed : null,
                  ]}
                  disabled={!canPublish || working || uploadingMedia}
                >
                  <Text style={[styles.primaryActionLabel, styles.publishActionLabel]}>
                    {working ? 'Publishing...' : uploadingMedia ? 'Uploading...' : 'Publish'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <ScreenStateView
              mode="empty"
              title="Join to post"
              description="You can browse the circle now. Join it to start threads and reply."
            />
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Latest Threads</Text>
            </View>

            {data?.posts.length ? (
              <View style={styles.listSurface}>
                {data.posts.map((post) => (
                  <CommunityFeedCard
                    key={post.id}
                    showCircle={false}
                    post={{
                      id: post.id,
                      content: post.content,
                      createdAt: post.createdAt,
                      author: post.author,
                      circle: {
                        slug: data.circle.slug,
                        name: data.circle.name,
                      },
                      commentCount: countCommunityComments(post.comments),
                      isTrending: countCommunityComments(post.comments) >= 8,
                      postType: post.postType,
                      eventId: post.eventId,
                      event: post.event,
                      mentions: post.mentions,
                      media: post.media,
                      linkPreviews: post.linkPreviews,
                    }}
                    onPress={() =>
                      router.push({
                        pathname: '/community/[slug]/post/[postId]',
                        params: { slug: data.circle.slug, postId: post.id },
                      })
                    }
                    variant="row"
                  />
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No discussions yet"
                description="Be the first member to start a conversation in this circle."
              />
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Related Events</Text>
            </View>

            {data?.upcomingEvents.length ? (
              <View style={styles.listSurface}>
                {data.upcomingEvents.map((event, index) => (
                  <DiscoverEventCard
                    key={event.id}
                    event={toDiscoverEventCard(event)}
                    showDivider={index < data.upcomingEvents.length - 1}
                    onPress={() =>
                      router.push({
                        pathname: '../../event/[id]',
                        params: { id: event.id },
                      })
                    }
                  />
                ))}
              </View>
            ) : (
              <ScreenStateView
                mode="empty"
                title="No upcoming circle moments"
                description="As matching events appear, they will show up here."
              />
            )}
          </View>

          <Modal
            animationType="slide"
            transparent
            visible={isEventPickerOpen}
            onRequestClose={() => setIsEventPickerOpen(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalSheet}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>Attach event</Text>
                  <Text style={styles.sectionTitle}>Related events</Text>
                </View>
                <ScrollView style={styles.eventPickerList}>
                  {eventPickerLoading ? (
                    <Text style={styles.eventPickerState}>Loading events...</Text>
                  ) : null}
                  {!eventPickerLoading && !eventPickerEvents.length ? (
                    <Text style={styles.eventPickerState}>
                      No linked events are available for this circle.
                    </Text>
                  ) : null}
                  {eventPickerEvents.map((event) => (
                    <Pressable
                      key={event.id}
                      onPress={() => {
                        setAttachedEvent(event);
                        setIsEventPickerOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.eventPickerItem,
                        pressed ? styles.cardPressed : null,
                      ]}
                    >
                      <EventSummaryCard
                        event={{
                          id: event.id,
                          slug: event.slug,
                          title: event.title,
                          startTime: event.startTime,
                          location: event.location,
                          formatLabel: event.format,
                        }}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={() => setIsEventPickerOpen(false)}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    pressed ? styles.cardPressed : null,
                  ]}
                >
                  <Text style={styles.primaryActionLabel}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 72,
    paddingHorizontal: 14,
  },
  attachmentPreview: {
    gap: 8,
  },
  attachmentRemoveAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 10,
  },
  backLabel: {
    color: design.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardPressed: {
    opacity: 0.84,
  },
  composerCard: {
    backgroundColor: design.background,
    borderBottomColor: design.border,
    borderBottomWidth: 1,
    borderTopColor: design.border,
    borderTopWidth: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  composerFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  content: {
    paddingBottom: 24,
  },
  disabledAction: {
    opacity: 0.5,
  },
  editorDivider: {
    backgroundColor: design.border,
    height: 20,
    width: 1,
  },
  editorShell: {
    backgroundColor: design.surfaceLowest,
    borderColor: design.border,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 152,
    overflow: 'hidden',
  },
  editorToolButton: {
    alignItems: 'center',
    borderRadius: 4,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  editorToolGlyph: {
    color: design.textVariant,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  editorToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  eyebrow: {
    color: design.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  screen: {
    backgroundColor: design.background,
    flex: 1,
  },
  hero: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: design.background,
    borderBottomColor: design.border,
    borderBottomWidth: 1,
    gap: 30,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  heroCopy: {
    flex: 1,
    gap: 20,
  },
  heroTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  inlineError: {
    color: design.danger,
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: design.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 104,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  listSurface: {
    backgroundColor: 'transparent',
    gap: 0,
  },
  memberHeadline: {
    color: design.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  memberName: {
    color: design.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  memberRow: {
    gap: 2,
    minHeight: 42,
    paddingVertical: 10,
  },
  membershipChip: {
    borderColor: design.border,
    borderRadius: 2,
    borderWidth: 1,
    color: design.accent,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mentionAvatar: {
    alignItems: 'center',
    backgroundColor: design.surface,
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  mentionAvatarLabel: {
    color: design.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  mentionMenu: {
    backgroundColor: design.surface,
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mentionName: {
    color: design.text,
    fontSize: 13,
    fontWeight: '600',
  },
  mentionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  mentionState: {
    color: design.muted,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  mentionTextWrap: {
    flex: 1,
    gap: 2,
  },
  mentionUsername: {
    color: design.muted,
    fontSize: 12,
  },
  mediaPreviewImage: {
    aspectRatio: 1,
    backgroundColor: design.surface,
    borderRadius: 4,
    width: '100%',
  },
  mediaPreviewItem: {
    gap: 4,
    width: 56,
  },
  mediaPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mediaRemoveButton: {
    alignItems: 'center',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  mediaRemoveLabel: {
    color: design.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: design.surface,
    borderColor: design.border,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    gap: 10,
    maxHeight: '82%',
    padding: 12,
  },
  postTypeChip: {
    alignItems: 'center',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: 9,
  },
  postTypeChipLabel: {
    color: design.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  postTypeChipLabelSelected: {
    color: design.accentText,
  },
  postTypeChipSelected: {
    backgroundColor: design.accent,
    borderColor: design.accent,
  },
  postTypeRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: design.accent,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
  },
  primaryActionLabel: {
    color: design.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  eventPickerItem: {
    marginBottom: 10,
  },
  eventPickerList: {
    maxHeight: 420,
  },
  eventPickerState: {
    color: design.muted,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 8,
  },
  publishAction: {
    backgroundColor: design.accent,
    borderColor: design.accent,
    borderRadius: 4,
    flex: 0,
    minHeight: 32,
    minWidth: 72,
  },
  publishActionLabel: {
    color: design.accentText,
  },
  safeArea: {
    flex: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    flex: 0,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 52,
    paddingHorizontal: 12,
  },
  secondaryActionLabel: {
    color: design.textVariant,
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: design.background,
    gap: 28,
    paddingHorizontal: 20,
    paddingVertical: 38,
  },
  sectionEyebrow: {
    color: design.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  sectionHeader: {
    gap: 0,
  },
  sectionTitle: {
    color: design.text,
    fontSize: 18,
    fontWeight: '600',
  },
  stack: {
    gap: 14,
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  subtitle: {
    color: design.textVariant,
    fontSize: 18,
    lineHeight: 26,
  },
  title: {
    color: design.text,
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  topBar: {
    borderBottomColor: design.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
});

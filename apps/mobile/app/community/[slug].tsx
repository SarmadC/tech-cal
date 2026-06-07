import { useCallback, useEffect, useRef, useState } from 'react';
import { Feather, FontAwesome } from '@expo/vector-icons';
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
  loadMobileCommunityCircle,
  loadMobileCommunityEvents,
  loadMobileCommunityMentionSuggestions,
  submitMobileCommunityVote,
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

function createEmptyPublishedMediaSet(): Set<string> {
  return new Set();
}

export default function CommunityCircleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string | string[] }>();
  const circleSlug = Array.isArray(slug) ? slug[0] : slug;
  const [data, setData] = useState<MobileCommunityCirclePage | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [postType, setPostType] = useState<CommunityPostType>('update');
  const [attachedEvent, setAttachedEvent] =
    useState<MobileCommunityEventCard | null>(null);
  const [eventPickerEvents, setEventPickerEvents] = useState<MobileCommunityEventCard[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [eventPickerLoading, setEventPickerLoading] = useState(false);
  const [eventPickerQuery, setEventPickerQuery] = useState('');
  const [isPostTypeOpen, setIsPostTypeOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
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

  function resetComposerState() {
    setPostTitle('');
    setDraft('');
    setPostType('update');
    setAttachedEvent(null);
    setSelectedMedia([]);
    setSelectedMentions([]);
    setMentionSuggestions([]);
    setMentionLoading(false);
    setIsEventPickerOpen(false);
    setIsPostTypeOpen(false);
  }

  function handleOpenComposer() {
    if (!data?.isJoined) {
      return;
    }

    setIsComposerOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }

  function handleCancelComposer() {
    const unpublishedPaths = selectedMedia
      .map((item) => item.path)
      .filter((path) => !publishedMediaPathsRef.current.has(path));

    if (unpublishedPaths.length) {
      void Promise.allSettled(
        unpublishedPaths.map((path) => deleteCommunityPostImage(path))
      );
    }

    publishedMediaPathsRef.current = createEmptyPublishedMediaSet();
    resetComposerState();
    setIsComposerOpen(false);
  }

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

  async function handleCreatePost() {
    if (
      !data ||
      !postTitle.trim() ||
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
        title: postTitle,
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
      resetComposerState();
      publishedMediaPathsRef.current = createEmptyPublishedMediaSet();
      setIsComposerOpen(false);
      await loadCircle('refresh');
    } catch (nextError) {
      Alert.alert(
        'Post failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to post.'
      );
    } finally {
      setWorking(false);
    }
  }

  async function handlePostVote(
    post: NonNullable<MobileCommunityCirclePage['posts']>[number],
    voteType: -1 | 1
  ) {
    if (!data || working) {
      return;
    }

    setWorking(true);

    try {
      await submitMobileCommunityVote({
        entityType: 'post',
        entityId: post.id,
        circleSlug: data.circle.slug,
        voteType: post.userVote === voteType ? 0 : voteType,
      });
      await loadCircle('refresh');
    } catch (nextError) {
      Alert.alert(
        'Vote failed',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to vote on this thread.'
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

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        orderedSelection: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        quality: 0.86,
        selectionLimit: remainingSlots,
      });
    } catch (nextError) {
      Alert.alert(
        'Photos unavailable',
        nextError instanceof Error
          ? nextError.message
          : 'Unable to open your photo library.'
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

    setEventPickerQuery('');
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

  const canPublish = Boolean(postTitle.trim());
  const eventPickerQueryTrimmed = eventPickerQuery.trim().toLowerCase();
  const filteredEventPickerEvents = eventPickerQueryTrimmed
    ? eventPickerEvents.filter((event) =>
        [event.title, event.location, event.format]
          .filter((field): field is string => Boolean(field))
          .some((field) => field.toLowerCase().includes(eventPickerQueryTrimmed))
      )
    : eventPickerEvents;

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
              hitSlop={8}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.cardPressed : null,
              ]}
              accessibilityLabel="Back"
            >
              <Feather name="chevron-left" size={24} color={design.text} />
            </Pressable>
          </View>

          {error ? <Text style={styles.inlineError}>{error}</Text> : null}

          <View style={styles.section}>
            <View style={styles.threadHeader}>
              <Text style={styles.sectionEyebrow}>Latest threads</Text>
              {data?.isJoined ? (
                <Pressable
                  onPress={handleOpenComposer}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.createThreadButton,
                    pressed ? styles.cardPressed : null,
                  ]}
                  accessibilityLabel="Create thread"
                >
                  <Feather name="plus" size={18} color={design.accent} />
                </Pressable>
              ) : null}
            </View>

            {data?.isJoined && isComposerOpen ? (
              <View style={styles.composerCard}>
                <View style={styles.postTypeSelectWrap}>
                  <Pressable
                    onPress={() => setIsPostTypeOpen((current) => !current)}
                    style={({ pressed }) => [
                      styles.postTypeSelect,
                      pressed ? styles.cardPressed : null,
                    ]}
                    accessibilityLabel="Select thread type"
                  >
                    <Text style={styles.postTypeSelectLabel}>
                      {POST_TYPE_OPTIONS.find((option) => option.value === postType)?.label ??
                        'Update'}
                    </Text>
                    <FontAwesome
                      name={isPostTypeOpen ? 'chevron-up' : 'chevron-down'}
                      size={11}
                      color={design.textVariant}
                    />
                  </Pressable>
                  {isPostTypeOpen ? (
                    <View style={styles.postTypeMenu}>
                      {POST_TYPE_OPTIONS.map((option) => {
                        const isSelected = option.value === postType;

                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => {
                              setPostType(option.value);
                              setIsPostTypeOpen(false);
                            }}
                            style={({ pressed }) => [
                              styles.postTypeOption,
                              isSelected ? styles.postTypeOptionSelected : null,
                              pressed ? styles.cardPressed : null,
                            ]}
                            accessibilityLabel={`Set thread type to ${option.label}`}
                          >
                            <Text
                              style={[
                                styles.postTypeOptionLabel,
                                isSelected ? styles.postTypeOptionLabelSelected : null,
                              ]}
                            >
                              {option.label}
                            </Text>
                            {isSelected ? (
                              <FontAwesome name="check" size={11} color={design.accent} />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
                <View style={styles.composerFields}>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Title</Text>
                    <TextInput
                      ref={inputRef}
                      value={postTitle}
                      onChangeText={setPostTitle}
                      placeholder="Thread title"
                      placeholderTextColor={design.textVariant}
                      style={styles.titleInput}
                      returnKeyType="next"
                      maxLength={200}
                    />
                  </View>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Body</Text>
                    <TextInput
                      multiline
                      value={draft}
                      onChangeText={handleDraftChange}
                      placeholder="Optional details"
                      placeholderTextColor={design.textVariant}
                      style={styles.input}
                    />
                  </View>
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
                      <FontAwesome name="image" size={16} color={design.textVariant} />
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
                        size={16}
                        color={design.textVariant}
                      />
                    </Pressable>
                  </View>
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
                    onPress={handleCancelComposer}
                    style={({ pressed }) => [
                      styles.secondaryAction,
                      pressed ? styles.cardPressed : null,
                    ]}
                  >
                    <Text style={styles.secondaryActionLabel}>Cancel</Text>
                  </Pressable>
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
                      {working ? 'Posting...' : uploadingMedia ? 'Uploading...' : 'Post'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {data?.posts.length ? (
              <View style={styles.postListSurface}>
                {data.posts.map((post, index) => (
                  <View
                    key={post.id}
                    style={[
                      styles.postListRow,
                      index < data.posts.length - 1 ? styles.postListDivider : null,
                    ]}
                  >
                    <CommunityFeedCard
                      post={{
                        id: post.id,
                        title: post.title,
                        content: post.content,
                        createdAt: post.createdAt,
                        author: post.author,
                        circle: {
                          slug: data.circle.slug,
                          name: data.circle.name,
                        },
                        commentCount: countCommunityComments(post.comments),
                        isTrending: countCommunityComments(post.comments) >= 8,
                        score: post.score,
                        userVote: post.userVote,
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
                      onVote={(_feedPost, voteType) => {
                        void handlePostVote(post, voteType);
                      }}
                      variant="thread"
                    />
                  </View>
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
                </View>
                <TextInput
                  value={eventPickerQuery}
                  onChangeText={setEventPickerQuery}
                  placeholder="Search events"
                  placeholderTextColor={design.textVariant}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.eventPickerSearch}
                />
                <ScrollView style={styles.eventPickerList} keyboardShouldPersistTaps="handled">
                  {eventPickerLoading ? (
                    <Text style={styles.eventPickerState}>Loading events...</Text>
                  ) : null}
                  {!eventPickerLoading && !eventPickerEvents.length ? (
                    <Text style={styles.eventPickerState}>
                      No linked events are available for this circle.
                    </Text>
                  ) : null}
                  {!eventPickerLoading &&
                  eventPickerEvents.length &&
                  !filteredEventPickerEvents.length ? (
                    <Text style={styles.eventPickerState}>
                      No events match “{eventPickerQuery.trim()}”.
                    </Text>
                  ) : null}
                  {filteredEventPickerEvents.map((event, index) => (
                    <DiscoverEventCard
                      key={event.id}
                      event={toDiscoverEventCard(event)}
                      showDivider={index < filteredEventPickerEvents.length - 1}
                      onPress={() => {
                        setAttachedEvent(event);
                        setIsEventPickerOpen(false);
                      }}
                    />
                  ))}
                </ScrollView>
                <Pressable
                  onPress={() => setIsEventPickerOpen(false)}
                  style={({ pressed }) => [
                    styles.modalDoneAction,
                    pressed ? styles.cardPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>Done</Text>
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
    borderRadius: 4,
    height: 32,
    justifyContent: 'center',
    width: 32,
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
  cardPressed: {
    opacity: 0.84,
  },
  composerCard: {
    backgroundColor: design.background,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 12,
  },
  composerFields: {
    gap: 8,
  },
  composerFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  content: {
    paddingBottom: 24,
  },
  disabledAction: {
    opacity: 0.5,
  },
  editorToolButton: {
    alignItems: 'center',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  editorToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    color: design.muted,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  screen: {
    backgroundColor: design.background,
    flex: 1,
  },
  inlineError: {
    color: design.danger,
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    backgroundColor: design.surfaceLowest,
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    color: design.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 96,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  listSurface: {
    backgroundColor: 'transparent',
    gap: 10,
  },
  postListDivider: {
    borderBottomColor: design.border,
    borderBottomWidth: 1,
  },
  postListRow: {
    paddingVertical: 2,
  },
  postListSurface: {
    backgroundColor: 'transparent',
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
    gap: 8,
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
  modalDoneAction: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 56,
    paddingHorizontal: 12,
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
    gap: 12,
    maxHeight: '82%',
    padding: 12,
  },
  postTypeMenu: {
    backgroundColor: design.surfaceLowest,
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 36,
    zIndex: 20,
  },
  postTypeOption: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 32,
    paddingHorizontal: 10,
  },
  postTypeOptionLabel: {
    color: design.textVariant,
    fontSize: 13,
    fontWeight: '500',
  },
  postTypeOptionLabelSelected: {
    color: design.text,
    fontWeight: '600',
  },
  postTypeOptionSelected: {
    backgroundColor: 'rgba(189, 194, 255, 0.08)',
  },
  postTypeSelect: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 32,
    minWidth: 132,
    paddingHorizontal: 10,
  },
  postTypeSelectLabel: {
    color: design.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  postTypeSelectWrap: {
    alignSelf: 'flex-start',
    minWidth: 160,
    position: 'relative',
    zIndex: 20,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: design.accent,
    borderColor: design.accent,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  primaryActionLabel: {
    color: design.accentText,
    fontSize: 13,
    fontWeight: '600',
  },
  eventPickerList: {
    maxHeight: 420,
  },
  eventPickerSearch: {
    backgroundColor: design.surfaceLowest,
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    color: design.text,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    minHeight: 32,
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
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
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
  titleInput: {
    backgroundColor: design.surfaceLowest,
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    color: design.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  topBar: {
    borderBottomColor: design.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createThreadButton: {
    alignItems: 'center',
    borderColor: design.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  threadHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

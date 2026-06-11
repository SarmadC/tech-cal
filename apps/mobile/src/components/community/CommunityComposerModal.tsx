import { FontAwesome } from "@expo/vector-icons";
import type {
  CommunityPostType,
  MobileCommunityCircle,
  MobileCommunityEventCard,
} from "@kurecal/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
} from "../../hooks/useAnimation";
import { useAppTheme } from "../../providers/ThemeProvider";
import { CommunityAttachedEventRow } from "./CommunityAttachedEventRow";

const DEFAULT_POST_TYPE_OPTIONS: Array<{
  label: string;
  value: CommunityPostType;
}> = [
  { label: "Update", value: "update" },
  { label: "Question", value: "question" },
  { label: "Intro", value: "intro" },
  { label: "Showcase", value: "showcase" },
  { label: "Event note", value: "event_note" },
  { label: "Announcement", value: "announcement" },
];

export const MAX_COMPOSER_IMAGES = 4;

export interface CommunityComposerImageAttachment {
  path: string;
  width: number;
  height: number;
  localUri: string;
}

export interface CommunityComposerEventOption extends MobileCommunityEventCard {
  circle: Pick<MobileCommunityCircle, "id" | "name" | "slug">;
}

interface CommunityComposerModalProps {
  attachedEvent?: CommunityComposerEventOption | null;
  body: string;
  bodyPlaceholder?: string;
  circle?: MobileCommunityCircle | null;
  circles?: MobileCommunityCircle[];
  closeLabel?: string;
  emptyNotice?: string;
  eventPickerEvents?: CommunityComposerEventOption[];
  eventPickerLoading?: boolean;
  eventPickerOpen?: boolean;
  eventPickerQuery?: string;
  fallbackCircle?: MobileCommunityCircle | null;
  isUploadingMedia?: boolean;
  isWorking: boolean;
  media?: CommunityComposerImageAttachment[];
  modalTitle?: string;
  onAfterClose?: () => void;
  onChangeBody: (value: string) => void;
  onChangeCircle?: (circleId: string) => void;
  onChangeEventPickerQuery?: (value: string) => void;
  onChangePostType?: (value: CommunityPostType | null) => void;
  onChangeTitle: (value: string) => void;
  onClose: () => void;
  onOpenEventPicker?: () => void;
  onPickImages?: () => void;
  onRemoveEvent?: () => void;
  onRemoveImage?: (path: string) => void;
  onSelectEvent?: (event: CommunityComposerEventOption) => void;
  onSubmit: () => void;
  postType?: CommunityPostType | null;
  postTypeOptions?: Array<{ label: string; value: CommunityPostType }>;
  requireBody?: boolean;
  requireCircle?: boolean;
  showAttachedEventPreview?: boolean;
  showCircleControls?: boolean;
  showCommunityControls?: boolean;
  showEventControls?: boolean;
  showImageControls?: boolean;
  showPostTypeControls?: boolean;
  submitLabel?: string;
  title: string;
  titlePlaceholder?: string;
  visible: boolean;
}

export function CommunityComposerModal({
  attachedEvent = null,
  body,
  bodyPlaceholder = "Optional details",
  circle = null,
  circles = [],
  closeLabel = "Cancel",
  emptyNotice = "Join a circle before creating a community post.",
  eventPickerEvents = [],
  eventPickerLoading = false,
  eventPickerOpen = false,
  eventPickerQuery = "",
  fallbackCircle = null,
  isUploadingMedia = false,
  isWorking,
  media = [],
  modalTitle = "Create post",
  onAfterClose,
  onChangeBody,
  onChangeCircle,
  onChangeEventPickerQuery,
  onChangePostType,
  onChangeTitle,
  onClose,
  onOpenEventPicker,
  onPickImages,
  onRemoveEvent,
  onRemoveImage,
  onSelectEvent,
  onSubmit,
  postType = null,
  postTypeOptions = DEFAULT_POST_TYPE_OPTIONS,
  requireBody = false,
  requireCircle,
  showAttachedEventPreview,
  showCircleControls,
  showCommunityControls = true,
  showEventControls,
  showImageControls,
  showPostTypeControls,
  submitLabel = "Post",
  title,
  titlePlaceholder = "Title",
  visible,
}: CommunityComposerModalProps) {
  const { tokens } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [initialVisible] = useState(visible);
  const animationProgress = useMemo(
    () => new Animated.Value(initialVisible ? 1 : 0),
    [initialVisible],
  );
  const [shouldRender, setShouldRender] = useState(visible);
  if (visible && !shouldRender) setShouldRender(true);
  const hasOpenedRef = useRef(false);
  const onAfterCloseRef = useRef(onAfterClose);
  const [isPostTypeOpen, setIsPostTypeOpen] = useState(false);
  const [isCircleOpen, setIsCircleOpen] = useState(false);
  const effectiveCircle = circle ?? attachedEvent?.circle ?? fallbackCircle;
  const shouldRequireCircle = requireCircle ?? showCommunityControls;
  const shouldShowCircleControls =
    showCircleControls ?? showCommunityControls;
  const shouldShowPostTypeControls =
    showPostTypeControls ?? showCommunityControls;
  const shouldShowEventControls = showEventControls ?? showCommunityControls;
  const shouldShowImageControls = showImageControls ?? showCommunityControls;
  const shouldShowAttachedEventPreview =
    showAttachedEventPreview ?? showCommunityControls;
  const canSubmit = Boolean(
    title.trim() &&
      (!requireBody || body.trim()) &&
      (!shouldRequireCircle || effectiveCircle) &&
      !isWorking &&
      !isUploadingMedia,
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
    () =>
      animationProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [animationProgress],
  );
  const sheetTranslateY = useMemo(
    () =>
      animationProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [windowHeight, 0],
      }),
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
        onAfterCloseRef.current?.();
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
        onAfterCloseRef.current?.();
      }
    });
  }, [animationProgress, reduceMotion, shouldRender, visible]);

  if (!shouldRender) {
    return null;
  }

  const canUseEventControls = Boolean(
    shouldShowEventControls &&
      onOpenEventPicker &&
      onChangeEventPickerQuery &&
      onSelectEvent,
  );
  const canUseMediaControls = Boolean(shouldShowImageControls && onPickImages);

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
              {modalTitle}
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
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.composerScroll}
            contentContainerStyle={styles.composerScrollContent}
          >
            {(shouldShowCircleControls && circles.length === 0) ||
            (shouldRequireCircle && !effectiveCircle) ? (
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
                  {emptyNotice}
                </Text>
              </View>
            ) : (
            <>
                {shouldShowCircleControls ? (
                  <>
                    <Text style={styles.composerLabel}>Circle (optional)</Text>
                    <View style={styles.postTypeSelectWrap}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select circle"
                        onPress={() => setIsCircleOpen((current) => !current)}
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
                              color: circle
                                ? tokens.colors.textPrimary
                                : tokens.colors.textTertiary,
                              fontFamily: tokens.typography.sans,
                            },
                          ]}
                        >
                          {circle?.name ?? "Select circle"}
                        </Text>
                        <FontAwesome
                          name={isCircleOpen ? "chevron-up" : "chevron-down"}
                          size={11}
                          color={tokens.colors.textSecondary}
                        />
                      </Pressable>
                      {isCircleOpen ? (
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
                          {circles.map((item) => {
                            const isSelected = circle?.id === item.id;
                            return (
                              <Pressable
                                key={item.id}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                onPress={() => {
                                  onChangeCircle?.(item.id);
                                  setIsCircleOpen(false);
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
                                  {item.name}
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

                    {shouldShowPostTypeControls ? (
                      <>
                    <Text style={styles.composerLabel}>Type</Text>
                    <View style={styles.postTypeSelectWrap}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select post type"
                        onPress={() =>
                          setIsPostTypeOpen((current) => !current)
                        }
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
                          {postTypeOptions.find(
                            (option) => option.value === postType,
                          )?.label ?? "Select type"}
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
                          {postTypeOptions.map((option) => {
                            const isSelected = option.value === postType;

                            return (
                              <Pressable
                                key={option.value}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                onPress={() => {
                                  onChangePostType?.(
                                    isSelected ? null : option.value,
                                  );
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
                      </>
                    ) : null}
                  </>
                ) : null}

                <TextInput
                  placeholder={titlePlaceholder}
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
                  placeholder={bodyPlaceholder}
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

                {shouldShowImageControls || shouldShowEventControls ? (
                  <View style={styles.composerToolbar}>
                    {shouldShowImageControls ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          isUploadingMedia ? "Uploading image" : "Add image"
                        }
                        disabled={
                          isWorking ||
                          isUploadingMedia ||
                          !canUseMediaControls ||
                          media.length >= MAX_COMPOSER_IMAGES
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
                              !canUseMediaControls ||
                              media.length >= MAX_COMPOSER_IMAGES
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
                    ) : null}
                    {shouldShowEventControls ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          attachedEvent ? "Change attached event" : "Attach event"
                        }
                        disabled={
                          isWorking ||
                          isUploadingMedia ||
                          !circles.length ||
                          !canUseEventControls
                        }
                        onPress={onOpenEventPicker}
                        style={({ pressed }) => [
                          styles.composerToolButton,
                          {
                            backgroundColor: tokens.colors.surfaceMuted,
                            borderRadius: tokens.radius.xs,
                            opacity:
                              isWorking ||
                              isUploadingMedia ||
                              !circles.length ||
                              !canUseEventControls
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
                    ) : null}
                  </View>
                ) : null}

                {shouldShowAttachedEventPreview && attachedEvent ? (
                  <View style={styles.attachmentPreview}>
                    <CommunityAttachedEventRow
                      event={attachedEvent}
                      variant="selected"
                      onPress={onOpenEventPicker}
                    />
                    {onRemoveEvent ? (
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
                    ) : null}
                  </View>
                ) : null}

                {shouldShowImageControls && media.length ? (
                  <View style={styles.mediaPreviewRow}>
                    {media.map((item) => (
                      <View key={item.path} style={styles.mediaPreviewItem}>
                        <Image
                          source={{ uri: item.localUri }}
                          style={styles.mediaPreviewImage}
                        />
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => onRemoveImage?.(item.path)}
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

                {shouldShowEventControls && eventPickerOpen ? (
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
                          onPress={() => onSelectEvent?.(event)}
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
                {closeLabel}
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
                {isWorking
                  ? "Posting..."
                  : isUploadingMedia
                    ? "Uploading..."
                    : submitLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxWidth: 430,
    padding: 12,
    width: "100%",
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
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    flex: 1,
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
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
  pressed: {
    opacity: 0.82,
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
});

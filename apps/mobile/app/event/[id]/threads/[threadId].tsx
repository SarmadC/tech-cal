import type {
  MobileCommunityRoomCommentSort,
  MobileCommunityRoomThreadChildComment,
  MobileCommunityRoomThreadComment,
  MobileCommunityRoomThreadDetail,
} from "@kurecal/domain";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Constants from "expo-constants";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  HeaderActionButton,
  MobilePage,
} from "../../../../src/components/chrome/MobilePage";
import { ScreenState } from "../../../../src/components/chrome/ScreenState";
import {
  CommunityThreadActionMenu,
  type ThreadActionKey,
  type ThreadActionOption,
} from "../../../../src/components/community/CommunityThreadActionMenu";
import { CommunityThreadReportSheet } from "../../../../src/components/community/CommunityThreadReportSheet";
import {
  createMobileEventThreadComment,
  deleteMobileEventThread,
  deleteMobileEventThreadComment,
  loadMobileEventThread,
  updateMobileEventThread,
  updateMobileEventThreadComment,
} from "../../../../src/lib/mobileApi";
import { useAppTheme } from "../../../../src/providers/ThemeProvider";

type MenuTarget =
  | { kind: "thread"; id: string; authorName: string; isAuthor: boolean }
  | {
      kind: "comment";
      id: string;
      authorName: string;
      isAuthor: boolean;
      parentId: string | null;
    };

type EditTarget =
  | { kind: "thread"; id: string; title: string; body: string }
  | { kind: "comment"; id: string; body: string };

type ReportTarget =
  | { kind: "thread"; id: string }
  | { kind: "comment"; id: string };

interface PendingComment {
  localId: string;
  body: string;
  parentRootId: string | null;
  status: "pending" | "failed";
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRelative(value: string): string {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "Recently";
  const diff = Date.now() - ts;
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatReplyLabel(count: number): string {
  if (count === 0) return "No replies";
  if (count === 1) return "1 reply";
  return `${count} replies`;
}

function makeLocalId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuidString(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isSafeAvatarUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  // Only allow http(s) — React Native <Image> will otherwise happily render
  // `data:`, `file:`, or even `javascript:` schemes on some platforms.
  return /^https?:\/\//i.test(url);
}

function findCommentById(
  comments: MobileCommunityRoomThreadComment[],
  id: string,
):
  | MobileCommunityRoomThreadComment
  | MobileCommunityRoomThreadChildComment
  | null {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    for (const reply of comment.replies) {
      if (reply.id === id) return reply;
    }
  }
  return null;
}

function buildMenuOptions(target: MenuTarget): ThreadActionOption[] {
  const options: ThreadActionOption[] = [];
  if (target.isAuthor) {
    options.push({ key: "edit", label: "Edit" });
    options.push({ key: "delete", label: "Delete", destructive: true });
  } else {
    options.push({ key: "report", label: "Report" });
  }
  options.push({ key: "copyLink", label: "Copy link" });
  options.push({ key: "cancel", label: "Cancel" });
  return options;
}

export default function EventThreadDetailScreen() {
  const { tokens } = useAppTheme();
  const params = useLocalSearchParams<{
    id: string | string[];
    threadId: string | string[];
    comment?: string | string[];
  }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const threadId = Array.isArray(params.threadId)
    ? params.threadId[0]
    : params.threadId;
  const rawPermalinkCommentId = Array.isArray(params.comment)
    ? params.comment[0]
    : params.comment;
  // Reject malformed/garbage values up-front so they never reach the ref map
  // or the scroll/measurement code paths.
  const initialPermalinkCommentId = isValidUuidString(rawPermalinkCommentId)
    ? rawPermalinkCommentId
    : undefined;

  const [detail, setDetail] = useState<MobileCommunityRoomThreadDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [composerActive, setComposerActive] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    rootId: string;
    authorName: string;
  } | null>(null);
  const [pending, setPending] = useState<PendingComment[]>([]);
  const [posting, setPosting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sort, setSort] = useState<MobileCommunityRoomCommentSort>("oldest");
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null);
  const requestSequenceRef = useRef(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const commentRefs = useRef<Map<string, View>>(new Map());
  const permalinkAppliedRef = useRef(false);

  const load = useCallback(async () => {
    if (!eventId || !threadId) {
      setError("Thread id is missing");
      setLoading(false);
      return;
    }

    const requestId = ++requestSequenceRef.current;
    setLoading(true);
    try {
      const data = await loadMobileEventThread(eventId, threadId, sort);
      if (requestId !== requestSequenceRef.current) return;
      setDetail(data);
      setError(null);
    } catch (nextError) {
      if (requestId !== requestSequenceRef.current) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load this thread",
      );
    } finally {
      if (requestId === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [eventId, threadId, sort]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const postComment = useCallback(
    async (body: string, parentRootId: string | null, localId: string) => {
      if (!eventId || !threadId) return;
      try {
        await createMobileEventThreadComment(eventId, threadId, {
          body,
          parentCommentId: parentRootId,
        });
        setPending((prev) => prev.filter((entry) => entry.localId !== localId));
        await load();
      } catch (nextError) {
        console.warn("createMobileEventThreadComment failed", nextError);
        setReplyError("Couldn't post your reply. Try again.");
        setPending((prev) =>
          prev.map((entry) =>
            entry.localId === localId ? { ...entry, status: "failed" } : entry,
          ),
        );
      }
    },
    [eventId, threadId, load],
  );

  const handlePostReply = async () => {
    if (!detail) return;
    // Block double-tap: a second invocation while the first POST is in
    // flight would create a duplicate stub (and duplicate row).
    if (posting) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      setReplyError("Add a reply before posting.");
      return;
    }
    setReplyError(null);
    setPosting(true);
    const localId = makeLocalId();
    const parentRootId = replyingTo?.rootId ?? null;
    setPending((prev) => [
      ...prev,
      { localId, body: trimmed, parentRootId, status: "pending" },
    ]);
    setReplyText("");
    setComposerActive(false);
    setReplyingTo(null);
    try {
      await postComment(trimmed, parentRootId, localId);
    } finally {
      setPosting(false);
    }
  };

  const handleRetry = (entry: PendingComment) => {
    setPending((prev) =>
      prev.map((p) =>
        p.localId === entry.localId ? { ...p, status: "pending" } : p,
      ),
    );
    void postComment(entry.body, entry.parentRootId, entry.localId);
  };

  const handleDismissFailed = (localId: string) => {
    setPending((prev) => prev.filter((entry) => entry.localId !== localId));
  };

  const openComposer = ({
    rootId,
    authorName,
  }: { rootId: string; authorName: string } | { rootId?: undefined; authorName?: undefined } = {}) => {
    setReplyError(null);
    if (rootId && authorName) {
      setReplyingTo({ rootId, authorName });
    } else {
      setReplyingTo(null);
    }
    setComposerActive(true);
  };

  const cancelComposer = () => {
    setComposerActive(false);
    setReplyError(null);
    setReplyText("");
    setReplyingTo(null);
  };

  const cancelReplyTarget = () => setReplyingTo(null);

  // Build the list of pending top-level stubs (those without a parent root)
  // for rendering at the end of the comments list.
  const topLevelPending = useMemo(
    () => pending.filter((entry) => entry.parentRootId === null),
    [pending],
  );

  // Pending child stubs keyed by their parent root id, so each top-level
  // comment can pick up its pending replies.
  const pendingByParent = useMemo(() => {
    const map = new Map<string, PendingComment[]>();
    for (const entry of pending) {
      if (!entry.parentRootId) continue;
      const existing = map.get(entry.parentRootId);
      if (existing) {
        existing.push(entry);
      } else {
        map.set(entry.parentRootId, [entry]);
      }
    }
    return map;
  }, [pending]);

  // Scroll to and briefly highlight a permalink-targeted comment after the
  // thread renders. Runs only on the first successful load so subsequent
  // refetches don't re-trigger the scroll.
  useEffect(() => {
    if (!initialPermalinkCommentId) return;
    if (!detail) return;
    if (permalinkAppliedRef.current) return;
    permalinkAppliedRef.current = true;

    // Defer to next frame so the comment Views have been laid out.
    const timer = setTimeout(() => {
      const view = commentRefs.current.get(initialPermalinkCommentId);
      const scroller = scrollRef.current;
      if (!view || !scroller) return;
      view.measureLayout(
        // measureLayout's second arg expects a node handle; ScrollView's ref
        // exposes one via `getInnerViewNode` on iOS / native nodes elsewhere.
        // Pass the ScrollView ref as `any` to avoid wrestling with types.
        scroller as unknown as number,
        (_x, y) => {
          scroller.scrollTo({
            y: Math.max(0, y - 24),
            animated: true,
          });
        },
        () => {
          /* swallow */
        },
      );
      setHighlightedCommentId(initialPermalinkCommentId);
      setTimeout(() => setHighlightedCommentId(null), 2200);
    }, 80);

    return () => clearTimeout(timer);
  }, [detail, initialPermalinkCommentId]);

  const handleSortChange = (next: MobileCommunityRoomCommentSort) => {
    if (next === sort) return;
    setSort(next);
  };

  const handleOpenThreadMenu = () => {
    if (!detail) return;
    setMenuTarget({
      kind: "thread",
      id: detail.thread.id,
      authorName:
        detail.thread.author.fullName || `@${detail.thread.author.username}`,
      isAuthor: detail.thread.isAuthor,
    });
  };

  const handleOpenCommentMenu = (
    comment: MobileCommunityRoomThreadComment | MobileCommunityRoomThreadChildComment,
  ) => {
    setMenuTarget({
      kind: "comment",
      id: comment.id,
      authorName: comment.author.fullName || `@${comment.author.username}`,
      isAuthor: comment.isAuthor,
      parentId: comment.parentId,
    });
  };

  const handleCopyLink = async (kind: "thread" | "comment", id: string) => {
    if (!eventId || !threadId) return;
    // Build a deep link using the scheme registered for the current variant
    // (kurecal-dev in dev, kurecal in production). Tapping it in another app
    // opens us at the right route.
    const schemeRaw = Constants.expoConfig?.scheme;
    const scheme =
      typeof schemeRaw === "string" && schemeRaw.length > 0
        ? schemeRaw
        : "kurecal";
    const path = `/event/${eventId}/threads/${threadId}`;
    const query = kind === "comment" ? `?comment=${id}` : "";
    const url = `${scheme}://${path}${query}`;

    try {
      // The native share sheet exposes both "Copy" and direct share targets,
      // so this works whether the user wants to copy or send the link. Using
      // React Native's built-in Share avoids the expo-clipboard native
      // module, which would otherwise require a dev-client rebuild.
      await Share.share({ message: url, url });
    } catch (nextError) {
      // iOS throws on cancel; ignore silently. Real failures still log.
      console.warn("Share link failed", nextError);
    }
  };

  const handleConfirmDelete = (target: MenuTarget) => {
    const label = target.kind === "thread" ? "thread" : "comment";
    Alert.alert(
      `Delete ${label}?`,
      `This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void performDelete(target);
          },
        },
      ],
      { cancelable: true },
    );
  };

  const performDelete = async (target: MenuTarget) => {
    if (!eventId || !threadId) return;
    try {
      if (target.kind === "thread") {
        await deleteMobileEventThread(eventId, threadId);
        router.back();
      } else {
        await deleteMobileEventThreadComment(eventId, threadId, target.id);
        await load();
      }
    } catch (nextError) {
      console.warn("delete community thread/comment failed", nextError);
      Alert.alert("Delete failed", "Couldn't delete that. Try again.");
    }
  };

  const handleStartEdit = (target: MenuTarget) => {
    if (target.kind === "thread") {
      if (!detail) return;
      setEditTarget({
        kind: "thread",
        id: target.id,
        title: detail.thread.title,
        body: detail.thread.body,
      });
      return;
    }
    const found = findCommentById(detail?.comments ?? [], target.id);
    if (!found || found.isDeleted) return;
    setEditTarget({ kind: "comment", id: target.id, body: found.body });
  };

  const handleSaveThreadEdit = async (title: string, body: string) => {
    if (!eventId || !threadId) return;
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await updateMobileEventThread(eventId, threadId, { title, body });
      setEditTarget(null);
      await load();
    } catch (nextError) {
      // Surface a generic message; log the underlying cause for engineers.
      console.warn("updateMobileEventThread failed", nextError);
      Alert.alert("Edit failed", "Couldn't save those edits. Try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveCommentEdit = async (commentId: string, body: string) => {
    if (!eventId || !threadId) return;
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await updateMobileEventThreadComment(eventId, threadId, commentId, {
        body,
      });
      setEditTarget(null);
      await load();
    } catch (nextError) {
      console.warn("updateMobileEventThreadComment failed", nextError);
      Alert.alert("Edit failed", "Couldn't save those edits. Try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSelectMenuAction = (key: ThreadActionKey) => {
    const target = menuTarget;
    setMenuTarget(null);
    if (!target) return;
    switch (key) {
      case "edit":
        handleStartEdit(target);
        return;
      case "delete":
        handleConfirmDelete(target);
        return;
      case "copyLink":
        void handleCopyLink(target.kind, target.id);
        return;
      case "report":
        setReportTarget({ kind: target.kind, id: target.id });
        return;
      case "cancel":
      default:
        return;
    }
  };

  const registerCommentRef = (id: string, node: View | null) => {
    if (node) {
      commentRefs.current.set(id, node);
    } else {
      commentRefs.current.delete(id);
    }
  };

  return (
    <MobilePage
      title={detail?.thread.title ?? "Thread"}
      action={
        <HeaderActionButton label="Back" onPress={() => router.back()} />
      }
      scrollRef={scrollRef}
    >
      {loading && !detail ? (
        <ScreenState
          mode="loading"
          title="Loading thread"
          description="Pulling the full discussion."
        />
      ) : null}

      {error && !detail ? (
        <ScreenState
          mode="error"
          title="Thread unavailable"
          description={error}
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => void load()}
              style={({ pressed }) => [
                styles.retryButton,
                {
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.sm,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Try again
              </Text>
            </Pressable>
          }
        />
      ) : null}

      {detail ? (
        <View style={styles.stack}>
          {editTarget?.kind === "thread" && editTarget.id === detail.thread.id ? (
            <ThreadEditCard
              initialBody={editTarget.body}
              initialTitle={editTarget.title}
              onCancel={() => setEditTarget(null)}
              onSave={(title, body) => void handleSaveThreadEdit(title, body)}
            />
          ) : (
            <>
              <View style={styles.bylineRow}>
                <ThreadByline thread={detail.thread} />
                <OverflowButton onPress={handleOpenThreadMenu} />
              </View>

              <Text
                style={[
                  styles.body,
                  {
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {detail.thread.body}
                {detail.thread.editedAt ? (
                  <Text
                    style={{
                      color: tokens.colors.textTertiary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    {"  "}(edited)
                  </Text>
                ) : null}
              </Text>
            </>
          )}

          <View
            style={[
              styles.divider,
              { backgroundColor: tokens.colors.divider },
            ]}
          />

          <Composer
            active={composerActive}
            error={replyError}
            posting={posting}
            replyingTo={replyingTo}
            text={replyText}
            onCancel={cancelComposer}
            onCancelReplyTarget={cancelReplyTarget}
            onChangeText={setReplyText}
            onOpen={() => openComposer()}
            onSubmit={handlePostReply}
          />

          {detail.thread.commentCount + pending.length === 0 ? (
            <Text
              style={[
                styles.emptyHint,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Be the first to reply.
            </Text>
          ) : (
            <View style={styles.commentsHeader}>
              <Text
                style={[
                  styles.commentsLabel,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {formatReplyLabel(detail.thread.commentCount + pending.length)}
              </Text>
              <SortToggle
                sort={sort}
                onChange={handleSortChange}
              />
            </View>
          )}

          {detail.comments.map((comment) => (
            <CommentBranch
              key={comment.id}
              comment={comment}
              editTarget={editTarget}
              highlightedCommentId={highlightedCommentId}
              pendingChildren={pendingByParent.get(comment.id) ?? []}
              onCancelEdit={() => setEditTarget(null)}
              onDismissFailed={handleDismissFailed}
              onOpenMenu={handleOpenCommentMenu}
              onRegisterRef={registerCommentRef}
              onReplyToRoot={(rootId, authorName) =>
                openComposer({ rootId, authorName })
              }
              onRetry={handleRetry}
              onSaveEdit={handleSaveCommentEdit}
            />
          ))}

          {topLevelPending.map((entry) => (
            <PendingRow
              key={entry.localId}
              entry={entry}
              onDismiss={() => handleDismissFailed(entry.localId)}
              onRetry={() => handleRetry(entry)}
            />
          ))}
        </View>
      ) : null}

      <CommunityThreadActionMenu
        onDismiss={() => setMenuTarget(null)}
        onSelect={handleSelectMenuAction}
        options={menuTarget ? buildMenuOptions(menuTarget) : []}
        title={menuTarget ? menuTarget.authorName : undefined}
        visible={menuTarget !== null}
      />

      <CommunityThreadReportSheet
        onDismiss={() => setReportTarget(null)}
        subjectId={reportTarget?.id ?? null}
        subjectType={
          reportTarget?.kind === "thread"
            ? "event_thread"
            : "event_thread_comment"
        }
        visible={reportTarget !== null}
      />
    </MobilePage>
  );
}

function Composer({
  active,
  error,
  posting,
  replyingTo,
  text,
  onCancel,
  onCancelReplyTarget,
  onChangeText,
  onOpen,
  onSubmit,
}: {
  active: boolean;
  error: string | null;
  posting: boolean;
  replyingTo: { rootId: string; authorName: string } | null;
  text: string;
  onCancel: () => void;
  onCancelReplyTarget: () => void;
  onChangeText: (value: string) => void;
  onOpen: () => void;
  onSubmit: () => void;
}) {
  const { tokens } = useAppTheme();
  // Disable Post until there's text AND no in-flight create. The second
  // condition is what blocks the double-tap exploit at the visual layer.
  const canPost = text.trim().length > 0 && !posting;

  if (!active) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.composerCollapsed,
          {
            backgroundColor: tokens.colors.surface,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.sm,
          },
          pressed && { backgroundColor: tokens.colors.surfaceMuted },
        ]}
      >
        <Text
          style={[
            styles.composerCollapsedText,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          Add a comment…
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.composerActive,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      {replyingTo ? (
        <View
          style={[
            styles.replyBanner,
            {
              backgroundColor: tokens.colors.accentSoft,
              borderRadius: tokens.radius.xs,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={{
              color: tokens.colors.accent,
              flex: 1,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Replying to {replyingTo.authorName}
          </Text>
          <Pressable
            accessibilityLabel="Cancel reply target"
            onPress={onCancelReplyTarget}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text
              style={{
                color: tokens.colors.accent,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              ×
            </Text>
          </Pressable>
        </View>
      ) : null}
      <TextInput
        accessibilityLabel="Comment body"
        autoFocus
        maxLength={2000}
        multiline
        onChangeText={onChangeText}
        placeholder="Add a comment..."
        placeholderTextColor={tokens.colors.textTertiary}
        style={[
          styles.composerInput,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
        value={text}
      />
      {error ? (
        <Text
          style={{
            color: tokens.colors.danger,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            fontWeight: "500",
          }}
        >
          {error}
        </Text>
      ) : null}
      <View style={styles.composerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.composerCancel,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={{
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Cancel
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!canPost}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.composerSubmit,
            {
              backgroundColor: canPost
                ? tokens.colors.accent
                : tokens.colors.accentSoft,
              borderRadius: tokens.radius.sm,
            },
            pressed && canPost && styles.pressed,
          ]}
        >
          <Text
            style={{
              color: canPost
                ? tokens.colors.textInverse
                : tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            Post
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CommentBranch({
  comment,
  editTarget,
  highlightedCommentId,
  pendingChildren,
  onCancelEdit,
  onDismissFailed,
  onOpenMenu,
  onRegisterRef,
  onReplyToRoot,
  onRetry,
  onSaveEdit,
}: {
  comment: MobileCommunityRoomThreadComment;
  editTarget: EditTarget | null;
  highlightedCommentId: string | null;
  pendingChildren: PendingComment[];
  onCancelEdit: () => void;
  onDismissFailed: (localId: string) => void;
  onOpenMenu: (
    comment:
      | MobileCommunityRoomThreadComment
      | MobileCommunityRoomThreadChildComment,
  ) => void;
  onRegisterRef: (id: string, node: View | null) => void;
  onReplyToRoot: (rootId: string, authorName: string) => void;
  onRetry: (entry: PendingComment) => void;
  onSaveEdit: (commentId: string, body: string) => void;
}) {
  const rootAuthorName =
    comment.author.fullName || `@${comment.author.username}`;
  const hasReplies = comment.replies.length > 0 || pendingChildren.length > 0;
  const editingRoot =
    editTarget?.kind === "comment" && editTarget.id === comment.id;

  return (
    <View style={styles.branch}>
      {editingRoot ? (
        <CommentEditCard
          initialBody={editTarget.body}
          onCancel={onCancelEdit}
          onSave={(body) => onSaveEdit(comment.id, body)}
        />
      ) : (
        <CommentRow
          comment={comment}
          isHighlighted={highlightedCommentId === comment.id}
          onOpenMenu={() => onOpenMenu(comment)}
          onRegisterRef={onRegisterRef}
          onReply={() => onReplyToRoot(comment.id, rootAuthorName)}
        />
      )}
      {hasReplies ? (
        <ChildRail>
          {comment.replies.map((reply) => {
            const editingReply =
              editTarget?.kind === "comment" && editTarget.id === reply.id;
            if (editingReply) {
              return (
                <CommentEditCard
                  key={reply.id}
                  initialBody={editTarget.body}
                  onCancel={onCancelEdit}
                  onSave={(body) => onSaveEdit(reply.id, body)}
                />
              );
            }
            return (
              <ChildCommentRow
                key={reply.id}
                comment={reply}
                isHighlighted={highlightedCommentId === reply.id}
                onOpenMenu={() => onOpenMenu(reply)}
                onRegisterRef={onRegisterRef}
                onReply={() =>
                  onReplyToRoot(
                    comment.id,
                    reply.author.fullName || `@${reply.author.username}`,
                  )
                }
              />
            );
          })}
          {pendingChildren.map((entry) => (
            <PendingRow
              key={entry.localId}
              entry={entry}
              onDismiss={() => onDismissFailed(entry.localId)}
              onRetry={() => onRetry(entry)}
            />
          ))}
        </ChildRail>
      ) : null}
    </View>
  );
}

function ChildRail({ children }: { children: React.ReactNode }) {
  const { tokens } = useAppTheme();
  return (
    <View style={styles.childRailWrap}>
      <View
        style={[
          styles.childRailLine,
          { backgroundColor: tokens.colors.divider },
        ]}
      />
      <View style={styles.childRailContent}>{children}</View>
    </View>
  );
}

function CommentRow({
  comment,
  isHighlighted,
  onOpenMenu,
  onRegisterRef,
  onReply,
}: {
  comment: MobileCommunityRoomThreadComment;
  isHighlighted: boolean;
  onOpenMenu: () => void;
  onRegisterRef: (id: string, node: View | null) => void;
  onReply: () => void;
}) {
  return (
    <CommentBody
      authorName={comment.author.fullName || `@${comment.author.username}`}
      avatarUrl={comment.author.avatarUrl}
      body={comment.body}
      commentId={comment.id}
      createdAt={comment.createdAt}
      editedAt={comment.editedAt}
      isAuthor={comment.isAuthor}
      isDeleted={comment.isDeleted}
      isHighlighted={isHighlighted}
      isOp={comment.isOp}
      onOpenMenu={onOpenMenu}
      onRegisterRef={onRegisterRef}
      onReply={onReply}
    />
  );
}

function ChildCommentRow({
  comment,
  isHighlighted,
  onOpenMenu,
  onRegisterRef,
  onReply,
}: {
  comment: MobileCommunityRoomThreadChildComment;
  isHighlighted: boolean;
  onOpenMenu: () => void;
  onRegisterRef: (id: string, node: View | null) => void;
  onReply: () => void;
}) {
  return (
    <CommentBody
      authorName={comment.author.fullName || `@${comment.author.username}`}
      avatarUrl={comment.author.avatarUrl}
      body={comment.body}
      commentId={comment.id}
      createdAt={comment.createdAt}
      editedAt={comment.editedAt}
      isAuthor={comment.isAuthor}
      isDeleted={comment.isDeleted}
      isHighlighted={isHighlighted}
      isOp={comment.isOp}
      onOpenMenu={onOpenMenu}
      onRegisterRef={onRegisterRef}
      onReply={onReply}
    />
  );
}

function CommentBody({
  authorName,
  avatarUrl,
  body,
  commentId,
  createdAt,
  editedAt,
  isAuthor,
  isDeleted,
  isHighlighted,
  isOp,
  onOpenMenu,
  onRegisterRef,
  onReply,
}: {
  authorName: string;
  avatarUrl: string | null;
  body: string;
  commentId: string;
  createdAt: string;
  editedAt: string | null;
  isAuthor: boolean;
  isDeleted: boolean;
  isHighlighted: boolean;
  isOp: boolean;
  onOpenMenu: () => void;
  onRegisterRef: (id: string, node: View | null) => void;
  onReply: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View
      ref={(node) => onRegisterRef(commentId, node)}
      style={[
        styles.commentRow,
        isHighlighted && {
          backgroundColor: tokens.colors.accentSoft,
          borderRadius: tokens.radius.sm,
          padding: 6,
          marginHorizontal: -6,
        },
      ]}
    >
      <Avatar
        avatarUrl={isDeleted ? null : avatarUrl}
        name={isDeleted ? "—" : authorName}
        size={24}
      />
      <View style={styles.commentCopy}>
        <View style={styles.commentHeader}>
          <Text
            numberOfLines={1}
            style={{
              color: isDeleted
                ? tokens.colors.textTertiary
                : tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              fontStyle: isDeleted ? "italic" : "normal",
              fontWeight: "700",
            }}
          >
            {isDeleted ? "[deleted]" : `${authorName}${isAuthor ? " · you" : ""}`}
          </Text>
          {!isDeleted && isOp ? (
            <View
              style={[
                styles.opBadge,
                {
                  backgroundColor: tokens.colors.accentSoft,
                  borderRadius: tokens.radius.xs,
                },
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.accent,
                  fontFamily: tokens.typography.sans,
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                }}
              >
                OP
              </Text>
            </View>
          ) : null}
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: "500",
              marginLeft: "auto",
            }}
          >
            {formatRelative(createdAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.commentBodyText,
            {
              color: isDeleted
                ? tokens.colors.textTertiary
                : tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
              fontStyle: isDeleted ? "italic" : "normal",
            },
          ]}
        >
          {body}
          {!isDeleted && editedAt ? (
            <Text
              style={{
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
                fontSize: 11,
                fontWeight: "500",
              }}
            >
              {"  "}(edited)
            </Text>
          ) : null}
        </Text>
        {!isDeleted ? (
          <View style={styles.commentActionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onReply}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text
                style={[
                  styles.replyLink,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                Reply
              </Text>
            </Pressable>
            <OverflowButton onPress={onOpenMenu} compact />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PendingRow({
  entry,
  onDismiss,
  onRetry,
}: {
  entry: PendingComment;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const { tokens } = useAppTheme();
  const failed = entry.status === "failed";

  return (
    <View style={[styles.commentRow, { opacity: failed ? 1 : 0.55 }]}>
      <Avatar avatarUrl={null} name="You" size={24} />
      <View style={styles.commentCopy}>
        <View style={styles.commentHeader}>
          <Text
            style={{
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            You
          </Text>
          <Text
            style={{
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
              fontSize: 11,
              fontWeight: "500",
              marginLeft: "auto",
            }}
          >
            {failed ? "Failed" : "Posting…"}
          </Text>
        </View>
        <Text
          style={[
            styles.commentBodyText,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {entry.body}
        </Text>
        {failed ? (
          <View style={styles.pendingActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onRetry}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text
                style={{
                  color: tokens.colors.accent,
                  fontFamily: tokens.typography.sans,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                Retry
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onDismiss}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text
                style={{
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                Dismiss
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ThreadByline({
  thread,
}: {
  thread: MobileCommunityRoomThreadDetail["thread"];
}) {
  const { tokens } = useAppTheme();
  const authorName = thread.author.fullName || `@${thread.author.username}`;
  const youSuffix = thread.isAuthor ? " · you" : "";
  const relative = formatRelative(thread.createdAt);

  return (
    <View style={styles.byline}>
      <Avatar
        avatarUrl={thread.author.avatarUrl}
        name={authorName}
        size={24}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.bylineText,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {authorName}
        {youSuffix} · {relative}
      </Text>
    </View>
  );
}

function OverflowButton({
  compact,
  onPress,
}: {
  compact?: boolean;
  onPress: () => void;
}) {
  const { tokens } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel="More actions"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.overflowCompact : styles.overflow,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={{
          color: tokens.colors.textTertiary,
          fontFamily: tokens.typography.sans,
          fontSize: compact ? 14 : 16,
          fontWeight: "700",
          letterSpacing: 1,
        }}
      >
        •••
      </Text>
    </Pressable>
  );
}

function SortToggle({
  onChange,
  sort,
}: {
  onChange: (next: MobileCommunityRoomCommentSort) => void;
  sort: MobileCommunityRoomCommentSort;
}) {
  const { tokens } = useAppTheme();

  const pill = (value: MobileCommunityRoomCommentSort, label: string) => {
    const active = sort === value;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(value)}
        style={({ pressed }) => [
          styles.sortPill,
          {
            backgroundColor: active
              ? tokens.colors.pillActive
              : tokens.colors.surface,
            borderColor: active ? tokens.colors.pillActive : tokens.colors.border,
            borderRadius: tokens.radius.xs,
          },
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={{
            color: active
              ? tokens.colors.pillActiveText
              : tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.sortRow}>
      {pill("newest", "Newest")}
      {pill("oldest", "Oldest")}
    </View>
  );
}

function ThreadEditCard({
  initialBody,
  initialTitle,
  onCancel,
  onSave,
}: {
  initialBody: string;
  initialTitle: string;
  onCancel: () => void;
  onSave: (title: string, body: string) => void;
}) {
  const { tokens } = useAppTheme();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const canSave =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (title.trim() !== initialTitle.trim() ||
      body.trim() !== initialBody.trim());

  return (
    <View
      style={[
        styles.editCard,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      <TextInput
        accessibilityLabel="Thread title"
        maxLength={200}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={tokens.colors.textTertiary}
        style={[
          styles.editTitleInput,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
        value={title}
      />
      <TextInput
        accessibilityLabel="Thread body"
        maxLength={5000}
        multiline
        onChangeText={setBody}
        placeholder="Body"
        placeholderTextColor={tokens.colors.textTertiary}
        style={[
          styles.editBodyInput,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
        value={body}
      />
      <EditFooter
        canSave={canSave}
        onCancel={onCancel}
        onSave={() => onSave(title.trim(), body.trim())}
      />
    </View>
  );
}

function CommentEditCard({
  initialBody,
  onCancel,
  onSave,
}: {
  initialBody: string;
  onCancel: () => void;
  onSave: (body: string) => void;
}) {
  const { tokens } = useAppTheme();
  const [body, setBody] = useState(initialBody);
  const canSave =
    body.trim().length > 0 && body.trim() !== initialBody.trim();

  return (
    <View
      style={[
        styles.editCard,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
        },
      ]}
    >
      <TextInput
        accessibilityLabel="Comment body"
        autoFocus
        maxLength={2000}
        multiline
        onChangeText={setBody}
        placeholder="Edit comment"
        placeholderTextColor={tokens.colors.textTertiary}
        style={[
          styles.composerInput,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
        value={body}
      />
      <EditFooter
        canSave={canSave}
        onCancel={onCancel}
        onSave={() => onSave(body.trim())}
      />
    </View>
  );
}

function EditFooter({
  canSave,
  onCancel,
  onSave,
}: {
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.composerActions}>
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={({ pressed }) => [
          styles.composerCancel,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={{
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
            fontSize: 12,
            fontWeight: "700",
          }}
        >
          Cancel
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!canSave}
        onPress={onSave}
        style={({ pressed }) => [
          styles.composerSubmit,
          {
            backgroundColor: canSave
              ? tokens.colors.accent
              : tokens.colors.accentSoft,
            borderRadius: tokens.radius.sm,
          },
          pressed && canSave && styles.pressed,
        ]}
      >
        <Text
          style={{
            color: canSave
              ? tokens.colors.textInverse
              : tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
            fontSize: 13,
            fontWeight: "700",
          }}
        >
          Save
        </Text>
      </Pressable>
    </View>
  );
}

function Avatar({
  avatarUrl,
  name,
  size,
}: {
  avatarUrl: string | null;
  name: string;
  size: number;
}) {
  const { tokens } = useAppTheme();

  if (isSafeAvatarUrl(avatarUrl)) {
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
        alignItems: "center",
        backgroundColor: tokens.colors.surfaceMuted,
        borderRadius: size / 2,
        height: size,
        justifyContent: "center",
        width: size,
      }}
    >
      <Text
        style={{
          color: tokens.colors.textPrimary,
          fontFamily: tokens.typography.sans,
          fontSize: size < 28 ? 10 : 12,
          fontWeight: "700",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  branch: {
    gap: 8,
  },
  byline: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  bylineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  bylineText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.05,
  },
  childRailContent: {
    flex: 1,
    gap: 12,
  },
  childRailLine: {
    width: 1,
  },
  childRailWrap: {
    flexDirection: "row",
    gap: 13,
    paddingLeft: 4,
  },
  commentBodyText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  commentCopy: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  commentActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingTop: 2,
  },
  commentRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  commentsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingTop: 4,
  },
  commentsLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  editBodyInput: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    minHeight: 96,
    textAlignVertical: "top",
  },
  editCard: {
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  editTitleInput: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  composerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  composerActive: {
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  composerCancel: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  composerCollapsed: {
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  composerCollapsedText: {
    fontSize: 13,
    fontWeight: "500",
  },
  composerInput: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    minHeight: 56,
    textAlignVertical: "top",
  },
  composerSubmit: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    paddingHorizontal: 14,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  emptyHint: {
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "500",
    paddingTop: 4,
  },
  opBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 14,
  },
  overflow: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  overflowCompact: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  pressed: {
    opacity: 0.82,
  },
  sortPill: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 22,
    paddingHorizontal: 10,
  },
  sortRow: {
    flexDirection: "row",
    gap: 6,
  },
  replyBanner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  replyLink: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.05,
  },
  retryButton: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stack: {
    gap: 12,
  },
});

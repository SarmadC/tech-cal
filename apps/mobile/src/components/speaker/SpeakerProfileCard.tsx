import { FontAwesome } from '@expo/vector-icons';
import type {
  MobileEventCard,
  MobileSpeakerDetail,
  MobileSpeakerDetailEvent,
} from '@kurecal/domain';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  buildSpeakerInitials,
  formatNetworkingStatus,
  formatSpeakerMetricDate,
  getNextSpeakerEvent,
  selectPrimarySpeakerEvent,
  selectSpeakerAvatarUrl,
  selectSpeakerPrimaryAction,
} from '../../lib/speakerPresentation';
import { useAppTheme } from '../../providers/ThemeProvider';
import { EventImageSurface } from '../shared/EventImageSurface';

export type SpeakerNetworkingAction =
  | 'mark_request_sent'
  | 'confirm_connection'
  | 'clear_request'
  | 'clear_connection';

export type SpeakerNetworkingPendingState =
  | 'request'
  | 'confirm'
  | 'clear'
  | 'clear_connection'
  | null;

interface SpeakerProfileCardProps {
  networkingActionPending: SpeakerNetworkingPendingState;
  onBack: () => void;
  onNetworkingAction: (action: SpeakerNetworkingAction) => void;
  onOpenExternal: (label: string, url: string) => void;
  speaker: MobileSpeakerDetail;
}

function getSpeakerHeadline(title: string | null, company: string | null): string {
  return [title, company].filter(Boolean).join(' · ') || 'Speaker';
}

function normalizeEventFormat(format: string | null): MobileEventCard['format'] {
  const normalized = format?.trim().toLowerCase();
  if (normalized === 'online' || normalized === 'virtual') {
    return 'virtual';
  }
  if (normalized === 'in-person' || normalized === 'in person') {
    return 'in-person';
  }
  return normalized === 'hybrid' ? 'hybrid' : null;
}

function toEventCard(event: MobileSpeakerDetailEvent): MobileEventCard {
  const format = normalizeEventFormat(event.format);
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    startTime: event.startTime,
    location: event.location,
    imageUrl: event.imageUrl ?? null,
    organizerLogoUrl: null,
    format,
    formatLabel: format ? undefined : event.format?.trim() || undefined,
  };
}

function SpeakerAvatar({
  name,
  photoUrl,
  portraitUrl,
}: Pick<MobileSpeakerDetail, 'name' | 'photoUrl' | 'portraitUrl'>) {
  const { tokens } = useAppTheme();
  const avatarUrl = selectSpeakerAvatarUrl({ photoUrl, portraitUrl });
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedUrl !== avatarUrl);

  useEffect(() => {
    setFailedUrl(null);
  }, [avatarUrl]);

  return (
    <View
      style={[
        styles.avatarFrame,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.shell,
          borderRadius: tokens.radius.pill,
        },
      ]}
    >
      {showImage && avatarUrl ? (
        <Image
          accessibilityLabel={`${name} profile photo`}
          onError={() => setFailedUrl(avatarUrl)}
          resizeMode="cover"
          source={{ uri: avatarUrl }}
          style={[styles.avatarImage, { borderRadius: tokens.radius.pill }]}
        />
      ) : (
        <LinearGradient
          colors={
            tokens.mode === 'dark'
              ? ['#24283A', '#181A22']
              : ['#EEF0FF', '#E2E5F5']
          }
          style={[
            styles.avatarFallback,
            { borderRadius: tokens.radius.pill },
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.35}
            style={[
              styles.avatarInitials,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {buildSpeakerInitials(name)}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

function BrandedSpeakerCover() {
  const { tokens } = useAppTheme();

  return (
    <LinearGradient
      colors={
        tokens.mode === 'dark'
          ? ['#171A24', '#101216']
          : ['#E9EBF8', '#F5F5F7']
      }
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.cover}
    >
      <View
        style={[
          styles.brandLine,
          styles.brandLineFirst,
          { backgroundColor: tokens.colors.accent },
        ]}
      />
      <View
        style={[
          styles.brandLine,
          styles.brandLineSecond,
          { backgroundColor: tokens.colors.textTertiary },
        ]}
      />
      <Text
        style={[
          styles.brandLabel,
          {
            color: tokens.colors.textSecondary,
            fontFamily: tokens.typography.mono,
          },
        ]}
      >
        KURECAL / SPEAKER
      </Text>
    </LinearGradient>
  );
}

function ConnectionTracker({
  onAction,
  pending,
  status,
}: {
  onAction: (action: SpeakerNetworkingAction) => void;
  pending: SpeakerNetworkingPendingState;
  status: NonNullable<MobileSpeakerDetail['networkingState']>['status'];
}) {
  const { tokens } = useAppTheme();
  const disabled = Boolean(pending);
  const statusLabel = formatNetworkingStatus(status);

  return (
    <View
      style={[
        styles.connectionRow,
        {
          borderColor: tokens.colors.divider,
        },
      ]}
    >
      <View style={styles.connectionStatus}>
        <View
          style={[
            styles.connectionDot,
            {
              backgroundColor:
                status === 'connected'
                  ? tokens.colors.success
                  : status === 'requested'
                    ? tokens.colors.warning
                    : tokens.colors.textTertiary,
            },
          ]}
        />
        <Text
          style={[
            styles.connectionLabel,
            {
              color: tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          Connection · {statusLabel}
        </Text>
      </View>

      <View style={styles.connectionActions}>
        {status === 'none' ? (
          <TrackerAction
            disabled={disabled}
            label={pending === 'request' ? 'Saving…' : 'Mark request sent'}
            onPress={() => onAction('mark_request_sent')}
            primary
          />
        ) : null}
        {status === 'requested' ? (
          <>
            <TrackerAction
              disabled={disabled}
              label={pending === 'confirm' ? 'Saving…' : 'Mark connected'}
              onPress={() => onAction('confirm_connection')}
              primary
            />
            <TrackerAction
              disabled={disabled}
              label={pending === 'clear' ? 'Undoing…' : 'Undo'}
              onPress={() => onAction('clear_request')}
            />
          </>
        ) : null}
        {status === 'connected' ? (
          <TrackerAction
            disabled={disabled}
            label={pending === 'clear_connection' ? 'Undoing…' : 'Undo'}
            onPress={() => onAction('clear_connection')}
          />
        ) : null}
      </View>
    </View>
  );
}

function TrackerAction({
  disabled,
  label,
  onPress,
  primary = false,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const { tokens } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.trackerAction,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.trackerActionLabel,
          {
            color: primary ? tokens.colors.link : tokens.colors.textSecondary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SpeakerProfileCard({
  networkingActionPending,
  onBack,
  onNetworkingAction,
  onOpenExternal,
  speaker,
}: SpeakerProfileCardProps) {
  const { tokens } = useAppTheme();
  const primaryEvent = useMemo(
    () => selectPrimarySpeakerEvent(speaker.events),
    [speaker.events]
  );
  const nextEvent = useMemo(
    () => getNextSpeakerEvent(speaker.events),
    [speaker.events]
  );
  const primaryAction = useMemo(
    () => selectSpeakerPrimaryAction(speaker),
    [speaker]
  );
  const networkingState = speaker.networkingState ?? {
    status: 'none' as const,
    linkedinRequestedAt: null,
    confirmedConnectedAt: null,
  };
  const appearanceCount = Math.max(
    speaker.appearanceCount,
    speaker.events.length
  );
  const metricCount = Number(Boolean(nextEvent)) + Number(appearanceCount > 0);

  return (
    <View style={styles.profile}>
      <View
        style={[
          styles.coverClip,
          {
            borderRadius: tokens.radius.sm,
          },
        ]}
      >
        {primaryEvent?.imageUrl ? (
          <EventImageSurface
            event={toEventCard(primaryEvent)}
            style={styles.cover}
          />
        ) : (
          <BrandedSpeakerCover />
        )}
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome
            color="#FFFFFF"
            name="angle-left"
            size={22}
            style={styles.backIcon}
          />
        </Pressable>
      </View>

      <View style={styles.cardBody}>
        <SpeakerAvatar
          name={speaker.name}
          photoUrl={speaker.photoUrl}
          portraitUrl={speaker.portraitUrl}
        />

        <View style={styles.identity}>
          <Text
            maxFontSizeMultiplier={1.35}
            style={[
              styles.name,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {speaker.name}
          </Text>
          <Text
            maxFontSizeMultiplier={1.35}
            style={[
              styles.headline,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {getSpeakerHeadline(speaker.title, speaker.company)}
          </Text>
        </View>

        {metricCount > 1 ? (
          <View
            style={[
              styles.metrics,
              {
                borderColor: tokens.colors.divider,
              },
            ]}
          >
            {nextEvent ? (
              <Metric
                label="Next"
                value={formatSpeakerMetricDate(nextEvent.startTime)}
              />
            ) : null}
            {appearanceCount > 0 ? (
              <Metric label="Appearances" value={String(appearanceCount)} />
            ) : null}
          </View>
        ) : null}

        {primaryAction ? (
          <Pressable
            accessibilityLabel={`${primaryAction.label} for ${speaker.name}`}
            accessibilityRole="link"
            onPress={() =>
              onOpenExternal(primaryAction.label, primaryAction.url)
            }
            style={({ pressed }) => [
              styles.primaryCta,
              {
                backgroundColor: tokens.colors.pillActive,
          borderRadius: tokens.radius.pill,
              },
              pressed && styles.pressed,
            ]}
          >
            <FontAwesome
              color={tokens.colors.pillActiveText}
              name={
                primaryAction.kind === 'linkedin'
                  ? 'linkedin-square'
                  : 'external-link'
              }
              size={17}
            />
            <Text
              style={[
                styles.primaryCtaLabel,
                {
                  color: tokens.colors.pillActiveText,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {primaryAction.label}
            </Text>
          </Pressable>
        ) : null}

        <ConnectionTracker
          onAction={onNetworkingAction}
          pending={networkingActionPending}
          status={networkingState.status}
        />
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { tokens } = useAppTheme();
  return (
    <View style={styles.metric}>
      <Text
        maxFontSizeMultiplier={1.25}
        numberOfLines={1}
        style={[
          styles.metricValue,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {value}
      </Text>
      <Text
        maxFontSizeMultiplier={1.25}
        style={[
          styles.metricLabel,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarFallback: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatarFrame: {
    borderWidth: 2,
    height: 88,
    marginTop: -44,
    overflow: 'hidden',
    width: 88,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  backButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    left: 10,
    position: 'absolute',
    top: 10,
    width: 32,
  },
  backIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.72)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  brandLabel: {
    bottom: 18,
    fontSize: 11,
    fontWeight: '600',
    left: 18,
    letterSpacing: 1.4,
    position: 'absolute',
  },
  brandLine: {
    height: 12,
    opacity: 0.34,
    position: 'absolute',
    right: -24,
    transform: [{ rotate: '-18deg' }],
    width: 220,
  },
  brandLineFirst: {
    top: 50,
  },
  brandLineSecond: {
    top: 84,
  },
  cardBody: {
    gap: 12,
  },
  connectionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
    gap: 12,
    justifyContent: 'flex-end',
  },
  connectionDot: {
    borderRadius: 6,
    height: 7,
    width: 7,
  },
  connectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  connectionRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 40,
    paddingTop: 8,
  },
  connectionStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
  },
  cover: {
    height: 176,
    width: '100%',
  },
  coverClip: {
    height: 176,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.45,
  },
  headline: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  identity: {
    gap: 4,
  },
  metric: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14,
  },
  metrics: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 62,
    paddingVertical: 8,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
    lineHeight: 33,
  },
  pressed: {
    opacity: 0.82,
  },
  profile: {
    gap: 0,
  },
  primaryCta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
  },
  primaryCtaLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  trackerAction: {
    justifyContent: 'center',
    minHeight: 32,
  },
  trackerActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});

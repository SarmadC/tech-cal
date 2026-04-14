import { FontAwesome } from '@expo/vector-icons';
import type { MobileCommunityNetworkingEvent } from '@kurecal/domain';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '../../providers/ThemeProvider';
import { CommunityAvatar } from './CommunityAvatar';
import { getSafeExternalUrl } from './presentation';

type SpeakerPreview = NonNullable<
  MobileCommunityNetworkingEvent['speakerPreview']
>[number];

interface CommunityNetworkingSpeakerCardProps {
  speaker: SpeakerPreview;
  eventTitle: string;
  matchReason: string;
  matchIndex?: number;
  isPastEvent?: boolean;
  onOpenSpeaker?: () => void;
  onOpenExternalLink?: (label: string, url: string) => void;
}

function getSpeakerHeadline(speaker: SpeakerPreview): string {
  const parts = [speaker.title, speaker.company].filter(Boolean);
  return parts.join(' · ') || 'Event speaker';
}

function getExternalAction(speaker: SpeakerPreview): {
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
  url: string;
} | null {
  const linkedinUrl = getSafeExternalUrl(speaker.linkedinUrl);
  if (linkedinUrl) {
    return {
      label: 'LinkedIn',
      icon: 'linkedin-square',
      url: linkedinUrl,
    };
  }

  const twitterUrl = getSafeExternalUrl(speaker.twitterUrl);
  if (twitterUrl) {
    return {
      label: 'Twitter',
      icon: 'twitter',
      url: twitterUrl,
    };
  }

  const websiteUrl = getSafeExternalUrl(speaker.websiteUrl);
  if (websiteUrl) {
    return {
      label: 'Website',
      icon: 'external-link',
      url: websiteUrl,
    };
  }

  return null;
}

function splitInsightPhrases(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[,(/)]+/)
    .map((part) => part.replace(/\b(and|for|of|the)\b/gi, ' ').trim())
    .map((part) => part.replace(/\s+/g, ' '))
    .filter((part) => part.length >= 4)
    .filter(
      (part) =>
        !/^(senior|staff|lead|head|director|associate|principal|vp|chief|professor)$/i.test(
          part
        )
    );
}

function getDisplayReason(params: {
  eventTitle: string;
  matchIndex: number;
  matchReason: string;
  speaker: SpeakerPreview;
}): string | null {
  const trimmedReason = params.matchReason.trim();
  const genericReasonPatterns = [
    /^strong fit for your .+ lens\.?$/i,
    /^strong overlap with .+\.?$/i,
    /^useful for your .+ work\.?$/i,
    /^relevant to your .+\.?$/i,
    /^best fit for your .+ from .+\.?$/i,
    /^useful context for your .+ from .+\.?$/i,
    /^clear topic overlap in .+\.?$/i,
    /^most relevant to your current event trail in .+\.?$/i,
    /^.+ overlap\.?$/i,
  ];
  const isGenericReason = genericReasonPatterns.some((pattern) =>
    pattern.test(trimmedReason)
  );

  const titlePhrases = splitInsightPhrases(params.speaker.title);
  const eventPhrases = splitInsightPhrases(params.eventTitle).filter(
    (phrase) => !/^(summit|conference|forum|expo|meetup)$/i.test(phrase)
  );
  const primaryPhrase = titlePhrases[0] ?? eventPhrases[0] ?? null;
  const secondaryPhrase =
    titlePhrases.find((phrase) => phrase !== primaryPhrase) ??
    eventPhrases.find((phrase) => phrase !== primaryPhrase) ??
    null;

  if (!isGenericReason) {
    return trimmedReason;
  }

  return null;
}

function getCardTone(matchIndex: number, mode: 'light' | 'dark') {
  if (matchIndex === 0) {
    return mode === 'light'
      ? {
          accent: '#C2410C',
          border: 'rgba(194, 65, 12, 0.18)',
          backgroundTop: 'rgba(255, 237, 213, 0.86)',
          backgroundBottom: 'rgba(255, 255, 255, 0.98)',
          shadowOpacity: 0.09,
        }
      : {
          accent: '#FDBA74',
          border: 'rgba(251, 191, 36, 0.18)',
          backgroundTop: 'rgba(56, 24, 6, 0.94)',
          backgroundBottom: 'rgba(16, 19, 24, 0.98)',
          shadowOpacity: 0.18,
        };
  }

  if (matchIndex === 1) {
    return mode === 'light'
      ? {
          accent: '#2563EB',
          border: 'rgba(37, 99, 235, 0.14)',
          backgroundTop: 'rgba(239, 246, 255, 0.86)',
          backgroundBottom: 'rgba(255, 255, 255, 0.98)',
          shadowOpacity: 0.06,
        }
      : {
          accent: '#93C5FD',
          border: 'rgba(96, 165, 250, 0.16)',
          backgroundTop: 'rgba(12, 31, 56, 0.9)',
          backgroundBottom: 'rgba(16, 19, 24, 0.98)',
          shadowOpacity: 0.12,
        };
  }

  return mode === 'light'
    ? {
        accent: '#475569',
        border: 'rgba(15, 23, 42, 0.08)',
        backgroundTop: 'rgba(255, 255, 255, 0.94)',
        backgroundBottom: 'rgba(255, 255, 255, 0.98)',
        shadowOpacity: 0.03,
      }
    : {
        accent: '#94A3B8',
        border: 'rgba(255, 255, 255, 0.08)',
        backgroundTop: 'rgba(20, 24, 31, 0.94)',
        backgroundBottom: 'rgba(16, 19, 24, 0.98)',
        shadowOpacity: 0.08,
      };
}

export function CommunityNetworkingSpeakerCard({
  eventTitle,
  isPastEvent = false,
  matchIndex = 0,
  matchReason,
  onOpenSpeaker,
  onOpenExternalLink,
  speaker,
}: CommunityNetworkingSpeakerCardProps) {
  const { tokens } = useAppTheme();
  const externalAction = getExternalAction(speaker);
  const tone = getCardTone(matchIndex, tokens.mode);
  const isHero = matchIndex === 0;
  const displayReason = getDisplayReason({
    eventTitle,
    matchIndex,
    matchReason,
    speaker,
  });

  return (
    <Pressable
      accessibilityLabel={`Open speaker ${speaker.name}`}
      accessibilityRole="button"
      onPress={onOpenSpeaker}
      style={[
        styles.card,
        {
          borderColor: tone.border,
          borderRadius: tokens.radius.md,
          shadowColor: tokens.shadow.shadowColor,
          shadowOpacity: tone.shadowOpacity,
          shadowRadius: matchIndex === 0 ? 18 : 12,
          shadowOffset: { width: 0, height: matchIndex === 0 ? 10 : 6 },
          elevation: matchIndex === 0 ? 5 : 2,
        },
      ]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.pressSurface,
            {
              borderRadius: tokens.radius.md,
              opacity: pressed ? 0.94 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[tone.backgroundTop, tone.backgroundBottom]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.mainRow}>
            <View
              style={[
                styles.avatarFrame,
                isHero ? styles.heroAvatarFrame : styles.compactAvatarFrame,
                {
                  borderColor: tokens.colors.border,
                  backgroundColor:
                    tokens.mode === 'light'
                      ? 'rgba(255,255,255,0.58)'
                      : 'rgba(255,255,255,0.04)',
                  borderRadius: 999,
                },
              ]}
            >
              <CommunityAvatar
                avatarUrl={speaker.photoUrl}
                name={speaker.name}
                size={isHero ? 58 : 46}
              />
            </View>
            <View style={styles.copy}>
              <View style={styles.nameRow}>
                <View style={styles.nameBlock}>
                  <Text
                    numberOfLines={isHero ? 2 : 1}
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 20 : 17,
                      lineHeight: isHero ? 24 : 20,
                      fontWeight: '800',
                      letterSpacing: isHero ? -0.5 : -0.35,
                    }}
                  >
                    {speaker.name}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 13 : 12,
                      lineHeight: isHero ? 18 : 17,
                      fontWeight: '600',
                    }}
                  >
                    {getSpeakerHeadline(speaker)}
                  </Text>
                </View>
                {externalAction ? (
                  <Pressable
                    accessibilityLabel={`Open ${speaker.name} ${externalAction.label}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      if (onOpenExternalLink) {
                        onOpenExternalLink(externalAction.label, externalAction.url);
                        return;
                      }

                      void Linking.openURL(externalAction.url);
                    }}
                    style={({ pressed: externalPressed }) => [
                      styles.externalShortcut,
                      {
                        width: 32,
                        height: 32,
                        backgroundColor:
                          tokens.mode === 'light'
                            ? 'rgba(255,255,255,0.72)'
                            : 'rgba(15,23,42,0.44)',
                        borderColor: tokens.colors.border,
                        borderRadius: tokens.radius.pill,
                        opacity: externalPressed ? 0.78 : 1,
                      },
                    ]}
                  >
                    <FontAwesome
                      color={tokens.colors.textPrimary}
                      name={externalAction.icon}
                      size={13}
                    />
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.supportingBlock}>
                {displayReason ? (
                  <Text
                    numberOfLines={isHero ? 2 : 1}
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 14 : 13,
                      lineHeight: isHero ? 18 : 17,
                      fontWeight: '700',
                    }}
                  >
                    {displayReason}
                  </Text>
                ) : null}
                <View style={styles.eventRow}>
                  <FontAwesome color={tone.accent} name="calendar-o" size={12} />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: tokens.colors.textSecondary,
                      fontFamily: tokens.typography.sans,
                      fontSize: isHero ? 12 : 11,
                      lineHeight: isHero ? 16 : 15,
                      fontWeight: '700',
                    }}
                  >
                    {isPastEvent ? 'Spoke at' : 'Speaking at'} {eventTitle}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarFrame: {
    padding: 4,
    borderWidth: 1,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressSurface: {
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  externalShortcut: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  supportingBlock: {
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroAvatarFrame: {
    padding: 2,
  },
  compactAvatarFrame: {
    padding: 1,
  },
});

import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import type {
  MobileCommunityHome,
  MobileCommunityNetworkingSpeakerMatch,
} from '@kurecal/domain';

import { HeaderActionButton, MobilePage } from '../../src/components/chrome/MobilePage';
import { KureButton } from '../../src/components/chrome/KureButton';
import { ScreenState } from '../../src/components/chrome/ScreenState';
import { CommunityNetworkingSpeakerCard } from '../../src/components/community/CommunityNetworkingSpeakerCard';
import { loadMobileCommunityHome } from '../../src/lib/mobileApi';
import { useAppTheme } from '../../src/providers/ThemeProvider';

function getRecommendedSpeakers(
  home: MobileCommunityHome | null
): MobileCommunityNetworkingSpeakerMatch[] {
  return home?.speakerMatches ?? [];
}

function getCommunityLoadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  return 'Recommended speakers could not be loaded right now.';
}

export default function DashboardRecommendedSpeakersScreen() {
  const { tokens } = useAppTheme();
  const hasLoadedRef = useRef(false);
  const [home, setHome] = useState<MobileCommunityHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadScreen = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial' || !home) {
      setLoading(true);
    }

    try {
      const nextHome = await loadMobileCommunityHome();
      setHome(nextHome);
      setError(null);
    } catch (nextError) {
      setError(getCommunityLoadErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [home]);

  useFocusEffect(
    useCallback(() => {
      const mode = hasLoadedRef.current ? 'refresh' : 'initial';
      hasLoadedRef.current = true;
      void loadScreen(mode);
    }, [loadScreen])
  );

  const recommendedSpeakers = getRecommendedSpeakers(home);

  return (
    <MobilePage
      title="Recommended speakers"
      subtitle="Suggested from your event graph"
      showAccentGlow={false}
      action={<HeaderActionButton label="Back" onPress={() => router.back()} />}
    >
      <View style={styles.content}>
        {loading && !home ? (
          <ScreenState
            mode="loading"
            title="Loading recommended speakers"
            description="Pulling speaker intros from your community graph."
          />
        ) : null}

        {error && !home ? (
          <ScreenState
            mode="error"
            title="Recommended speakers unavailable"
            description={error}
            action={
              <KureButton onPress={() => void loadScreen('initial')}>
                Try again
              </KureButton>
            }
          />
        ) : null}

        {home && recommendedSpeakers.length === 0 ? (
          <ScreenState
            mode="empty"
            title="No speaker recommendations yet"
            description="Attend or save a few more events and we’ll suggest people worth meeting here."
          />
        ) : null}

        {home && recommendedSpeakers.length > 0 ? (
          <View style={styles.stack}>
            {recommendedSpeakers.map((item) => (
              <View
                key={`${item.speaker.id}:${item.event.id}:dashboard-recommended`}
                style={styles.item}
              >
                <CommunityNetworkingSpeakerCard
                  speaker={item.speaker}
                  onOpenSpeaker={() =>
                    router.push({
                      pathname: '/speaker/[id]',
                      params: {
                        id: item.speaker.id,
                        eventId: item.event.id,
                        eventTitle: item.event.title,
                      },
                    })
                  }
                />
                <View style={styles.itemMeta}>
                  <Text
                    style={[
                      styles.eventTitle,
                      {
                        color: tokens.colors.textPrimary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.event.title}
                  </Text>
                  <Text
                    style={[
                      styles.reason,
                      {
                        color: tokens.colors.textSecondary,
                        fontFamily: tokens.typography.sans,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {item.matchReason}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </MobilePage>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  stack: {
    gap: 14,
  },
  item: {
    gap: 8,
  },
  itemMeta: {
    gap: 2,
    paddingHorizontal: 4,
  },
  eventTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  reason: {
    fontSize: 13,
    lineHeight: 18,
  },
});

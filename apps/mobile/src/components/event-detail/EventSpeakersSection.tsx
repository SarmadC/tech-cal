import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { MobileEventDetailSpeaker } from '@kurecal/domain';
import {
  buildSpeakerSecondaryText,
  getInitials,
  SPEAKER_PREVIEW_COUNT,
} from './eventDetailUtils';
import { useAppTheme } from '../../providers/ThemeProvider';

const CARD_INSET = 18;

export function EventSpeakersSection({ speakers }: { speakers: MobileEventDetailSpeaker[] }) {
  const { tokens } = useAppTheme();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? speakers : speakers.slice(0, SPEAKER_PREVIEW_COUNT);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
          Who is on stage
        </Text>
      </View>

      <View
        style={[
          styles.listPanel,
          { backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border },
        ]}
      >
        {visible.map((speaker, index) => {
          const secondary = buildSpeakerSecondaryText(speaker);

          return (
            <View
              key={speaker.id || speaker.name}
              style={[
                styles.row,
                index > 0 && { borderTopColor: tokens.colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={styles.rowInner}>
                {speaker.photoUrl ? (
                  <Image source={{ uri: speaker.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.fallback, { backgroundColor: tokens.colors.accentSoft }]}>
                    <Text style={[styles.fallbackText, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>
                      {getInitials(speaker.name)}
                    </Text>
                  </View>
                )}
                <View style={styles.copy}>
                  <Text style={[styles.name, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                    {speaker.name}
                  </Text>
                  {secondary ? (
                    <Text style={[styles.meta, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                      {secondary}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {speakers.length > SPEAKER_PREVIEW_COUNT ? (
        <Pressable onPress={() => setShowAll((v) => !v)}>
          <Text style={[styles.link, { color: tokens.colors.link, fontFamily: tokens.typography.sans }]}>
            {showAll ? 'Show fewer speakers' : `Show all ${speakers.length} speakers`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.18,
  },
  listPanel: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: CARD_INSET,
    paddingVertical: 10,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  fallback: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 13,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    fontSize: 13,
    fontWeight: '700',
  },
});

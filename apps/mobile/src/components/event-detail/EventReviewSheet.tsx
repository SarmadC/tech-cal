import type {
  MobileEventNetworkingFeedback,
  MobileEventNetworkingFeedbackUpdate,
} from '@kurecal/domain';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../../providers/ThemeProvider';

export function EventReviewSheet({
  eventTitle,
  feedback,
  isLoading,
  onDismiss,
  onSubmit,
  visible,
}: {
  eventTitle: string;
  feedback: MobileEventNetworkingFeedback | null;
  isLoading: boolean;
  onDismiss: () => void;
  onSubmit: (input: MobileEventNetworkingFeedbackUpdate) => Promise<void>;
  visible: boolean;
}) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState<number | null>(null);
  const [connectionsMade, setConnectionsMade] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(feedback?.actualValueRating ?? null);
      setConnectionsMade(feedback?.connectionsMade ?? null);
      setError(null);
      setSubmitting(false);
    }
  }, [feedback, visible]);

  async function handleSubmit() {
    if (rating === null) {
      setError('Select a rating to submit your review.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        actualValueRating: rating,
        ...(connectionsMade !== null ? { connectionsMade } : {}),
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to save review.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close event review"
        onPress={onDismiss}
        style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]}
      />
      <View style={[styles.safeArea, { paddingBottom: insets.bottom }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.colors.shellElevated,
              borderTopColor: tokens.colors.borderStrong,
            },
          ]}
        >
          <View style={[styles.dragHandle, { backgroundColor: tokens.colors.borderStrong }]} />
          <Text style={[styles.title, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
            How was this event?
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.subtitle, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}
          >
            {eventTitle}
          </Text>

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={tokens.colors.accent} />
            </View>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                  Rating
                </Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = rating !== null && value <= rating;
                    return (
                      <Pressable
                        accessibilityLabel={`Rate ${value} out of 5`}
                        key={value}
                        onPress={() => setRating(value)}
                        style={({ pressed }) => [
                          styles.ratingButton,
                          {
                            backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.surface,
                            borderColor: selected ? tokens.colors.accent : tokens.colors.border,
                            opacity: pressed ? 0.76 : 1,
                          },
                        ]}
                      >
                        <FontAwesome
                          color={selected ? tokens.colors.accent : tokens.colors.textTertiary}
                          name={selected ? 'star' : 'star-o'}
                          size={16}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.field, styles.connectionsField, { borderTopColor: tokens.colors.divider }]}>
                <View style={styles.connectionsCopy}>
                  <Text style={[styles.label, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                    Connections made
                  </Text>
                  <Text style={[styles.hint, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>
                    Optional
                  </Text>
                </View>
                {connectionsMade === null ? (
                  <Pressable
                    onPress={() => setConnectionsMade(0)}
                    style={[styles.trackButton, { borderColor: tokens.colors.borderStrong }]}
                  >
                    <Text style={[styles.trackLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                      Add count
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.stepper}>
                    <Pressable
                      accessibilityLabel="Decrease connections made"
                      onPress={() => setConnectionsMade((current) => Math.max(0, (current ?? 0) - 1))}
                      style={[styles.stepButton, { borderColor: tokens.colors.borderStrong }]}
                    >
                      <FontAwesome name="minus" size={11} color={tokens.colors.textSecondary} />
                    </Pressable>
                    <Text style={[styles.count, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.mono }]}>
                      {connectionsMade}
                    </Text>
                    <Pressable
                      accessibilityLabel="Increase connections made"
                      onPress={() => setConnectionsMade((current) => (current ?? 0) + 1)}
                      style={[styles.stepButton, { borderColor: tokens.colors.borderStrong }]}
                    >
                      <FontAwesome name="plus" size={11} color={tokens.colors.textSecondary} />
                    </Pressable>
                  </View>
                )}
              </View>
              {error ? (
                <Text style={[styles.error, { color: tokens.colors.danger, fontFamily: tokens.typography.sans }]}>
                  {error}
                </Text>
              ) : null}
            </>
          )}

          <View style={[styles.footer, { borderTopColor: tokens.colors.divider }]}>
            <Pressable
              disabled={submitting}
              onPress={onDismiss}
              style={[styles.secondaryButton, { borderColor: tokens.colors.borderStrong }]}
            >
              <Text style={[styles.buttonLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>
                Not now
              </Text>
            </Pressable>
            <Pressable
              disabled={isLoading || submitting}
              onPress={() => void handleSubmit()}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: tokens.colors.accent,
                  opacity: isLoading || submitting ? 0.5 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={tokens.colors.textInverse} size="small" />
              ) : (
                <Text style={[styles.buttonLabel, { color: tokens.colors.textInverse, fontFamily: tokens.typography.sans }]}>
                  Submit review
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonLabel: { fontSize: 13, fontWeight: '700' },
  connectionsCopy: { flex: 1, gap: 2 },
  connectionsField: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingTop: 16,
  },
  count: { fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '700', minWidth: 28, textAlign: 'center' },
  dragHandle: { alignSelf: 'center', borderRadius: 2, height: 4, marginBottom: 16, width: 36 },
  error: { fontSize: 12, lineHeight: 17, paddingHorizontal: 16, paddingTop: 12 },
  field: { gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, padding: 16 },
  hint: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  loading: { alignItems: 'center', height: 146, justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject },
  primaryButton: { alignItems: 'center', borderRadius: 6, flex: 1, justifyContent: 'center', minHeight: 38 },
  ratingButton: { alignItems: 'center', borderRadius: 5, borderWidth: 1, flex: 1, height: 42, justifyContent: 'center' },
  ratingRow: { flexDirection: 'row', gap: 8 },
  safeArea: { flex: 1, justifyContent: 'flex-end' },
  secondaryButton: { alignItems: 'center', borderRadius: 6, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 38 },
  sheet: { borderTopLeftRadius: 10, borderTopRightRadius: 10, borderTopWidth: 1, paddingTop: 10 },
  stepButton: { alignItems: 'center', borderRadius: 5, borderWidth: 1, height: 32, justifyContent: 'center', width: 32 },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  subtitle: { fontSize: 13, lineHeight: 18, paddingHorizontal: 16, paddingTop: 4 },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 23, paddingHorizontal: 16 },
  trackButton: { borderRadius: 5, borderWidth: 1, minHeight: 32, justifyContent: 'center', paddingHorizontal: 12 },
  trackLabel: { fontSize: 12, fontWeight: '600' },
});

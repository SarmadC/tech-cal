import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { CommunityReportInput } from '@kurecal/domain';

import { useAppTheme } from '../../providers/ThemeProvider';

const REPORT_REASONS: Array<{
  value: CommunityReportInput['reason'];
  label: string;
  description: string;
}> = [
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Targeted abuse, intimidation, or repeated hostility.',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'Promotional noise, scams, or repeated low-value posting.',
  },
  {
    value: 'hate',
    label: 'Hate',
    description: 'Dehumanizing or hateful language aimed at a protected group.',
  },
  {
    value: 'sexual-content',
    label: 'Sexual content',
    description: 'Sexual material that does not belong in this community.',
  },
  {
    value: 'misinformation',
    label: 'Misinformation',
    description: 'Misleading or false claims presented as fact.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Anything else that needs moderator review.',
  },
];

export interface CommunityReportTarget {
  id: string;
  type: CommunityReportInput['subjectType'];
  title: string;
  context?: string;
}

export function CommunityReportComposer({
  visible,
  target,
  submitting = false,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  target: CommunityReportTarget | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: CommunityReportInput) => Promise<void>;
}) {
  const { tokens } = useAppTheme();
  const [reason, setReason] = useState<CommunityReportInput['reason']>('harassment');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }

    setReason('harassment');
    setDetails('');
  }, [target?.id, visible]);

  const submitDisabled = useMemo(
    () => submitting || !target,
    [submitting, target]
  );

  if (!target) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: tokens.colors.overlay }]}>
        <Pressable style={styles.dismissTarget} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.colors.surface,
              borderColor: tokens.colors.border,
              borderTopLeftRadius: tokens.radius.lg,
              borderTopRightRadius: tokens.radius.lg,
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text
              style={[
                styles.kicker,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              REPORT {target.type.toUpperCase()}
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {target.title}
            </Text>

            {target.context ? (
              <Text
                style={[
                  styles.context,
                  {
                    color: tokens.colors.textSecondary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                {target.context}
              </Text>
            ) : null}

            <View style={styles.reasonList}>
              {REPORT_REASONS.map((option) => {
                const selected = option.value === reason;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setReason(option.value)}
                    style={[
                      styles.reasonCard,
                      {
                        backgroundColor: selected
                          ? tokens.colors.accentSoft
                          : tokens.colors.input,
                        borderColor: selected
                          ? tokens.colors.accent
                          : tokens.colors.border,
                        borderRadius: tokens.radius.sm,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonLabel,
                        {
                          color: selected
                            ? tokens.colors.textPrimary
                            : tokens.colors.textPrimary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.reasonDescription,
                        {
                          color: selected
                            ? tokens.colors.textSecondary
                            : tokens.colors.textSecondary,
                          fontFamily: tokens.typography.sans,
                        },
                      ]}
                    >
                      {option.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.noteBlock}>
              <Text
                style={[
                  styles.fieldLabel,
                  {
                    color: tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              >
                Additional context
              </Text>
              <TextInput
                multiline
                value={details}
                onChangeText={setDetails}
                placeholder="Add any detail that helps moderators review faster."
                placeholderTextColor={tokens.colors.textTertiary}
                maxLength={1500}
                style={[
                  styles.textarea,
                  {
                    backgroundColor: tokens.colors.input,
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.textPrimary,
                    fontFamily: tokens.typography.sans,
                  },
                ]}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                disabled={submitting}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: tokens.colors.input,
                    borderColor: tokens.colors.border,
                    borderRadius: tokens.radius.pill,
                    opacity: submitting ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.secondaryButtonLabel,
                    {
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={submitDisabled}
                onPress={() =>
                  onSubmit({
                    subjectType: target.type,
                    subjectId: target.id,
                    reason,
                    details: details.trim() || undefined,
                  })
                }
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: tokens.colors.textPrimary,
                    borderRadius: tokens.radius.pill,
                    opacity: submitDisabled ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.primaryButtonLabel,
                    {
                      color: tokens.colors.textInverse,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {submitting ? 'Sending...' : 'Submit report'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  context: {
    fontSize: 14,
    lineHeight: 20,
  },
  dismissTarget: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  noteBlock: {
    gap: 8,
  },
  primaryButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  reasonCard: {
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  reasonDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  reasonList: {
    gap: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheet: {
    borderWidth: 1,
    paddingBottom: Platform.select({ ios: 28, default: 20 }),
  },
  sheetContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  textarea: {
    borderWidth: 1,
    fontSize: 15,
    minHeight: 120,
    padding: 14,
    textAlignVertical: 'top',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
});

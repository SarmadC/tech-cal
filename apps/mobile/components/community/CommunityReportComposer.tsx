import { useEffect, useState } from 'react';
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
import { KureButton } from '@/components/chrome/KureButton';
import { useAppTheme } from '@/providers/ThemeProvider';

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
            <Text style={[styles.kicker, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>REPORT {target.type.toUpperCase()}</Text>
            <Text style={[styles.title, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{target.title}</Text>
            {target.context ? (
              <Text style={[styles.context, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>
                {target.context}
              </Text>
            ) : null}

            <View style={styles.reasonList}>
              {REPORT_REASONS.map((option) => {
                const selected = option.value === reason;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.reasonCard,
                      {
                        backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.input,
                        borderColor: selected ? tokens.colors.accent : tokens.colors.border,
                        borderRadius: tokens.radius.sm,
                      },
                    ]}
                    onPress={() => setReason(option.value)}
                  >
                    <Text
                      style={[
                        styles.reasonLabel,
                        {
                          color: selected ? tokens.colors.accent : tokens.colors.textPrimary,
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
                          color: selected ? tokens.colors.textPrimary : tokens.colors.textSecondary,
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
              <Text style={[styles.fieldLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Additional context</Text>
              <TextInput
                multiline
                value={details}
                onChangeText={setDetails}
                placeholder="Add any detail that will help moderators review faster."
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
              <KureButton variant="secondary" onPress={onClose} disabled={submitting}>
                Cancel
              </KureButton>
              <KureButton
                onPress={() =>
                  onSubmit({
                    subjectType: target.type,
                    subjectId: target.id,
                    reason,
                    details: details.trim() || undefined,
                  })
                }
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Submit report'}
              </KureButton>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissTarget: {
    flex: 1,
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
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  context: {
    fontSize: 14,
    lineHeight: 20,
  },
  reasonList: {
    gap: 10,
  },
  reasonCard: {
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  reasonDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  noteBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  actions: {
    gap: 10,
    paddingTop: 4,
  },
});

import type {
  CommunityReportInput,
  CommunityReportSubjectType,
} from "@kurecal/domain";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { submitMobileCommunityReport } from "../../lib/mobileApi";
import { useAppTheme } from "../../providers/ThemeProvider";

type Reason = CommunityReportInput["reason"];

const REASONS: Array<{ key: Reason; label: string; description: string }> = [
  { key: "spam", label: "Spam", description: "Repetitive or off-topic" },
  {
    key: "harassment",
    label: "Harassment",
    description: "Targeted, personal attacks",
  },
  { key: "hate", label: "Hate speech", description: "Slurs, threats, bigotry" },
  {
    key: "sexual-content",
    label: "Sexual content",
    description: "Explicit or inappropriate",
  },
  {
    key: "misinformation",
    label: "Misinformation",
    description: "False or misleading claims",
  },
  { key: "other", label: "Other", description: "Tell us in the notes" },
];

interface CommunityThreadReportSheetProps {
  visible: boolean;
  subjectType: CommunityReportSubjectType;
  subjectId: string | null;
  onDismiss: () => void;
  onSubmitted?: () => void;
}

export function CommunityThreadReportSheet({
  onDismiss,
  onSubmitted,
  subjectId,
  subjectType,
  visible,
}: CommunityThreadReportSheetProps) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReason(null);
      setDetails("");
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const canSubmit = Boolean(reason) && !submitting && Boolean(subjectId);

  const handleSubmit = async () => {
    if (!reason || !subjectId) {
      setError("Pick a reason first.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitMobileCommunityReport({
        subjectType,
        subjectId,
        reason,
        details: details.trim() || undefined,
      });
      onSubmitted?.();
      onDismiss();
    } catch (nextError) {
      // Always show a generic message in the UI; log the raw error for devs.
      console.warn("submitMobileCommunityReport failed", nextError);
      setError("Couldn't submit the report. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close report sheet"
        style={[styles.overlay, { backgroundColor: tokens.colors.overlay }]}
        onPress={onDismiss}
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
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: tokens.colors.borderStrong },
            ]}
          />
          <Text
            style={[
              styles.title,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Report content
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Help us understand what's wrong. Our team reviews every report.
          </Text>

          {REASONS.map((entry, index) => {
            const selected = reason === entry.key;
            return (
              <Pressable
                key={entry.key}
                accessibilityRole="button"
                onPress={() => setReason(entry.key)}
                style={({ pressed }) => [
                  styles.reasonRow,
                  index < REASONS.length - 1 && {
                    borderBottomColor: tokens.colors.divider,
                    borderBottomWidth: 1,
                  },
                  pressed && {
                    backgroundColor: tokens.colors.surfaceMuted,
                  },
                ]}
              >
                <View style={styles.reasonCopy}>
                  <Text
                    style={{
                      color: tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    {entry.label}
                  </Text>
                  <Text
                    style={{
                      color: tokens.colors.textTertiary,
                      fontFamily: tokens.typography.sans,
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    {entry.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected
                        ? tokens.colors.accent
                        : tokens.colors.border,
                    },
                  ]}
                >
                  {selected ? (
                    <View
                      style={[
                        styles.radioDot,
                        { backgroundColor: tokens.colors.accent },
                      ]}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          <View style={styles.detailsField}>
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              Add details (optional)
            </Text>
            <TextInput
              accessibilityLabel="Report details"
              editable={!submitting}
              maxLength={1500}
              multiline
              onChangeText={setDetails}
              placeholder="Anything else our team should know?"
              placeholderTextColor={tokens.colors.textTertiary}
              style={[
                styles.detailsInput,
                {
                  backgroundColor: tokens.colors.surface,
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.sm,
                  color: tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
              value={details}
            />
          </View>

          {error ? (
            <Text
              style={{
                color: tokens.colors.danger,
                fontFamily: tokens.typography.sans,
                fontSize: 12,
                fontWeight: "500",
                paddingHorizontal: 16,
              }}
            >
              {error}
            </Text>
          ) : null}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  borderColor: tokens.colors.border,
                  borderRadius: tokens.radius.sm,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={{
                  color: tokens.colors.textSecondary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: canSubmit
                    ? tokens.colors.accent
                    : tokens.colors.accentSoft,
                  borderRadius: tokens.radius.sm,
                },
                pressed && canSubmit && styles.pressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={tokens.colors.textInverse} />
              ) : (
                <Text
                  style={{
                    color: canSubmit
                      ? tokens.colors.textInverse
                      : tokens.colors.textTertiary,
                    fontFamily: tokens.typography.sans,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  Submit report
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
  cancelButton: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
  },
  detailsField: {
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  detailsInput: {
    borderWidth: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    minHeight: 72,
    padding: 10,
    textAlignVertical: "top",
  },
  dragHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 36,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    padding: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pressed: {
    opacity: 0.82,
  },
  radio: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  radioDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  reasonCopy: {
    flex: 1,
    gap: 2,
  },
  reasonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  safeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    maxHeight: "90%",
    paddingTop: 10,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 18,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
});

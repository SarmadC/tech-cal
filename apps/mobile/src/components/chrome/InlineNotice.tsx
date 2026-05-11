import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../providers/ThemeProvider";

type InlineNoticeTone = "info" | "success" | "warning" | "danger";

interface InlineNoticeProps {
  title: string;
  description?: string;
  tone?: InlineNoticeTone;
  action?: ReactNode;
}

export function InlineNotice({
  title,
  description,
  tone = "info",
  action,
}: InlineNoticeProps) {
  const { tokens } = useAppTheme();
  const toneColor =
    tone === "success"
      ? tokens.colors.success
      : tone === "warning"
        ? tokens.colors.warning
        : tone === "danger"
          ? tokens.colors.danger
          : tokens.colors.info;

  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: tokens.colors.surfaceStrong,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
      <View style={[styles.rail, { backgroundColor: toneColor }]} />
      <View style={styles.copy}>
        <Text
          style={[
            styles.title,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[
              styles.description,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {description}
          </Text>
        ) : null}
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },
  rail: {
    width: 2,
    borderRadius: 1,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  action: {
    paddingTop: 4,
  },
});

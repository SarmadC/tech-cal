import { Pressable, StyleSheet, Text, View } from "react-native";

import { BrandLoadingLogo } from "./brand/BrandLoadingLogo";
import { useAppTheme } from "../providers/ThemeProvider";

interface ScreenStateViewProps {
  description: string;
  mode: "empty" | "error" | "loading";
  title: string;
  onRetry?: () => void;
}

export function ScreenStateView({
  description,
  mode,
  title,
  onRetry,
}: ScreenStateViewProps) {
  const { tokens } = useAppTheme();

  if (mode === "loading") {
    return (
      <View style={styles.loadingRoot}>
        <BrandLoadingLogo color={tokens.colors.textPrimary} size={64} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.md,
        },
      ]}
    >
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
      {mode === "error" && onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: tokens.colors.pillActive,
              borderColor: tokens.colors.pillActive,
              borderRadius: tokens.radius.md,
            },
            pressed ? styles.retryButtonPressed : null,
          ]}
        >
          <Text
            style={[
              styles.retryLabel,
              {
                color: tokens.colors.pillActiveText,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  loadingRoot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 200,
    paddingVertical: 24,
  },
  retryButton: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 32,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  retryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  retryLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  root: {
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 200,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});

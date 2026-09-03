import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BrandPageLoadingState } from "../brand/BrandPageLoadingState";
import { useAppTheme } from "../../providers/ThemeProvider";
import { KureCard } from "./KureCard";

type ScreenStateMode = "loading" | "empty" | "error";
type ScreenStateVariant = "default" | "discover" | "plain";

interface ScreenStateProps {
  action?: ReactNode;
  description?: string;
  fullHeight?: boolean;
  mode: ScreenStateMode;
  title?: string;
  variant?: ScreenStateVariant;
}

export function ScreenState({
  action,
  description,
  fullHeight = false,
  mode,
  title,
  variant = "default",
}: ScreenStateProps) {
  const { tokens } = useAppTheme();
  const showSpinner = mode === "loading";
  const useCard = variant === "default";
  const surfaceStyle =
    variant === "discover"
      ? {
          backgroundColor: tokens.colors.discoverToolbar,
          borderColor: tokens.colors.discoverToolbarBorder,
        }
      : {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.border,
        };

  if (showSpinner) {
    return (
      <BrandPageLoadingState
        style={[styles.loadingSurface, fullHeight && styles.fullHeightSurface]}
      />
    );
  }

  const content = (
    <View style={[styles.content, fullHeight && styles.fullHeight]}>
      {title ? (
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
      ) : null}
      {description ? (
        <Text
          style={[
            styles.description,
            {
              color:
                variant === "discover"
                  ? tokens.colors.discoverTextMuted
                  : tokens.colors.textSecondary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );

  if (useCard) {
    return <KureCard>{content}</KureCard>;
  }

  return (
    <View
      style={[
        styles.surface,
        surfaceStyle,
        fullHeight && styles.fullHeightSurface,
        variant === "plain" && styles.plainSurface,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    paddingTop: 4,
  },
  content: {
    gap: 6,
    justifyContent: "center",
    minHeight: 72,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  fullHeight: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
  },
  fullHeightSurface: {
    minHeight: 160,
  },
  loadingSurface: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 240,
    paddingVertical: 28,
    gap: 12,
  },
  plainSurface: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  surface: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
});

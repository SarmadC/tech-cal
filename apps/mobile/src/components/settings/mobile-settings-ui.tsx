import { SymbolView } from "expo-symbols";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../providers/ThemeProvider";
import type { AppThemeTokens } from "../../theme/tokens";

type SymbolName = React.ComponentProps<typeof SymbolView>["name"];

interface SettingsDetailScaffoldProps {
  action?: React.ReactNode;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  subtitle?: string;
  title: string;
}

interface SettingsGroupProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface SettingsRowProps {
  destructive?: boolean;
  disabled?: boolean;
  icon: SymbolName;
  onPress?: () => void;
  rightLabel?: string;
  showChevron?: boolean;
  subtitle?: string;
  title: string;
}

interface SettingsSwitchRowProps {
  icon: SymbolName;
  onValueChange: (value: boolean) => void;
  subtitle?: string;
  title: string;
  value: boolean;
}

interface SettingsAvatarProps {
  initials: string;
  size?: number;
}

interface SettingsButtonProps {
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

function themedStyles(tokens: AppThemeTokens) {
  const isDark = tokens.mode === "dark";

  return {
    card: {
      backgroundColor: tokens.colors.surfaceStrong,
      borderColor: isDark
        ? "rgba(255, 255, 255, 0.075)"
        : "rgba(15, 23, 42, 0.085)",
      divider: isDark
        ? "rgba(255, 255, 255, 0.055)"
        : "rgba(15, 23, 42, 0.07)",
    },
    icon: {
      backgroundColor: isDark
        ? "rgba(255, 255, 255, 0.055)"
        : "rgba(15, 23, 42, 0.055)",
      color: tokens.colors.textSecondary,
    },
  };
}

export function SettingsDetailScaffold({
  action,
  children,
  contentStyle,
  footer,
  subtitle,
  title,
}: SettingsDetailScaffoldProps) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.safeArea, { backgroundColor: tokens.colors.shell }]}
    >
      <LinearGradient
        colors={tokens.gradients.page}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.detailHeader,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: tokens.colors.divider,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <SymbolView
            name="chevron.left"
            size={17}
            tintColor={tokens.colors.textPrimary}
            type="monochrome"
          />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text
            numberOfLines={1}
            style={[
              styles.detailTitle,
              {
                color: tokens.colors.textPrimary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={[
                styles.detailSubtitle,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerAction}>{action}</View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.detailContent,
          {
            paddingBottom: Math.max(insets.bottom + 28, 52),
          },
          contentStyle,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom + 12, 24),
              backgroundColor: tokens.colors.header,
              borderTopColor: tokens.colors.headerBorder,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function SettingsGroup({ children, style }: SettingsGroupProps) {
  const { tokens } = useAppTheme();
  const palette = themedStyles(tokens);

  return (
    <View style={[styles.group, style]}>
      {children}
    </View>
  );
}

export function SettingsRow({
  destructive = false,
  disabled = false,
  icon,
  onPress,
  rightLabel,
  showChevron = Boolean(onPress),
  subtitle,
  title,
}: SettingsRowProps) {
  const { tokens } = useAppTheme();
  const palette = themedStyles(tokens);
  const textColor = destructive ? tokens.colors.danger : tokens.colors.textPrimary;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.rowIcon}>
        <SymbolView
          name={icon}
          size={18}
          tintColor={destructive ? tokens.colors.danger : palette.icon.color}
          type="monochrome"
        />
      </View>
      <View style={styles.rowCopy}>
        <Text
          numberOfLines={1}
          style={[
            styles.rowTitle,
            {
              color: textColor,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[
              styles.rowSubtitle,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightLabel ? (
        <Text
          numberOfLines={1}
          style={[
            styles.rightLabel,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {rightLabel}
        </Text>
      ) : null}
      {showChevron ? (
        <SymbolView
          name="chevron.right"
          size={15}
          tintColor={tokens.colors.textTertiary}
          type="monochrome"
        />
      ) : null}
    </Pressable>
  );
}

export function SettingsSwitchRow({
  icon,
  onValueChange,
  subtitle,
  title,
  value,
}: SettingsSwitchRowProps) {
  const { tokens } = useAppTheme();
  const palette = themedStyles(tokens);

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <SymbolView
          name={icon}
          size={18}
          tintColor={palette.icon.color}
          type="monochrome"
        />
      </View>
      <View style={styles.rowCopy}>
        <Text
          style={[
            styles.rowTitle,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.rowSubtitle,
              {
                color: tokens.colors.textTertiary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={value ? "#FFFFFF" : tokens.colors.textSecondary}
        trackColor={{
          false: tokens.mode === "dark" ? "#34363A" : "#D1D5DB",
          true: tokens.colors.pillActive,
        }}
        value={value}
      />
    </View>
  );
}

export function SettingsDivider() {
  const { tokens } = useAppTheme();
  const palette = themedStyles(tokens);

  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: palette.card.divider,
        },
      ]}
    />
  );
}

export function SettingsAvatar({ initials, size = 50 }: SettingsAvatarProps) {
  const { tokens } = useAppTheme();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tokens.colors.pillActive,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarInitials,
          {
            color: tokens.colors.pillActiveText,
            fontFamily: tokens.typography.sans,
            fontSize: Math.round(size * 0.34),
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

export function SettingsButton({
  destructive = false,
  disabled = false,
  label,
  onPress,
  variant = "primary",
}: SettingsButtonProps) {
  const { tokens } = useAppTheme();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: destructive
            ? tokens.colors.textPrimary
            : isPrimary
              ? tokens.colors.pillActive
              : "transparent",
          borderColor: destructive
            ? "transparent"
            : isPrimary
              ? tokens.colors.pillActive
              : tokens.colors.borderStrong,
        },
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          {
            color: destructive
              ? tokens.colors.danger
              : isPrimary
                ? tokens.colors.pillActiveText
                : tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SettingsFieldLabel({
  children,
  helper,
}: {
  children: React.ReactNode;
  helper?: string;
}) {
  const { tokens } = useAppTheme();

  return (
    <View style={styles.fieldLabelWrap}>
      <Text
        style={[
          styles.fieldLabel,
          {
            color: tokens.colors.textTertiary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {children}
      </Text>
      {helper ? (
        <Text
          style={[
            styles.fieldHelper,
            {
              color: tokens.colors.textTertiary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  detailHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 6,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitleWrap: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  headerAction: {
    alignItems: "flex-end",
    minWidth: 32,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  detailSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  detailContent: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  group: {},
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: 4,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  rowSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  rightLabel: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "400",
    maxWidth: 118,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontWeight: "800",
    letterSpacing: 0,
  },
  button: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  fieldLabelWrap: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.72,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  fieldHelper: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.992 }],
  },
  disabled: {
    opacity: 0.48,
  },
});

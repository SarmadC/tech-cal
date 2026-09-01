import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../providers/ThemeProvider";

export type ThreadActionKey =
  | "edit"
  | "delete"
  | "report"
  | "block"
  | "copyLink"
  | "cancel";

export interface ThreadActionOption {
  key: ThreadActionKey;
  label: string;
  destructive?: boolean;
}

interface CommunityThreadActionMenuProps {
  visible: boolean;
  title?: string;
  options: ThreadActionOption[];
  onSelect: (key: ThreadActionKey) => void;
  onDismiss: () => void;
}

export function CommunityThreadActionMenu({
  onDismiss,
  onSelect,
  options,
  title,
  visible,
}: CommunityThreadActionMenuProps) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onDismiss}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close menu"
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
          {title ? (
            <Text
              style={[
                styles.title,
                {
                  color: tokens.colors.textTertiary,
                  fontFamily: tokens.typography.sans,
                },
              ]}
            >
              {title}
            </Text>
          ) : null}
          {options.map((option, index) => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              onPress={() => onSelect(option.key)}
              style={({ pressed }) => [
                styles.option,
                index < options.length - 1 && {
                  borderBottomColor: tokens.colors.divider,
                  borderBottomWidth: 1,
                },
                pressed && { backgroundColor: tokens.colors.surfaceMuted },
              ]}
            >
              <Text
                style={{
                  color: option.destructive
                    ? tokens.colors.danger
                    : tokens.colors.textPrimary,
                  fontFamily: tokens.typography.sans,
                  fontSize: 15,
                  fontWeight: option.destructive ? "700" : "600",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 36,
  },
  option: {
    alignItems: "flex-start",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
});

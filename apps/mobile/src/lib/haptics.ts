import * as Haptics from 'expo-haptics';

// Fire-and-forget wrappers; haptics must never throw into UI flows
// (simulators and some devices reject the native call).
export const haptics = {
  light: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  selection: () => {
    void Haptics.selectionAsync().catch(() => {});
  },
  success: () => {
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
  },
  warning: () => {
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
  },
};

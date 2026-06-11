import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type ActionSheetOption = {
  label: string;
  destructive?: boolean;
  onPress?: () => void;
};

/**
 * Native iOS action sheet with an Alert fallback on other platforms.
 * A "Cancel" button is always appended automatically.
 */
export function showActionSheet({
  title,
  message,
  options,
}: {
  title?: string;
  message?: string;
  options: ActionSheetOption[];
}) {
  if (Platform.OS === 'ios') {
    const labels = [...options.map((option) => option.label), 'Cancel'];
    const destructiveButtonIndex = options.findIndex(
      (option) => option.destructive,
    );

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: labels,
        cancelButtonIndex: labels.length - 1,
        destructiveButtonIndex:
          destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (buttonIndex) => {
        options[buttonIndex]?.onPress?.();
      },
    );
    return;
  }

  Alert.alert(title ?? '', message, [
    ...options.map((option) => ({
      text: option.label,
      style: option.destructive ? ('destructive' as const) : undefined,
      onPress: option.onPress,
    })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}

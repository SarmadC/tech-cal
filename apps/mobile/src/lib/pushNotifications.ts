import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { registerPushToken, unregisterPushToken } from './mobileApi';
import { sessionStorage } from './sessionStorage';

const DEVICE_ID_KEY = 'kurecal_push_device_id';

let handlerConfigured = false;
let nativeModuleWarningLogged = false;

interface NotificationResponseLike {
  notification: {
    request: {
      content: {
        data?: Record<string, unknown>;
      };
    };
  };
}

interface NotificationsModule {
  addNotificationResponseReceivedListener: (
    listener: (response: NotificationResponseLike) => void
  ) => { remove: () => void };
  getExpoPushTokenAsync: (input: {
    projectId: string;
  }) => Promise<{ data?: string }>;
  getLastNotificationResponseAsync: () => Promise<NotificationResponseLike | null>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  setNotificationHandler: (handler: unknown) => void;
}

function logMissingNativeModule() {
  if (nativeModuleWarningLogged) {
    return;
  }

  nativeModuleWarningLogged = true;
  console.warn(
    '[push] Native push notification modules are unavailable. Rebuild the Expo dev client to enable push notifications.'
  );
}

function getNotificationsModule(): NotificationsModule | null {
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    logMissingNativeModule();
    return null;
  }
}

function isPhysicalDevice(): boolean {
  try {
    return Boolean(
      (require('expo-device') as { isDevice?: boolean }).isDevice
    );
  } catch {
    return Boolean((Constants as { isDevice?: boolean }).isDevice ?? true);
  }
}

function getNativeApplicationVersion(): string | undefined {
  try {
    return (require('expo-application') as {
      nativeApplicationVersion?: string | null;
    }).nativeApplicationVersion ?? undefined;
  } catch {
    return undefined;
  }
}

export function setupNotificationHandler(): void {
  if (handlerConfigured) return;
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await sessionStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated =
    (globalThis.crypto?.randomUUID?.() as string | undefined) ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await sessionStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

function resolveExpoProjectId(): string | null {
  const expoConfig = Constants.expoConfig ?? Constants.easConfig ?? null;
  const projectId =
    (expoConfig as { extra?: { eas?: { projectId?: string } } })?.extra?.eas
      ?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId ??
    null;
  return projectId ?? null;
}

export async function getLastNotificationData(): Promise<Record<string, unknown> | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification.request.content.data ?? null;
}

export function addNotificationResponseListener(
  listener: (data: Record<string, unknown>) => void
): { remove: () => void } {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return { remove: () => undefined };
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    listener(response.notification.request.content.data ?? {});
  });
}

export async function registerForPushNotificationsAsync(): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications || !isPhysicalDevice()) {
    return;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return;
    }

    const projectId = resolveExpoProjectId();
    if (!projectId) {
      console.warn('[push] Missing Expo projectId; skipping token fetch.');
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const expoPushToken = tokenResponse.data;
    if (!expoPushToken) return;

    const deviceId = await getOrCreateDeviceId();
    await registerPushToken({
      expoPushToken,
      deviceId,
      platform: Platform.OS,
      appVersion: getNativeApplicationVersion(),
    });
  } catch (error) {
    console.warn('[push] Failed to register for push notifications.', error);
  }
}

export async function unregisterPushNotificationsAsync(): Promise<void> {
  try {
    const deviceId = await sessionStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) return;
    await unregisterPushToken({ deviceId });
  } catch (error) {
    console.warn('[push] Failed to unregister push token.', error);
  }
}

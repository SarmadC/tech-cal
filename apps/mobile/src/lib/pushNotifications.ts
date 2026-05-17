import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken, unregisterPushToken } from './mobileApi';
import { sessionStorage } from './sessionStorage';

const DEVICE_ID_KEY = 'kurecal_push_device_id';

let handlerConfigured = false;

export function setupNotificationHandler(): void {
  if (handlerConfigured) return;
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

export async function registerForPushNotificationsAsync(): Promise<void> {
  if (!Device.isDevice) {
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
      appVersion: Application.nativeApplicationVersion ?? undefined,
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

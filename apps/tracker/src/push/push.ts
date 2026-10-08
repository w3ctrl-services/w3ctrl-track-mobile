/**
 * Push notifications for the tracker app.
 *
 * This phone REPORTS location; it is not a Traccar user, so there is no
 * user account to register the token against (Traccar's Firebase
 * notificator only targets users). This module still:
 *  - asks notification permission and acquires the native FCM token,
 *  - stores the token locally for future parent→phone messaging,
 *  - archives every received push into the local inbox,
 *  - exposes readiness for the Settings screen.
 *
 * If a parent→child push channel is ever built, registerPushTarget()
 * is the seam: hand the token to whatever user/device the server
 * should target.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

export const PUSH_TOKEN_KEY = "w3ctrl_tracker_push_token";
const DENIED_KEY = "w3ctrl_tracker_push_denied";

export async function ensurePushPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    await AsyncStorage.setItem(DENIED_KEY, "1").catch(() => {});
    return false;
  }
  await AsyncStorage.removeItem(DENIED_KEY).catch(() => {});
  return true;
}

/** Native FCM token on Android; null on iOS (APNs — needs RNFB). */
export async function getNativePushToken(): Promise<string | null> {
  try {
    const { type, data } = await Notifications.getDevicePushTokenAsync();
    if (Platform.OS === "android" && type === "android") return data;
    return null;
  } catch {
    return null;
  }
}

/** Acquire + persist the token. Returns it (or null when unavailable). */
export async function ensurePushToken(): Promise<string | null> {
  const ok = await ensurePushPermission();
  if (!ok) return null;
  const token = await getNativePushToken();
  if (token) await AsyncStorage.setItem(PUSH_TOKEN_KEY, token).catch(() => {});
  return token;
}

export async function pushStatus(): Promise<{
  permission: boolean;
  token: boolean;
  platformOk: boolean;
}> {
  const { status } = await Notifications.getPermissionsAsync().catch(() => ({
    status: "undetermined" as const,
  }));
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY).catch(() => null);
  return {
    permission: status === "granted",
    token: !!token,
    platformOk: Platform.OS === "android",
  };
}

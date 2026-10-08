/**
 * Push notifications — FCM token lifecycle for the customer app.
 *
 * End to end:
 *  1. This module asks the OS for notification permission and reads the
 *     NATIVE device push token (FCM on Android) via
 *     Notifications.getDevicePushTokenAsync().
 *  2. The token is merged into the Traccar user's
 *     `attributes.notificationTokens` (comma-separated) with PUT /users/:id.
 *  3. When an alert rule fires with the firebase channel, Traccar's
 *     Firebase notificator sends the push to every registered token.
 *
 * Server requirement: traccar.xml must configure the firebase notificator
 * (notificator.firebase.serviceAccount). Without it, tokens register fine
 * but nothing is ever sent. Never add "firebase" to notificator.types
 * without the key — Traccar fails to START (NPE in NotificatorFirebase).
 *
 * iOS note: getDevicePushTokenAsync() returns an APNs token on iOS, which
 * Traccar's FCM sender cannot use. iOS push needs the Firebase SDK in the
 * app (react-native-firebase) to mint an FCM token — tracked as a follow-up.
 * This module returns null on iOS and skips registration cleanly.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { traccar, type TraccarUser } from "@w3ctrl/api";

const TOKEN_KEY = "w3ctrl_push_token";
const DENIED_KEY = "w3ctrl_push_denied";

export async function pushPermissionDeniedBefore(): Promise<boolean> {
  return (await AsyncStorage.getItem(DENIED_KEY).catch(() => null)) === "1";
}

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

/**
 * Native push token Traccar can send to. On Android this IS the FCM token.
 * Returns null on iOS (APNs token — unusable by Traccar's FCM sender).
 */
export async function getNativePushToken(): Promise<string | null> {
  try {
    const { type, data } = await Notifications.getDevicePushTokenAsync();
    if (Platform.OS === "android" && type === "android") return data;
    return null;
  } catch {
    return null;
  }
}

function mergeTokens(existing: unknown, token: string): string {
  const list = String(existing ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.includes(token)) list.push(token);
  // Keep the list bounded — FCM tokens rotate; drop the oldest extras.
  return list.slice(-10).join(",");
}

/**
 * Register this device's FCM token on the Traccar user. Idempotent —
 * skips the PUT when the token is already registered.
 */
export async function registerPushToken(
  user: TraccarUser,
): Promise<"registered" | "already" | "unavailable" | "failed"> {
  const token = await getNativePushToken();
  if (!token) return "unavailable";
  const prev = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  const current = String(user.attributes?.notificationTokens ?? "");
  if (prev === token && current.split(/[,\s]+/).includes(token)) {
    return "already";
  }
  try {
    const attributes = {
      ...((user.attributes ?? {}) as Record<string, unknown>),
      notificationTokens: mergeTokens(current, token),
    };
    await traccar.updateUser({ ...user, attributes });
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    return "registered";
  } catch {
    return "failed";
  }
}

/** Current push readiness for settings UI. */
export async function pushStatus(): Promise<{
  permission: boolean;
  token: boolean;
  platformOk: boolean;
}> {
  const { status } = await Notifications.getPermissionsAsync().catch(() => ({
    status: "undetermined" as const,
  }));
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  return {
    permission: status === "granted",
    token: !!token,
    platformOk: Platform.OS === "android",
  };
}

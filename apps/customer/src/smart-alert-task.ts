/**
 * Background smart-alert checks for the customer app.
 *
 * Registers an OS background-fetch task ("w3ctrl-smart-alerts") that wakes
 * roughly every 15 minutes (iOS/Android decide the exact cadence), pulls
 * the latest positions, evaluates the user's smart rules, and raises local
 * notifications on hits.
 *
 * This runs in a headless JS context, so it wires its own token provider
 * (SecureStore) and reads the cached user itself — it never touches React
 * state.
 */
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  evaluateSmartAlerts,
  setTokenProvider,
  traccar,
  type TraccarUser,
} from "@w3ctrl/api";
import { pushHit, readRules, readStates, writeStates } from "./utils/smart-alerts";

const TASK_NAME = "w3ctrl-smart-alerts";
const TOKEN_KEY = "w3ctrl_token";
const USER_KEY = "w3ctrl_user";

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Headless context: provide the auth token ourselves.
    setTokenProvider(() => SecureStore.getItemAsync(TOKEN_KEY));

    const cached = await AsyncStorage.getItem(USER_KEY);
    const user = (cached ? JSON.parse(cached) : null) as TraccarUser | null;
    const rules = (await readRules(user)).filter((r) => r.enabled);
    if (rules.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    const [devices, positionList, geofences] = await Promise.all([
      traccar.devices(),
      traccar.positions(),
      traccar.geofences(),
    ]);
    if (devices.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;
    const positions: Record<number, (typeof positionList)[number]> = {};
    for (const p of positionList) positions[p.deviceId] = p;

    const states = await readStates();
    const { hits, states: next } = evaluateSmartAlerts({
      rules,
      devices,
      positions,
      geofences,
      nowMs: Date.now(),
      states,
    });
    await writeStates(next);

    for (const hit of hits) {
      await pushHit(hit);
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.granted) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `W3ctrl Track — ${hit.ruleName}`,
              body: hit.message,
            },
            trigger: null,
          });
        }
      } catch {
        /* notification failed — the hit is still in the feed */
      }
    }

    return hits.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the periodic background check. Safe to call on every launch —
 * re-registering an existing task is a no-op. The OS decides the actual
 * cadence (minimum ~15 min); the UI states this honestly.
 */
export async function registerSmartAlertTask(): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!registered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    /* background fetch unavailable (e.g. Expo Go) — foreground checks still work */
  }
}

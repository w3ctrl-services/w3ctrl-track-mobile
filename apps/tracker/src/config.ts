/**
 * SecureStore-backed configuration for W3ctrl Tracker.
 *
 * Everything the tracker needs to run unattended lives here: the portal
 * device ID, the ingest server URL, the settings PIN and the report
 * interval. Values survive app restarts and are encrypted on-device.
 */
import * as SecureStore from "expo-secure-store";

const KEYS = {
  deviceId: "trk_device_id",
  server: "trk_server",
  pin: "trk_pin",
  interval: "trk_interval",
  done: "trk_onboarding_done",
} as const;

export const DEFAULT_SERVER = "https://gpstracker.w3ctrl.com";
export const DEFAULT_INTERVAL_SEC = 180;

export interface Config {
  deviceId: string;
  server: string;
  pin: string;
  intervalSec: number;
  done: boolean;
}

export async function loadConfig(): Promise<Config> {
  const [deviceId, server, pin, interval, done] = await Promise.all([
    SecureStore.getItemAsync(KEYS.deviceId),
    SecureStore.getItemAsync(KEYS.server),
    SecureStore.getItemAsync(KEYS.pin),
    SecureStore.getItemAsync(KEYS.interval),
    SecureStore.getItemAsync(KEYS.done),
  ]);
  const parsed = interval ? parseInt(interval, 10) : NaN;
  return {
    deviceId: deviceId ?? "",
    server: server || DEFAULT_SERVER,
    pin: pin ?? "",
    intervalSec:
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_SEC,
    done: done === "1",
  };
}

export async function saveConfig(partial: Partial<Config>): Promise<void> {
  const ops: Promise<void>[] = [];
  if (partial.deviceId !== undefined) {
    ops.push(SecureStore.setItemAsync(KEYS.deviceId, partial.deviceId));
  }
  if (partial.server !== undefined) {
    ops.push(SecureStore.setItemAsync(KEYS.server, partial.server));
  }
  if (partial.pin !== undefined) {
    ops.push(SecureStore.setItemAsync(KEYS.pin, partial.pin));
  }
  if (partial.intervalSec !== undefined) {
    ops.push(
      SecureStore.setItemAsync(KEYS.interval, String(partial.intervalSec)),
    );
  }
  if (partial.done !== undefined) {
    ops.push(SecureStore.setItemAsync(KEYS.done, partial.done ? "1" : "0"));
  }
  await Promise.all(ops);
}

export async function clearConfig(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)),
  );
}

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
  childName: "trk_child_name",
  contact1Name: "trk_contact1_name",
  contact1Phone: "trk_contact1_phone",
  contact2Name: "trk_contact2_name",
  contact2Phone: "trk_contact2_phone",
} as const;

export const DEFAULT_SERVER = "https://gpstracker.w3ctrl.com";
export const DEFAULT_INTERVAL_SEC = 180;

export interface Config {
  deviceId: string;
  server: string;
  pin: string;
  intervalSec: number;
  done: boolean;
  childName: string;
  contact1Name: string;
  contact1Phone: string;
  contact2Name: string;
  contact2Phone: string;
}

export async function loadConfig(): Promise<Config> {
  const [deviceId, server, pin, interval, done, childName, c1n, c1p, c2n, c2p] =
    await Promise.all([
      SecureStore.getItemAsync(KEYS.deviceId),
      SecureStore.getItemAsync(KEYS.server),
      SecureStore.getItemAsync(KEYS.pin),
      SecureStore.getItemAsync(KEYS.interval),
      SecureStore.getItemAsync(KEYS.done),
      SecureStore.getItemAsync(KEYS.childName),
      SecureStore.getItemAsync(KEYS.contact1Name),
      SecureStore.getItemAsync(KEYS.contact1Phone),
      SecureStore.getItemAsync(KEYS.contact2Name),
      SecureStore.getItemAsync(KEYS.contact2Phone),
    ]);
  const parsed = interval ? parseInt(interval, 10) : NaN;
  return {
    deviceId: deviceId ?? "",
    server: server || DEFAULT_SERVER,
    pin: pin ?? "",
    intervalSec:
      Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL_SEC,
    done: done === "1",
    childName: childName ?? "",
    contact1Name: c1n ?? "",
    contact1Phone: c1p ?? "",
    contact2Name: c2n ?? "",
    contact2Phone: c2p ?? "",
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
  if (partial.childName !== undefined) {
    ops.push(SecureStore.setItemAsync(KEYS.childName, partial.childName));
  }
  if (partial.contact1Name !== undefined) {
    ops.push(SecureStore.setItemAsync(KEYS.contact1Name, partial.contact1Name));
  }
  if (partial.contact1Phone !== undefined) {
    ops.push(
      SecureStore.setItemAsync(KEYS.contact1Phone, partial.contact1Phone),
    );
  }
  if (partial.contact2Name !== undefined) {
    ops.push(SecureStore.setItemAsync(KEYS.contact2Name, partial.contact2Name));
  }
  if (partial.contact2Phone !== undefined) {
    ops.push(
      SecureStore.setItemAsync(KEYS.contact2Phone, partial.contact2Phone),
    );
  }
  await Promise.all(ops);
}

export async function clearConfig(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)),
  );
}

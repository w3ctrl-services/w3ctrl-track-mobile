/**
 * Background location engine for W3ctrl Tracker.
 *
 * The OS wakes the "w3ctrl-tracking" task every `intervalSec` seconds (or
 * 50 m of movement); the task reads the stored config, grabs the latest
 * fix plus battery state, and GETs it to the portal's /track/ ingest
 * endpoint (OsmAnd protocol — same contract as the Traccar Client app).
 *
 * Thrown errors use i18n keys as their message so UI code can run them
 * through `t()` — this module has no access to React hooks.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { TraccarError } from "@w3ctrl/api";
import { DEFAULT_SERVER, loadConfig } from "./config";

export const TRACKING_TASK = "w3ctrl-tracking";
const LAST_REPORT_KEY = "trk_last_report";
const LANG_KEY = "w3ctrl_lang";

/* ------------------------------------------------------------------ types */

export interface PositionReport {
  lat: number;
  lon: number;
  accuracy?: number | null;
  speed?: number | null;
  /** e.g. "sos" — becomes a Traccar alarm event server-side */
  alarm?: string;
}

export interface LastReport {
  at: number;
  accuracy: number | null;
  battery: number | null;
}

interface BatteryInfo {
  level: number | null;
  charging: boolean | null;
}

interface TaskData {
  locations?: Location.LocationObject[];
}

/* ------------------------------------------------- user-facing key strings */

const K = {
  fgDenied: "Location permission is required to track this phone.",
  bgDenied:
    "Background (“Always”) location permission is required for background tracking.",
  noDevice: "Set up this phone first.",
  unknownDevice:
    "Unknown device ID — add this phone in your W3ctrl Track account first (Devices → Add → Phone).",
} as const;

/* ------------------------------------------------------- background task */

if (!TaskManager.isTaskDefined(TRACKING_TASK)) {
  TaskManager.defineTask(
    TRACKING_TASK,
    async (body: { data: unknown; error: unknown }) => {
      try {
        if (body.error) return;
        const data = body.data as TaskData | null | undefined;
        const locations = data?.locations;
        if (!locations || locations.length === 0) return;
        const latest = locations[locations.length - 1];
        await reportToServer({
          lat: latest.coords.latitude,
          lon: latest.coords.longitude,
          accuracy: latest.coords.accuracy,
          speed: latest.coords.speed,
        });
      } catch {
        // Never throw from a background task — the OS kills tasks that
        // fail repeatedly. The next wake-up retries.
      }
    },
  );
}

/* -------------------------------------------------------------- helpers */

async function readBattery(): Promise<BatteryInfo> {
  try {
    const state = await Battery.getPowerStateAsync();
    const charging =
      state.batteryState === Battery.BatteryState.CHARGING ||
      state.batteryState === Battery.BatteryState.FULL;
    return {
      level:
        state.batteryLevel >= 0
          ? Math.round(state.batteryLevel * 100)
          : null,
      charging:
        state.batteryState === Battery.BatteryState.UNKNOWN ? null : charging,
    };
  } catch {
    return { level: null, charging: null };
  }
}

/** Foreground-service notification text in the user's language. */
async function notifStrings(): Promise<{ title: string; body: string }> {
  try {
    const lang = await AsyncStorage.getItem(LANG_KEY);
    if (lang === "hi") {
      return {
        title: "W3ctrl Tracker सक्रिय है",
        body: "आपके W3ctrl Track खाते के साथ लोकेशन साझा हो रही है",
      };
    }
  } catch {
    /* fall through to English */
  }
  return {
    title: "W3ctrl Tracker is active",
    body: "Sharing location with your W3ctrl Track account",
  };
}

function buildUrl(server: string, deviceId: string, r: PositionReport): string {
  const base = `${server.replace(/\/+$/, "")}/track/`;
  const q = new URLSearchParams({
    id: deviceId,
    lat: r.lat.toFixed(6),
    lon: r.lon.toFixed(6),
    timestamp: String(Math.floor(Date.now() / 1000)),
    app: "w3ctrl-tracker",
    v: "1.0",
  });
  if (r.alarm) q.set("alarm", r.alarm);
  return `${base}?${q.toString()}`;
}

/** POST-equivalent: GET the report, persist the last-report receipt. */
async function deliver(
  url: string,
  query: { accuracy?: number | null; speed?: number | null },
  battery: BatteryInfo,
): Promise<void> {
  const q = new URLSearchParams();
  if (battery.level != null) q.set("batt", String(battery.level));
  if (battery.charging != null) q.set("charge", String(battery.charging));
  if (query.accuracy != null)
    q.set("accuracy", String(Math.round(query.accuracy)));
  // OsmAnd protocol: speed in m/s; Traccar converts to knots internally.
  if (query.speed != null && query.speed >= 0)
    q.set("speed", String(Number(query.speed.toFixed(1))));
  const res = await fetch(`${url}&${q.toString()}`);
  // 400 = unknown device id (register it in the portal first)
  if (res.status === 400) {
    throw new TraccarError(400, K.unknownDevice);
  }
  if (!res.ok) {
    throw new Error(`Track ingest failed (${res.status})`);
  }
  const report: LastReport = {
    at: Date.now(),
    accuracy: query.accuracy ?? null,
    battery: battery.level,
  };
  await AsyncStorage.setItem(LAST_REPORT_KEY, JSON.stringify(report)).catch(
    () => {},
  );
}

/* ------------------------------------------------------------------ API */

/**
 * Report one position to the configured server. Used by the background
 * task and by SOS. Honors the server URL from setup — unlike
 * `reportPosition()` from @w3ctrl/api, which hardcodes TRACK_URL.
 */
export async function reportToServer(r: PositionReport): Promise<void> {
  const cfg = await loadConfig();
  if (!cfg.deviceId.trim()) throw new Error(K.noDevice);
  const battery = await readBattery();
  const url = buildUrl(cfg.server || DEFAULT_SERVER, cfg.deviceId.trim(), r);
  await deliver(url, r, battery);
}

/**
 * One-shot report used by the setup screen's "Test connection" — takes the
 * server/device straight from the form (nothing saved yet).
 */
export async function sendTestReport(
  server: string,
  deviceId: string,
): Promise<void> {
  const id = deviceId.trim();
  if (!id) throw new Error(K.noDevice);
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error(K.fgDenied);
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const battery = await readBattery();
  const url = buildUrl(server || DEFAULT_SERVER, id, {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
  });
  await deliver(
    url,
    { accuracy: pos.coords.accuracy, speed: pos.coords.speed },
    battery,
  );
}

export async function startTracking(intervalSec: number): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error(K.fgDenied);
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") throw new Error(K.bgDenied);
  const notif = await notifStrings();
  await Location.startLocationUpdatesAsync(TRACKING_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: intervalSec * 1000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: notif.title,
      notificationBody: notif.body,
      notificationColor: "#ff9900",
    },
  });
}

export async function stopTracking(): Promise<void> {
  try {
    const started =
      await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
    if (started) await Location.stopLocationUpdatesAsync(TRACKING_TASK);
  } catch {
    /* already stopped */
  }
}

export function isTracking(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(TRACKING_TASK);
}

/** Immediate high-accuracy fix sent with alarm=sos. */
export async function sendSos(): Promise<void> {
  const cfg = await loadConfig();
  if (!cfg.deviceId.trim()) throw new Error(K.noDevice);
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  await reportToServer({
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    speed: pos.coords.speed,
    alarm: "sos",
  });
}

export async function checkPermissions(): Promise<{
  foreground: boolean;
  background: boolean;
}> {
  const [fg, bg] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);
  return {
    foreground: fg.status === "granted",
    background: bg.status === "granted",
  };
}

export async function readLastReport(): Promise<LastReport | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_REPORT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LastReport>;
    if (typeof p.at !== "number") return null;
    return {
      at: p.at,
      accuracy: typeof p.accuracy === "number" ? p.accuracy : null,
      battery: typeof p.battery === "number" ? p.battery : null,
    };
  } catch {
    return null;
  }
}

export async function clearLastReport(): Promise<void> {
  await AsyncStorage.removeItem(LAST_REPORT_KEY).catch(() => {});
}

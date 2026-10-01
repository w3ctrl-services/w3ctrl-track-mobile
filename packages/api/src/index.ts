/**
 * Traccar API client for the mobile apps — a React Native port of the web
 * app's `src/lib/traccar.ts` (the canonical reference; if the two disagree
 * the web module wins).
 *
 * Auth: mobile apps use a long-lived Bearer token instead of the session
 * cookie. Obtain it once via `POST /api/session/token` (far-future
 * expiration), store it in SecureStore, and inject it with `setTokenProvider`.
 * Traccar's REST API *is* the product API — there is no separate mobile API.
 *
 * Live updates: the Traccar WebSocket authenticates via the session cookie,
 * which React Native doesn't manage well, so the apps poll `positions` /
 * `events` with React Query (15s / 30s). A socket can be layered on later.
 */

export const API_BASE = "https://app.gpstracker.w3ctrl.com/api";
/** OsmAnd ingest endpoint — used by the tracker app to report positions. */
export const TRACK_URL = "https://gpstracker.w3ctrl.com/track/";

/* ------------------------------------------------------------------ types */

export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  administrator?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  totpKey?: string | null;
  attributes?: Record<string, unknown>;
}

export interface TraccarDevice {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate?: string;
  positionId?: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  disabled?: boolean;
  attributes?: Record<string, unknown>;
}

export interface TraccarPosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  /** knots — multiply by 1.852 for km/h */
  speed: number;
  course: number;
  address?: string;
  accuracy?: number;
  network?: unknown;
  attributes: Record<string, unknown>;
}

export interface TraccarEvent {
  id: number;
  deviceId: number;
  type: string;
  eventTime: string;
  positionId: number;
  geofenceId?: number;
  maintenanceId?: number;
  attributes?: Record<string, unknown>;
}

export interface TraccarGeofence {
  id: number;
  name: string;
  description?: string;
  area: string;
  attributes?: Record<string, unknown>;
}

export interface TraccarTrip {
  deviceId: number;
  deviceName: string;
  startTime: string;
  endTime: string;
  startAddress?: string;
  endAddress?: string;
  distance: number;
  duration: number;
  averageSpeed: number;
  maxSpeed: number;
  spentFuel?: number;
}

export interface TraccarSummary {
  deviceId: number;
  deviceName: string;
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  engineHours: number;
}

export interface TraccarStop {
  deviceId: number;
  deviceName: string;
  startTime: string;
  endTime: string;
  duration: number;
  address?: string;
  latitude: number;
  longitude: number;
}

export interface TraccarNotification {
  id: number;
  type: string;
  notificators: string;
  attributes?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ errors */

export class TraccarError extends Error {
  status: number;
  wwwAuthenticate?: string | null;
  constructor(status: number, message: string, wwwAuthenticate?: string | null) {
    super(message);
    this.name = "TraccarError";
    this.status = status;
    this.wwwAuthenticate = wwwAuthenticate ?? null;
  }
}

/* ------------------------------------------------------- token plumbing */

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;

/** The app injects its SecureStore-backed token getter once at startup. */
export function setTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}

/* ------------------------------------------------------------------ core */

async function request<T>(
  path: string,
  init?: RequestInit,
  opts?: { allow404?: boolean; anonymous?: boolean },
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!opts?.anonymous) {
    const token = await tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...((init?.headers as Record<string, string>) ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  if (res.status === 404) {
    if (opts?.allow404) return undefined as T;
    const body = await res.text().catch(() => "");
    throw new TraccarError(404, body || `Not found: ${path}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TraccarError(
      res.status,
      body || `Request failed (${res.status})`,
      res.headers.get("WWW-Authenticate"),
    );
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function requestText(path: string, init?: RequestInit): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TraccarError(res.status, body || `Request failed (${res.status})`);
  }
  return res.text();
}

function form(data: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  };
}

function json(method: string, data: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

/* ------------------------------------------------------------------ auth */

/**
 * Step 1 of mobile login: POST /api/session with email+password (+TOTP code).
 * Throws TraccarError 401 when credentials are wrong or the TOTP code is
 * missing/incorrect (detect via `wwwAuthenticate === "TOTP"` when no code
 * was sent).
 */
export async function login(
  email: string,
  password: string,
  code?: string,
): Promise<TraccarUser> {
  const data: Record<string, string> = { email, password };
  if (code) data.code = code;
  return request<TraccarUser>("/session", form(data), { anonymous: true });
}

/**
 * Step 2 of mobile login: mint a long-lived Bearer token for the app.
 * Call while the session from login() is fresh — Traccar ties the token
 * to the authenticated user.
 */
export async function mintToken(expirationIso: string): Promise<string> {
  const data: Record<string, string> = { expiration: expirationIso };
  return requestText("/session/token", form(data));
}

/** Convenience: login + mint a 10-year token in one call. */
export async function loginWithToken(
  email: string,
  password: string,
  code?: string,
): Promise<{ user: TraccarUser; token: string }> {
  const user = await login(email, password, code);
  const far = new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000).toISOString();
  const token = await mintToken(far);
  return { user, token };
}

export function session(): Promise<TraccarUser | undefined> {
  return request<TraccarUser | undefined>("/session", undefined, { allow404: true });
}

export function logout(): Promise<void> {
  return request<void>("/session", { method: "DELETE" });
}

/* ------------------------------------------------------------------ data */

export const traccar = {
  devices: () => request<TraccarDevice[]>("/devices"),
  device: (id: number) => request<TraccarDevice>(`/devices/${id}`),
  createDevice: (input: { name: string; uniqueId: string; category?: string }) =>
    request<TraccarDevice>("/devices", json("POST", input)),
  updateDevice: (device: TraccarDevice) =>
    request<TraccarDevice>(`/devices/${device.id}`, json("PUT", device)),

  positions: () => request<TraccarPosition[]>("/positions"),
  positionHistory: (deviceId: number, from: string, to: string) => {
    const q = new URLSearchParams({ deviceId: String(deviceId), from, to });
    return request<TraccarPosition[]>(`/positions?${q}`);
  },

  events: (params?: { deviceId?: number; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.deviceId) q.set("deviceId", String(params.deviceId));
    if (params?.from) q.set("from", params.from);
    if (params?.to) q.set("to", params.to);
    const qs = q.toString();
    return request<TraccarEvent[]>(`/events${qs ? `?${qs}` : ""}`);
  },

  geofences: () => request<TraccarGeofence[]>("/geofences"),
  createGeofence: (data: Omit<TraccarGeofence, "id">) =>
    request<TraccarGeofence>("/geofences", json("POST", data)),
  updateGeofence: (id: number, data: TraccarGeofence) =>
    request<TraccarGeofence>(`/geofences/${id}`, json("PUT", data)),
  deleteGeofence: (id: number) => request<void>(`/geofences/${id}`, { method: "DELETE" }),

  linkPermission: (data: Record<string, number>) =>
    request<void>("/permissions", json("POST", data)),
  unlinkPermission: (data: Record<string, number>) =>
    request<void>("/permissions", { ...json("DELETE", data) }),

  tripsReport: (deviceId: number, from: string, to: string) => {
    const q = new URLSearchParams({ deviceId: String(deviceId), from, to });
    return request<TraccarTrip[]>(`/reports/trips?${q}`);
  },
  summaryReport: (deviceIds: number[], from: string, to: string) => {
    const q = new URLSearchParams();
    deviceIds.forEach((id) => q.append("deviceId", String(id)));
    q.set("from", from);
    q.set("to", to);
    return request<TraccarSummary[]>(`/reports/summary?${q}`);
  },
  stopsReport: (deviceId: number, from: string, to: string) => {
    const q = new URLSearchParams({ deviceId: String(deviceId), from, to });
    return request<TraccarStop[]>(`/reports/stops?${q}`);
  },

  notifications: () => request<TraccarNotification[]>("/notifications"),
  createNotification: (data: Omit<TraccarNotification, "id">) =>
    request<TraccarNotification>("/notifications", json("POST", data)),
  deleteNotification: (id: number) =>
    request<void>(`/notifications/${id}`, { method: "DELETE" }),

  sendCommand: (deviceId: number, type: string, attributes?: Record<string, unknown>) =>
    request<void>("/commands/send", json("POST", { deviceId, type, attributes })),

  users: () => request<TraccarUser[]>("/users"),
  updateUser: (user: TraccarUser) =>
    request<TraccarUser>(`/users/${user.id}`, json("PUT", user)),
};

/* ------------------------------------------------------- tracker ingest */

/**
 * Report a position to /track/ (OsmAnd protocol over HTTPS).
 * Any extra params become position attributes verbatim server-side.
 */
export async function reportPosition(params: {
  id: string;
  lat: number;
  lon: number;
  timestamp?: number;
  batt?: number;
  charge?: boolean;
  alarm?: string;
  accuracy?: number;
  speed?: number;
  extra?: Record<string, string | number | boolean>;
}): Promise<void> {
  const q = new URLSearchParams({
    id: params.id,
    lat: String(params.lat),
    lon: String(params.lon),
    timestamp: String(params.timestamp ?? Math.floor(Date.now() / 1000)),
  });
  if (params.batt != null) q.set("batt", String(Math.round(params.batt)));
  if (params.charge != null) q.set("charge", String(params.charge));
  if (params.alarm) q.set("alarm", params.alarm);
  if (params.accuracy != null) q.set("accuracy", String(Math.round(params.accuracy)));
  if (params.speed != null) q.set("speed", String(params.speed));
  for (const [k, v] of Object.entries(params.extra ?? {})) q.set(k, String(v));
  const res = await fetch(`${TRACK_URL}?${q}`);
  // 200 = accepted; 400 = unknown device id (register it in the portal first)
  if (!res.ok && res.status !== 400) {
    throw new Error(`Track ingest failed (${res.status})`);
  }
  if (res.status === 400) {
    throw new TraccarError(400, "Unknown device ID — add it in the portal first.");
  }
}

/* ------------------------------------------------------------------ utils */

/** knots → km/h */
export const knotsToKmh = (knots: number): number => knots * 1.852;

/** Device type from attributes.deviceType (absent → "vehicle"). */
export type DeviceType = "vehicle" | "phone" | "laptop" | "asset" | "pet";
export function getDeviceType(d: TraccarDevice): DeviceType {
  const t = (d.attributes?.deviceType as string) ?? "vehicle";
  return (["vehicle", "phone", "laptop", "asset", "pet"] as DeviceType[]).includes(
    t as DeviceType,
  )
    ? (t as DeviceType)
    : "vehicle";
}

/** Battery tier 0-100 from position attributes (batteryLevel / batt). */
export function batteryOf(p?: TraccarPosition | null): number | null {
  if (!p) return null;
  const v = p.attributes?.batteryLevel ?? (p.attributes as Record<string, unknown>)?.batt;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

/** Parse "CIRCLE (lat lng, radiusM)". */
export function parseCircle(area: string): { lat: number; lng: number; radius: number } | null {
  const m = area.match(/CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (!m) return null;
  return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), radius: parseFloat(m[3]) };
}

/** Build "CIRCLE (lat lng, radiusM)". */
export function circleArea(lat: number, lng: number, radiusM: number): string {
  return `CIRCLE (${lat.toFixed(6)} ${lng.toFixed(6)}, ${Math.round(radiusM)})`;
}

/* ------------------------------------------------------------- alarms */

const ALARM_LABELS: Record<string, string> = {
  general: "General alarm",
  sos: "SOS alert",
  vibration: "Vibration detected",
  movement: "Movement detected",
  lowspeed: "Low speed",
  overspeed: "Overspeed",
  falldown: "Fall detected",
  lowpower: "Low power",
  lowbattery: "Low battery",
  fault: "Fault",
  poweroff: "Power off",
  poweron: "Power on",
  door: "Door alarm",
  lock: "Locked",
  unlock: "Unlocked",
  geofence: "Geofence alarm",
  geofenceenter: "Geofence entry",
  geofenceexit: "Geofence exit",
  gpsantennacut: "GPS antenna cut",
  accident: "Accident suspected",
  tow: "Towing detected",
  idle: "Excessive idling",
  highrpm: "High RPM",
  hardacceleration: "Harsh acceleration",
  hardbraking: "Harsh braking",
  hardcornering: "Harsh cornering",
  lanechange: "Lane change",
  fatiguedriving: "Fatigue driving",
  powercut: "Power cut",
  powerrestored: "Power restored",
  jamming: "GPS jamming",
  temperature: "Temperature alarm",
  parking: "Parking alarm",
  bonnet: "Bonnet alarm",
  footbrake: "Foot brake",
  fuelleak: "Fuel leak",
  tampering: "Tampering detected",
  removing: "Tracker removal",
};

export function alarmLabel(value: string): string {
  const key = value.toLowerCase();
  if (ALARM_LABELS[key]) return ALARM_LABELS[key];
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

/** Human label for a Traccar event (alarm events use the alarm map). */
export function eventLabel(e: TraccarEvent): string {
  if (e.type === "alarm") {
    const raw = e.attributes?.alarm;
    if (typeof raw === "string" && raw) {
      return raw
        .split(",")
        .map((s) => alarmLabel(s.trim()))
        .filter(Boolean)
        .join(", ");
    }
    return "Alarm";
  }
  return alarmLabel(e.type);
}

/** Notification types the rule builder offers. */
export const NOTIFICATION_TYPES = [
  { value: "alarm", label: "Alarm (shock / SOS / tamper)" },
  { value: "ignitionOn", label: "Ignition on" },
  { value: "ignitionOff", label: "Ignition off" },
  { value: "geofenceEnter", label: "Geofence enter" },
  { value: "geofenceExit", label: "Geofence exit" },
  { value: "overspeed", label: "Overspeed" },
  { value: "deviceOffline", label: "Device offline" },
] as const;

/* Smart alerts (overstay / low battery) — client-evaluated rules. */
export {
  BATTERY_PRESETS_PCT,
  OVERSTAY_PRESETS_MIN,
  SMART_ALERT_KINDS,
  batteryPercent,
  blankState,
  defaultRuleName,
  deviceScopeLabel,
  evaluateSmartAlerts,
  isStopped,
  isValidRule,
  newRuleId,
  parseRules,
  pointInGeofence,
  ruleSummary,
  sanitizeRule,
  type EvaluateArgs,
  type EvaluateResult,
  type SmartAlertHit,
  type SmartAlertKind,
  type SmartAlertRule,
  type SmartEvalState,
} from "./smart-alerts";

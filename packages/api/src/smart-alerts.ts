/**
 * Smart alerts — client-evaluated rules (overstay / low battery).
 *
 * This is the shared core used by the customer app. The rule schema is
 * IDENTICAL to the web portal's `src/lib/smart-alerts.ts` — rules live in
 * `user.attributes.smartAlerts`, so one rule set roams across web + mobile.
 * Keep the two files in sync when the schema changes.
 */
import {
  knotsToKmh,
  parseCircle,
  type TraccarDevice,
  type TraccarGeofence,
  type TraccarPosition,
} from "./index";

/* ------------------------------------------------------------------ types */

export type SmartAlertKind = "overstay" | "lowBattery";

export interface SmartAlertRule {
  id: string;
  kind: SmartAlertKind;
  name: string;
  enabled: boolean;
  /** empty = every device */
  deviceIds: number[];
  /** overstay: minutes stopped before firing */
  dwellMinutes: number;
  /** overstay: empty = anywhere */
  geofenceIds: number[];
  /** lowBattery: fire when charge drops below this percent */
  batteryPct: number;
  createdAt: string;
}

export interface SmartAlertHit {
  id: string;
  ruleId: string;
  ruleName: string;
  kind: SmartAlertKind;
  deviceId: number;
  deviceName: string;
  message: string;
  at: string;
  lat?: number;
  lng?: number;
}

export interface SmartEvalState {
  stoppedSinceMs: number | null;
  lastFixMs: number | null;
  overstayFiredAtMs: number | null;
  batteryFiredAtMs: number | null;
  lastBatteryPct: number | null;
}

export const SMART_ALERT_KINDS: { value: SmartAlertKind; label: string; hint: string }[] = [
  {
    value: "overstay",
    label: "Overstay",
    hint: "Fires when a device stays stopped longer than the set minutes — anywhere, or inside chosen geofences.",
  },
  {
    value: "lowBattery",
    label: "Low battery",
    hint: "Fires when a phone, laptop or tracker battery drops below the set percent.",
  },
];

export const OVERSTAY_PRESETS_MIN = [5, 10, 15, 30, 60, 120];
export const BATTERY_PRESETS_PCT = [10, 15, 20, 25, 30, 50];

const STOPPED_KMH = 3;
const STALE_FIX_MS = 15 * 60_000;
const BATTERY_HYSTERESIS = 5;

/* ------------------------------------------------------- battery reading */

/**
 * Battery charge percent, or null when the device doesn't report one.
 * Reads `batteryLevel` first, then the `batt` percent our phone/laptop
 * trackers send. Never the vehicle `battery` voltage attribute.
 */
export function batteryPercent(p: TraccarPosition): number | null {
  const a = p.attributes ?? {};
  for (const key of ["batteryLevel", "batt"]) {
    const v = (a as Record<string, unknown>)[key];
    const n =
      typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  }
  return null;
}

export function isStopped(p: TraccarPosition): boolean {
  return knotsToKmh(p.speed ?? 0) < STOPPED_KMH;
}

/* ------------------------------------------------------- geofence checks */

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function parsePolygonPts(area: string): [number, number][] | null {
  const m = area.match(/POLYGON\s*\(\(\s*(.+?)\s*\)\)/i);
  if (!m) return null;
  return m[1].split(",").map((pair) => {
    const [lng, lat] = pair.trim().split(/\s+/).map(Number);
    return [lat, lng] as [number, number];
  });
}

export function pointInGeofence(lat: number, lng: number, geofence: TraccarGeofence): boolean {
  const area = geofence.area ?? "";
  if (area.startsWith("CIRCLE")) {
    const c = parseCircle(area);
    if (!c) return false;
    return haversineM(lat, lng, c.lat, c.lng) <= c.radius;
  }
  if (area.startsWith("POLYGON")) {
    const pts = parsePolygonPts(area);
    if (!pts || pts.length < 3) return false;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [yi, xi] = pts[i];
      const [yj, xj] = pts[j];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }
  return false;
}

/* ------------------------------------------------------- rule validation */

export function isValidRule(r: unknown): r is SmartAlertRule {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  if (o.kind !== "overstay" && o.kind !== "lowBattery") return false;
  if (typeof o.id !== "string" || typeof o.name !== "string") return false;
  if (!Array.isArray(o.deviceIds) || !Array.isArray(o.geofenceIds)) return false;
  if (typeof o.dwellMinutes !== "number" || typeof o.batteryPct !== "number") return false;
  return true;
}

export function sanitizeRule(r: SmartAlertRule): SmartAlertRule {
  return {
    id: String(r.id ?? newRuleId()),
    kind: r.kind === "lowBattery" ? "lowBattery" : "overstay",
    name: String(r.name ?? "").slice(0, 80) || defaultRuleName(r.kind, r),
    enabled: r.enabled !== false,
    deviceIds: Array.isArray(r.deviceIds)
      ? r.deviceIds.filter((n) => Number.isFinite(n))
      : [],
    dwellMinutes: Math.min(Math.max(Math.round(r.dwellMinutes) || 30, 5), 24 * 60),
    geofenceIds: Array.isArray(r.geofenceIds)
      ? r.geofenceIds.filter((n) => Number.isFinite(n))
      : [],
    batteryPct: Math.min(Math.max(Math.round(r.batteryPct) || 20, 5), 50),
    createdAt: r.createdAt || new Date().toISOString(),
  };
}

export function parseRules(raw: unknown): SmartAlertRule[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isValidRule).map(sanitizeRule);
}

export function defaultRuleName(
  kind: SmartAlertKind,
  r?: Partial<Pick<SmartAlertRule, "dwellMinutes" | "batteryPct" | "geofenceIds">>,
): string {
  if (kind === "overstay") {
    const mins = r?.dwellMinutes ?? 30;
    const where = r?.geofenceIds?.length ? "in geofence" : "anywhere";
    return `Overstay ${mins} min ${where}`;
  }
  return `Battery below ${r?.batteryPct ?? 20}%`;
}

export function newRuleId(): string {
  return `sr-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function blankState(): SmartEvalState {
  return {
    stoppedSinceMs: null,
    lastFixMs: null,
    overstayFiredAtMs: null,
    batteryFiredAtMs: null,
    lastBatteryPct: null,
  };
}

/* ------------------------------------------------------------- evaluator */

export interface EvaluateArgs {
  rules: SmartAlertRule[];
  devices: TraccarDevice[];
  positions: Map<number, TraccarPosition> | Record<number, TraccarPosition>;
  geofences: TraccarGeofence[];
  nowMs: number;
  states: Record<string, SmartEvalState>;
}

export interface EvaluateResult {
  hits: SmartAlertHit[];
  states: Record<string, SmartEvalState>;
}

const stateKey = (ruleId: string, deviceId: number) => `${ruleId}:${deviceId}`;

export function evaluateSmartAlerts(args: EvaluateArgs): EvaluateResult {
  const { rules, devices, geofences, nowMs } = args;
  const states: Record<string, SmartEvalState> = { ...args.states };
  const hits: SmartAlertHit[] = [];
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const geofenceById = new Map(geofences.map((g) => [g.id, g]));
  const posOf = (id: number): TraccarPosition | undefined =>
    args.positions instanceof Map
      ? args.positions.get(id)
      : (args.positions as Record<number, TraccarPosition>)[id];

  const fire = (
    rule: SmartAlertRule,
    device: TraccarDevice,
    message: string,
    pos?: TraccarPosition,
  ) => {
    hits.push({
      id: `sh-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      kind: rule.kind,
      deviceId: device.id,
      deviceName: device.name,
      message,
      at: new Date(nowMs).toISOString(),
      lat: pos?.latitude,
      lng: pos?.longitude,
    });
  };

  for (const rawRule of rules) {
    if (!rawRule.enabled) continue;
    const rule = sanitizeRule(rawRule);
    const targets = (
      rule.deviceIds.length
        ? rule.deviceIds.map((id) => deviceById.get(id)).filter(Boolean)
        : devices
    ) as TraccarDevice[];

    for (const device of targets) {
      const pos = posOf(device.id);
      const key = stateKey(rule.id, device.id);
      const st = states[key] ?? blankState();

      if (!pos) continue;
      const fixMs = new Date(pos.fixTime).getTime();
      if (!Number.isFinite(fixMs) || nowMs - fixMs > STALE_FIX_MS) {
        states[key] = st;
        continue;
      }
      st.lastFixMs = fixMs;

      if (rule.kind === "overstay") {
        const stopped = isStopped(pos);
        const scoped =
          rule.geofenceIds.length > 0
            ? rule.geofenceIds.some((gid) => {
                const g = geofenceById.get(gid);
                return g ? pointInGeofence(pos.latitude, pos.longitude, g) : false;
              })
            : true;

        if (!stopped || !scoped) {
          st.stoppedSinceMs = null;
          st.overstayFiredAtMs = null;
        } else {
          if (st.stoppedSinceMs == null) st.stoppedSinceMs = fixMs;
          if (
            st.overstayFiredAtMs == null &&
            fixMs - st.stoppedSinceMs >= rule.dwellMinutes * 60_000
          ) {
            const where =
              rule.geofenceIds.length > 0
                ? `inside ${rule.geofenceIds
                    .map((gid) => geofenceById.get(gid)?.name ?? "geofence")
                    .join(", ")}`
                : "at its current spot";
            fire(
              rule,
              device,
              `${device.name} has been stopped ${where} for ${rule.dwellMinutes} min`,
              pos,
            );
            st.overstayFiredAtMs = nowMs;
          }
        }
      } else {
        const pct = batteryPercent(pos);
        st.lastBatteryPct = pct;
        if (pct == null) {
          st.batteryFiredAtMs = null;
        } else if (pct < rule.batteryPct) {
          if (st.batteryFiredAtMs == null) {
            fire(
              rule,
              device,
              `${device.name} battery is at ${Math.round(pct)}% (below ${rule.batteryPct}%)`,
              pos,
            );
            st.batteryFiredAtMs = nowMs;
          }
        } else if (pct >= rule.batteryPct + BATTERY_HYSTERESIS) {
          st.batteryFiredAtMs = null;
        }
      }

      states[key] = st;
    }
  }

  return { hits, states };
}

/* ------------------------------------------------------- human summaries */

export function ruleSummary(
  rule: SmartAlertRule,
  geofenceName: (id: number) => string | undefined,
  t: (s: string) => string,
): string {
  if (rule.kind === "overstay") {
    const where = rule.geofenceIds.length
      ? `${t("inside")} ${rule.geofenceIds.map((id) => geofenceName(id) ?? t("geofence")).join(", ")}`
      : t("anywhere");
    return `${t("Stopped")} ${where} · ${rule.dwellMinutes} ${t("min")}`;
  }
  return `${t("Battery below")} ${rule.batteryPct}%`;
}

export function deviceScopeLabel(
  rule: SmartAlertRule,
  t: (s: string) => string,
): string {
  if (!rule.deviceIds.length) return t("All devices");
  if (rule.deviceIds.length === 1) return t("1 device");
  return `${rule.deviceIds.length} ${t("devices")}`;
}

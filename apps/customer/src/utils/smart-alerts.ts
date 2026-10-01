/**
 * Smart-alert persistence for the customer app.
 *
 * Rules roam via `user.attributes.smartAlerts` (same schema as the web
 * portal). Eval states + hit log live in AsyncStorage on this device.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  parseRules,
  sanitizeRule,
  type SmartAlertHit,
  type SmartAlertRule,
  type SmartEvalState,
  type TraccarUser,
} from "@w3ctrl/api";

const RULES_KEY = "w3ctrl.smartAlertRules.v1";
const STATES_KEY = "w3ctrl.smartAlertState.v1";
const HITS_KEY = "w3ctrl.smartAlertHits.v1";
const MAX_HITS = 100;

/* ---------------------------------------------------------------- rules */

export function readRulesFromUser(user: TraccarUser | null): SmartAlertRule[] {
  const fromServer = parseRules((user?.attributes as Record<string, unknown> | undefined)?.smartAlerts);
  if (fromServer) return fromServer;
  return [];
}

export async function readLocalRules(): Promise<SmartAlertRule[]> {
  try {
    const raw = await AsyncStorage.getItem(RULES_KEY);
    return parseRules(raw ? JSON.parse(raw) : []) ?? [];
  } catch {
    return [];
  }
}

/** Rules for this user: server attributes first, local fallback. */
export async function readRules(user: TraccarUser | null): Promise<SmartAlertRule[]> {
  const fromServer = readRulesFromUser(user);
  if (fromServer.length > 0 || user) return fromServer;
  return readLocalRules();
}

export async function writeLocalRules(rules: SmartAlertRule[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RULES_KEY, JSON.stringify(rules.map(sanitizeRule)));
  } catch {
    /* ignore */
  }
}

/* ---------------------------------------------------------------- states */

export async function readStates(): Promise<Record<string, SmartEvalState>> {
  try {
    const raw = await AsyncStorage.getItem(STATES_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export async function writeStates(states: Record<string, SmartEvalState>): Promise<void> {
  try {
    const keys = Object.keys(states);
    let slim = states;
    if (keys.length > 500) {
      slim = {};
      for (const k of keys.slice(-500)) slim[k] = states[k];
    }
    await AsyncStorage.setItem(STATES_KEY, JSON.stringify(slim));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ hits */

export async function readHits(): Promise<SmartAlertHit[]> {
  try {
    const raw = await AsyncStorage.getItem(HITS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX_HITS) : [];
  } catch {
    return [];
  }
}

export async function pushHit(hit: SmartAlertHit): Promise<SmartAlertHit[]> {
  const hits = [hit, ...(await readHits())].slice(0, MAX_HITS);
  try {
    await AsyncStorage.setItem(HITS_KEY, JSON.stringify(hits));
  } catch {
    /* ignore */
  }
  return hits;
}

export async function clearHits(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HITS_KEY);
  } catch {
    /* ignore */
  }
}

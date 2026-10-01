/**
 * Smart-alert engine for the customer app (foreground).
 *
 * Evaluates the user's smart rules (overstay / low battery) against the
 * polled live positions whenever they refresh, plus on a 5-minute timer.
 * Hits are saved to the local hit log, pushed to the store for live UI,
 * and raised as local notifications when permitted.
 *
 * Honest limits (stated in the UI): foreground checks run while the app
 * is open; background checks run roughly every 15 minutes via the OS
 * background-fetch task — not a 24/7 server watch.
 */
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { evaluateSmartAlerts, type SmartAlertHit } from "@w3ctrl/api";
import { useAuth } from "../auth/AuthContext";
import { useDevices, useGeofences, usePositionMap } from "../api/hooks";
import { pushHit, readRules, readStates, writeStates } from "../utils/smart-alerts";
import { useSmartAlertStore } from "../utils/smart-alert-store";

async function notifyHit(hit: SmartAlertHit): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      // Not granted — the in-app feed still records the hit.
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `W3ctrl Track — ${hit.ruleName}`,
        body: hit.message,
      },
      trigger: null,
    });
  } catch {
    /* notifications unavailable — feed still shows the hit */
  }
}

export function useSmartAlerts(enabled: boolean) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const { user } = useAuth();
  const { data: devices } = useDevices();
  const positionMap = usePositionMap();
  const { data: geofences } = useGeofences();
  const pushToStore = useSmartAlertStore((s) => s.pushHit);
  const setRules = useSmartAlertStore((s) => s.setRules);
  const refresh = useSmartAlertStore((s) => s.refresh);

  const userRef = useRef(user);
  userRef.current = user;
  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  const positionsRef = useRef(positionMap);
  positionsRef.current = positionMap;
  const geofencesRef = useRef(geofences);
  geofencesRef.current = geofences;

  // Keep the store's rule list in sync with the server attributes.
  useEffect(() => {
    if (enabled) void refresh(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

  const evaluate = useRef(() => {});
  evaluate.current = () => {
    void (async () => {
      if (!enabledRef.current) return;
      const u = userRef.current;
      const devs = devicesRef.current ?? [];
      if (devs.length === 0) return;
      const rules = (await readRules(u)).filter((r) => r.enabled);
      setRules(rules);
      if (rules.length === 0) return;

      const states = await readStates();
      const { hits, states: next } = evaluateSmartAlerts({
        rules,
        devices: devs,
        positions: positionsRef.current,
        geofences: geofencesRef.current ?? [],
        nowMs: Date.now(),
        states,
      });
      await writeStates(next);

      for (const hit of hits) {
        await pushHit(hit);
        pushToStore(hit);
        await notifyHit(hit);
      }
    })();
  };

  // Re-evaluate when the polled positions refresh.
  useEffect(() => {
    evaluate.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionMap]);

  // …and on a timer while the app is open.
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => evaluate.current(), 5 * 60_000);
    return () => clearInterval(timer);
  }, [enabled]);
}

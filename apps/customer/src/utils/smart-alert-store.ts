/**
 * Tiny zustand store so smart-alert hits and rule changes propagate
 * live to every screen without prop drilling.
 */
import { create } from "zustand";
import { readHits, readRules } from "./smart-alerts";
import type { SmartAlertHit, SmartAlertRule, TraccarUser } from "@w3ctrl/api";

interface SmartAlertStore {
  hits: SmartAlertHit[];
  rules: SmartAlertRule[];
  /** bump to force re-reads after a save from another screen */
  refresh: (user: TraccarUser | null) => Promise<void>;
  pushHit: (hit: SmartAlertHit) => void;
  setRules: (rules: SmartAlertRule[]) => void;
}

export const useSmartAlertStore = create<SmartAlertStore>()((set) => ({
  hits: [],
  rules: [],
  refresh: async (user) => {
    const [hits, rules] = await Promise.all([readHits(), readRules(user)]);
    set({ hits, rules });
  },
  pushHit: (hit) =>
    set((s) => ({ hits: [hit, ...s.hits].slice(0, 100) })),
  setRules: (rules) => set({ rules }),
}));

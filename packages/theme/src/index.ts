/**
 * W3ctrl Track design tokens — ported from the web app's globals.css.
 * Warm neutrals biased toward the W3ctrl amber (#ff9900); amber is the
 * single signal colour, semantic status colours stay separate.
 */

export interface Palette {
  paper: string;
  surface: string;
  surface2: string;
  surface3: string;
  ink: string;
  ink2: string;
  muted: string;
  faint: string;
  line: string;
  lineStrong: string;
  brand: string;
  brandHover: string;
  brandInk: string;
  brandSoft: string;
  brandEdge: string;
  night: string;
  nightInk: string;
  nightMuted: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  alert: string;
  alertSoft: string;
}

export const light: Palette = {
  paper: "#f4f4f6",
  surface: "#ffffff",
  surface2: "#f4f0e9",
  surface3: "#ece6dc",
  ink: "#191611",
  ink2: "#4a443c",
  muted: "#6e6760",
  faint: "#706859",
  line: "#e9e9ee",
  lineStrong: "#d3cabb",
  brand: "#ff9900",
  brandHover: "#e88a00",
  brandInk: "#96580a",
  brandSoft: "#fff4e3",
  brandEdge: "#f6d3a2",
  night: "#12100d",
  nightInk: "#f5f1ea",
  nightMuted: "#a79c8e",
  ok: "#1d7a4c",
  okSoft: "#e2f1e8",
  warn: "#a9680b",
  warnSoft: "#fbeed5",
  alert: "#bb332a",
  alertSoft: "#fbe6e4",
};

export const dark: Palette = {
  paper: "#100e0b",
  surface: "#17140f",
  surface2: "#1e1a14",
  surface3: "#262019",
  ink: "#f5f1ea",
  ink2: "#ccc3b6",
  muted: "#a1978a",
  faint: "#8d8477",
  line: "#2c2519",
  lineStrong: "#3d3427",
  brand: "#ffa722",
  brandHover: "#ffb845",
  brandInk: "#ffbf5c",
  brandSoft: "#2a1e0d",
  brandEdge: "#4a3518",
  night: "#0b0a08",
  nightInk: "#f5f1ea",
  nightMuted: "#a79c8e",
  ok: "#5cc08a",
  okSoft: "#12271c",
  warn: "#e0a545",
  warnSoft: "#2b2110",
  alert: "#e8776c",
  alertSoft: "#2d1614",
};

export type ThemeMode = "light" | "dark";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.2 },
  subtitle: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  small: { fontSize: 13, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "400" as const },
  mono: { fontSize: 13, fontFamily: "monospace" as const },
} as const;

/** Status dot colour for a Traccar device status string. */
export function statusColor(p: Palette, status: string): string {
  if (status === "online") return p.ok;
  if (status === "offline") return p.alert;
  return p.faint;
}

/** Battery tier colour — matches the web app (>=70 green, >=30 amber). */
export function batteryColor(p: Palette, pct: number | null | undefined): string {
  if (pct == null) return p.faint;
  if (pct >= 70) return p.ok;
  if (pct >= 30) return p.warn;
  return p.alert;
}

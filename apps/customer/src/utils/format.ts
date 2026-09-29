/** Formatting helpers shared by the customer app screens. */

export function formatRelative(
  iso: string | undefined | null,
  t: (k: string) => string,
): string {
  if (!iso) return t("Unknown");
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return t("Unknown");
  if (ms < 0) return t("just now");
  const min = Math.floor(ms / 60000);
  if (min < 1) return t("just now");
  if (min < 60) return `${min} ${t("min ago")}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ${t("hr ago")}`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days} ${t("days ago")}`;
  return new Date(iso).toLocaleDateString();
}

export function formatDuration(ms: number, t: (k: string) => string): string {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} ${t("min")}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} ${t("hr")}` : `${h} ${t("hr")} ${m} ${t("min")}`;
}

/** Metres → km string with sensible precision. */
export function formatKm(meters: number): string {
  const km = meters / 1000;
  return km >= 100 ? km.toFixed(0) : km.toFixed(1);
}

export function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekStart(): Date {
  const d = startOfDay();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

export function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function greetingKey(): "Good morning" | "Good afternoon" | "Good evening" {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

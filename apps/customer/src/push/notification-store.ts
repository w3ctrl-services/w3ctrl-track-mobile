/**
 * Local inbox of received push notifications (AsyncStorage).
 *
 * Traccar's Firebase notificator sends notification+data payloads; the OS
 * displays them even with the app closed. Every notification the app sees
 * (foreground listener) is archived here so the user has a history —
 * the Notifications screen reads this store.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  /** Traccar event id, when the push carried one — deep-links to Alerts. */
  eventId?: number;
  receivedAt: string; // ISO
  read: boolean;
}

const KEY = "w3ctrl_notification_inbox";
const MAX = 100;

function rid(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function inboxList(): Promise<InboxNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as InboxNotification[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function inboxAdd(
  n: Pick<InboxNotification, "title" | "body" | "eventId">,
): Promise<InboxNotification> {
  const item: InboxNotification = {
    id: rid(),
    title: n.title || "W3ctrl Track",
    body: n.body || "",
    eventId: n.eventId,
    receivedAt: new Date().toISOString(),
    read: false,
  };
  const list = [item, ...(await inboxList())].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  return item;
}

export async function inboxMarkRead(id: string): Promise<void> {
  const list = await inboxList();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(list.map((i) => (i.id === id ? { ...i, read: true } : i))),
  ).catch(() => {});
}

export async function inboxMarkAllRead(): Promise<void> {
  const list = await inboxList();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(list.map((i) => ({ ...i, read: true }))),
  ).catch(() => {});
}

export async function inboxClear(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

export async function inboxUnreadCount(): Promise<number> {
  return (await inboxList()).filter((i) => !i.read).length;
}

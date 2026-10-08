/**
 * Local inbox of received push notifications (AsyncStorage).
 * Same shape as the customer app's inbox; the tracker phone keeps its own.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  receivedAt: string; // ISO
  read: boolean;
}

const KEY = "w3ctrl_tracker_notification_inbox";
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
  n: Pick<InboxNotification, "title" | "body">,
): Promise<InboxNotification> {
  const item: InboxNotification = {
    id: rid(),
    title: n.title || "W3ctrl Tracker",
    body: n.body || "",
    receivedAt: new Date().toISOString(),
    read: false,
  };
  const list = [item, ...(await inboxList())].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  return item;
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

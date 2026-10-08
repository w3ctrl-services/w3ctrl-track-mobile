/**
 * Push wire-up hook — mount once inside the authenticated tree.
 *
 * - asks notification permission and registers the FCM token on the
 *   Traccar user (idempotent; re-runs when the user changes),
 * - archives every received notification into the local inbox,
 * - tapping a notification deep-links to the Alerts tab (Traccar puts
 *   the event id in the data payload).
 *
 * OS-level display (banner/sound) for background/killed states is handled
 * by expo-notifications + FCM — no code needed beyond the token.
 */
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useAuth } from "../auth/AuthContext";
import { navigationRef } from "../navigation/navRef";
import { ensurePushPermission, registerPushToken } from "./push";
import { inboxAdd } from "./notification-store";

function eventIdFrom(
  data: Record<string, unknown> | null | undefined,
): number | undefined {
  const raw = data?.eventId;
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function usePushNotifications(enabled: boolean) {
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user) return;
    let cancelled = false;

    (async () => {
      const ok = await ensurePushPermission();
      if (ok && !cancelled) await registerPushToken(user);
    })();

    const recv = Notifications.addNotificationReceivedListener((n) => {
      void inboxAdd({
        title: n.request.content.title ?? "W3ctrl Track",
        body: n.request.content.body ?? "",
        eventId: eventIdFrom(
          n.request.content.data as Record<string, unknown> | undefined,
        ),
      });
    });

    const resp = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate("Main", { screen: "Alerts" });
      }
    });

    return () => {
      cancelled = true;
      recv.remove();
      resp.remove();
    };
  }, [enabled, user?.id]);
}

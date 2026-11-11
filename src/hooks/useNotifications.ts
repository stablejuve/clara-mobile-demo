import * as Notif from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { depositNotificationContent, type PushTarget, pushTargetOf } from "../relayer/notify";
import type { Movement } from "../relayer/types";

export type PushPermission = "unknown" | "granted" | "denied" | "unavailable";
export type Notifications = {
  permission: PushPermission;
  ensurePermission: () => Promise<boolean>;
  /** Notificación local inmediata por un depósito (también con la app en primer plano: así se ve llegar en el simulador). */
  notifyDeposit: (m: Movement) => Promise<void>;
};

Notif.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export function useNotifications(onTarget: (t: PushTarget) => void): Notifications {
  const [permission, setPermission] = useState<PushPermission>("unknown");
  const onTargetRef = useRef(onTarget);
  onTargetRef.current = onTarget;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    let stale = false;
    Notif.getPermissionsAsync()
      .then((p) => { if (stale) return; setPermission(p.granted ? "granted" : p.status === "denied" ? "denied" : "unknown"); })
      .catch(() => { if (!stale) setPermission("unavailable"); });
    return () => { stale = true; };
  }, []);

  // Tap en la notificación: en caliente (listener) y en frío (última respuesta), una sola vez por respuesta.
  useEffect(() => {
    const handle = (r: Notif.NotificationResponse | null) => {
      if (!r || handled.current === r.notification.request.identifier) return;
      handled.current = r.notification.request.identifier;
      const target = pushTargetOf(r.notification.request.content.data);
      if (target) onTargetRef.current(target);
    };
    const sub = Notif.addNotificationResponseReceivedListener(handle);
    Notif.getLastNotificationResponseAsync().then(handle).catch(() => {});
    return () => sub.remove();
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (permission === "granted") return true;
    if (permission === "denied" || permission === "unavailable") return false;
    try {
      const p = await Notif.requestPermissionsAsync();
      setPermission(p.granted ? "granted" : "denied");
      return p.granted;
    } catch {
      setPermission("unavailable");
      return false;
    }
  }, [permission]);

  const notifyDeposit = useCallback(async (m: Movement) => {
    if (!(await ensurePermission())) return;
    try {
      await Notif.scheduleNotificationAsync({ identifier: `deposit-${m.id}`, content: depositNotificationContent(m), trigger: null });
    } catch (e) {
      console.warn(`notificación local: ${e instanceof Error ? e.message : e}`);
    }
  }, [ensurePermission]);

  return { permission, ensurePermission, notifyDeposit };
}

import * as LocalAuthentication from "expo-local-authentication";
import { useCallback, useEffect, useState } from "react";
import { t } from "../i18n/es";

export type FaceId = {
  /** true si el usuario pasó Face ID (o el simulador no lo tiene inscrito: la demo no se bloquea). */
  authenticate: (reason: string) => Promise<boolean>;
  /** null mientras se consulta el hardware. */
  available: boolean | null;
};

/** Passkey simulada con Face ID local (D8): la ceremonia se siente real sin WebAuthn. */
export function useFaceId(): FaceId {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let stale = false;
    Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
      .then(([hw, enrolled]) => { if (!stale) setAvailable(hw && enrolled); })
      .catch(() => { if (!stale) setAvailable(false); });
    return () => { stale = true; };
  }, []);
  const authenticate = useCallback(async (reason: string): Promise<boolean> => {
    if (available === false) { await new Promise((r) => setTimeout(r, 600)); return true; }
    try {
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: t("common.cancel"), disableDeviceFallback: false });
      return r.success;
    } catch {
      return false;
    }
  }, [available]);
  return { authenticate, available };
}

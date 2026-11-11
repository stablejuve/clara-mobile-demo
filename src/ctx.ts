import type { FaceId } from "./hooks/useFaceId";
import type { Module } from "./hooks/useModule";
import type { Notifications } from "./hooks/useNotifications";
import type { AppStore } from "./store";

/** Todo lo que reciben Page, Navigator y las pantallas (vía withPage). */
export type AppCtx = AppStore & {
  module: Module;
  faceId: FaceId;
  notifications: Notifications;
  /** Regreso del KYC (deep link o fallback de la pantalla simulada): completeKycReturn + ir a kycPending. */
  kycReturn: () => Promise<void>;
};

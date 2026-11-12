import type { Dispatch, SetStateAction } from "react";
import type { FaceId } from "./hooks/useFaceId";
import type { Module } from "./hooks/useModule";
import type { Notifications } from "./hooks/useNotifications";
import type { KycDraft } from "./relayer/kyc";
import type { AppStore } from "./store";

/** Todo lo que reciben las pantallas (vía withCtx). */
export type AppCtx = AppStore & {
  module: Module;
  faceId: FaceId;
  notifications: Notifications;
  /** Expediente KYC en captura: lo comparten la hoja de alta y las hojas de cada sección. */
  kyc: { draft: KycDraft; setDraft: Dispatch<SetStateAction<KycDraft>> };
  /** Saldo → pestaña Beneficios con la pila [beneficios, saldo]. */
  openBalance: () => void;
};

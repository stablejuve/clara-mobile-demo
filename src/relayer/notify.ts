import { t } from "../i18n/es";
import { formatCents, formatMxn } from "./money";
import type { Movement } from "./types";

// Notificación local del depósito (spec «Capa mock»: «simular pago de Acme … dispara una notificación local»). Puro.
export type PushTarget = { kind: "deposit"; movementId: string };

export function depositNotificationContent(m: Movement): { title: string; body: string; data: Record<string, unknown> } {
  const main = m.amountMxnCents !== undefined ? `+${formatMxn(m.amountMxnCents)} (≈ ${formatCents(m.amountUsdcCents)} USDC)` : `+${formatCents(m.amountUsdcCents)} USDC`;
  return {
    title: t("notify.depositTitle", { from: m.fromLabel ?? t("common.employer") }),
    body: `${main}${m.concept ? ` · ${m.concept}` : ""}`,
    data: { recibo: { kind: "deposit", movementId: m.id } },
  };
}

/** Destino del tap en la notificación: `content.data.recibo`. */
export function pushTargetOf(data: unknown): PushTarget | null {
  if (data === null || typeof data !== "object") return null;
  const r = (data as Record<string, unknown>).recibo;
  if (r === null || typeof r !== "object") return null;
  const { kind, movementId } = r as Record<string, unknown>;
  return kind === "deposit" && typeof movementId === "string" ? { kind: "deposit", movementId } : null;
}

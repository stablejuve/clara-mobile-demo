import { t } from "../i18n/es";
import type { Movement } from "./types";

// Cómo se lee un movimiento en la lista y en su detalle (diseño «Recibo Minimal»). Puro.

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

/** «Hoy», «Ayer» o «11 nov». */
export function dayLabel(at: number, now: number): string {
  const d = new Date(at), n = new Date(now);
  const day = (x: Date) => Math.floor(new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime() / 86_400_000);
  const diff = day(n) - day(d);
  if (diff === 0) return t("rc.today");
  if (diff === 1) return t("rc.yesterday");
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function movementTitle(m: Movement): string {
  return m.kind === "deposit" ? (m.fromLabel ?? t("common.employer")) : (m.toLabel ?? t("rc.bank"));
}

export function movementSub(m: Movement, now: number): string {
  if (m.kind === "deposit") return `${(m.concept ?? t("rc.deposit")).split(" · ")[0]} · ${dayLabel(m.at, now)}`;
  const st = m.status === "completed" ? t("rc.mv.completed") : m.status === "failed" ? t("rc.mv.failed") : t("rc.mv.pending");
  return `${t("rc.mv.transfer")} · ${st}`;
}

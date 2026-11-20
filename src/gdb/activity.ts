import { conceptLabel, cop, getLang, tr, usd } from "./copy";
import type { State } from "./ledger";

// Movimientos del empleado: beneficios recibidos, compras con tarjeta y retiros, en una sola lista. Para él todo se lee en su
// moneda local primero y los dólares debajo (se pueden ocultar). Sin estados intermedios del emisor: un movimiento está pendiente,
// hecho o no pasó.

export type Kind = "funding" | "card" | "withdrawal";
/** `pending`: aprobado, aún no sale del saldo (compra) o en camino al banco (retiro) · `done` · `declined`: compra rechazada ·
 *  `failed`: el banco rechazó el retiro y el dinero está por regresar · `returned`: el dinero del retiro fallido ya regresó. */
export type TxStatus = "pending" | "done" | "declined" | "failed" | "returned";
export type ActivityItem = {
  id: string; kind: Kind; title: string; at: number; status: TxStatus;
  /** Monto que manda, en moneda local (un beneficio recibido se convierte a la tasa del día). */ primary: string;
  /** El mismo monto en dólares (null si no se conoce). */ secondary: string | null;
  /** Detalle de un beneficio (su concepto). */ note: string | null;
};

/** Equivalente en moneda local (centavos de COP) de un monto en dólares, a la tasa dada. */
export const toLocal = (usdCents: number, rate: number): number => Math.round(usdCents * rate);

/** `rate`: pesos por dólar, para expresar en moneda local lo que nació en dólares (el beneficio). */
export function feed(s: State, rate: number): ActivityItem[] {
  const employer = s.invitation.employer;
  const items: ActivityItem[] = [
    // Un beneficio aparece cuando la empresa ya lo pagó: primero «pendiente» (viene en camino, aún no suma al saldo) y luego hecho.
    // Mientras la empresa no lo paga, el empleado no ve nada.
    ...s.fundings.filter((f) => f.status === "processing" || f.status === "completed").map((f): ActivityItem => ({
      id: f.id, kind: "funding", title: employer, at: f.at, status: f.status === "completed" ? "done" : "pending", primary: `+${cop(toLocal(f.amount, rate))}`, secondary: usd(f.amount),
      note: f.concept ? conceptLabel(f.concept) : tr("tx.s.benefit"),
    })),
    ...s.auths.map((a): ActivityItem => ({
      id: a.id, kind: "card", title: a.merchant, at: a.at, note: null,
      status: a.status === "declined" ? "declined" : a.movedAt === null ? "pending" : "done",
      primary: a.local === null ? usd(a.amount) : cop(a.local), secondary: a.local === null ? null : usd(a.amount),
    })),
    ...s.withdrawals.map((w): ActivityItem => ({
      id: w.id, kind: "withdrawal", title: w.bank.holder ?? w.bank.name, at: w.at, note: null,
      status: w.status === "processing" ? "pending" : w.status === "completed" ? "done" : w.status === "failed" ? "failed" : "returned",
      primary: cop(w.local), secondary: usd(w.usd),
    })),
  ];
  return items.sort((a, b) => b.at - a.at || b.id.localeCompare(a.id));
}

/** El monto no contó para el saldo (rechazo, retiro devuelto): se muestra tachado. */
export const isVoid = (it: ActivityItem): boolean => it.status === "declined" || it.status === "returned";

const locale = (): string => (getLang() === "es" ? "es-CO" : "en-US");
/** «Nov 18, 2026». */
export const dateLabel = (at: number): string => new Date(at).toLocaleDateString(locale(), { month: "short", day: "numeric", year: "numeric" });
/** «12:05 AM». */
export const timeLabel = (at: number): string => new Date(at).toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit" });
/** «November 2026»: encabezado de cada mes en la lista. */
export const monthLabel = (at: number): string => new Date(at).toLocaleDateString(locale(), { month: "long", year: "numeric" });
export const monthKey = (at: number): string => { const d = new Date(at); return `${d.getFullYear()}-${d.getMonth()}`; };

/** Texto bajo el nombre: el estado si no está hecho; si lo está, fecha y hora. */
export function subLabel(it: ActivityItem): string {
  return it.status === "done" ? `${dateLabel(it.at)} | ${timeLabel(it.at)}` : tr(`tx.st.${it.status}`);
}

export type TypeFilter = "all" | Kind;
export const TYPE_FILTERS: readonly TypeFilter[] = ["all", "card", "funding", "withdrawal"];
/** Búsqueda por nombre (sin importar mayúsculas ni acentos) y filtro por tipo. */
export function filterFeed(items: readonly ActivityItem[], query: string, type: TypeFilter): ActivityItem[] {
  const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const q = norm(query);
  return items.filter((it) => (type === "all" || it.kind === type) && (q === "" || norm(it.title).includes(q) || norm(it.note ?? "").includes(q)));
}

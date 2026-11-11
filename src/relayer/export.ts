import { formatCents } from "./money";
import type { Movement } from "./types";

// Ajustes → Exportar movimientos: CSV plano que se comparte con la hoja nativa. Puro.
const cell = (v: string | undefined): string => (v === undefined ? "" : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const plain = (cents: number): string => formatCents(cents).replace(/,/g, "");

export function movementsCsv(rows: readonly Movement[]): string {
  const head = "id,fecha,tipo,estado,usdc,mxn,origen,concepto,referencia,hash,recibo";
  const lines = rows.map((m) => [
    m.id, new Date(m.at).toISOString(), m.kind, m.status,
    m.kind === "withdrawal" ? `-${plain(m.amountUsdcCents)}` : plain(m.amountUsdcCents),
    m.amountMxnCents === undefined ? "" : plain(m.amountMxnCents),
    cell(m.fromLabel), cell(m.concept), cell(m.reference), cell(m.txHash), cell(m.receiptId),
  ].join(","));
  return [head, ...lines].join("\n");
}

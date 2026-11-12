import { movementsCsv } from "../src/relayer/export";
import type { Movement } from "../src/relayer/types";

test("CSV con cabecera, una fila por movimiento, comas escapadas, fechas ISO", () => {
  const rows: Movement[] = [
    { id: "mv_1", kind: "deposit", status: "completed", amountUsdcCents: 492_75, amountMxnCents: 8_500_00, at: Date.UTC(2026, 10, 11, 12), fromLabel: "Acme", concept: "Nómina, quincena", reference: "ACME-1", txHash: "0xabc" },
    { id: "mv_2", kind: "withdrawal", status: "failed", amountUsdcCents: 100_00, at: Date.UTC(2026, 10, 12, 9), receiptId: "rcpt_1" },
  ];
  expect(movementsCsv(rows)).toBe([
    "id,fecha,tipo,estado,usdc,mxn,origen,concepto,referencia,hash,recibo",
    'mv_1,2026-11-11T12:00:00.000Z,deposit,completed,492.75,8500.00,Acme,"Nómina, quincena",ACME-1,0xabc,',
    "mv_2,2026-11-12T09:00:00.000Z,withdrawal,failed,-100.00,,,,,,rcpt_1",
  ].join("\n"));
  expect(movementsCsv([])).toBe("id,fecha,tipo,estado,usdc,mxn,origen,concepto,referencia,hash,recibo");
});

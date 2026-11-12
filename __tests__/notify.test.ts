import { depositNotificationContent, pushTargetOf } from "../src/relayer/notify";
import type { Movement } from "../src/relayer/types";

const m: Movement = { id: "mv_0007", kind: "deposit", status: "completed", amountUsdcCents: 492_75, amountMxnCents: 8_500_00, at: 0, fromLabel: "Acme", concept: "Nómina · 2.ª quincena", reference: "ACME-NOM-2026-11B" };

test("la notificación local del depósito lleva empresa, monto y concepto, y el target al movimiento", () => {
  expect(depositNotificationContent(m)).toEqual({
    title: "Te pagó Acme",
    body: "+$8,500.00 MXN (≈ 492.75 USDC) · Nómina · 2.ª quincena",
    data: { recibo: { kind: "deposit", movementId: "mv_0007" } },
  });
});

test("pushTargetOf lee `recibo` de content.data y descarta lo demás", () => {
  expect(pushTargetOf({ recibo: { kind: "deposit", movementId: "mv_1" } })).toEqual({ kind: "deposit", movementId: "mv_1" });
  expect(pushTargetOf({ recibo: { kind: "otro", movementId: "mv_1" } })).toBeNull();
  expect(pushTargetOf({ pickler: { kind: "read" } })).toBeNull();
  expect(pushTargetOf(null)).toBeNull();
  expect(pushTargetOf(undefined)).toBeNull();
});

import { DEMO_RATE, feeCents, formatCents, formatMxn, formatRate, formatUsdc, MIN_SEND_MXN_CENTS, mxnToUsdcCents, parseAmount, quoteFor, SEND_FEE_BPS, usdcToMxnCents } from "../src/relayer/money";

test("constantes de la demo", () => {
  expect(DEMO_RATE).toBe(17.25);
  expect(SEND_FEE_BPS).toBe(50);
  expect(MIN_SEND_MXN_CENTS).toBe(50_00);
});

test("USDC ↔ MXN en centavos con redondeo half-up", () => {
  expect(usdcToMxnCents(100_00)).toBe(1725_00);
  expect(mxnToUsdcCents(1725_00)).toBe(100_00);
  expect(usdcToMxnCents(1)).toBe(17);            // 17.25 → 17
  expect(usdcToMxnCents(3)).toBe(52);            // 51.75 → 52
  expect(mxnToUsdcCents(8_500_00)).toBe(492_75); // nómina de 8,500 MXN
  expect(feeCents(300)).toBe(2);                 // 1.5 → 2
  expect(feeCents(280)).toBe(1);                 // 1.4 → 1
  expect(feeCents(100_00)).toBe(50);
});

test("formatos", () => {
  expect(formatCents(125000)).toBe("1,250.00");
  expect(formatCents(5)).toBe("0.05");
  expect(formatCents(-250)).toBe("−2.50");
  expect(formatCents(123456789)).toBe("1,234,567.89");
  expect(formatUsdc(49275)).toBe("492.75 USDC");
  expect(formatMxn(850000)).toBe("$8,500.00 MXN");
  expect(formatRate(17.25)).toBe("1 USDC = $17.25 MXN");
});

test("parseAmount: punto decimal, comas de miles, máximo 2 decimales", () => {
  expect(parseAmount("1,250.5")).toBe(125050);
  expect(parseAmount("1250")).toBe(125000);
  expect(parseAmount(" 0.05 ")).toBe(5);
  expect(parseAmount("")).toBeNull();
  expect(parseAmount("abc")).toBeNull();
  expect(parseAmount("1.234")).toBeNull();
  expect(parseAmount("-5")).toBeNull();
});

test("quoteFor: comisión dentro del monto; mínimo 50 MXN recibidos; saldo suficiente", () => {
  expect(quoteFor(300, 10_000)).toEqual({ ok: true, quote: { amountUsdcCents: 300, feeUsdcCents: 2, netUsdcCents: 298, amountMxnCents: 5141, rate: 17.25 } });
  expect(quoteFor(280, 10_000)).toEqual({ ok: false, code: "below_minimum" });   // 279 → 48.13 MXN
  expect(quoteFor(0, 10_000)).toEqual({ ok: false, code: "below_minimum" });
  expect(quoteFor(100_00, 50_00)).toEqual({ ok: false, code: "insufficient_balance" });
  expect(quoteFor(100_00, 100_00).ok).toBe(true);
});

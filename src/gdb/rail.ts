import type { Authorization } from "./ledger";

// Cómo se mueve el dinero de una compra con tarjeta (decisión de 2026-11-18): la tarjeta es de Clara (Mastercard, con su issuer
// processor) y los fondos del empleado están custodiados en su wallet de Bridge. No hay passkey ni firma del usuario: Clara
// instruye a Bridge por API, en nombre del empleado. Puro: sólo traduce el estado de la autorización a los pasos del esquema.
//
//   01 Autorización (tiempo real): empleado paga → Mastercard pide autorización → Clara + issuer processor valida Available y
//      aprueba.
//   02 Movimiento de fondos y settlement: en cuanto Mastercard confirma la aprobación, Clara instruye la transferencia wallet
//      del empleado → wallet de Clara (ambas en Bridge). Mientras se procesa hay reserva; cuando Bridge confirma, los fondos ya
//      salieron. La compensación y el settlement neto con Mastercard (vía el banco liquidador) llegan después.

export type RailState = "done" | "current" | "todo" | "bad";
export type RailNode = "payer" | "network" | "issuer" | "userWallet" | "claraWallet" | "bank" | "netSettle";
/** `call`: la llamada a Bridge que ejecuta el paso (null si no hay ninguna). */
export type RailStep = { node: RailNode; state: RailState; call: string | null };
export type CardRail = {
  /** Monto en USDC, 1:1 con el USD de la compra. */ usdc: string;
  /** `moving`: aprobada, transferencia en proceso · `moved`: los fondos ya están en la wallet de Clara · `clearing`: la red
   *  compensó, falta liquidar · `settled`: liquidado con Mastercard. */
  stage: "declined" | "moving" | "moved" | "clearing" | "settled";
  /** La wallet del empleado ya se debitó. */ moved: boolean;
  authorization: RailStep[];
  settlement: RailStep[];
};

export const BRIDGE_CALLS = {
  /** Wallet del empleado → wallet de Clara, con `on_behalf_of` = el customer del empleado. */
  walletToWallet: "POST /v0/transfers · bridge_wallet → bridge_wallet",
  /** Wallet de Clara → cuenta USD en el banco liquidador. */
  offRamp: "POST /v0/transfers · bridge_wallet → wire (USD)",
} as const;

export function cardRail(a: Authorization): CardRail {
  const usdc = (a.amount / 100).toFixed(2);
  const stage: CardRail["stage"] = a.status === "declined" ? "declined" : a.status === "settled" ? "settled" : a.status === "cleared" ? "clearing" : a.movedAt !== null ? "moved" : "moving";
  const lvl = ["moving", "moved", "clearing", "settled"].indexOf(stage); // −1 = rechazada
  const at = (doneFrom: number, currentAt: number): RailState => (lvl >= doneFrom ? "done" : lvl === currentAt ? "current" : "todo");
  return {
    usdc, stage, moved: lvl >= 1,
    authorization: [
      { node: "payer", state: "done", call: null },
      { node: "network", state: "done", call: null },
      { node: "issuer", state: stage === "declined" ? "bad" : "done", call: null },
    ],
    settlement: [
      { node: "userWallet", state: at(1, 0), call: BRIDGE_CALLS.walletToWallet },
      { node: "claraWallet", state: at(1, -2), call: null },
      { node: "bank", state: at(3, 2), call: BRIDGE_CALLS.offRamp },
      { node: "netSettle", state: at(3, -2), call: null },
    ],
  };
}

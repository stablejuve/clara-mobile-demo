import type { Balance, BankAccount, CardDetails, KycLinks, ModuleEvent, ModuleSnapshot, ModuleState, Movement, Quote, Receipt, WalletProvider } from "./types";
import type { Scenario } from "./mock/scenarios";

/** Frontera del módulo (D6): las pantallas sólo hablan con esto. Hoy lo implementa `mock/`; la fase de backend lo cambia por HTTP.
 *  Lista del spec («Capa mock») + dos métodos que el flujo exige: `deactivate` (Ajustes, evento module.deactivated) y
 *  `reconfirmKyc` («confirma tus datos» tras endorsement_expired, D5). `freezeCard(frozen)` cubre congelar y descongelar. */
export type RelayerModuleApi = {
  getModule(): Promise<ModuleState>;
  acceptTerms(): Promise<ModuleState>;
  startKyc(): Promise<KycLinks>;
  completeKycReturn(): Promise<ModuleState>;
  createPasskey(): Promise<{ address: string }>;
  getBalance(): Promise<Balance>;
  listMovements(): Promise<Movement[]>;
  requestCard(): Promise<ModuleState>;
  authorizeCard(): Promise<ModuleState>;
  getCard(): Promise<CardDetails>;
  freezeCard(frozen: boolean): Promise<ModuleState>;
  addToWallet(provider: WalletProvider): Promise<ModuleState>;
  addBankAccount(clabe: string): Promise<BankAccount>;
  quoteSend(amountUsdcCents: number): Promise<Quote>;
  confirmSend(quoteId: string): Promise<Receipt>;
  getReceipt(id: string): Promise<Receipt>;
  getEvents(): Promise<ModuleEvent[]>;
  deactivate(): Promise<ModuleState>;
  reconfirmKyc(): Promise<ModuleState>;
};

/** Sólo para la demo (panel oculto y useModule): no existirá en el backend real. */
export type RelayerDemoApi = {
  getSnapshot(): ModuleSnapshot;
  subscribe(listener: (snap: ModuleSnapshot) => void): () => void;
  getScenario(): Scenario;
  setScenario(s: Scenario): Promise<void>;
  /** «Simular pago de Acme»: crea el movimiento (MXN → USDC al tipo de la demo) y lo emite; la app dispara la notificación. */
  simulateEmployerDeposit(input: { amountMxnCents: number; concept: string; reference: string }): Promise<Movement>;
  reset(): Promise<void>;
};

import type { ReactElement, ReactNode } from "react";
import type { AppCtx } from "../../ctx";
import type { ModuleScreen } from "../../navigation/screens";
import { BalanceScreen, SettingsButton } from "./balance";
import { BankAccountScreen } from "./bankAccount";
import { CardScreen } from "./card";
import { CardAuthorizeScreen } from "./cardAuthorize";
import { CardRequestScreen } from "./cardRequest";
import { DepositScreen } from "./deposit";
import { DemoPanelScreen } from "./demoPanel";
import { ActivateScreen } from "./activate";
import { AddToWalletScreen } from "./addToWallet";
import { KycScreen } from "./kyc";
import { KycPendingScreen } from "./kycPending";
import { KycRejectedScreen } from "./kycRejected";
import { PasskeyScreen } from "./passkey";
import { SendScreen } from "./send";
import { SendReceiptScreen } from "./sendReceipt";
import { SettingsScreen } from "./settings";
import { TermsScreen } from "./terms";

/** Pantalla de cada ruta recibo/*. */
export const MODULE_COMPONENTS: Record<ModuleScreen, (ctx: AppCtx) => ReactElement> = {
  activate: ActivateScreen, terms: TermsScreen, kyc: KycScreen, kycPending: KycPendingScreen, kycRejected: KycRejectedScreen,
  passkey: PasskeyScreen, balance: BalanceScreen, deposit: DepositScreen, cardRequest: CardRequestScreen, cardAuthorize: CardAuthorizeScreen,
  card: CardScreen, addToWallet: AddToWalletScreen, bankAccount: BankAccountScreen, send: SendScreen, sendReceipt: SendReceiptScreen,
  settings: SettingsScreen, demoPanel: DemoPanelScreen,
};

/** Botón a la derecha de la cabecera (balance → ajustes, Task 12). */
export const MODULE_HEADER_RIGHT: Partial<Record<ModuleScreen, (ctx: AppCtx) => ReactNode>> = { balance: (ctx) => SettingsButton(ctx) };

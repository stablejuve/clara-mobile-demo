# relayer-mobiledemo — módulo "Recibo" embebido en una app de beneficios — design

**Fecha:** 2026-11-11 · **Estado:** aprobado en sesión por el owner · **Repo:** `relayer-mobiledemo` (fork del cascarón `pickler-expo/apps/mobile`).

## Why

Relayer quiere vender a plataformas de RH/beneficios y a empleadores grandes un módulo para que sus usuarios finales reciban dinero en stablecoins, lo gasten con una tarjeta virtual Visa y lo manden a su banco. Antes de construir el backend hace falta **enseñar el flujo completo** desde el lado del usuario: cómo se activa el módulo dentro de la app de la empresa, qué acepta, qué verifica, qué ve y qué puede hacer. Esta app es ese cascarón: todo con datos fijos y una capa mock, para iterar producto y enseñar en reuniones. La conexión con el API de Relayer es otra fase.

## Goal

Una app Expo que se corre en simulador y se sube a TestFlight, con:

1. una **app anfitriona genérica** (empresa ficticia "Acme Beneficios") con tres pestañas de relleno;
2. el **módulo Recibo**, "powered by Relayer", que el usuario activa desde Beneficios y recorre de punta a punta: términos → KYC → wallet con passkey → saldo y depósitos → tarjeta virtual → agregar al teléfono → cuenta bancaria → envío a banco → recibo;
3. una **capa mock** del API de Relayer con máquina de estados, latencias y escenarios conmutables (camino feliz, KYC rechazado, tarjeta no disponible en el país, retiro fallido) desde un panel de demo oculto;
4. un `docs/` con este spec, el **modelo de datos** que el backend real guardará y el **contrato de eventos** hacia la empresa.

## Decisions

| # | Decisión | Por qué |
|---|---|---|
| D1 | **Fork del cascarón de pickler**: react-navigation 7 (tabs + stack por tab + root stack), StyleSheet con tokens, primitivas `T/Btn/Card/KV/Chip/Segmented/Stepper/Page`, gate de cuenta, desbloqueo Face ID + SecureStore, `useNotifications`, onboarding de una sola vez, jest con lógica pura, scripts de TestFlight. Se borra todo lo de Perpl, reads, Monad, markets/board/agents/portfolio y la wallet Mera. | Lo que pide el owner: cascarón probado, re-skin, cero backend. |
| D2 | **Persona**: empleado en México. Saldo en USDC con equivalente en MXN, salida a CLABE por SPEI, tarjeta Visa virtual en USD. | Es el caso Bridge para LatAm y el cliente objetivo. |
| D3 | **No custodial**: el usuario crea una passkey (Turnkey en la fase real) y es dueño de la wallet en Base; la tarjeta gasta directo de esa wallet tras una autorización on-chain única; el envío a banco sale de esa wallet hacia Bridge. En la demo todo se simula, pero las pantallas son las del flujo real. | Coherente con Relayer (nunca custodia) y con la posición regulatoria en México: Relayer es proveedor de tecnología; Bridge es la contraparte regulada del usuario para FX y rieles. |
| D4 | **Marca**: look and feel de Relayer (tokens de `apps/web/app/tokens.css` portados a `src/ui/theme.ts`, light y dark). Nombre del módulo: **Recibo**. "Powered by Relayer" en términos y pie. La empresa anfitriona solo pone su nombre. | El owner lo pidió así; el white label por empresa queda para después. |
| D5 | **Fidelidad a Bridge** en la lógica del mock: alta con KYC Links (`tos_link` + `kyc_link` con `redirect_uri` de vuelta a la app); endorsements `base`, `spei` y `cards`; la tarjeta debe pedirse dentro de las **24 h** posteriores al KYC o el endorsement caduca (la UX pide la tarjeta al aprobar y, si venció, muestra "confirma tus datos"); CLABE como cuenta externa con verificación de titularidad (depósito de 0.01 MXN); retiro mínimo 50 MXN; tarjeta por Stripe Issuing con push provisioning a Apple/Google Wallet. | Para que al conectar el backend no cambie el flujo. |
| D6 | **Mock como contrato**: `src/relayer/` expone la interfaz `RelayerModuleApi` (tipos + métodos) y `src/relayer/mock/` la implementa con estado en memoria y latencias. La fase de backend reemplaza solo la implementación. | Separa pantalla de transporte desde el día uno. |
| D7 | **i18n mínima**: copy en español en `src/i18n/es.ts` con `t()`; inglés después. | La demo es para México; evita hardcodear texto en pantallas. |
| D8 | **Sin backend, sin SDKs reales**: nada de Bridge, Turnkey, Stripe ni passkeys reales. La passkey se simula con Face ID local (expo-local-authentication) para que la ceremonia se sienta real. | Alcance de esta fase. |
| D9 | **iOS primero** (simulador y TestFlight con los scripts heredados); Android compila pero no se pule. | Herencia del cascarón; EAS queda para la fase de backend. |

## Arquitectura

```
App.tsx                      fuentes, splash, AppCtx, Navigator
src/navigation/              routes.ts (tabla pura + gate), Navigator.tsx, ref.ts, TabBar
src/ui/                      theme.ts (tokens Relayer light/dark), primitives.tsx, Page.tsx, variants.ts
src/host/                    app anfitriona: screens/home, benefits, profile (relleno estático)
src/relayer/                 api.ts (RelayerModuleApi), types.ts, state.ts (máquina de estados pura)
src/relayer/mock/            mockApi.ts (estado en memoria + latencias), scenarios.ts, fixtures/
src/relayer/screens/         activate, terms, kyc, kycPending, passkey, balance, deposit,
                             cardRequest, cardAuthorize, card, addToWallet, bankAccount,
                             send, sendReceipt, settings, demoPanel
src/hooks/                   useModule (estado del módulo), useUnlock (Face ID), useNotifications
src/i18n/                    es.ts, t()
docs/                        specs/, data-model.md, events.md
__tests__/                   lógica pura: state, money, kyc24h, routes, theme
```

### Navegación

- Tabs de la anfitriona: `HomeTab`, `BenefitsTab`, `ProfileTab`. El módulo vive como stack dentro de `BenefitsTab`: `benefits → recibo/*`.
- Gate heredado: sin módulo activo, cualquier pantalla de `recibo/*` manda a `activate` recordando el destino.
- Deep link `relayermobiledemo://recibo/kyc-return` para el regreso del KYC (en la demo lo dispara el mock).

### Máquina de estados del módulo (`src/relayer/state.ts`, pura y testeada)

```
module:  off → terms_pending → kyc → wallet_ready → active
kyc:     not_started → incomplete → under_review → approved | rejected
wallet:  none → passkey_created → address_ready
card:    none → requested → endorsement_pending → active → frozen   (endorsement_expired si pasaron 24 h sin pedirla)
pass:    not_added → added
bank:    none → pending_verification → verified | failed
send:    idle → quoting → confirming → submitted → completed | failed
```

Reglas: `card.request` solo con `kyc=approved` y `wallet=address_ready`; si `now - kyc.approved_at > 24h` el mock responde `endorsement_expired` y la UI ofrece "confirma tus datos" (reinicia a `under_review` corto → `approved`). `send` exige `bank=verified`, `amount_mxn ≥ 50` y saldo suficiente. `pass.add` exige `card=active`.

### Capa mock

- `RelayerModuleApi`: `getModule()`, `acceptTerms()`, `startKyc()`, `completeKycReturn()`, `createPasskey()`, `getBalance()`, `listMovements()`, `requestCard()`, `authorizeCard()`, `getCard()`, `freezeCard()`, `addToWallet(provider)`, `addBankAccount(clabe)`, `quoteSend(amountUsdc)`, `confirmSend(quoteId)`, `getReceipt(id)`, `getEvents()`.
- Latencias 300–1200 ms; errores tipados `RelayerError{code}` con copy en `i18n`.
- Escenarios (`scenarios.ts`): `happy`, `kyc_rejected`, `cards_unavailable_region`, `endorsement_expired`, `send_failed`, `bank_verification_failed`. Se cambian desde el panel de demo (toque largo 5 s en el pie "powered by Relayer") y persisten en AsyncStorage.
- Depósitos: el panel de demo tiene "simular pago de Acme" (monto, concepto, referencia), que crea un movimiento y dispara una notificación local.

### Modelo de datos (lo que el backend real persistirá; `docs/data-model.md`)

`end_user` (id, host_tenant_id, external_user_id, email, name, country, locale) · `consent` (end_user_id, tos_version, accepted_at, bridge_signed_agreement_id) · `kyc` (bridge_customer_id, kyc_link_id, status, rejection_reasons[], endorsements{base,spei,cards}{status,approved_at}) · `wallet` (turnkey_sub_org_id, passkey_credential_id, chain, address) · `card` (issuer_card_id, last4, expiry, status, freezes[], authorized_at, provisioning{apple,google}) · `external_account` (bridge_external_account_id, bank_name, clabe_last4, owner_name, verification{status,completed_at}) · `deposit` (tx_hash, chain, amount_usdc, from_label, reference, memo, received_at) · `withdrawal` (bridge_transfer_id, amount_usdc, amount_mxn, rate, fee, status, receipt_url, created_at, completed_at) · `event_outbox` (id, tenant_id, type, payload, delivered_at, attempts).

### Contrato de eventos hacia la empresa (`docs/events.md`)

Webhooks firmados (HMAC) e idempotentes (`event_id`), sin PII sensible ni PAN: `module.activated`, `kyc.approved`, `kyc.rejected` (solo estado), `wallet.ready` (dirección y chain, para pagar), `card.issued`, `deposit.received` (eco de la `reference` que mandó la empresa), `withdrawal.completed`, `module.deactivated`. La demo los lista en el panel de demo como "lo que recibiría Acme".

## Pantallas (orden del flujo)

1. **Beneficios** (anfitriona): tarjeta "Recibo · powered by Relayer" con CTA Activar.
2. **Activar**: qué es, qué vas a poder hacer, 3 pasos.
3. **Términos**: Bridge + Relayer, checkbox, "powered by Relayer".
4. **KYC**: abre el flujo (en la demo, pantalla simulada de Persona con 3 pasos) y regresa por deep link.
5. **KYC en revisión / rechazado**: estados con razón visible al usuario.
6. **Crear passkey**: ceremonia con Face ID, resultado con la dirección.
7. **Saldo**: USDC y equivalente MXN, tipo de cambio, movimientos, acciones Tarjeta / Enviar.
8. **Depósito**: detalle con empresa, concepto, referencia, hash.
9. **Pedir tarjeta**: condiciones, botón; estado "endorsement pendiente"; "confirma tus datos" si venció.
10. **Autorizar tarjeta**: explicación de la autorización on-chain, Face ID, listo.
11. **Tarjeta**: arte, últimos 4, vencimiento, congelar/descongelar, ver datos (simulado).
12. **Agregar al teléfono**: Apple Wallet / Google Pay simulado.
13. **Cuenta bancaria**: CLABE, banco detectado, titular; verificación pendiente → verificada.
14. **Enviar a banco**: monto en USDC o MXN, cotización, comisión, confirmación con Face ID.
15. **Recibo**: estado, folio, compartir.
16. **Ajustes del módulo**: desactivar, exportar movimientos, soporte; pie "powered by Relayer" (toque largo → panel de demo).

## Non-goals

- Backend, API real, Bridge, Turnkey, Stripe, passkeys reales, push remoto.
- White label por empresa, Android pulido, EAS, tarjeta física, inglés completo.
- Nómina formal, beneficios tipo vales.

## Open questions (default applies unless the owner says otherwise)

1. **Tarjetas en México**: Bridge aprueba por país según el programa. Default: la demo asume que sí y tiene el escenario `cards_unavailable_region` listo.
2. **Nombre "Recibo"**: default hasta que el owner diga otro.
3. **Bundle id y dominio del deep link**: default `fi.relayer.mobiledemo` y `relayermobiledemo://`.

## Testing

- Jest (jest-expo): `state.ts` (todas las transiciones válidas e inválidas, regla de 24 h), `money.ts` (USDC↔MXN, redondeo, mínimo 50 MXN), `routes.ts` (gate y tabla), `theme.ts` (contraste y tokens light/dark), `scenarios.ts` (cada escenario produce el estado esperado).
- Manual: recorrido completo en simulador por escenario, checklist en `docs/walkthrough.md`.

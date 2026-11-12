# Recibo · flujos que no se sienten fintech + modo explicativo de endpoints

Fecha: 2026-11-12. Estado: **en curso**.

Decisiones del 2026-11-12: tarjeta **automática** (A1 hecho); límite de gasto sin hoja propia por ahora, pero el modo explicativo
lo cuenta en «Autorizar» (A3 parcial); se agregan **transacciones de tarjeta**; **B hecho** con enlaces a documentación por
endpoint; montos con MXN primero y USDC de referencia. Pendientes: A2 (términos de tarjeta), A4–A6.

Dos frentes:

- **A. Lógicas raras.** Botones que solo «cargan algo» o datos que no salen de ningún lado. Cada uno se rehace como funcionaría
  con Bridge + Stripe Issuing.
- **B. Modo explicativo.** Al tocar una acción, la app muestra qué endpoint de **nuestro** backend llamaría, qué hace y qué
  le pide a Bridge, Stripe o Turnkey. Es solo visual, sin integrar nada.

---

## Lo que dice Bridge (fuente de las decisiones)

Páginas: `platform/cards/overview/kyc`, `platform/cards/overview/stripe-issuing`, `platform/cards/overview/noncustodial`,
`platform/cards/features`, `platform/cards/additional/fees`, `platform/customers/customers/kyclinks`.

1. **No existe «pedir tarjeta» como trámite aparte.** La tarjeta sale del endorsement `cards` del Customer. Se pide en el
   mismo KYC Link (`GET /v0/customers/{id}/kyc_link?endorsement=cards`). Al aprobarse, Bridge **crea solo el Cardholder** en
   Stripe y devuelve `stripe_cardholder_id`.
2. **Ventana de 24 h.** Si no se crea la tarjeta dentro de las 24 h siguientes a la aprobación, el endorsement pasa a `revoked`
   y el cardholder a `inactive`. Se reactiva con un KYC link nuevo con `endorsement=cards` («confirma tus datos»). Por eso los
   programas emiten la tarjeta **en automático** en cuanto aprueban el KYC.
3. **Emitir = `POST /v1/issuing/cards` en Stripe** con `type=virtual`, `status=active` y `crypto_wallet{chain, currency, type, address}`.
   Si la creas con `status=active`, ya está activa.
4. **No custodial:** la wallet del usuario tiene que hacer un `approve(spender, monto)` ERC-20 al contrato de Bridge. Ese
   monto es el **tope de gasto real** de la tarjeta. Nuestro «Autorizar con Face ID» es esta firma, y hoy no dice cuánto se aprueba.
5. **Términos:** el `tos_link` de Bridge se acepta antes de aprobar. Las comisiones de la tarjeta se revelan en los
   **términos del programa** que el usuario acepta al darse de alta. En issuing comercial se registra IP y fecha
   (`user_terms_acceptance`).
6. **Ver datos sensibles:** PAN, CVV y vencimiento se muestran con Stripe Issuing Elements (iframe) o con una ephemeral key.
   Nunca pasan por nuestro backend.
7. **Apple/Google Wallet:** push provisioning de Stripe Issuing.

---

## A. Lógicas a rehacer

| # | Hoy | Problema | Propuesta |
|---|---|---|---|
| A1 | Pantalla Tarjeta: botón **«Pedir tarjeta»** → «Emitiendo…» → aparece | Bridge no tiene ese paso y es un botón que solo carga | **La tarjeta nace con la activación.** Al aprobar el KYC (endorsement `cards` en el mismo link) el backend la emite sola. La pantalla Tarjeta ya la muestra; si todavía se está emitiendo, el brillo y «Emitiendo…» sin botón |
| A2 | Términos del alta: Bridge + Relayer | Faltan los términos del programa de tarjeta y sus comisiones | La página de términos agrega un tercer renglón, **«Términos de la tarjeta Visa (Lead Bank) y comisiones»**, con enlace. Se aceptan una sola vez con el resto |
| A3 | **«Autorizar con Face ID»** sin contexto | No dice qué se firma ni cuánto | Hoja **«Límite de gasto»**: monto sugerido ($5,000 MXN ≈ USDC), editable, con la explicación «la tarjeta podrá tomar hasta este monto de tu wallet» → Face ID → firma del `approve`. Cambiar el límite después es la misma hoja |
| A4 | «Límites» con texto fijo ($20,000 / $50,000) | No sale de ningún lado | «Límite de gasto» = el allowance de A3, con botón **Cambiar**. El de SPEI se quita (Bridge no expone un límite por usuario) o se marca como regla del programa |
| A5 | «Compras en línea» / «Pagos sin contacto» | Interruptores que no guardan nada | Mapearlos a `spending_controls` de Stripe Issuing (por categoría o canal) y pasar por la API; o quitarlos. **Recomendación: quitarlos** hasta que el programa los soporte |
| A6 | «Ver datos» voltea al instante | Revelar PAN/CVV es una acción sensible | Face ID → se revela → se oculta solo a los 60 s, con un contador. Se explica como Issuing Elements |
| A7 | Seed de 4 cuentas guardadas al activarse | Un usuario nuevo no tendría contactos | Solo **«Mi cuenta de nómina»**, que viene de RH (la empresa ya conoce la CLABE donde paga). «Mamá», «Renta» y «Gimnasio» quedan como datos de demo, sembrados desde el panel |
| A8 | Retiro: la cuenta nueva se verifica sola en 3 s | Correcto en el fondo | Mantener. El modo explicativo (B) dice que Bridge crea la `external_account` y verifica al titular |
| A9 | Tarjeta vencida (24 h) → «Confirma tus datos» | Correcto | Mantener. Con A1 casi no se ve, porque la emisión es inmediata |

Nuevo orden del alta con A1–A3: intro → términos (Bridge + Relayer + tarjeta) → KYC (con `endorsement=cards`) → passkey/wallet →
**límite de gasto (approve)** → listo, con la tarjeta ya en Saldo y en Tarjeta.

> Pregunta abierta para el negocio: ¿el límite de gasto se fija en el alta (paso extra) o la primera vez que se abre
> la tarjeta? Propuesta: en el alta, con «Ahora no» que deja la tarjeta visible pero sin poder gastar.

---

## B. Modo explicativo (endpoint inspector)

### Cómo se ve
- Interruptor **«Mostrar llamadas al backend»** en el panel de demo y en Perfil. Encendido por default en builds de demo.
- Cada acción que pega al API saca un **chip abajo**, sobre la tab bar y las hojas, durante unos 4 s:
  `POST /v1/end-users/{id}/beneficiaries` + una línea («Guarda la CLABE y pide a Bridge que verifique al titular»).
- Al tocar el chip se abre una hoja con:
  - el método y la ruta;
  - la descripción;
  - **qué llama hacia afuera** (p. ej. `Bridge POST /v0/customers/{id}/external_accounts`);
  - un ejemplo de request/response (JSON fijo);
  - la etiqueta **Existe hoy** o **Por construir**, y en ese caso el endpoint más parecido de relayer-core.
- Si una pantalla dispara varias llamadas, se apilan (máx. 3). Las de fondo (veredicto del KYC, liquidación SPEI) llegan como
  **webhook entrante** con su propio estilo (`← Bridge webhook customer.updated`).

### Cómo se construye
1. `src/relayer/endpoints.ts`: catálogo puro que mapea cada método de `RelayerModuleApi` y cada proceso de fondo del mock a
   `{ method, path, summary, upstream[], status: "exists" | "planned", nearest?, sample }`.
   Un test exige que **todo método del API tenga entrada**.
2. `src/relayer/trace.ts`: `withTrace(api, emit)` envuelve el API con un Proxy. Al llamar un método emite
   `{ key, at, ok, error? }` y el mock emite los procesos de fondo. Las pantallas no cambian.
3. `src/ui/TraceChip.tsx`: el overlay del chip y su hoja de detalle, montados en `App.tsx` junto al Banner.
4. Preferencia en storage local: `trace.enabled`.

### Catálogo inicial (nuestro backend → proveedor)

«Existe» = ya está en `relayer-core/apps/api`. Hoy esas rutas son del integrador; para Recibo hacen falta las variantes por
usuario final (`/v1/end-users/{id}/…`), que se marcan «Por construir» con el endpoint actual como `nearest`.

| Acción en la app | Nuestro endpoint | Estado | Hacia afuera |
|---|---|---|---|
| Activar Recibo | `POST /v1/end-users` | Existe | Turnkey: sub-org del usuario |
| Aceptar términos | `POST /v1/end-users/{id}/consents` | Por construir (`/app/kyc/customers/tos-link`) | Bridge `tos_link` → `signed_agreement_id` |
| Enviar KYC | `POST /v1/end-users/{id}/kyc` | Por construir (`/app/kyc/customers/submit`) | Bridge `POST /v0/customers` con endorsements `base, spei, cards` |
| Veredicto KYC (fondo) | `POST /hooks/bridge` | Existe | ← Bridge webhook `customer.updated` |
| Crear passkey / wallet | `POST /v1/end-users/{id}/wallet` | Por construir (`/app/passkeys/register`, `/app/wallets/confirm`) | Turnkey: passkey + wallet en Base |
| Emitir tarjeta (auto, A1) | `POST /v1/end-users/{id}/card` | Por construir | Stripe `POST /v1/issuing/cards` (`crypto_wallet`) |
| Límite de gasto (A3) | `POST /v1/end-users/{id}/card/allowance` | Por construir | Turnkey firma `approve()` al spender de Bridge en Base |
| Ver datos (A6) | `POST /v1/end-users/{id}/card/reveal` | Por construir | Stripe ephemeral key → Issuing Elements |
| Congelar | `PATCH /v1/end-users/{id}/card` | Por construir | Stripe `status=inactive` |
| Agregar a Wallet | `POST /v1/end-users/{id}/card/provisioning` | Por construir | Stripe push provisioning |
| Cuentas guardadas | `GET /v1/end-users/{id}/beneficiaries` | Por construir (`GET /v1/recipients/with-accounts`) | — |
| Nueva cuenta | `POST /v1/end-users/{id}/beneficiaries` | Por construir (`POST /v1/recipients`, `/:id/accounts`) | Bridge `POST /v0/customers/{id}/external_accounts` (SPEI) |
| Cotizar | `POST /v1/offramp/quote` | Existe | Bridge tipo de cambio USDC→MXN |
| Confirmar retiro | `POST /v1/payouts` | Existe (integrador) | Turnkey firma la transferencia → Bridge transfer a la external account |
| Liquidación SPEI (fondo) | `POST /hooks/bridge` | Existe | ← Bridge webhook `transfer.updated` |
| Depósito de nómina (fondo) | evento a la empresa | Existe (`/v1/webhooks`) | ← on-chain (Base) |

El texto final de cada entrada se valida contra los controllers antes de escribirlo; las rutas «Por construir» son la
propuesta de API para la fase de backend.

---

## Orden de trabajo

1. **Terminar beneficiarios** (en curso, sin commit): verificar en pantalla y hacer commit. Incluye A7.
2. **B. Modo explicativo**: catálogo, trace, chip y hoja, con tests del catálogo. Va primero porque no cambia flujos y deja
   cada cambio de A autoexplicado.
3. **A1 + A2**: tarjeta automática y términos de tarjeta (mock: emitir al aprobar el KYC; quitar `requestCard` de la UI).
4. **A3 + A4**: hoja de límite de gasto, allowance en el estado y los límites derivados.
5. **A6**: revelar con Face ID y ocultar a los 60 s.
6. **A5**: quitar los controles falsos (o mapearlos si el negocio los quiere).
7. Actualizar `docs/walkthrough.md`, `docs/data-model.md` (allowance, consentimiento de tarjeta) y CLAUDE.md.

## Decisiones que necesito

- A1: ¿tarjeta automática (recomendado) o botón con confirmación y términos?
- A3: ¿el límite de gasto va en el alta o al primer uso?
- A5: ¿quitar los controles o dejarlos como «próximamente»?
- B: ¿el chip se enciende por default o solo desde el panel?

---

## C. Contrato de endpoints: tarjeta y retiro (qué valida cada uno)

Fuentes Bridge: `platform/cards/overview/{kyc,stripe-issuing,noncustodial,funding-strategies,webhooks}`,
`platform/cards/additional/fees`, `api-reference/exchange-rates`, `platform/orchestration/transfers/transfer`.
Patrón de firma igual que relayer-core (`…/prepare` devuelve la transacción a firmar con la passkey, `…/confirm` la manda).

### Hechos de Bridge que cambian el diseño
- **No hay precio bloqueado.** `GET /v0/exchange_rates?from=usd&to=mxn` regresa `midmarket_rate`, `buy_rate` y `sell_rate`
  (con la comisión de Bridge incluida). Se actualiza cada ~30 s y Bridge dice que no ofrece un quote con tasa bloqueada.
  Nuestro `POST /v1/offramp/quote` ya hace esto: tasa en vivo + nuestra comisión. ⇒ El «Precio fijo · 60 s» de la demo
  **no es real**: debe decir «Tipo de cambio estimado» y recotizar justo antes de firmar.
- **La tarjeta cobra en USD** (`currency=usd`) y gasta USDC 1:1. Una compra en pesos la convierte **la red Visa** (tasa de la
  red + nuestra FX fee configurable); no llamamos a ningún endpoint de precios para autorizarla. El MXN que mostramos de la
  compra sale del webhook (`merchant_amount` / `fees.fx_fee`).
- **Quien valida la compra es Bridge**, al momento de la autorización: que la wallet tenga el `approve` vigente al contrato del
  programa y **saldo USDC suficiente**; si sí, jala los fondos on-chain *just-in-time*. Si no, la rechaza.

### Tarjeta
| # | Endpoint (nuestro) | Valida | Llama a |
|---|---|---|---|
| T1 | `POST /v1/end-users/{id}/card` (lo dispara el backend al aprobarse el KYC) | endorsement `cards` = approved y < 24 h; hay `stripe_cardholder_id`; wallet creada; no hay otra tarjeta activa | Stripe `POST /v1/issuing/cards` `type=virtual, status=active, currency=usd, crypto_wallet{chain:avalanche_c_chain, currency:usdc, type:standard, address}` |
| T2 | `POST …/card/allowance/prepare` `{ amount_usdc }` | tarjeta activa; monto > 0 | Avalanche RPC: arma `approve(spender_programa, monto)` |
| T3 | `POST …/card/allowance/confirm` `{ signed_tx }` | firma de la passkey del usuario | Turnkey firma/manda; lee `allowance()` |
| T4 | `GET …/card` | — | Stripe card + Avalanche `balanceOf(USDC)` y `allowance()` ⇒ «Disponible para gastar» = min(saldo, allowance) |
| T5 | `PATCH …/card` `{ status: active|inactive }` | dueño de la tarjeta | Stripe `POST /v1/issuing/cards/{id}` |
| T6 | `POST …/card/reveal` | Face ID / sesión | Stripe ephemeral key → Issuing Elements (PAN/CVV nunca pasan por nosotros) |
| T7 | `POST …/card/provisioning` | dispositivo | Stripe push provisioning |
| T8 | `POST /hooks/stripe` | firma de Stripe | ← `issuing_authorization.created/updated`, `issuing_transaction.created`: guarda el movimiento (MXN, USD, FX fee), avisa a la app y manda `card.transaction` a la empresa |

### Retiro a cuenta (SPEI)
| # | Endpoint (nuestro) | Valida | Llama a |
|---|---|---|---|
| R1 | `POST /v1/offramp/quote` `{ source_currency: usdc, source_amount | destination_amount, destination_currency: mxn, destination_payment_rail: spei }` (**existe**) | monto ≥ mínimo (50 MXN); moneda/riel soportados | Bridge `GET /v0/exchange_rates?from=usd&to=mxn` (`sell_rate`) + nuestra comisión. Estimación, no bloqueo |
| R2 | `POST …/withdrawals/prepare` `{ beneficiary_id, amount_usdc }` | beneficiario con external account **verificada**; saldo on-chain ≥ monto; mínimo; **recotiza** (R1) | Bridge `POST /v0/transfers` `source{payment_rail:avalanche_c_chain, currency:usdc, from_address}` → `destination{payment_rail:spei, currency:mxn, external_account_id}` ⇒ `source_deposit_instructions.to_address`; arma la transferencia USDC a esa dirección |
| R3 | `POST …/withdrawals/confirm` `{ transfer_id, signed_tx }` | firma de la passkey; el transfer sigue `awaiting_funds` | Turnkey manda el USDC a Bridge |
| R4 | `GET /v1/payouts/{reference}/status` (**existe**, nivel integrador) | — | Bridge `GET /v0/transfers/{id}` |
| R5 | `POST /hooks/bridge` (**existe**) | firma de Bridge | ← `transfer` updates: `payment_processed` ⇒ completado con folio SPEI; `returned`/`refunded` ⇒ el USDC regresa a la wallet |

El MXN final lo fija Bridge cuando recibe el USDC (tasa de ese momento). Por eso la app muestra «≈ $X MXN (estimado)» y no promete una cifra exacta.

### Red y tipo de cambio en la demo (2026-11-12)
- La red de la wallet es **Avalanche C-Chain** (en los logs; el flujo de usuario no menciona la red). Ojo: la guía de tarjetas
  no custodiales de Bridge lista Tempo, Solana, Base y Linea; Avalanche aparece en el fondeo *top-up*. Confirmar con Bridge
  que el programa de tarjetas no custodiales soporta Avalanche antes de la fase de backend.
- El tipo de cambio es **en vivo** (`liveRate`, escalones de 15 s; Bridge ~30 s): el indicador «1 USD = $X MXN ▲/▼ · hace N s»
  se ve en Saldo, en el monto y en la revisión; `estimateSend` (= `POST /v1/offramp/quote`) se registra al teclear y cuando
  cambia la tasa; `quoteSend` (= `…/withdrawals/prepare`) recotiza al revisar y otra vez al confirmar. Sin «precio fijo 60 s».

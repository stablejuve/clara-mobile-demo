# Recibo · modelo de datos (backend real)

Lo que la fase de backend persistirá por usuario final de un tenant anfitrión. Nombres en snake_case; tiempos en UTC;
montos en centavos enteros (USDC con 6 decimales on-chain, 2 en la UI). La app no guarda nada de esto: lo recibe por `RelayerModuleApi`
(`src/relayer/api.ts`) y lo tipa en `src/relayer/types.ts`. Entre paréntesis, el nombre del tipo de la app cuando existe.

## end_user
| campo | tipo | notas |
|---|---|---|
| id | uuid | PK |
| host_tenant_id | uuid | empresa anfitriona (Acme) |
| external_user_id | text | id del usuario en la plataforma de RH |
| email, name | text | del KYC; `name` es el titular de tarjeta y CLABE |
| country, locale | text | `MX`, `es-MX` (D2) |
| module_status | enum | `off · terms_pending · kyc · wallet_ready · active` (`ModuleState.module`) |

## consent
| end_user_id | uuid | FK |
| tos_version | text | versión de términos Relayer |
| accepted_at | timestamptz | |
| bridge_signed_agreement_id | text | del `tos_link` de Bridge |

## kyc
| bridge_customer_id | text | |
| kyc_link_id | text | KYC Link (`tos_link` + `kyc_link` + `redirect_uri`) |
| status | enum | `not_started · incomplete · under_review · approved · rejected` (`KycStatus`) |
| rejection_reasons | text[] | códigos de Bridge; la app los traduce (`kyc.reason.*`) |
| endorsements | jsonb | `{ base, spei, cards }` → `{ status, approved_at }`; la regla de 24 h de `cards` vive aquí (`approved_at` del KYC) |

## wallet
| turnkey_sub_org_id | text | sub-org por usuario |
| passkey_credential_id | text | credencial WebAuthn |
| chain, address | text | `base`, `0x…` (`ModuleState.wallet`) |

## card
| issuer_card_id | text | Stripe Issuing |
| last4, expiry | text | |
| status | enum | `none · requested · endorsement_pending · active · frozen · endorsement_expired` (`CardStatus`) |
| authorized_at | timestamptz | autorización on-chain única (`card.authorizedAt`) |
| freezes | jsonb[] | historial `{ at, by }` |
| provisioning | jsonb | `{ apple: bool, google: bool }` (`ModuleState.pass`) |

## external_account
| bridge_external_account_id | text | |
| bank_name, clabe_last4, owner_name | text | la CLABE completa no se guarda en claro |
| verification | jsonb | `{ status: none·pending_verification·verified·failed, completed_at }` (`BankStatus`) |

## deposit (`Movement` kind=deposit)
| tx_hash, chain | text | |
| amount_usdc | bigint | centavos |
| from_label, reference, memo | text | la `reference` la manda la empresa y vuelve en `deposit.received` |
| received_at | timestamptz | |

## withdrawal (`Receipt` + `Movement` kind=withdrawal)
| bridge_transfer_id | text | |
| amount_usdc, amount_mxn, fee, rate | bigint/numeric | la cotización que el usuario confirmó (`Quote`) |
| status | enum | `submitted · completed · failed` (`ReceiptStatus`) + `failure_code` |
| receipt_url | text | |
| created_at, completed_at | timestamptz | |

## event_outbox
| id | uuid | `event_id` idempotente en el webhook |
| tenant_id | uuid | |
| type | text | ver `docs/events.md` |
| payload | jsonb | sin PII sensible ni PAN |
| delivered_at | timestamptz | null hasta el 2xx del tenant |
| attempts | int | backoff exponencial |

## Reglas que el servidor repite (hoy en `src/relayer/state.ts`)
- `requestCard` sólo con `kyc.status = approved`, `wallet.status = address_ready`, `card.status = none`, y `now − kyc.approved_at ≤ 24 h`; si no, `endorsement_expired` y la app ofrece «confirma tus datos» (re-KYC corto que renueva `approved_at`).
- `confirmSend` sólo con `external_account.verification = verified`, monto ≥ 50 MXN recibidos y saldo suficiente; la comisión (0.50 %) va dentro del monto.
- `addToWallet` sólo con `card.status = active` y `authorized_at` no nulo.

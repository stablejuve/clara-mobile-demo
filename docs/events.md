# Recibo · eventos hacia la empresa anfitriona

Webhooks HTTPS firmados con HMAC-SHA256 (`X-Relayer-Signature: t=<ts>,v1=<hex>` sobre `<ts>.<body>`), idempotentes por `event_id`,
reintentos con backoff hasta 24 h. Sin PII sensible ni PAN: la empresa concilia por `external_user_id` y `reference`.
En la demo se listan en el panel oculto («Lo que recibiría Acme») y se generan en `src/relayer/mock/mockApi.ts`.

## Sobre
```json
{ "event_id": "evt_0007", "type": "deposit.received", "created_at": "2026-11-11T12:00:00Z",
  "tenant_id": "ten_acme", "external_user_id": "acme-10482", "data": { … } }
```

| type | cuándo | data |
|---|---|---|
| `module.activated` | la wallet quedó lista y el módulo pasa a `active` | `{}` |
| `kyc.approved` | Bridge aprobó la identidad | `{ "endorsements": ["base","spei"] }` (sólo estado) |
| `kyc.rejected` | Bridge rechazó | `{ "retryable": true }` (sin razones: son del usuario) |
| `wallet.ready` | dirección para pagar | `{ "chain": "base", "address": "0x…" }` |
| `card.issued` | tarjeta emitida | `{ "last4": "4821" }` |
| `deposit.received` | llegó un depósito a la dirección | `{ "amount_usdc_cents": 49275, "reference": "ACME-NOM-2026-11B", "tx_hash": "0x…" }` — eco de la `reference` que mandó la empresa |
| `withdrawal.completed` | SPEI liquidado | `{ "amount_usdc_cents": 10000, "amount_mxn_cents": 171638 }` |
| `module.deactivated` | el usuario desactivó | `{}` — la empresa deja de depositar en esa dirección |

## Lo que la empresa necesita hacer con ellos
- `wallet.ready` → guardar la dirección como destino de nómina para ese `external_user_id`.
- `deposit.received` → conciliar con la `reference` enviada en su pago.
- `module.deactivated` → dejar de pagar a esa dirección.

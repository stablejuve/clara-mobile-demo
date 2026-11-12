# relayer-mobiledemo

Expo app (fork del cascarón `pickler-expo/apps/mobile`) que demuestra el módulo de cuenta global + tarjeta (en código `rc.*`, antes «Recibo»; en pantalla «Relayer HR») embebido en una app de beneficios. **Marca de la demo:** la app se llama **Relayer HR** (look and feel de Relayer), la empresa es **Acme** y la infraestructura se presenta como de **Clara** («powered by Clara», términos, modo explicativo), aunque por dentro sea la arquitectura de Relayer. Todo corre contra una capa mock: **no hay backend** en esta fase.

- Spec: `docs/specs/2026-11-11-relayer-mobiledemo-design.md`. Modelo de datos: `docs/data-model.md`. Eventos a la empresa: `docs/events.md`.
- Stack: Expo 57, React Native 0.86, react-navigation 7, StyleSheet con tokens en `src/ui/theme.ts` (Wallets v4 Paper/Ash del diseño «Recibo Minimal» de Claude Design), Archivo + mono del sistema, jest-expo para lógica pura.
- UI: diseño «Recibo Minimal». Pestañas con título grande (`src/ui/LargeTitle.tsx`), hojas nativas (`onboarding`, `kycForm`, `send`, `movement`), kit en `src/ui/kit.tsx` (SVG exactos del diseño).
- KYC nativo: 5 secciones con «Llenar con ejemplo»; modelo y validación en `src/relayer/kyc.ts`, contraste con relayer-core en `docs/kyc-native.md`.
- Beneficiarios (como `beneficiaries-v2` de relayer-core): `ModuleState.beneficiaries` reemplaza la cuenta única; Transferir abre en «Enviar a» (cuentas guardadas) y «Nueva cuenta» es la hoja `beneficiary` (titular → datos → domicilio → CLABE → revisar). Modelo en `src/relayer/beneficiaries.ts`; la demo arranca con 4 cuentas (`DEMO_BENEFICIARIES`).
- Tarjeta: se emite sola al activar Recibo (Bridge: endorsement `cards` + 24 h); la pantalla sólo autoriza el gasto (approve no custodial) o reconfirma datos. Compras con tarjeta = movimientos `card` (`simulateCardPurchase`, primera compra automática tras autorizar).
- Montos: MXN primero, USDC debajo como referencia (`movementMxnCents` en `src/relayer/display.ts`).
- Modo explicativo: cada acción saca un chip con el endpoint que llamaría (presentado como backend de Clara; rutas de relayer-core) (catálogo en `src/relayer/endpoints.ts`, `withTrace` en `src/relayer/trace.ts`, UI `src/ui/TraceOverlay.tsx`); se apaga en Perfil. Plan: `docs/plans/2026-11-12-flujos-y-modo-explicativo.md`.
- Dev: `xcrun simctl openurl booted relayermobiledemo://demo/seed/active` deja el módulo activo; `…/demo/open/<pantalla>` abre una pantalla.
- Contrato: `src/relayer/api.ts` (`RelayerModuleApi`) es la frontera; `src/relayer/mock/` la implementa. La fase de backend reemplaza solo el mock.
- Copy en `src/i18n/es.ts`; nunca texto hardcodeado en pantallas.
- Comandos: `npm install`, `npx expo start`, `npm test`, `npm run typecheck`. iOS: `scripts/ios-archive.sh` y `scripts/ios-upload.sh` (heredados).
- No commitear llaves ni defaults de servicios reales en `app.config.ts`.
- Panel de demo: 5 s sobre «powered by Clara». Face ID del simulador: inscribirlo antes de un recorrido (sin inscripción se simula). Checklist: `docs/walkthrough.md`.

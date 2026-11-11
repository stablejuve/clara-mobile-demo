# relayer-mobiledemo

Expo app (fork del cascarón `pickler-expo/apps/mobile`) que demuestra el módulo **Recibo** ("powered by Relayer") embebido en una app de beneficios genérica. Todo corre contra una capa mock: **no hay backend** en esta fase.

- Spec: `docs/specs/2026-11-11-relayer-mobiledemo-design.md`. Modelo de datos: `docs/data-model.md`. Eventos a la empresa: `docs/events.md`.
- Stack: Expo 57, React Native 0.86, react-navigation 7, StyleSheet con tokens en `src/ui/theme.ts` (light/dark, portados de relayer-core `apps/web/app/tokens.css`), jest-expo para lógica pura.
- Contrato: `src/relayer/api.ts` (`RelayerModuleApi`) es la frontera; `src/relayer/mock/` la implementa. La fase de backend reemplaza solo el mock.
- Copy en `src/i18n/es.ts`; nunca texto hardcodeado en pantallas.
- Comandos: `npm install`, `npx expo start`, `npm test`, `npm run typecheck`. iOS: `scripts/ios-archive.sh` y `scripts/ios-upload.sh` (heredados).
- No commitear llaves ni defaults de servicios reales en `app.config.ts`.

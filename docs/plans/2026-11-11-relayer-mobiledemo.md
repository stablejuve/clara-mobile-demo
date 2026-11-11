# relayer-mobiledemo — módulo Recibo embebido en Acme Beneficios · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el fork del cascarón de pickler en la demo del módulo **Recibo** («powered by Relayer») dentro de una app de beneficios genérica («Acme Beneficios»): tres pestañas anfitrionas, el recorrido completo del módulo (términos → KYC → passkey → saldo → tarjeta → teléfono → CLABE → envío → recibo), una capa mock del API de Relayer con máquina de estados, latencias y escenarios conmutables desde un panel oculto, y la documentación del modelo de datos y del contrato de eventos.

**Architecture:** Primero se vacía el producto de pickler y la app arranca a un placeholder (Tasks 1–2). Después se re-visten los tokens (`src/ui/theme.ts` con las paletas Paper/Carbon de Relayer, `useTheme()` sobre un `ThemeProvider`) y las primitivas dejan de leer un objeto estático (Tasks 3–4). El copy vive en `src/i18n/es.ts` (Task 5). La navegación conserva el patrón heredado (tabs + una pila nativa por pestaña + adaptador `ref.ts`), ahora con tabla pura y gate por módulo activo (Task 6). El módulo es una máquina de estados pura (`src/relayer/state.ts`) y un contrato (`RelayerModuleApi`) que `src/relayer/mock/` implementa en memoria con latencias y escenarios (Tasks 7–8). Hooks (`useModule`, `useFaceId`, `useNotifications`) conectan mock, Face ID y notificaciones locales (Task 9). Sobre eso se montan la app anfitriona y las 17 pantallas del módulo, cada una contra `ctx.module.api` (Tasks 10–15). Cierra la documentación y las puertas finales (Tasks 16–17).

**Tech Stack:** Expo 57 · React Native 0.86 · react-navigation 7 (native-stack + bottom-tabs) · expo-secure-store · expo-local-authentication · expo-notifications · @react-native-async-storage/async-storage · react-native-qrcode-svg · lucide-react-native · jest-expo (lógica pura) · TypeScript 6.

**Spec:** `docs/specs/2026-11-11-relayer-mobiledemo-design.md` (D1–D9, máquina de estados, capa mock, pantallas 1–16). Este plan la entrega completa.

---

## Convenciones (todas las tareas)

- Repo: `/Users/Juvenal/Development/SherryLabs/relayer-mobiledemo`, rama `main` (commit inicial `7d9e018`). Todos los paths de este plan son relativos a esa raíz.
- **Toda orden en primer plano y con `</dev/null`**: `npm run typecheck </dev/null`, `npm test </dev/null`, `npx jest __tests__/<archivo>.test.ts </dev/null`. Jest en modo watch y Metro se cuelgan esperando stdin.
- **Después de cada commit `npm run typecheck` y `npm test` salen limpios.** Si una tarea deja algo rojo, no se commitea: se arregla dentro de la tarea.
- **Nunca `git add -A` ni `git add .`**: paths explícitos (`git rm` para borrados, `git add` para el resto). Commits con `--no-verify` no hacen falta (no hay hooks); prefijos `chore:` / `feat:` / `refactor:` / `test:` / `docs:`; trailer obligatorio en cada commit:

  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  ```

- **Sin llaves ni defaults de servicios reales** (`app.config.ts`, fixtures, docs): URLs de Bridge/Persona/Stripe sólo como texto ilustrativo con `example` o `demo`; ninguna key.
- **Copy en español y nunca hardcodeado en pantallas**: todo string visible pasa por `t("…")` de `src/i18n/es.ts`. Los nombres propios de la demo (Acme Beneficios, Ana Torres, bancos) viven en `src/relayer/mock/fixtures.ts`.
- **Tests sólo de lógica pura**, estilo heredado: `__tests__/*.test.ts` con `test(...)` / `test.each` / `describe.each` y sin `@testing-library` ni render de componentes (el repo no tiene esa configuración y no se agrega). Lo que se testea vive en archivos que no importan `react-native` ni módulos nativos (`theme.ts`, `routes.ts`, `state.ts`, `money.ts`, `scenarios.ts`, `mockApi.ts` con storage en memoria, `i18n`).
- **Tests primero** cuando la tarea tiene lógica pura: escribir el test, correrlo (debe fallar), implementar, correrlo (debe pasar), commit.
- Colores: las pantallas usan `const { c } = useTheme()` y nombres semánticos (`c.page`, `c.inkBody`, `c.brand`…). **Nunca hex en pantallas ni primitivas**; los únicos hex del repo viven en `src/ui/theme.ts`, `app.config.ts` (fondo del splash) y `scripts/make-placeholder-assets.mjs`.
- Radios: `RADIUS.card` (2) para cards, inputs y botones; `RADIUS.pill` sólo puntos y avatares (es el look de Relayer: esquinas rectas).
- Navegación desde pantallas: siempre `ctx.nav` / `ctx.back` / `ctx.requireModule` / `ctx.switchTab`, nunca `navigationRef` directo. react-navigation 7: `navigate` a una ruta ya presente **apila**; el adaptador manda `pop: true` (heredado, ver `ref.ts`).
- **Mock como contrato (D6)**: las pantallas sólo importan tipos de `src/relayer/types.ts` y hablan con `ctx.module.api` (`RelayerModuleApi`). Nada de la UI importa `src/relayer/mock/*` salvo `App.tsx` (crea el mock) y `demoPanel.tsx` (usa `RelayerDemoApi`).
- Simulador iOS: Face ID se pierde al reiniciarlo; antes de un recorrido con passkey, inscribirlo (`Features → Face ID → Enrolled`, o `xcrun simctl spawn <UDID> notifyutil -s com.apple.BiometricKit.enrollmentChanged 1 && xcrun simctl spawn <UDID> notifyutil -p com.apple.BiometricKit.enrollmentChanged`). Sin inscripción, `useFaceId` da la ceremonia por buena tras 600 ms (ver Task 9).

---

## Mapa de archivos (resultado final)

```
App.tsx                               fuentes, splash, ThemeProvider, AppCtx, deep link, Navigator
index.ts                              registerRootComponent (sin polyfills)
app.config.ts                         "Acme Beneficios" · fi.relayer.mobiledemo · scheme relayermobiledemo · sin extra
scripts/make-placeholder-assets.mjs   icon.png + splash-mark.png (PNG puro en Node, sin deps)
scripts/ios-archive.sh, ios-upload.sh heredados, workspace/esquema AcmeBeneficios
src/ui/theme.ts                       LIGHT/DARK (tokens Relayer), RL, RADIUS, F, fam, textStyle, alpha, resolveScheme
src/ui/contrast.ts                    contraste WCAG (sólo lo usan los tests)
src/ui/ThemeProvider.tsx              ThemeProvider + useTheme()
src/ui/variants.ts                    btnVariants(c), tone(c, name)
src/ui/primitives.tsx                 T, Tag, Touch, Icon, Card, TouchCard, KV, KVList, Hair, Chip, Btn, Segmented, Field, Check, Steps, Row, Dot, Warn, StatusCard, Body, Skeleton, Reveal
src/ui/Page.tsx                       Page (cabecera propia), PageScroll, FooterBar, withPage
src/ui/TabBar.tsx                     3 pestañas: Inicio · Beneficios · Perfil
src/ui/tabBarLayout.ts                heredado sin cambios
src/navigation/screens.ts             Screen, HOST_SCREENS, MODULE_SCREENS, MODULE_OPEN, MODULE_GATED, CAN_BACK, SHOW_TABS, ROOT_OF
src/navigation/routes.ts              TabName, param lists, TAB_ORDER/TAB_OF/TAB_ROOT, SCREENS_ALL, screenOfRoute, gateTarget
src/navigation/deepLink.ts            KYC_RETURN_URL, parseDeepLink
src/navigation/ref.ts                 navigationRef, navigateTo, switchTab, goBackIfCan, currentScreen, flushPending
src/navigation/context.tsx            AppCtxProvider, useAppCtx
src/navigation/Navigator.tsx          Root → Tabs → {HomeTab, BenefitsTab (benefits + recibo/*), ProfileTab}
src/store.ts                          StoreState {depositId, receiptId, next}, headerFor, useAppStore
src/ctx.ts                            AppCtx = AppStore & { module, faceId, notifications, kycReturn }
src/i18n/es.ts                        es (claves planas), t(), Key
src/i18n/errors.ts                    describeError(e) → copy por RelayerErrorCode
src/relayer/types.ts                  ModuleState, Movement, Receipt, Quote, ModuleEvent, RelayerError…
src/relayer/api.ts                    RelayerModuleApi, RelayerDemoApi
src/relayer/state.ts                  máquina de estados pura + resumeScreen
src/relayer/money.ts                  DEMO_RATE, centavos USDC↔MXN, formatos, parseAmount, quoteFor
src/relayer/notify.ts                 depositNotificationContent, pushTargetOf
src/relayer/export.ts                 movementsCsv
src/relayer/clabe.ts                  BANKS, bankFor, clabeValid (puro; lo usan pantalla y mock)
src/relayer/mock/fixtures.ts          DEMO_USER, EMPLOYER, DEMO_ADDRESS, DEMO_CARD, KYC_LINKS, DEFAULT_DEPOSIT, employerDeposit
src/relayer/mock/scenarios.ts         Scenario, SCENARIOS, rulesFor, parseScenario, load/saveScenario
src/relayer/mock/mockApi.ts           createMockApi({ storage, now, delay, later })
src/relayer/screens/PoweredBy.tsx     pie «powered by Relayer» (toque largo 5 s → demoPanel)
src/relayer/screens/*.tsx             activate, terms, kyc, kycPending, kycRejected, passkey, balance, deposit, cardRequest,
                                      cardAuthorize, card, addToWallet, bankAccount, send, sendReceipt, settings, demoPanel
src/host/screens/{home,benefits,profile}.tsx
src/storage/kv.ts                     KeyValueStorage, memoryKv (puro)
src/storage/asyncKv.ts                adaptador AsyncStorage
src/storage/theme.ts                  parse/load/saveThemeOverride
src/hooks/useModule.ts                snapshot del mock + aviso de depósitos nuevos
src/hooks/useFaceId.ts                expo-local-authentication
src/hooks/useNotifications.ts         permiso + notificación local de depósito + tap
src/hooks/useAction.ts                busy/error alrededor de una llamada al api
src/hooks/useCurrentScreen.ts         heredado (pantalla enfocada)
src/hooks/useNow.ts                   heredado
docs/data-model.md · docs/events.md · docs/walkthrough.md · README.md
__tests__/theme, variants, tabBarLayout, i18n, routes, deepLink, store, state, money, scenarios, mockApi, notify, export, storage-theme
```

---

# Fase A — Vaciar el producto de pickler

### Task 1: instalar, vaciar el producto y arrancar a un placeholder

**Files:**
- Delete (directorios completos): `src/perpl/`, `src/reads/`, `src/hd/`, `src/wallet/`, `src/config/`, `src/screens/`, `src/storage/`, `src/navigation/`, `src/hooks/`, `__tests__/fixtures/`
- Delete (archivos): `src/DevControls.tsx`, `src/account.ts`, `src/ctx.ts`, `src/onboarding.ts`, `src/polyfills.ts`, `src/store.ts`, `src/ui/Page.tsx`, `src/ui/TabBar.tsx`, `scripts/perpl-market-data-capture.mjs`, `scripts/archivo-instance.sh`, `scripts/splash-mark.py`, `assets/fonts/ArchivoPickler-Bold.ttf`, `assets/pickler-mark.png`, `assets/android-icon-background.png`, `assets/android-icon-foreground.png`, `assets/android-icon-monochrome.png`, `assets/favicon.png`, `assets/splash-icon.png`, y todos los `__tests__/*.test.ts` **excepto** `theme.test.ts`, `variants.test.ts`, `tabBarLayout.test.ts`
- Modify: `package.json`, `package-lock.json` (lo regenera npm), `jest.config.js`, `index.ts`, `App.tsx`, `src/ui/theme.ts`, `src/ui/primitives.tsx`, `__tests__/theme.test.ts`

Por qué se borran también `Page.tsx`, `TabBar.tsx`, `store.ts`, `navigation/*` y `hooks/*`: importan Perpl, reads, tesorería y la cuenta de Mera por todos lados; es más barato recrearlos con el código de las Tasks 6–10 (mismo patrón heredado, otros contenidos) que editarlos a ciegas. `primitives.tsx`, `theme.ts`, `variants.ts` y `tabBarLayout.ts` sí se quedan (sólo dependen de react-native y lucide).

Dependencias que se van (ya nadie las importará; verificado con `grep -rn "from \"<pkg>" src App.tsx index.ts __tests__` antes de borrar): `@category-labs/mera`, `@noble/curves`, `@scure/base`, `@scure/bip32`, `@scure/bip39`, `viem`, `react-native-passkey`, `expo-crypto` (sólo lo usaba `polyfills.ts` para Mera), `expo-constants` (sólo `src/config/*`), `expo-status-bar` (nunca se importó: `App.tsx` usa `StatusBar` de react-native). Se quedan aunque no se importen directamente: `expo-system-ui` (lo exige `userInterfaceStyle: "automatic"` en `app.config.ts`), `react-native-worklets` (peer de reanimated 4), `react-native-screens` y `react-native-safe-area-context` (react-navigation), `expo-build-properties` y `expo-splash-screen` (plugins). Entran: `expo-local-authentication` (Face ID de la passkey, D8) y `@react-native-async-storage/async-storage` (escenario y tema persistidos).

- [ ] **Paso 1: instalar lo heredado** (el `package-lock.json` del fork resuelve):

  ```bash
  cd /Users/Juvenal/Development/SherryLabs/relayer-mobiledemo
  npm install </dev/null
  ```

- [ ] **Paso 2: script `typecheck`.** En `package.json`, cambiar `"name": "mobile"` por `"name": "relayer-mobiledemo"` y agregar a `scripts`:

  ```json
  "typecheck": "tsc --noEmit",
  ```

  (entre `"test": "jest",` y `"ios:archive"`). Correr `npm run typecheck </dev/null` y `npm test </dev/null` una vez para ver la base en verde (301 tests, 44 suites) antes de tocar nada.

- [ ] **Paso 3: borrar el producto** (todo con `git rm` para que quede staged):

  ```bash
  git rm -r -q src/perpl src/reads src/hd src/wallet src/config src/screens src/storage src/navigation src/hooks __tests__/fixtures
  git rm -q src/DevControls.tsx src/account.ts src/ctx.ts src/onboarding.ts src/polyfills.ts src/store.ts src/ui/Page.tsx src/ui/TabBar.tsx
  git rm -q scripts/perpl-market-data-capture.mjs scripts/archivo-instance.sh scripts/splash-mark.py
  git rm -q assets/fonts/ArchivoPickler-Bold.ttf assets/pickler-mark.png assets/android-icon-background.png assets/android-icon-foreground.png assets/android-icon-monochrome.png assets/favicon.png assets/splash-icon.png
  git rm -q $(ls __tests__/*.test.ts | grep -v -E '^__tests__/(theme|variants|tabBarLayout)\.test\.ts$')
  ```

  Verificar: `git ls-files src __tests__ scripts assets` debe listar exactamente `src/ui/primitives.tsx`, `src/ui/tabBarLayout.ts`, `src/ui/theme.ts`, `src/ui/variants.ts`, `__tests__/tabBarLayout.test.ts`, `__tests__/theme.test.ts`, `__tests__/variants.test.ts`, `scripts/ios-archive.sh`, `scripts/ios-upload.sh`, `assets/icon.png`, `assets/splash-mark.png`.

- [ ] **Paso 4: dependencias.**

  ```bash
  npm uninstall @category-labs/mera @noble/curves @scure/base @scure/bip32 @scure/bip39 viem react-native-passkey expo-crypto expo-constants expo-status-bar </dev/null
  npx expo install expo-local-authentication @react-native-async-storage/async-storage </dev/null
  ```

  `npx expo install` elige las versiones compatibles con Expo 57. Comprobar en `package.json` que ya no aparecen las diez de arriba y que sí aparecen las dos nuevas.

- [ ] **Paso 5: `jest.config.js`** sin los paquetes borrados:

  ```js
  module.exports = {
    preset: "jest-expo",
    testMatch: ["**/__tests__/**/*.test.ts"],
    transformIgnorePatterns: [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|@react-native-async-storage/.*)",
    ],
  };
  ```

- [ ] **Paso 6: `index.ts`** sin polyfills:

  ```ts
  import { registerRootComponent } from "expo";
  import App from "./App";

  registerRootComponent(App);
  ```

- [ ] **Paso 7: fuente display.** En `src/ui/theme.ts` quitar la línea `display: "ArchivoPickler-Bold",` de `F` y dejar `fam` así (Archivo entra después, D4; mientras, `display` es Instrument Sans 700):

  ```ts
  export function fam(weight: number, kind?: FontKind): string {
    if (kind === "display") return F.b;
    if (kind === "mono") return weight >= 700 ? F.monoB : weight >= 500 ? F.monoM : F.mono;
    if (weight >= 700) return F.b;
    if (weight >= 600) return F.sb;
    if (weight >= 500) return F.m;
    return F.r;
  }
  ```

  En `__tests__/theme.test.ts` cambiar las dos aserciones de Archivo por `expect(fam(600, "display")).toBe("InstrumentSans_700Bold");` y `expect(fam(700, "display")).toBe("InstrumentSans_700Bold");`, y en el test de `textStyle` cambiar `fontFamily: "ArchivoPickler-Bold"` por `fontFamily: "InstrumentSans_700Bold"`. (El archivo se reescribe entero en la Task 3; aquí sólo tiene que pasar.)

- [ ] **Paso 8: `App.tsx` placeholder** (arranca, carga fuentes, pinta un texto; sin navegación todavía):

  ```tsx
  import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans";
  import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
  import { useFonts } from "expo-font";
  import * as SplashScreen from "expo-splash-screen";
  import { useEffect } from "react";
  import { StatusBar, View } from "react-native";
  import { GestureHandlerRootView } from "react-native-gesture-handler";
  import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
  import { T, Tag } from "./src/ui/primitives";
  import { C } from "./src/ui/theme";

  void SplashScreen.preventAutoHideAsync();
  SplashScreen.setOptions({ fade: true, duration: 200 });

  // Placeholder de la Task 1: la app arranca sin producto. Las Tasks 3–10 lo reemplazan por el ThemeProvider + Navigator.
  export default function App() {
    const [fontsLoaded] = useFonts({
      InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
      JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold,
    });
    useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
    if (!fontsLoaded) return null;
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
              <Tag>ACME BENEFICIOS</Tag>
              <T w={700} s={28} lh={1.1}>Recibo</T>
              <T w={400} s={13} lh={1.4} color={C.dim}>Cascarón vacío. El módulo llega en las siguientes tareas.</T>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  ```

- [ ] **Paso 9: `src/ui/primitives.tsx`.** Sigue compilando solo (importa `./theme` y `./variants`, react-native, lucide y react-native-svg). Comprobar con `npm run typecheck </dev/null`; si tsc marca algo, es por el `T` con `display` (sigue existiendo en `fam`) — no debería.

- [ ] **Paso 10: verificar.**

  ```bash
  npm run typecheck </dev/null      # 0 errores
  npm test </dev/null               # 3 suites, todas verdes (theme, variants, tabBarLayout)
  npx expo export --platform ios --output-dir /tmp/relayer-mobiledemo-export </dev/null   # bundle JS del placeholder; debe terminar con "Exported: …"
  rm -rf /tmp/relayer-mobiledemo-export
  ```

  Si `expo export` falla por red (fuentes de `@expo-google-fonts` ya están en node_modules; no hay descargas), anotar el error en el commit y seguir: la puerta definitiva es la Task 17.

- [ ] **Paso 11: commit.**

  ```bash
  git add package.json package-lock.json jest.config.js index.ts App.tsx src/ui/theme.ts __tests__/theme.test.ts
  git commit -m "chore: strip the pickler product; the shell boots to a placeholder" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 2: identidad de la app (config, iconos, scripts iOS)

**Files:**
- Modify: `app.config.ts`, `scripts/ios-archive.sh`, `scripts/ios-upload.sh`, `.gitignore`
- Create: `scripts/make-placeholder-assets.mjs`
- Regenerate: `assets/icon.png`, `assets/splash-mark.png`

- [ ] **Paso 1: `app.config.ts`** completo (sin `extra`, sin env `PICKLER_*`, sin key de MonadScan, sin associated domains: la passkey es simulada, D8):

  ```ts
  import type { ExpoConfig } from "expo/config";

  // Demo del módulo Recibo dentro de "Acme Beneficios" (spec D4/D9). Sin servicios reales: nada de `extra` ni env.
  const bundleIdentifier = "fi.relayer.mobiledemo";
  const PAPER = "#FBFBFA";   // --surface-page light (src/ui/theme.ts LIGHT.page)
  const CARBON = "#121819";  // --surface-page dark  (DARK.page)
  const faceIDPermission = "Acme Beneficios usa Face ID para crear y usar tu wallet de Recibo.";

  const config: ExpoConfig = {
    name: "Acme Beneficios",
    slug: "relayer-mobiledemo",
    version: "0.1.0",
    orientation: "portrait",
    // 1024x1024 sin alfa (Apple lo exige). Placeholder: scripts/make-placeholder-assets.mjs.
    icon: "./assets/icon.png",
    scheme: "relayermobiledemo",
    userInterfaceStyle: "automatic",
    backgroundColor: PAPER,
    ios: {
      bundleIdentifier,
      buildNumber: "1",
      supportsTablet: false,
      backgroundColor: PAPER,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSFaceIDUsageDescription: faceIDPermission,
      },
    },
    android: { package: bundleIdentifier },
    plugins: [
      "expo-font",
      ["expo-secure-store", { faceIDPermission }],
      ["expo-local-authentication", { faceIDPermission }],
      ["expo-build-properties", { ios: { deploymentTarget: "18.0" } }],
      ["expo-notifications", { enableBackgroundRemoteNotifications: false }],
      ["expo-splash-screen", { image: "./assets/splash-mark.png", imageWidth: 140, resizeMode: "contain", backgroundColor: PAPER, dark: { backgroundColor: CARBON } }],
    ],
  };

  export default config;
  ```

- [ ] **Paso 2: `scripts/make-placeholder-assets.mjs`** — genera los PNG sin dependencias (zlib de Node):

  ```js
  // Placeholders de icono y splash (Task 2): petrol de Relayer con un anillo papel. PNG escrito a mano (zlib de Node, sin deps).
  // Uso: node scripts/make-placeholder-assets.mjs   (desde la raíz del repo)
  import { writeFileSync } from "node:fs";
  import { deflateSync } from "node:zlib";

  const CRC_TABLE = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  }
  /** `pixel(x, y)` → [r, g, b, a]. `alpha=false` escribe RGB (Apple exige el icono sin canal alfa). */
  function png(size, alpha, pixel) {
    const bpp = alpha ? 4 : 3;
    const stride = size * bpp + 1;
    const raw = Buffer.alloc(stride * size);
    for (let y = 0; y < size; y++) {
      raw[y * stride] = 0; // filtro None
      for (let x = 0; x < size; x++) {
        const [r, g, b, a] = pixel(x, y);
        const o = y * stride + 1 + x * bpp;
        raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
        if (alpha) raw[o + 3] = a;
      }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
    ]);
  }

  const PETROL = [0x00, 0x59, 0x4f];
  const PAPER = [0xfb, 0xfb, 0xfa];
  const ring = (size, x, y) => {
    const o0 = size * 0.28, o1 = size * 0.72, i0 = size * 0.41, i1 = size * 0.59;
    return x >= o0 && x < o1 && y >= o0 && y < o1 && !(x >= i0 && x < i1 && y >= i0 && y < i1);
  };
  writeFileSync("assets/icon.png", png(1024, false, (x, y) => (ring(1024, x, y) ? [...PAPER, 255] : [...PETROL, 255])));
  writeFileSync("assets/splash-mark.png", png(512, true, (x, y) => (ring(512, x, y) ? [...PETROL, 255] : [0, 0, 0, 0])));
  console.log("ok: assets/icon.png (1024, RGB) · assets/splash-mark.png (512, RGBA)");
  ```

  Correr `node scripts/make-placeholder-assets.mjs </dev/null`. Comprobar: `file assets/icon.png` → `PNG image data, 1024 x 1024, 8-bit/color RGB`; `file assets/splash-mark.png` → `512 x 512, 8-bit/color RGBA`.

- [ ] **Paso 3: scripts de iOS.** `expo prebuild` nombra el proyecto por `name` sin espacios (`AcmeBeneficios`). En `scripts/ios-archive.sh` reemplazar `ios/Pickler.xcworkspace` → `ios/AcmeBeneficios.xcworkspace`, `-scheme Pickler` → `-scheme AcmeBeneficios`, `build/Pickler.xcarchive` (dos veces) → `build/AcmeBeneficios.xcarchive`, `build/export/Pickler.ipa` → `build/export/AcmeBeneficios.ipa`, y el comentario de cabecera `Lecciones heredadas de Proflores` se deja. En `scripts/ios-upload.sh`: `build/export/Pickler.ipa` → `build/export/AcmeBeneficios.ipa`. `ExportOptions.plist` no nombra bundle ni app: se queda.

- [ ] **Paso 4: `.gitignore`.** Agregar al final:

  ```
  # TestFlight (App Store Connect API key), nunca se commitea
  .env.asc
  build/
  ```

- [ ] **Paso 5: verificar.** `npm run typecheck </dev/null`, `npm test </dev/null`, y que la config carga: `npx expo config --type public </dev/null | head -20` debe mostrar `name: 'Acme Beneficios'`, `scheme: 'relayermobiledemo'` y `bundleIdentifier: 'fi.relayer.mobiledemo'`.

- [ ] **Paso 6: commit.**

  ```bash
  git add app.config.ts scripts/make-placeholder-assets.mjs scripts/ios-archive.sh scripts/ios-upload.sh .gitignore assets/icon.png assets/splash-mark.png
  git commit -m "chore: rename to Acme Beneficios / fi.relayer.mobiledemo with placeholder icon and splash" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

---

# Fase B — Re-skin con los tokens de Relayer

### Task 3: tokens light/dark (`theme.ts`) con test de contraste

**Files:**
- Rewrite: `src/ui/theme.ts`
- Create: `src/ui/contrast.ts`
- Rewrite: `__tests__/theme.test.ts`

Fuente de los valores: `relayer-core/apps/web/app/tokens.css` (Paper = `:root`, Carbon = `[data-theme="dark"]`). Nombres: `surface-*` → `page/canvas/card/elev/input/sub`; `ink-*` → `inkStrong/inkBody/ink72…ink04`; `accent-*` → `brand/brandH/onBrand/live/settled`; `sem-*` → `info/success/warning/error`; `btn-primary*` → `btnPrimary/btnPrimaryH/onBtnPrimary`; `--rl-*` → `RL`; `--radius-*` → `RADIUS`.

- [ ] **Paso 1: test primero** — reescribir `__tests__/theme.test.ts`:

  ```ts
  import { contrast } from "../src/ui/contrast";
  import { alpha, DARK, fam, LIGHT, PALETTES, RADIUS, resolveScheme, RL, textStyle } from "../src/ui/theme";

  test("las dos paletas tienen los mismos nombres y los valores de tokens.css", () => {
    expect(Object.keys(LIGHT)).toEqual(Object.keys(DARK));
    expect([LIGHT.page, LIGHT.canvas, LIGHT.card, LIGHT.sub]).toEqual(["#FBFBFA", "#F5F5F4", "#FFFFFF", "#F1F1F0"]);
    expect([LIGHT.inkStrong, LIGHT.inkBody, LIGHT.ink55]).toEqual(["#121819", "#24292B", "rgba(20,25,27,0.55)"]);
    expect([LIGHT.brand, LIGHT.brandH, LIGHT.onBrand, LIGHT.live, LIGHT.settled]).toEqual(["#00594F", "#00473F", "#FBFBF9", "#00C4CC", "#3DA083"]);
    expect([LIGHT.info, LIGHT.success, LIGHT.warning, LIGHT.error]).toEqual(["#3D5A7B", "#2F8E5C", "#B57100", "#8B2940"]);
    expect([DARK.page, DARK.canvas, DARK.card, DARK.sub]).toEqual(["#121819", "#0D1213", "#1A2223", "#0F1516"]);
    expect([DARK.inkStrong, DARK.inkBody, DARK.ink55]).toEqual(["#FFFFFF", "#E6ECEB", "rgba(230,236,235,0.58)"]);
    expect([DARK.brand, DARK.brandH, DARK.onBrand, DARK.live, DARK.settled]).toEqual(["#72BDB1", "#8CCBC1", "#121819", "#33D6DD", "#66C8A8"]);
    expect([DARK.info, DARK.success, DARK.warning, DARK.error]).toEqual(["#8FA8C4", "#66C8A8", "#E8B25C", "#D87968"]);
    expect([LIGHT.btnPrimary, LIGHT.onBtnPrimary, DARK.btnPrimary, DARK.onBtnPrimary]).toEqual(["#121819", "#FFFFFF", "#72BDB1", "#121819"]);
    expect(RL).toEqual({ carbon: "#121819", petrol: "#00594F", turq: "#72BDB1", sage: "#B5C8AA", peach: "#F0B395", coral: "#D87968" });
    expect(RADIUS).toEqual({ card: 2, control: 2, pill: 9999 });
  });

  describe.each(["light", "dark"] as const)("contraste WCAG · %s", (scheme) => {
    const c = PALETTES[scheme];
    test.each(["page", "card"] as const)("texto sobre %s", (bg) => {
      for (const k of ["inkStrong", "inkBody", "ink72", "brand", "info", "error"] as const) expect(contrast(c[k], c[bg])).toBeGreaterThanOrEqual(4.5);
      for (const k of ["ink55", "success", "warning", "settled"] as const) expect(contrast(c[k], c[bg])).toBeGreaterThanOrEqual(3);
    });
    test("texto sobre la marca y sobre el botón primario", () => {
      expect(contrast(c.onBrand, c.brand)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.onBtnPrimary, c.btnPrimary)).toBeGreaterThanOrEqual(4.5);
    });
  });

  test("live es relleno (punto), nunca texto: en light no llega a 3:1 sobre página", () => {
    expect(contrast(LIGHT.live, LIGHT.page)).toBeLessThan(3);
  });

  test("ink40 es placeholder/deshabilitado: no se usa como texto (queda por debajo de 3:1 en light)", () => {
    expect(contrast(LIGHT.ink40, LIGHT.page)).toBeLessThan(3);
  });

  test("alpha convierte #RRGGBB a rgba", () => {
    expect(alpha("#B57100", 0.12)).toBe("rgba(181,113,0,0.12)");
    expect(alpha("#FFFFFF", 1)).toBe("rgba(255,255,255,1)");
  });

  test("resolveScheme: el override manual gana; system sigue al teléfono; sin dato, light", () => {
    expect(resolveScheme("dark", "light")).toBe("dark");
    expect(resolveScheme("light", "dark")).toBe("light");
    expect(resolveScheme("system", "dark")).toBe("dark");
    expect(resolveScheme("system", null)).toBe("light");
    expect(resolveScheme("system", undefined)).toBe("light");
  });

  test("fuentes: Instrument Sans por peso, JetBrains Mono con tres cortes", () => {
    expect([fam(400), fam(500), fam(600), fam(700), fam(800)]).toEqual([
      "InstrumentSans_400Regular", "InstrumentSans_500Medium", "InstrumentSans_600SemiBold", "InstrumentSans_700Bold", "InstrumentSans_700Bold",
    ]);
    expect([fam(400, "mono"), fam(500, "mono"), fam(700, "mono")]).toEqual(["JetBrainsMono_400Regular", "JetBrainsMono_500Medium", "JetBrainsMono_700Bold"]);
  });

  test("textStyle convierte lh (ratio) y ls (em) a px y sólo pone color si se pide", () => {
    expect(textStyle(600, 24, { lh: 1.1, ls: -0.02 })).toEqual({ fontFamily: "InstrumentSans_600SemiBold", fontSize: 24, lineHeight: 26, letterSpacing: -0.48 });
    expect(textStyle(500, 10.5, { mono: true, color: "#121819" })).toEqual({ fontFamily: "JetBrainsMono_500Medium", fontSize: 10.5, color: "#121819" });
  });
  ```

- [ ] **Paso 2: correr y ver fallar.** `npx jest __tests__/theme.test.ts </dev/null` → falla (no existen `LIGHT`, `contrast`…).

- [ ] **Paso 3: `src/ui/contrast.ts`:**

  ```ts
  // Contraste WCAG 2.x (sólo lo usan los tests de tema). Acepta "#RRGGBB" y "rgba(r,g,b,a)"; un fg translúcido se compone
  // sobre el fondo porque los ink-NN de Relayer son alfa sobre página/card.
  type Rgba = [number, number, number, number];

  function parse(color: string): Rgba {
    if (color.startsWith("#")) {
      const h = color.slice(1);
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    }
    const m = /rgba?\(([^)]+)\)/.exec(color);
    if (!m) throw new Error(`color no soportado: ${color}`);
    const p = m[1].split(",").map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }

  function over(fg: Rgba, bg: [number, number, number]): [number, number, number] {
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
  }

  function luminance([r, g, b]: [number, number, number]): number {
    const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  /** Relación de contraste fg/bg redondeada a 2 decimales (4.5 = AA texto normal; 3 = AA texto grande / UI). */
  export function contrast(fg: string, bg: string): number {
    const solidBg = over(parse(bg), [0, 0, 0]);
    const l1 = luminance(over(parse(fg), solidBg));
    const l2 = luminance(solidBg);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
  }
  ```

- [ ] **Paso 4: `src/ui/theme.ts`** completo (reemplaza el archivo):

  ```ts
  import type { TextStyle } from "react-native";

  // Tokens de Relayer (relayer-core apps/web/app/tokens.css, paleta v5 Carbon/Petrol/Turquoise/Sage/Peach/Coral), spec D4.
  // Dos paletas con los mismos nombres semánticos: Paper (light) y Carbon (dark). Las pantallas leen `useTheme().c`; aquí viven
  // los únicos hex de la UI. Reglas: `live` es un punto, nunca texto; `ink40` sólo placeholders y deshabilitados.

  export type Scheme = "light" | "dark";
  export type ThemeOverride = Scheme | "system";

  /** Identidad v5, independiente del esquema (arte de tarjeta, marca, puntos). */
  export const RL = { carbon: "#121819", petrol: "#00594F", turq: "#72BDB1", sage: "#B5C8AA", peach: "#F0B395", coral: "#D87968" } as const;

  /** Forma: Relayer es de esquinas rectas (2 px); el pill sólo para puntos y avatares. */
  export const RADIUS = { card: 2, control: 2, pill: 9999 } as const;

  export type Palette = {
    page: string; canvas: string; card: string; elev: string; input: string; sub: string;
    inkStrong: string; inkBody: string; ink72: string; ink55: string; ink40: string; ink25: string; ink15: string; ink08: string; ink04: string;
    brand: string; brandH: string; onBrand: string; live: string; settled: string;
    info: string; success: string; warning: string; error: string;
    backdrop: string;
    btnPrimary: string; btnPrimaryH: string; onBtnPrimary: string;
  };

  export const LIGHT: Palette = {
    page: "#FBFBFA", canvas: "#F5F5F4", card: "#FFFFFF", elev: "#FFFFFF", input: "#FFFFFF", sub: "#F1F1F0",
    inkStrong: "#121819", inkBody: "#24292B",
    ink72: "rgba(20,25,27,0.72)", ink55: "rgba(20,25,27,0.55)", ink40: "rgba(20,25,27,0.40)", ink25: "rgba(20,25,27,0.24)",
    ink15: "rgba(20,25,27,0.12)", ink08: "rgba(20,25,27,0.07)", ink04: "rgba(20,25,27,0.035)",
    brand: "#00594F", brandH: "#00473F", onBrand: "#FBFBF9", live: "#00C4CC", settled: "#3DA083",
    info: "#3D5A7B", success: "#2F8E5C", warning: "#B57100", error: "#8B2940",
    backdrop: "rgba(20,25,27,0.32)",
    btnPrimary: "#121819", btnPrimaryH: "#2A3536", onBtnPrimary: "#FFFFFF",
  };

  export const DARK: Palette = {
    page: "#121819", canvas: "#0D1213", card: "#1A2223", elev: "#222B2C", input: "#121819", sub: "#0F1516",
    inkStrong: "#FFFFFF", inkBody: "#E6ECEB",
    ink72: "rgba(230,236,235,0.74)", ink55: "rgba(230,236,235,0.58)", ink40: "rgba(230,236,235,0.40)", ink25: "rgba(230,236,235,0.24)",
    ink15: "rgba(230,236,235,0.12)", ink08: "rgba(230,236,235,0.07)", ink04: "rgba(230,236,235,0.04)",
    brand: "#72BDB1", brandH: "#8CCBC1", onBrand: "#121819", live: "#33D6DD", settled: "#66C8A8",
    info: "#8FA8C4", success: "#66C8A8", warning: "#E8B25C", error: "#D87968",
    backdrop: "rgba(0,0,0,0.65)",
    btnPrimary: "#72BDB1", btnPrimaryH: "#8FCCC2", onBtnPrimary: "#121819",
  };

  export const PALETTES: Record<Scheme, Palette> = { light: LIGHT, dark: DARK };

  /** Esquema efectivo: el override manual gana; "system" sigue al teléfono (sin dato → light). */
  export function resolveScheme(override: ThemeOverride, system: Scheme | null | undefined): Scheme {
    if (override !== "system") return override;
    return system === "dark" ? "dark" : "light";
  }

  /** "#RRGGBB" → "rgba(r,g,b,a)": tintes de fondo de avisos, chips y tarjetas (warning al 12 %, etc.). */
  export function alpha(hex: string, a: number): string {
    const h = hex.replace("#", "");
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
  }

  // Familias cargadas en App.tsx: Instrument Sans (cuerpo) y JetBrains Mono (cifras, etiquetas). Archivo (display web) entra después.
  export const F = {
    r: "InstrumentSans_400Regular",
    m: "InstrumentSans_500Medium",
    sb: "InstrumentSans_600SemiBold",
    b: "InstrumentSans_700Bold",
    mono: "JetBrainsMono_400Regular",
    monoM: "JetBrainsMono_500Medium",
    monoB: "JetBrainsMono_700Bold",
  } as const;

  export type FontKind = "mono";

  export function fam(weight: number, kind?: FontKind): string {
    if (kind === "mono") return weight >= 700 ? F.monoB : weight >= 500 ? F.monoM : F.mono;
    if (weight >= 700) return F.b;
    if (weight >= 600) return F.sb;
    if (weight >= 500) return F.m;
    return F.r;
  }

  export type TypeOpts = { lh?: number; ls?: number; mono?: boolean; color?: string };

  /** `font: <weight> <size>/<lh> <family>`; `ls` en em → px. Sin `color` no pone color (lo pone `T` con la paleta). */
  export function textStyle(weight: number, size: number, { lh, ls = 0, mono = false, color }: TypeOpts = {}): TextStyle {
    const style: TextStyle = { fontFamily: fam(weight, mono ? "mono" : undefined), fontSize: size };
    if (lh) style.lineHeight = Math.round(size * lh);
    if (ls) style.letterSpacing = +(size * ls).toFixed(2);
    if (color) style.color = color;
    return style;
  }
  ```

- [ ] **Paso 5: correr.** `npx jest __tests__/theme.test.ts </dev/null` → verde. `npm run typecheck </dev/null` **fallará** en `primitives.tsx`, `variants.ts` y `App.tsx` (ya no existe `C`): se arregla en la Task 4 — **no commitear todavía**; la Task 4 cierra el commit de las dos juntas. (Si se prefiere commit por tarea, dejar temporalmente `export const C = LIGHT as unknown as Record<string, string>;` al final de `theme.ts` y quitarlo en la Task 4; pero el commit único es más limpio.)

### Task 4: ThemeProvider, variantes y primitivas leyendo la paleta

**Files:**
- Create: `src/ui/ThemeProvider.tsx`, `src/storage/kv.ts`, `src/storage/asyncKv.ts`, `src/storage/theme.ts`
- Rewrite: `src/ui/variants.ts`, `src/ui/primitives.tsx`, `__tests__/variants.test.ts`, `App.tsx`
- Create: `__tests__/storage-theme.test.ts`

- [ ] **Paso 1: tests primero.** `__tests__/variants.test.ts`:

  ```ts
  import { contrast } from "../src/ui/contrast";
  import { DARK, LIGHT, PALETTES } from "../src/ui/theme";
  import { btnVariants, tone } from "../src/ui/variants";

  test.each(["light", "dark"] as const)("cada variante de botón se lee (%s)", (scheme) => {
    const c = PALETTES[scheme];
    const v = btnVariants(c);
    expect(v.primary).toEqual({ bg: c.btnPrimary, bd: c.btnPrimary, fg: c.onBtnPrimary, w: 600 });
    expect(v.brand).toEqual({ bg: c.brand, bd: c.brand, fg: c.onBrand, w: 600 });
    expect(v.control).toEqual({ bg: c.sub, bd: c.sub, fg: c.inkStrong, w: 600 });
    expect(v.outline).toEqual({ bg: "transparent", bd: c.ink15, fg: c.inkStrong, w: 600 });
    expect(v.ghost.fg).toBe(c.ink72);
    expect(v.danger.fg).toBe(c.error);
    for (const k of ["primary", "brand", "control"] as const) expect(contrast(v[k].fg, v[k].bg)).toBeGreaterThanOrEqual(4.5);
    for (const k of ["outline", "ghost"] as const) expect(contrast(v[k].fg, c.page)).toBeGreaterThanOrEqual(4.5);
  });

  test("tone: borde al 35 %, fondo al 12 %, texto del color; neutral usa sub/ink", () => {
    expect(tone(LIGHT, "warning")).toEqual({ bd: "rgba(181,113,0,0.35)", bg: "rgba(181,113,0,0.12)", fg: "#B57100" });
    expect(tone(DARK, "error")).toEqual({ bd: "rgba(216,121,104,0.35)", bg: "rgba(216,121,104,0.12)", fg: "#D87968" });
    expect(tone(DARK, "neutral")).toEqual({ bd: DARK.ink15, bg: DARK.sub, fg: DARK.ink72 });
  });
  ```

  `__tests__/storage-theme.test.ts`:

  ```ts
  import { memoryKv } from "../src/storage/kv";
  import { loadThemeOverride, parseThemeOverride, saveThemeOverride, THEME_KEY } from "../src/storage/theme";

  test("parseThemeOverride acepta light/dark/system y cae a system", () => {
    expect(parseThemeOverride("dark")).toBe("dark");
    expect(parseThemeOverride("light")).toBe("light");
    expect(parseThemeOverride("system")).toBe("system");
    expect(parseThemeOverride("blue")).toBe("system");
    expect(parseThemeOverride(null)).toBe("system");
  });

  test("load/save persisten en el KV bajo relayer.theme.v1", async () => {
    const kv = memoryKv();
    expect(await loadThemeOverride(kv)).toBe("system");
    await saveThemeOverride(kv, "dark");
    expect(kv.data[THEME_KEY]).toBe("dark");
    expect(await loadThemeOverride(kv)).toBe("dark");
  });

  test("un KV que falla al leer cuenta como system", async () => {
    const kv = { getItem: async () => { throw new Error("boom"); }, setItem: async () => {} };
    expect(await loadThemeOverride(kv)).toBe("system");
  });
  ```

  Correr `npx jest __tests__/variants.test.ts __tests__/storage-theme.test.ts </dev/null` → fallan.

- [ ] **Paso 2: `src/storage/kv.ts`** (puro, sin módulos nativos):

  ```ts
  /** Clave/valor mínimo: AsyncStorage en la app (asyncKv.ts), memoria en tests y en el mock. */
  export type KeyValueStorage = {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
  };

  export function memoryKv(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
    const data = { ...initial };
    return {
      data,
      getItem: async (k) => (k in data ? data[k] : null),
      setItem: async (k, v) => { data[k] = v; },
    };
  }
  ```

  `src/storage/asyncKv.ts`:

  ```ts
  import AsyncStorage from "@react-native-async-storage/async-storage";
  import type { KeyValueStorage } from "./kv";

  /** Único punto que toca AsyncStorage: escenario de la demo y override del tema. */
  export const asyncStorageKv: KeyValueStorage = {
    getItem: (k) => AsyncStorage.getItem(k),
    setItem: (k, v) => AsyncStorage.setItem(k, v),
  };
  ```

  `src/storage/theme.ts`:

  ```ts
  import type { ThemeOverride } from "../ui/theme";
  import type { KeyValueStorage } from "./kv";

  export const THEME_KEY = "relayer.theme.v1";

  export function parseThemeOverride(raw: string | null | undefined): ThemeOverride {
    return raw === "light" || raw === "dark" ? raw : "system";
  }

  /** Un fallo de lectura cuenta como "system": mejor seguir al teléfono que bloquear el arranque. */
  export async function loadThemeOverride(kv: KeyValueStorage): Promise<ThemeOverride> {
    try { return parseThemeOverride(await kv.getItem(THEME_KEY)); } catch { return "system"; }
  }

  export async function saveThemeOverride(kv: KeyValueStorage, o: ThemeOverride): Promise<void> {
    try { await kv.setItem(THEME_KEY, o); } catch { /* sin persistencia, a lo sumo vuelve a system al relanzar */ }
  }
  ```

- [ ] **Paso 3: `src/ui/ThemeProvider.tsx`:**

  ```tsx
  import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
  import { useColorScheme } from "react-native";
  import { asyncStorageKv } from "../storage/asyncKv";
  import { loadThemeOverride, saveThemeOverride } from "../storage/theme";
  import { type Palette, PALETTES, resolveScheme, type Scheme, type ThemeOverride } from "./theme";

  export type Theme = { scheme: Scheme; c: Palette; override: ThemeOverride; setOverride: (o: ThemeOverride) => void };

  const Ctx = createContext<Theme | null>(null);

  /** Esquema del sistema + override manual persistido (Perfil → Apariencia). Envuelve toda la app (App.tsx). */
  export function ThemeProvider({ children }: { children: ReactNode }) {
    const system = useColorScheme();
    const [override, setOverrideState] = useState<ThemeOverride>("system");
    useEffect(() => {
      let stale = false;
      void loadThemeOverride(asyncStorageKv).then((o) => { if (!stale) setOverrideState(o); });
      return () => { stale = true; };
    }, []);
    const setOverride = useCallback((o: ThemeOverride) => { setOverrideState(o); void saveThemeOverride(asyncStorageKv, o); }, []);
    const scheme = resolveScheme(override, system);
    const value = useMemo<Theme>(() => ({ scheme, c: PALETTES[scheme], override, setOverride }), [scheme, override, setOverride]);
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }

  export function useTheme(): Theme {
    const v = useContext(Ctx);
    if (v === null) throw new Error("useTheme fuera de ThemeProvider");
    return v;
  }
  ```

- [ ] **Paso 4: `src/ui/variants.ts`:**

  ```ts
  import { alpha, type Palette } from "./theme";

  // Variantes de Btn y tonos de aviso (puros, testeados): reciben la paleta porque dependen del esquema.
  export type BtnVariant = "primary" | "brand" | "control" | "outline" | "ghost" | "danger";
  export type Variant = { bg: string; bd: string; fg: string; w: number };

  export function btnVariants(c: Palette): Record<BtnVariant, Variant> {
    return {
      primary: { bg: c.btnPrimary, bd: c.btnPrimary, fg: c.onBtnPrimary, w: 600 },
      brand: { bg: c.brand, bd: c.brand, fg: c.onBrand, w: 600 },
      control: { bg: c.sub, bd: c.sub, fg: c.inkStrong, w: 600 },
      outline: { bg: "transparent", bd: c.ink15, fg: c.inkStrong, w: 600 },
      ghost: { bg: "transparent", bd: "transparent", fg: c.ink72, w: 600 },
      danger: { bg: alpha(c.error, 0.12), bd: "transparent", fg: c.error, w: 600 },
    };
  }

  export type ToneName = "info" | "success" | "warning" | "error" | "neutral";
  export type Tone = { bd: string; bg: string; fg: string };

  /** Tarjetas de estado y avisos: borde al 35 %, fondo al 12 %, texto del color semántico. */
  export function tone(c: Palette, name: ToneName): Tone {
    if (name === "neutral") return { bd: c.ink15, bg: c.sub, fg: c.ink72 };
    const base = c[name];
    return { bd: alpha(base, 0.35), bg: alpha(base, 0.12), fg: base };
  }
  ```

- [ ] **Paso 5: `src/ui/primitives.tsx`** completo (reemplaza el archivo; mismas piezas heredadas que siguen sirviendo, más `Field`, `Check`, `Steps`, `Row`, `Dot`; sin `display`, sin `Sparkline`, `Stepper`, `Avatar`, `InkBlock`, `SearchBox`, `StatGrid`, `EmptyPanel` que eran de pickler):

  ```tsx
  import { type ReactNode, useEffect, useRef } from "react";
  import { ActivityIndicator, Animated, Easing, type Insets, Pressable, type StyleProp, Text, TextInput, type TextInputProps, type TextStyle, View, type ViewStyle } from "react-native";
  import {
    ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Banknote, Bell, Bug, Check as CheckGlyph, ChevronRight, CircleAlert, CircleCheck, Clock, Copy, CreditCard, Download,
    Eye, EyeOff, FileText, Gift, HandCoins, House, Info, Landmark, Lock, LogOut, QrCode, Receipt, ScanFace, Send, Settings, Share2, ShieldCheck, Smartphone, Snowflake, Sparkles, User, Wallet, X,
  } from "lucide-react-native";
  import { RADIUS, textStyle } from "./theme";
  import { useTheme } from "./ThemeProvider";
  import { btnVariants, type BtnVariant, type Tone, tone, type ToneName } from "./variants";
  export type { BtnVariant, Tone, ToneName } from "./variants";

  // ---------------------------------------------------------------------------
  // Texto: w=peso, s=tamaño, lh=ratio, ls=em; mono (JetBrains). Sin color: inkStrong de la paleta.
  export type TProps = {
    w?: number; s?: number; lh?: number; ls?: number; mono?: boolean; color?: string;
    style?: StyleProp<TextStyle>; numberOfLines?: number; children?: ReactNode; accessibilityLabel?: string; selectable?: boolean;
  };

  export function T({ w = 400, s = 14, lh, ls, mono, color, style, numberOfLines, accessibilityLabel, selectable, children }: TProps) {
    const { c } = useTheme();
    return (
      <Text numberOfLines={numberOfLines} accessibilityLabel={accessibilityLabel} selectable={selectable} style={[textStyle(w, s, { lh, ls, mono, color: color ?? c.inkStrong }), style]}>
        {children}
      </Text>
    );
  }

  /** Eyebrow mono de Relayer: 10.5 px, peso 500, tracking .08em, mayúsculas. Sin color: ink55. */
  export function Tag({ children, color, s = 10.5, style }: { children: ReactNode; color?: string; s?: number; style?: StyleProp<TextStyle> }) {
    const { c } = useTheme();
    return <T w={500} s={s} lh={1} ls={0.08} mono color={color ?? c.ink55} style={style}>{typeof children === "string" ? children.toUpperCase() : children}</T>;
  }

  export type TouchProps = {
    onPress?: () => void; onLongPress?: () => void; delayLongPress?: number; style?: StyleProp<ViewStyle>; children?: ReactNode; disabled?: boolean;
    hitSlop?: number | Insets; accessibilityLabel?: string;
  };

  export function Touch({ onPress, onLongPress, delayLongPress, style, children, disabled, hitSlop, accessibilityLabel }: TouchProps) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [style, pressed && !disabled ? { opacity: 0.72 } : null]}
      >
        {children}
      </Pressable>
    );
  }

  // ---------------------------------------------------------------------------
  // Iconos lucide.
  const ICONS = {
    back: ArrowLeft, arrow: ArrowRight, down: ArrowDown, up: ArrowUp, chevron: ChevronRight,
    home: House, gift: Gift, user: User, card: CreditCard, bank: Landmark, shield: ShieldCheck, faceId: ScanFace, send: Send,
    wallet: Wallet, settings: Settings, check: CheckGlyph, copy: Copy, share: Share2, freeze: Snowflake, bell: Bell, lock: Lock,
    alert: CircleAlert, ok: CircleCheck, clock: Clock, phone: Smartphone, receipt: Receipt, verified: BadgeCheck, eye: Eye, eyeOff: EyeOff,
    close: X, doc: FileText, info: Info, logout: LogOut, download: Download, bug: Bug, banknote: Banknote, qr: QrCode, sparkles: Sparkles, coins: HandCoins,
  } as const;
  export type IconName = keyof typeof ICONS;

  export function Icon({ name, size = 16, color, strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
    const { c } = useTheme();
    const Cmp = ICONS[name];
    return <Cmp size={size} color={color ?? c.inkStrong} strokeWidth={strokeWidth} />;
  }

  // ---------------------------------------------------------------------------
  // Superficies.
  export type CardProps = { children?: ReactNode; style?: StyleProp<ViewStyle>; bd?: string; bg?: string; pad?: number; gap?: number };

  /** Card de Relayer: fondo card, hairline ink08, radio 2. */
  export function Card({ children, style, bd, bg, pad = 16, gap }: CardProps) {
    const { c } = useTheme();
    return (
      <View style={[{ padding: pad, borderRadius: RADIUS.card, borderWidth: 1, borderColor: bd ?? c.ink08, backgroundColor: bg ?? c.card, gap }, style]}>
        {children}
      </View>
    );
  }

  export function TouchCard({ onPress, onLongPress, delayLongPress, children, style, bd, bg, pad = 16, disabled, accessibilityLabel }: TouchProps & { bd?: string; bg?: string; pad?: number }) {
    const { c } = useTheme();
    return (
      <Touch onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} disabled={disabled} accessibilityLabel={accessibilityLabel}
        style={[{ padding: pad, borderRadius: RADIUS.card, borderWidth: 1, borderColor: bd ?? c.ink08, backgroundColor: bg ?? c.card }, style]}>
        {children}
      </Touch>
    );
  }

  /** Fila clave/valor: clave mono ink55, valor mono inkStrong. */
  export function KV({ k, v, vFg, kFg }: { k: string; v: string; vFg?: string; kFg?: string }) {
    const { c } = useTheme();
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <T w={500} s={10.5} lh={1.4} ls={0.08} mono color={kFg ?? c.ink55}>{k.toUpperCase()}</T>
        <T w={500} s={12.5} lh={1.4} mono color={vFg ?? c.inkStrong} style={{ textAlign: "right", flexShrink: 1 }} selectable>{v}</T>
      </View>
    );
  }

  export type KVRow = { label: string; value: string; fg?: string };

  export function KVList({ rows, top, gap = 8, style }: { rows: KVRow[]; top?: boolean; gap?: number; style?: StyleProp<ViewStyle> }) {
    const { c } = useTheme();
    return (
      <View style={[{ gap, paddingTop: top ? 10 : 0, borderTopWidth: top ? 1 : 0, borderTopColor: c.ink08 }, style]}>
        {rows.map((r, i) => <KV key={i} k={r.label} v={r.value} vFg={r.fg} />)}
      </View>
    );
  }

  export function Hair({ style }: { style?: StyleProp<ViewStyle> }) {
    const { c } = useTheme();
    return <View style={[{ height: 1, backgroundColor: c.ink08 }, style]} />;
  }

  /** Punto de estado (pill): live, success, warning, error o cualquier color. */
  export function Dot({ color, size = 8 }: { color: string; size?: number }) {
    return <View style={{ width: size, height: size, borderRadius: RADIUS.pill, backgroundColor: color }} />;
  }

  /** Chip rectangular (radio control): filtros, escenarios, marcas. `on` = fondo ink, texto página. */
  export type ChipProps = {
    label: string; on?: boolean; fg?: string; bd?: string; bg?: string; onPress?: () => void; mono?: boolean;
    s?: number; py?: number; px?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
  };

  export function Chip({ label, on, fg, bd, bg, onPress, mono, s = 11.5, py = 7, px = 11, style, accessibilityLabel }: ChipProps) {
    const { c } = useTheme();
    const colors = on ? { fg: c.onBtnPrimary, bd: c.btnPrimary, bg: c.btnPrimary } : { fg: fg ?? c.ink72, bd: bd ?? c.ink15, bg: bg ?? "transparent" };
    const inner = <T w={mono ? 500 : 600} s={s} lh={1} mono={mono} color={colors.fg}>{label}</T>;
    const box: ViewStyle = { paddingVertical: py, paddingHorizontal: px, borderRadius: RADIUS.control, borderWidth: 1, borderColor: colors.bd, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" };
    if (onPress) return <Touch onPress={onPress} accessibilityLabel={accessibilityLabel} style={[box, style]}>{inner}</Touch>;
    return <View style={[box, style]}>{inner}</View>;
  }

  // ---------------------------------------------------------------------------
  // Botones. Alturas de Relayer: md 40 (py 11), lg 46 (py 14).
  export type BtnProps = {
    label: string; onPress?: () => void; variant?: BtnVariant; arrow?: boolean; icon?: IconName; s?: number; py?: number;
    style?: StyleProp<ViewStyle>; disabled?: boolean; flex?: number; busy?: boolean; accessibilityLabel?: string;
  };

  /** `busy` muestra un spinner en lugar del icono y bloquea el toque; `disabled` baja opacidad. */
  export function Btn({ label, onPress, variant = "control", arrow, icon, s = 14, py = 14, style, disabled, flex, busy, accessibilityLabel }: BtnProps) {
    const { c } = useTheme();
    const v = btnVariants(c)[variant];
    return (
      <Touch
        onPress={onPress}
        disabled={disabled || busy}
        accessibilityLabel={accessibilityLabel}
        style={[{
          flex, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
          paddingVertical: py, paddingHorizontal: 18, borderRadius: RADIUS.control,
          borderWidth: 1, borderColor: v.bd, backgroundColor: v.bg, opacity: disabled ? 0.45 : 1,
        }, style]}
      >
        {busy ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} size={16} color={v.fg} /> : null}
        <T w={v.w} s={s} lh={1} color={v.fg}>{label}</T>
        {arrow && !busy ? <Icon name="arrow" size={15} color={v.fg} /> : null}
      </Touch>
    );
  }

  // ---------------------------------------------------------------------------
  // Selectores y formularios.
  export type SegmentedProps<K extends string> = { options: readonly (readonly [K, string])[]; value: K; onChange: (k: K) => void };

  export function Segmented<K extends string>({ options, value, onChange }: SegmentedProps<K>) {
    const { c } = useTheme();
    return (
      <View style={{ flexDirection: "row", gap: 2, padding: 2, borderRadius: RADIUS.control, backgroundColor: c.sub, borderWidth: 1, borderColor: c.ink08 }}>
        {options.map(([k, label]) => {
          const on = value === k;
          return (
            <Touch key={k} onPress={() => onChange(k)} accessibilityLabel={`segment-${k}`}
              style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 6, borderRadius: RADIUS.control, backgroundColor: on ? c.card : "transparent", borderWidth: 1, borderColor: on ? c.ink15 : "transparent", alignItems: "center" }}>
              <T w={600} s={13} lh={1} color={on ? c.inkStrong : c.ink55}>{label}</T>
            </Touch>
          );
        })}
      </View>
    );
  }

  /** Input de Relayer: etiqueta eyebrow + caja input con hairline ink15 (alto lg 46). */
  export function Field({ label, hint, error, right, ...input }: { label: string; hint?: string; error?: string; right?: ReactNode } & TextInputProps) {
    const { c } = useTheme();
    return (
      <View style={{ gap: 6 }}>
        <Tag>{label}</Tag>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: RADIUS.control, borderWidth: 1, borderColor: error ? c.error : c.ink15, backgroundColor: c.input }}>
          <TextInput placeholderTextColor={c.ink40} autoCorrect={false} {...input} style={[textStyle(500, 15, { color: c.inkStrong }), { flex: 1, paddingVertical: 12 }, input.style]} />
          {right}
        </View>
        {error ? <T w={400} s={12} lh={1.4} color={c.error}>{error}</T> : hint ? <T w={400} s={12} lh={1.4} color={c.ink55}>{hint}</T> : null}
      </View>
    );
  }

  /** Casilla con texto (términos). */
  export function Check({ checked, onChange, children, accessibilityLabel }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; accessibilityLabel: string }) {
    const { c } = useTheme();
    return (
      <Touch onPress={() => onChange(!checked)} accessibilityLabel={accessibilityLabel} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View style={{ width: 22, height: 22, borderRadius: RADIUS.control, borderWidth: 1, borderColor: checked ? c.btnPrimary : c.ink25, backgroundColor: checked ? c.btnPrimary : c.input, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
          {checked ? <Icon name="check" size={14} color={c.onBtnPrimary} strokeWidth={2.4} /> : null}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Touch>
    );
  }

  /** Lista numerada (Activar: 3 pasos; Pedir tarjeta: condiciones). */
  export function Steps({ items }: { items: readonly { title: string; body: string }[] }) {
    const { c } = useTheme();
    return (
      <View style={{ gap: 12 }}>
        {items.map((it, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: RADIUS.control, backgroundColor: c.sub, borderWidth: 1, borderColor: c.ink08, alignItems: "center", justifyContent: "center" }}>
              <T w={500} s={11} lh={1} mono color={c.ink72}>{String(i + 1).padStart(2, "0")}</T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T w={600} s={14} lh={1.3}>{it.title}</T>
              <T w={400} s={13} lh={1.45} color={c.ink72}>{it.body}</T>
            </View>
          </View>
        ))}
      </View>
    );
  }

  /** Fila de lista: icono o punto, título + subtítulo, valor a la derecha, chevron si navega. */
  export function Row({ icon, dot, title, sub, right, rightFg, onPress, accessibilityLabel }: { icon?: IconName; dot?: string; title: string; sub?: string; right?: string; rightFg?: string; onPress?: () => void; accessibilityLabel?: string }) {
    const { c } = useTheme();
    const inner = (
      <>
        {icon ? <View style={{ width: 36, height: 36, borderRadius: RADIUS.control, backgroundColor: c.sub, alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={17} color={c.ink72} /></View> : null}
        {dot ? <Dot color={dot} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w={600} s={14} lh={1.25} numberOfLines={1}>{title}</T>
          {sub ? <T w={400} s={12} lh={1.3} color={c.ink55} numberOfLines={1} style={{ marginTop: 3 }}>{sub}</T> : null}
        </View>
        {right ? <T w={500} s={13} lh={1} mono color={rightFg ?? c.inkStrong}>{right}</T> : null}
        {onPress ? <Icon name="chevron" size={16} color={c.ink40} /> : null}
      </>
    );
    const box: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.ink08, backgroundColor: c.card };
    return onPress ? <Touch onPress={onPress} accessibilityLabel={accessibilityLabel} style={box}>{inner}</Touch> : <View style={box}>{inner}</View>;
  }

  // ---------------------------------------------------------------------------
  // Avisos y estados.
  export function Warn({ title, body, tone: name = "warning", children }: { title: string; body?: string; tone?: ToneName; children?: ReactNode }) {
    const { c } = useTheme();
    const t = tone(c, name);
    return (
      <Card bd={t.bd} bg={t.bg} pad={14} gap={6}>
        <T w={600} s={13} lh={1.3} color={t.fg}>{title}</T>
        {body ? <T w={400} s={12.5} lh={1.45} color={c.inkBody}>{body}</T> : null}
        {children}
      </Card>
    );
  }

  /** Tarjeta de estado (KYC, endorsement, verificación, recibo): eyebrow + título + cuerpo en el tono. */
  export function StatusCard({ tag, title, body, tone: name, busy, children }: { tag: string; title: string; body?: string; tone: ToneName; busy?: boolean; children?: ReactNode }) {
    const { c } = useTheme();
    const t = tone(c, name);
    return (
      <Card bd={t.bd} bg={t.bg} pad={16} gap={8}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {busy ? <ActivityIndicator size="small" color={t.fg} /> : <Dot color={t.fg} />}
          <Tag color={t.fg}>{tag}</Tag>
        </View>
        <T w={600} s={18} lh={1.2} ls={-0.01}>{title}</T>
        {body ? <T w={400} s={13} lh={1.5} color={c.inkBody}>{body}</T> : null}
        {children}
      </Card>
    );
  }

  /** Cuerpo de pantalla: padding horizontal 18 y gap. (El `Page` de ruta vive en Page.tsx.) */
  export function Body({ children, style, gap = 12, top = 12 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; gap?: number; top?: number }) {
    return <View style={[{ paddingTop: top, paddingHorizontal: 18, paddingBottom: 24, gap }, style]}>{children}</View>;
  }

  // ---------------------------------------------------------------------------
  // Skeletons (heredados): un solo pulso compartido con refcount.
  const PULSE = new Animated.Value(1);
  let pulseLoop: Animated.CompositeAnimation | null = null;
  let pulseMounted = 0;

  function usePulse(): Animated.Value {
    useEffect(() => {
      if (pulseMounted++ === 0) {
        pulseLoop = Animated.loop(Animated.sequence([
          Animated.timing(PULSE, { toValue: 0.45, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(PULSE, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]));
        pulseLoop.start();
      }
      return () => { if (--pulseMounted === 0) { pulseLoop?.stop(); pulseLoop = null; PULSE.setValue(1); } };
    }, []);
    return PULSE;
  }

  type SkeletonProps = { w?: number | `${number}%`; h?: number; style?: StyleProp<ViewStyle> };

  function SkeletonBlock({ w = "100%", h = 12, style }: SkeletonProps) {
    const { c } = useTheme();
    const opacity = usePulse();
    return <Animated.View style={[{ width: w, height: h, borderRadius: RADIUS.control, backgroundColor: c.ink08, opacity }, style]} />;
  }

  function SkeletonRow() {
    return (
      <Card pad={13} style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
        <View style={{ flex: 1, gap: 6 }}><SkeletonBlock h={14} w="40%" /><SkeletonBlock h={11} w="60%" /></View>
        <SkeletonBlock h={13} w={72} />
      </Card>
    );
  }

  export const Skeleton = Object.assign(SkeletonBlock, { Row: SkeletonRow });

  /** El contenido entra con un fade de 150 ms (skeleton → dato). */
  export function Reveal({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start(); }, [opacity]);
    return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
  }
  ```

- [ ] **Paso 6: `App.tsx`** con el provider (sigue siendo placeholder):

  ```tsx
  import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans";
  import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
  import { useFonts } from "expo-font";
  import * as SplashScreen from "expo-splash-screen";
  import { useEffect } from "react";
  import { StatusBar, View } from "react-native";
  import { GestureHandlerRootView } from "react-native-gesture-handler";
  import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
  import { T, Tag } from "./src/ui/primitives";
  import { ThemeProvider, useTheme } from "./src/ui/ThemeProvider";

  void SplashScreen.preventAutoHideAsync();
  SplashScreen.setOptions({ fade: true, duration: 200 });

  function Placeholder() {
    const { c, scheme } = useTheme();
    return (
      <>
        <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
        <SafeAreaView style={{ flex: 1, backgroundColor: c.page }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
            <Tag>Acme Beneficios</Tag>
            <T w={600} s={28} lh={1.1} ls={-0.02}>Recibo</T>
            <T w={400} s={13} lh={1.4} color={c.ink72}>Cascarón vacío. El módulo llega en las siguientes tareas.</T>
          </View>
        </SafeAreaView>
      </>
    );
  }

  export default function App() {
    const [fontsLoaded] = useFonts({
      InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
      JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold,
    });
    useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
    if (!fontsLoaded) return null;
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider><Placeholder /></ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  ```

- [ ] **Paso 7: verificar.** `npm run typecheck </dev/null` (0 errores), `npm test </dev/null` (theme, variants, storage-theme, tabBarLayout en verde).

- [ ] **Paso 8: commit** (Tasks 3 y 4 juntas):

  ```bash
  git add src/ui/theme.ts src/ui/contrast.ts src/ui/ThemeProvider.tsx src/ui/variants.ts src/ui/primitives.tsx src/storage/kv.ts src/storage/asyncKv.ts src/storage/theme.ts App.tsx __tests__/theme.test.ts __tests__/variants.test.ts __tests__/storage-theme.test.ts
  git commit -m "feat(ui): Relayer tokens light/dark, ThemeProvider and primitives reading the palette" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

---

# Fase C — Copy

### Task 5: `src/i18n/es.ts` + `t()`

**Files:**
- Create: `src/i18n/es.ts`
- Create: `__tests__/i18n.test.ts`

Todo el copy del módulo y de la anfitriona vive aquí (D7), con claves planas `sección.clave`. Las pantallas de las Tasks 10–15 usan exactamente estas claves; si una pantalla necesita una nueva, se agrega aquí (nunca texto inline). Va antes que la navegación porque `store.ts` (`headerFor`) y `notify.ts` la importan.

- [ ] **Paso 1: test primero** `__tests__/i18n.test.ts`:

  ```ts
  import { es, isKey, type Key, reasonCopy, t } from "../src/i18n/es";

  const SCREENS = [
    "home", "benefits", "profile", "activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "balance", "deposit",
    "cardRequest", "cardAuthorize", "card", "addToWallet", "bankAccount", "send", "sendReceipt", "settings", "demoPanel",
  ] as const;
  const ERROR_CODES = [
    "invalid_transition", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed",
    "bank_not_verified", "insufficient_balance", "below_minimum", "card_not_active", "clabe_invalid", "quote_expired", "passkey_cancelled", "not_found", "unknown",
  ] as const;

  test("toda clave tiene copy (los subtítulos de pantalla pueden ir vacíos) y nada quedó pendiente", () => {
    for (const [k, v] of Object.entries(es)) {
      if (/^screen\..+\.sub$/.test(k)) continue;
      expect([k, v.trim().length > 0]).toEqual([k, true]);
      expect(v).not.toMatch(/TODO|TBD|lorem/i);
    }
  });

  test("cada pantalla tiene título y subtítulo; cada código de error tiene copy; los estados tienen etiqueta", () => {
    for (const s of SCREENS) { expect(isKey(`screen.${s}.title`)).toBe(true); expect(isKey(`screen.${s}.sub`)).toBe(true); }
    for (const c of ERROR_CODES) expect(isKey(`errors.${c}`)).toBe(true);
    for (const s of ["off", "terms_pending", "kyc", "wallet_ready", "active"]) expect(isKey(`module.status.${s}`)).toBe(true);
    for (const s of ["none", "requested", "endorsement_pending", "active", "frozen", "endorsement_expired"]) expect(isKey(`card.status.${s}`)).toBe(true);
    for (const s of ["none", "pending_verification", "verified", "failed"]) expect(isKey(`bank.status.${s}`)).toBe(true);
    for (const s of ["happy", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed"]) {
      expect(isKey(`scenario.${s}`)).toBe(true);
      expect(isKey(`scenario.${s}.hint`)).toBe(true);
    }
  });

  test("t interpola {var} y deja las que no vienen", () => {
    expect(t("home.greeting")).toBe("Hola, Ana");
    expect(t("notify.depositTitle", { from: "Acme Beneficios" })).toBe("Te pagó Acme Beneficios");
    expect(t("send.quoteTtl", { s: 42 })).toBe("La cotización vence en 42 s");
    expect(t("bank.clabeHint", {})).toBe("{n} de 18 dígitos");
  });

  test("reasonCopy traduce las razones conocidas y devuelve el código si no la conoce", () => {
    expect(reasonCopy("id_document_unreadable")).toBe("La identificación no se pudo leer. Toma la foto sin reflejos y con las cuatro esquinas visibles.");
    expect(reasonCopy("something_else")).toBe("something_else");
  });

  test("el pie dice powered by Relayer y las pestañas son Inicio · Beneficios · Perfil", () => {
    expect(t("common.poweredBy")).toBe("powered by Relayer");
    expect([t("tab.home"), t("tab.benefits"), t("tab.profile")]).toEqual(["Inicio", "Beneficios", "Perfil"]);
    const k: Key = "balance.back";
    expect(t(k)).toBe("Volver al saldo");
  });
  ```

- [ ] **Paso 2: correr** `npx jest __tests__/i18n.test.ts </dev/null` → falla (no existe el módulo).

- [ ] **Paso 3: `src/i18n/es.ts`** completo:

  ```ts
  // Copy en español (D7). Claves planas "sección.clave"; {var} se interpola con t(key, vars). Inglés después.
  export const es = {
    // ── común ──
    "common.poweredBy": "powered by Relayer",
    "common.continue": "Continuar",
    "common.cancel": "Cancelar",
    "common.back": "Volver",
    "common.copy": "Copiar",
    "common.edit": "Editar",
    "common.share": "Compartir",
    "common.ready": "Listo",
    "common.yes": "Sí",
    "common.employer": "Tu empresa",
    "common.placeholder": "Esta pantalla llega en una tarea posterior del plan.",

    // ── pestañas y cabeceras ──
    "tab.home": "Inicio",
    "tab.benefits": "Beneficios",
    "tab.profile": "Perfil",
    "screen.home.title": "Inicio", "screen.home.sub": "",
    "screen.benefits.title": "Beneficios", "screen.benefits.sub": "",
    "screen.profile.title": "Perfil", "screen.profile.sub": "",
    "screen.activate.title": "Recibo", "screen.activate.sub": "Activar el módulo",
    "screen.terms.title": "Términos", "screen.terms.sub": "Bridge y Relayer",
    "screen.kyc.title": "Verificación", "screen.kyc.sub": "Identidad · Bridge",
    "screen.kycPending.title": "En revisión", "screen.kycPending.sub": "Verificación de identidad",
    "screen.kycRejected.title": "No aprobada", "screen.kycRejected.sub": "Verificación de identidad",
    "screen.passkey.title": "Tu wallet", "screen.passkey.sub": "Passkey con Face ID",
    "screen.balance.title": "Recibo", "screen.balance.sub": "Saldo · USDC en Base",
    "screen.deposit.title": "Depósito", "screen.deposit.sub": "Detalle del movimiento",
    "screen.cardRequest.title": "Tarjeta", "screen.cardRequest.sub": "Visa virtual",
    "screen.cardAuthorize.title": "Autorizar", "screen.cardAuthorize.sub": "Una sola vez, on-chain",
    "screen.card.title": "Tarjeta", "screen.card.sub": "Visa virtual · USD",
    "screen.addToWallet.title": "Agregar al teléfono", "screen.addToWallet.sub": "Apple Wallet · Google Pay",
    "screen.bankAccount.title": "Cuenta bancaria", "screen.bankAccount.sub": "CLABE · SPEI",
    "screen.send.title": "Enviar a banco", "screen.send.sub": "USDC → MXN por SPEI",
    "screen.sendReceipt.title": "Recibo de envío", "screen.sendReceipt.sub": "SPEI",
    "screen.settings.title": "Ajustes", "screen.settings.sub": "Módulo Recibo",
    "screen.demoPanel.title": "Panel de demo", "screen.demoPanel.sub": "Sólo para la demo",

    // ── errores del API (RelayerErrorCode) ──
    "errors.invalid_transition": "Esa acción no está disponible en este paso.",
    "errors.kyc_rejected": "Tu verificación de identidad no fue aprobada.",
    "errors.cards_unavailable_region": "La tarjeta todavía no está disponible en tu país.",
    "errors.endorsement_expired": "Pasaron más de 24 horas desde tu verificación. Confirma tus datos para pedir la tarjeta.",
    "errors.send_failed": "El banco rechazó la transferencia. Tu saldo regresó a tu wallet.",
    "errors.bank_verification_failed": "No pudimos confirmar que la cuenta esté a tu nombre.",
    "errors.bank_not_verified": "Primero verifica una cuenta bancaria.",
    "errors.insufficient_balance": "No tienes saldo suficiente.",
    "errors.below_minimum": "El mínimo para enviar es $50.00 MXN.",
    "errors.card_not_active": "Tu tarjeta tiene que estar activa y autorizada.",
    "errors.clabe_invalid": "Revisa la CLABE: deben ser 18 dígitos válidos.",
    "errors.quote_expired": "La cotización venció. Cotiza de nuevo.",
    "errors.passkey_cancelled": "No se completó Face ID. Inténtalo de nuevo.",
    "errors.not_found": "No encontramos ese registro.",
    "errors.unknown": "Algo salió mal. Inténtalo de nuevo.",

    // ── estados ──
    "module.status.off": "Sin activar",
    "module.status.terms_pending": "Términos pendientes",
    "module.status.kyc": "Verificando identidad",
    "module.status.wallet_ready": "Creando wallet",
    "module.status.active": "Activo",
    "card.status.none": "Sin tarjeta",
    "card.status.requested": "Solicitada",
    "card.status.endorsement_pending": "Endorsement pendiente",
    "card.status.active": "Activa",
    "card.status.frozen": "Congelada",
    "card.status.endorsement_expired": "Confirma tus datos",
    "bank.status.none": "Sin cuenta",
    "bank.status.pending_verification": "Verificando",
    "bank.status.verified": "Verificada",
    "bank.status.failed": "No verificada",
    "movement.kind.deposit": "Depósito",
    "movement.kind.withdrawal": "Envío a banco",
    "movement.status.completed": "Completado",
    "movement.status.pending": "En proceso",
    "movement.status.failed": "Fallido",

    // ── notificación ──
    "notify.depositTitle": "Te pagó {from}",

    // ── anfitriona: inicio ──
    "home.greetingTag": "Acme Beneficios",
    "home.greeting": "Hola, Ana",
    "home.subtitle": "Tus beneficios, en un solo lugar.",
    "home.sectionNext": "Próximo",
    "home.payrollTitle": "Nómina quincenal",
    "home.payrollSub": "Se deposita el 15 de noviembre",
    "home.payrollRight": "15 NOV",
    "home.vouchersTitle": "Vales de despensa",
    "home.vouchersSub": "Saldo disponible este mes",
    "home.vouchersRight": "$2,400",
    "home.sectionRecibo": "Recibo",
    "home.reciboTag": "Recibo · powered by Relayer",
    "home.reciboOff": "Recibe parte de tu pago en dólares digitales, gástalo con tarjeta y mándalo a tu banco.",
    "home.reciboCta": "Activar",

    // ── anfitriona: beneficios ──
    "benefits.intro": "Lo que Acme Beneficios tiene para ti.",
    "benefits.recibo.title": "Recibo",
    "benefits.recibo.sub": "Recibe pagos en USDC, gasta con una tarjeta Visa virtual y manda a tu cuenta por SPEI.",
    "benefits.recibo.activate": "Activar",
    "benefits.recibo.open": "Abrir",
    "benefits.recibo.resume": "Continuar",
    "benefits.health.title": "Seguro de gastos médicos mayores",
    "benefits.health.sub": "Cobertura familiar · póliza vigente",
    "benefits.gym.title": "Gimnasio",
    "benefits.gym.sub": "50 % de descuento en cadenas afiliadas",
    "benefits.vouchers.title": "Vales de despensa",
    "benefits.vouchers.sub": "$2,400 al mes en tu tarjeta de vales",
    "benefits.status.active": "Activo",
    "benefits.status.available": "Disponible",

    // ── anfitriona: perfil ──
    "profile.name": "Ana Torres",
    "profile.role": "Analista · Operaciones",
    "profile.employeeId": "Empleada 10482 · Acme Beneficios",
    "profile.appearance": "Apariencia",
    "profile.theme.system": "Sistema",
    "profile.theme.light": "Claro",
    "profile.theme.dark": "Oscuro",
    "profile.accountTag": "Cuenta",
    "profile.rows.personal": "Datos personales",
    "profile.rows.personalSub": "Nombre, correo, CURP",
    "profile.rows.notifications": "Notificaciones",
    "profile.rows.notificationsSub": "Nómina, beneficios y Recibo",
    "profile.rows.recibo": "Ajustes de Recibo",
    "profile.rows.reciboSub": "Exportar, soporte, desactivar",
    "profile.footer": "Acme Beneficios · demo · v0.1.0",

    // ── activar (pantalla 2) ──
    "activate.title": "Recibe, gasta y manda tu dinero. Sin bancos de por medio.",
    "activate.lede": "Recibo es el módulo con el que tu empresa te paga en USDC, un dólar digital, y tú decides qué hacer con él.",
    "activate.heldTitle": "Te guardamos a dónde ibas",
    "activate.heldBody": "Al terminar la activación te llevamos directo.",
    "activate.whatTag": "Qué vas a poder hacer",
    "activate.what.receive.title": "Recibir pagos en USDC",
    "activate.what.receive.body": "Tu empresa deposita en tu wallet en Base. Ves el equivalente en pesos al momento.",
    "activate.what.spend.title": "Gastar con una Visa virtual",
    "activate.what.spend.body": "Una tarjeta en dólares que agregas a tu teléfono y gasta directo de tu wallet.",
    "activate.what.send.title": "Mandar a tu banco por SPEI",
    "activate.what.send.body": "A cualquier CLABE a tu nombre, con cotización clara antes de confirmar.",
    "activate.stepsTag": "Tres pasos",
    "activate.step1.title": "Acepta los términos",
    "activate.step1.body": "De Bridge (quien mueve el dinero) y de Relayer (la tecnología).",
    "activate.step2.title": "Verifica tu identidad",
    "activate.step2.body": "Identificación, selfie y comprobante de domicilio. Normalmente minutos.",
    "activate.step3.title": "Crea tu wallet con Face ID",
    "activate.step3.body": "Una passkey en tu teléfono. Nadie más la tiene: ni Acme, ni Relayer.",
    "activate.ctaStart": "Empezar",
    "activate.ctaResume": "Continuar donde me quedé",
    "activate.ctaOpen": "Abrir Recibo",
    "activate.footnote": "Relayer es proveedor de tecnología. Bridge es la entidad regulada que convierte y mueve tu dinero.",

    // ── términos (pantalla 3) ──
    "terms.lede": "Antes de empezar, dos acuerdos. Léelos con calma; puedes volver a verlos en Ajustes.",
    "terms.bridgeTag": "Bridge",
    "terms.bridgeTitle": "Términos de servicio de Bridge",
    "terms.bridgeBody": "Bridge verifica tu identidad, convierte USDC a pesos y envía por SPEI. Es tu contraparte regulada para el cambio y los rieles bancarios.",
    "terms.relayerTag": "Relayer",
    "terms.relayerTitle": "Términos del módulo Recibo",
    "terms.relayerBody": "Relayer opera la wallet, la tarjeta y esta experiencia dentro de la app de tu empresa. No custodia tu dinero.",
    "terms.custodyNote": "Tu wallet es tuya: se controla con una passkey en tu teléfono. Ni Acme Beneficios ni Relayer pueden mover tu saldo.",
    "terms.checkbox": "Leí y acepto los términos de Bridge y de Relayer.",
    "terms.cta": "Aceptar y continuar",

    // ── KYC (pantallas 4 y 5) ──
    "kyc.tag": "Verificación de identidad",
    "kyc.introTitle": "Vamos a verificar quién eres",
    "kyc.introBody": "Lo hace Bridge con un proveedor de verificación. Tus documentos no pasan por Acme ni por Relayer.",
    "kyc.needTag": "Vas a necesitar",
    "kyc.need.id.title": "Identificación oficial",
    "kyc.need.id.sub": "INE o pasaporte vigente",
    "kyc.need.selfie.title": "Una selfie",
    "kyc.need.selfie.sub": "Para comparar con tu identificación",
    "kyc.need.address.title": "Comprobante de domicilio",
    "kyc.need.address.sub": "Recibo de luz, agua o estado de cuenta",
    "kyc.retryTitle": "Tu intento anterior no fue aprobado",
    "kyc.retryBody": "Revisa las razones en la pantalla anterior y vuelve a intentarlo.",
    "kyc.open": "Abrir verificación",
    "kyc.footnote": "Se abre el flujo del proveedor y regresas a Acme al terminar.",
    "kyc.providerTag": "Persona · simulado",
    "kyc.step.document.title": "Identificación",
    "kyc.step.document.body": "Toma una foto del frente y del reverso de tu INE.",
    "kyc.step.selfie.title": "Selfie",
    "kyc.step.selfie.body": "Mira a la cámara y gira la cabeza despacio.",
    "kyc.step.address.title": "Domicilio",
    "kyc.step.address.body": "Sube un comprobante de los últimos tres meses.",
    "kyc.finish": "Regresar a Acme",
    "kyc.doneTag": "Enviado",
    "kyc.doneTitle": "Regresando a Acme Beneficios…",
    "kyc.doneBody": "El proveedor te devuelve a la app por el enlace de regreso.",
    "kyc.reason.id_document_unreadable": "La identificación no se pudo leer. Toma la foto sin reflejos y con las cuatro esquinas visibles.",
    "kyc.reason.address_mismatch": "El domicilio del comprobante no coincide con el que declaraste.",
    "kycPending.tag": "En revisión",
    "kycPending.title": "Bridge está revisando tus datos",
    "kycPending.body": "Normalmente toma minutos. Te avisamos aquí mismo cuando termine.",
    "kycPending.noneTitle": "No hay una verificación en curso",
    "kycPending.noneBody": "Empieza la activación desde Beneficios.",
    "kycPending.noneCta": "Ir a Activar",
    "kycPending.whatTag": "Qué se revisa",
    "kycPending.whatBody": "Identidad, domicilio y listas de control. Si falta algo, te decimos exactamente qué.",
    "kycPending.back": "Volver a Beneficios",
    "kycRejected.tag": "No aprobada",
    "kycRejected.title": "Tu verificación no fue aprobada",
    "kycRejected.body": "Puedes corregir lo señalado y volver a intentarlo.",
    "kycRejected.reasonsTag": "Razones",
    "kycRejected.noReasons": "Bridge no dio una razón específica.",
    "kycRejected.retry": "Intentar de nuevo",
    "kycRejected.support": "Contactar soporte",

    // ── passkey (pantalla 6) ──
    "passkey.tag": "Tu wallet",
    "passkey.title": "Crea tu wallet con Face ID",
    "passkey.lede": "Una passkey en tu teléfono controla tu wallet en Base. No hay contraseña ni frase que guardar.",
    "passkey.how1.title": "Face ID crea la passkey",
    "passkey.how1.body": "Vive en el llavero de tu iPhone, respaldada por iCloud.",
    "passkey.how2.title": "La passkey controla tu wallet",
    "passkey.how2.body": "Cada envío y la autorización de la tarjeta piden Face ID.",
    "passkey.how3.title": "Nadie más puede moverla",
    "passkey.how3.body": "Ni Acme Beneficios ni Relayer. Es tuya.",
    "passkey.create": "Crear con Face ID",
    "passkey.creating": "Esperando Face ID…",
    "passkey.createSub": "Passkey · tu teléfono",
    "passkey.prompt": "Crear tu wallet de Recibo",
    "passkey.footnote": "En la demo la passkey se simula con Face ID local; la wallet real la crea Turnkey en la siguiente fase.",
    "passkey.doneTag": "Wallet lista",
    "passkey.doneTitle": "Tu wallet está lista",
    "passkey.doneBody": "Esta es la dirección a la que tu empresa deposita. Ya está registrada en Acme Beneficios.",
    "passkey.addressTag": "Dirección en Base",
    "passkey.chain": "Red",
    "passkey.custody": "Control",
    "passkey.custodyValue": "Tu passkey",

    // ── saldo (pantalla 7) ──
    "balance.availableTag": "Disponible",
    "balance.card": "Tarjeta",
    "balance.send": "Enviar",
    "balance.kvWallet": "Wallet",
    "balance.kvCard": "Tarjeta",
    "balance.kvBank": "Cuenta",
    "balance.movementsTag": "Movimientos",
    "balance.empty": "Todavía no hay movimientos. Cuando tu empresa deposite, lo ves aquí y te avisamos.",
    "balance.back": "Volver al saldo",

    // ── depósito (pantalla 8) ──
    "deposit.receivedTag": "Recibido",
    "deposit.from": "De",
    "deposit.concept": "Concepto",
    "deposit.reference": "Referencia",
    "deposit.when": "Fecha",
    "deposit.network": "Red",
    "deposit.status": "Estado",
    "deposit.hashTag": "Hash de la transacción",
    "deposit.footnote": "La referencia es la que mandó tu empresa; sirve para conciliar con tu recibo de nómina.",
    "deposit.missingTitle": "No encontramos ese depósito",
    "deposit.missingBody": "Vuelve al saldo y ábrelo desde la lista.",

    // ── tarjeta (pantallas 9–12) ──
    "card.artTag": "Recibo · virtual",
    "card.holder": "Titular",
    "card.holderPlaceholder": "TU NOMBRE",
    "card.expiry": "Vence",
    "cardRequest.conditionsTag": "Condiciones",
    "cardRequest.cond1.title": "Visa virtual en dólares",
    "cardRequest.cond1.body": "Gasta tu USDC en cualquier comercio que acepte Visa, físico o en línea.",
    "cardRequest.cond2.title": "Gasta directo de tu wallet",
    "cardRequest.cond2.body": "Sin fondearla: cada compra sale de tu saldo tras una autorización única.",
    "cardRequest.cond3.title": "Pídela dentro de 24 horas",
    "cardRequest.cond3.body": "La aprobación de tu identidad para tarjeta vence a las 24 h; si pasa, te pedimos confirmar tus datos.",
    "cardRequest.cta": "Pedir tarjeta",
    "cardRequest.unavailableTitle": "Todavía no en tu país",
    "cardRequest.unavailableBody": "El programa de tarjetas aún no cubre tu región. El resto de Recibo funciona igual.",
    "cardRequest.notify": "Avisarme cuando esté",
    "cardRequest.expiredTag": "Confirma tus datos",
    "cardRequest.expiredTitle": "Pasaron más de 24 horas",
    "cardRequest.expiredBody": "Bridge necesita una confirmación rápida de tu identidad antes de emitir la tarjeta.",
    "cardRequest.reconfirm": "Confirmar mis datos",
    "cardRequest.pending.requested.tag": "Solicitada",
    "cardRequest.pending.requested.title": "Pedimos tu tarjeta",
    "cardRequest.pending.requested.body": "Bridge está registrando la solicitud.",
    "cardRequest.pending.endorsement_pending.tag": "Endorsement pendiente",
    "cardRequest.pending.endorsement_pending.title": "Bridge aprueba tu tarjeta",
    "cardRequest.pending.endorsement_pending.body": "Es el permiso de tarjetas sobre tu verificación. Suele tardar segundos.",
    "cardRequest.footnote": "La emite Stripe Issuing; la aprobación de identidad la da Bridge.",
    "cardAuthorize.tag": "Una sola vez",
    "cardAuthorize.title": "Autoriza que la tarjeta gaste de tu wallet",
    "cardAuthorize.body": "Es una firma on-chain con tu passkey. Después, cada compra se descuenta sola de tu saldo.",
    "cardAuthorize.whatTag": "Qué firmas",
    "cardAuthorize.kvWallet": "Wallet",
    "cardAuthorize.kvSpender": "Puede gastar",
    "cardAuthorize.kvSpenderValue": "Programa de tarjeta",
    "cardAuthorize.kvLimit": "Límite",
    "cardAuthorize.kvLimitValue": "Tu saldo disponible",
    "cardAuthorize.kvRevoke": "Revocar",
    "cardAuthorize.kvRevokeValue": "Cuando quieras, en Ajustes",
    "cardAuthorize.cta": "Autorizar con Face ID",
    "cardAuthorize.prompt": "Autorizar tu tarjeta Recibo",
    "cardAuthorize.footnote": "Sin esta firma la tarjeta existe pero no puede cobrar.",
    "card.frozenTitle": "Tarjeta congelada",
    "card.frozenBody": "No acepta cargos hasta que la descongeles.",
    "card.reveal": "Ver datos",
    "card.hide": "Ocultar",
    "card.freeze": "Congelar",
    "card.unfreeze": "Descongelar",
    "card.kvStatus": "Estado",
    "card.kvAuthorized": "Autorizada",
    "card.kvNetwork": "Red",
    "card.kvNetworkValue": "Visa · USD",
    "card.inWalletTitle": "En tu teléfono",
    "card.addToPhone": "Agregar al teléfono",
    "card.footnote": "Los datos completos sólo se muestran en pantalla; nunca se copian a otra app.",
    "addToWallet.lede": "Paga con el teléfono: agrega la tarjeta a tu cartera digital.",
    "addToWallet.provider.apple": "Apple Wallet",
    "addToWallet.provider.google": "Google Pay",
    "addToWallet.preview": "Recibo · Visa en {provider}",
    "addToWallet.previewSub": "Vista previa simulada",
    "addToWallet.step1.title": "Se abre la cartera",
    "addToWallet.step1.body": "El sistema confirma con Face ID y registra la tarjeta.",
    "addToWallet.step2.title": "Listo para pagar",
    "addToWallet.step2.body": "Acerca el teléfono a la terminal. Cada cargo sale de tu wallet.",
    "addToWallet.cta": "Agregar a {provider}",
    "addToWallet.footnote": "En la demo el push provisioning es simulado.",
    "addToWallet.doneTag": "Agregada",
    "addToWallet.doneTitle": "Tu tarjeta está en {provider}",
    "addToWallet.doneBody": "Ya puedes pagar con el teléfono.",
    "addToWallet.backToCard": "Volver a la tarjeta",

    // ── cuenta bancaria (pantalla 13) ──
    "bank.lede": "Registra la CLABE a la que quieres mandar tu dinero. Tiene que estar a tu nombre.",
    "bank.clabeLabel": "CLABE",
    "bank.clabeHint": "{n} de 18 dígitos",
    "bank.clabeOk": "CLABE válida · {bank}",
    "bank.unknownBank": "banco no identificado",
    "bank.bank": "Banco",
    "bank.owner": "Titular",
    "bank.ownerValue": "La persona verificada en el KYC",
    "bank.rail": "Riel",
    "bank.cta": "Agregar cuenta",
    "bank.footnote": "Bridge deposita $0.01 MXN para confirmar que la cuenta es tuya.",
    "bank.pendingTag": "Verificando titularidad",
    "bank.pendingTitle": "Mandamos $0.01 MXN a tu cuenta",
    "bank.pendingBody": "Si el nombre del titular coincide con tu verificación, la cuenta queda lista.",
    "bank.verifiedTag": "Verificada",
    "bank.verifiedTitle": "Tu cuenta está lista",
    "bank.verifiedBody": "Ya puedes mandar tu saldo por SPEI.",
    "bank.failedTag": "No verificada",
    "bank.failedTitle": "No pudimos confirmar la titularidad",
    "bank.failedBody": "El nombre de la cuenta no coincide con tu verificación. Prueba con otra CLABE a tu nombre.",
    "bank.goSend": "Enviar a banco",

    // ── envío (pantalla 14) ──
    "send.unitMxn": "En pesos",
    "send.unitUsdc": "En USDC",
    "send.amountMxn": "Monto a recibir · MXN",
    "send.amountUsdc": "Monto a enviar · USDC",
    "send.available": "Disponible: {usdc} (≈ {mxn})",
    "send.preview": "{usdc} → {mxn} después de comisión",
    "send.to": "A",
    "send.minimum": "Mínimo",
    "send.feeLabel": "Comisión",
    "send.feeValue": "0.50 % del monto",
    "send.quote": "Cotizar",
    "send.footnote": "La cotización fija el tipo de cambio por 60 segundos.",
    "send.youSendTag": "Envías",
    "send.fee": "Comisión",
    "send.rate": "Tipo de cambio",
    "send.receives": "Recibes",
    "send.rail": "Riel",
    "send.quoteTtl": "La cotización vence en {s} s",
    "send.quoteExpired": "La cotización venció: edita y cotiza de nuevo.",
    "send.confirm": "Confirmar con Face ID",
    "send.prompt": "Confirmar envío a tu banco",
    "send.confirmFootnote": "Face ID firma la salida de USDC de tu wallet hacia Bridge, que liquida por SPEI.",

    // ── recibo (pantalla 15) ──
    "receipt.status.submitted.tag": "Enviado",
    "receipt.status.submitted.title": "Bridge está liquidando por SPEI",
    "receipt.status.submitted.body": "Suele tardar segundos. Puedes salir de esta pantalla.",
    "receipt.status.completed.tag": "Completado",
    "receipt.status.completed.title": "Tu dinero llegó al banco",
    "receipt.status.completed.body": "Guarda el folio por si tu banco te lo pide.",
    "receipt.status.failed.tag": "Falló",
    "receipt.status.failed.title": "El envío no se completó",
    "receipt.status.failed.body": "Tu saldo regresó a tu wallet.",
    "receipt.folio": "Folio",
    "receipt.created": "Enviado",
    "receipt.completed": "Liquidado",
    "receipt.shareMessage": "Recibo {folio}: {usdc} → {mxn} a {bank} ····{last4}. powered by Relayer",
    "receipt.missingTitle": "No encontramos ese recibo",
    "receipt.missingBody": "Vuelve al saldo y ábrelo desde la lista.",

    // ── ajustes (pantalla 16) ──
    "settings.kvStatus": "Módulo",
    "settings.kvWallet": "Wallet",
    "settings.kvCard": "Tarjeta",
    "settings.kvBank": "Cuenta",
    "settings.export": "Exportar movimientos",
    "settings.exportSub": "{n} movimientos · CSV",
    "settings.exportTitle": "Movimientos de Recibo",
    "settings.support": "Soporte",
    "settings.supportSub": "Escríbenos; respondemos en horas hábiles",
    "settings.deactivate": "Desactivar Recibo",
    "settings.deactivateTitle": "¿Desactivar Recibo?",
    "settings.deactivateBody": "Tu wallet sigue siendo tuya on-chain, pero Acme dejará de depositar aquí y la tarjeta se cancela.",
    "settings.deactivateConfirm": "Desactivar",
    "settings.footnote": "Mantén presionado «powered by Relayer» cinco segundos para abrir el panel de demo.",

    // ── panel de demo ──
    "demo.title": "Panel de demo",
    "demo.body": "Nada de esto existe en producto. Cambia el escenario del mock, simula pagos y mira lo que recibiría la empresa.",
    "demo.scenarioTag": "Escenario",
    "scenario.happy": "Camino feliz",
    "scenario.happy.hint": "Todo se aprueba; el envío se completa.",
    "scenario.kyc_rejected": "KYC rechazado",
    "scenario.kyc_rejected.hint": "La verificación vuelve rechazada con dos razones; se puede reintentar.",
    "scenario.cards_unavailable_region": "Tarjeta no disponible",
    "scenario.cards_unavailable_region.hint": "Pedir tarjeta responde cards_unavailable_region.",
    "scenario.endorsement_expired": "Endorsement vencido",
    "scenario.endorsement_expired.hint": "El KYC se aprueba «hace 25 h»: pedir tarjeta exige confirmar tus datos.",
    "scenario.send_failed": "Envío fallido",
    "scenario.send_failed.hint": "El SPEI falla después de enviado y el saldo regresa.",
    "scenario.bank_verification_failed": "CLABE no verificada",
    "scenario.bank_verification_failed.hint": "La titularidad de la cuenta no coincide.",
    "demo.stateTag": "Estado del módulo",
    "demo.kvBalance": "Saldo",
    "demo.kvFaceId": "Face ID",
    "demo.faceIdSimulated": "No inscrito · se simula",
    "demo.kvPush": "Notificaciones",
    "demo.payTag": "Simular pago de Acme",
    "demo.payAmount": "Monto · MXN",
    "demo.payConcept": "Concepto",
    "demo.payReference": "Referencia",
    "demo.payCta": "Depositar",
    "demo.payNeedsActive": "Activa el módulo primero: el depósito necesita una wallet.",
    "demo.eventsTag": "Lo que recibiría Acme (webhooks)",
    "demo.noEvents": "Todavía no hay eventos.",
    "demo.reset": "Reiniciar demo",
    "demo.resetTitle": "¿Reiniciar la demo?",
    "demo.resetBody": "Borra el estado del módulo, los movimientos y los eventos. El escenario se conserva.",
    "demo.resetConfirm": "Reiniciar",
    "demo.goBenefits": "Ir a Beneficios",
  } as const;

  export type Key = keyof typeof es;

  export const isKey = (k: string): k is Key => k in es;

  /** Copy por clave; `{var}` se sustituye con `vars`; una var que no viene se deja tal cual. */
  export function t(key: Key, vars?: Record<string, string | number>): string {
    const s: string = es[key];
    return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
  }

  /** Razón de rechazo del KYC (código de Bridge) → copy; si no la conocemos, el código. */
  export function reasonCopy(code: string): string {
    const k = `kyc.reason.${code}`;
    return isKey(k) ? t(k) : code;
  }
  ```

- [ ] **Paso 4: correr** `npx jest __tests__/i18n.test.ts </dev/null` → verde; `npm run typecheck </dev/null` → 0.

- [ ] **Paso 5: commit.**

  ```bash
  git add src/i18n/es.ts __tests__/i18n.test.ts
  git commit -m "feat(i18n): Spanish copy for the host app and the Recibo module with t()" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

---

# Fase D — Navegación y dominio (todo puro, todo testeado)

### Task 6: tabla de rutas, gate por módulo y deep link

**Files:**
- Create: `src/navigation/screens.ts`, `src/navigation/routes.ts`, `src/navigation/deepLink.ts`, `src/store.ts`
- Create: `__tests__/routes.test.ts`, `__tests__/deepLink.test.ts`, `__tests__/store.test.ts`

`store.ts` importa `t` de `src/i18n/es.ts` (Task 5) para `headerFor`; si se ejecuta esta tarea antes que la 5, las claves `screen.*` ya están definidas allí.

- [ ] **Paso 1: tests primero.** `__tests__/routes.test.ts`:

  ```ts
  import { gateTarget, SCREENS_ALL, screenOfRoute, TAB_OF, TAB_ORDER, TAB_ROOT } from "../src/navigation/routes";
  import { CAN_BACK, HOST_SCREENS, MODULE_GATED, MODULE_OPEN, MODULE_SCREENS, ROOT_OF, SHOW_TABS } from "../src/navigation/screens";

  test("tres pestañas; cada pantalla pertenece a una; el módulo vive bajo Beneficios", () => {
    expect(TAB_ORDER).toEqual(["HomeTab", "BenefitsTab", "ProfileTab"]);
    expect(SCREENS_ALL).toHaveLength(20);
    expect(SCREENS_ALL).toEqual([...HOST_SCREENS, ...MODULE_SCREENS]);
    for (const s of SCREENS_ALL) expect(ROOT_OF[s]).toBe(TAB_ROOT[TAB_OF[s]]);
    for (const s of MODULE_SCREENS) expect(TAB_OF[s]).toBe("BenefitsTab");
    expect(TAB_OF.home).toBe("HomeTab");
    expect(TAB_OF.profile).toBe("ProfileTab");
  });

  test("las 17 pantallas del módulo en el orden del spec; tabs sólo en las raíces; back en todo el módulo", () => {
    expect(MODULE_SCREENS).toEqual([
      "activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "balance", "deposit",
      "cardRequest", "cardAuthorize", "card", "addToWallet", "bankAccount", "send", "sendReceipt", "settings", "demoPanel",
    ]);
    expect([...SHOW_TABS]).toEqual(["home", "benefits", "profile"]);
    expect([...CAN_BACK]).toEqual([...MODULE_SCREENS]);
  });

  test("abiertas sin módulo activo: el alta y el panel; el resto exige módulo activo", () => {
    expect([...MODULE_OPEN]).toEqual(["activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "demoPanel"]);
    expect([...MODULE_GATED]).toEqual(["balance", "deposit", "cardRequest", "cardAuthorize", "card", "addToWallet", "bankAccount", "send", "sendReceipt", "settings"]);
  });

  test("screenOfRoute ignora navegadores", () => {
    expect(screenOfRoute("balance")).toBe("balance");
    expect(screenOfRoute("Tabs")).toBeNull();
    expect(screenOfRoute("BenefitsTab")).toBeNull();
    expect(screenOfRoute(undefined)).toBeNull();
  });

  test("gateTarget: sin módulo activo, recibo/* gated manda a activate recordando el destino", () => {
    expect(gateTarget(false, "balance")).toEqual({ screen: "activate", next: "balance" });
    expect(gateTarget(false, "send")).toEqual({ screen: "activate", next: "send" });
    expect(gateTarget(true, "balance")).toEqual({ screen: "balance" });
    expect(gateTarget(false, "terms")).toEqual({ screen: "terms" });
    expect(gateTarget(false, "demoPanel")).toEqual({ screen: "demoPanel" });
    expect(gateTarget(false, "home")).toEqual({ screen: "home" });
    for (const s of MODULE_GATED) expect(gateTarget(false, s).screen).toBe("activate");
    for (const s of MODULE_OPEN) expect(gateTarget(false, s).screen).toBe(s);
  });
  ```

  `__tests__/deepLink.test.ts`:

  ```ts
  import { KYC_RETURN_URL, parseDeepLink } from "../src/navigation/deepLink";

  test("el regreso del KYC es relayermobiledemo://recibo/kyc-return (con o sin query)", () => {
    expect(KYC_RETURN_URL).toBe("relayermobiledemo://recibo/kyc-return");
    expect(parseDeepLink(KYC_RETURN_URL)).toEqual({ kind: "kyc-return" });
    expect(parseDeepLink("relayermobiledemo://recibo/kyc-return?status=complete")).toEqual({ kind: "kyc-return" });
    expect(parseDeepLink("relayermobiledemo://recibo/kyc-return/")).toEqual({ kind: "kyc-return" });
  });

  test("todo lo demás se ignora", () => {
    expect(parseDeepLink("relayermobiledemo://recibo/otra")).toBeNull();
    expect(parseDeepLink("https://relayer.fi/recibo/kyc-return")).toBeNull();
    expect(parseDeepLink("")).toBeNull();
    expect(parseDeepLink(null)).toBeNull();
    expect(parseDeepLink(undefined)).toBeNull();
  });
  ```

  `__tests__/store.test.ts`:

  ```ts
  import { SCREENS_ALL } from "../src/navigation/routes";
  import { headerFor, INITIAL } from "../src/store";

  test("toda pantalla tiene título; las raíces no llevan subtítulo", () => {
    for (const s of SCREENS_ALL) expect(headerFor(s)[0].length).toBeGreaterThan(0);
    expect(headerFor("home")).toEqual(["Inicio", ""]);
    expect(headerFor("benefits")).toEqual(["Beneficios", ""]);
    expect(headerFor("profile")).toEqual(["Perfil", ""]);
    expect(headerFor("balance")).toEqual(["Recibo", "Saldo · USDC en Base"]);
    expect(headerFor("demoPanel")).toEqual(["Panel de demo", "Sólo para la demo"]);
  });

  test("el store arranca vacío", () => {
    expect(INITIAL).toEqual({});
  });
  ```

  Correr: `npx jest __tests__/routes.test.ts __tests__/deepLink.test.ts __tests__/store.test.ts </dev/null` → fallan.

- [ ] **Paso 2: `src/navigation/screens.ts`:**

  ```ts
  // Pantallas y conjuntos puros (sin react-native). store.ts los re-exporta.

  export type HostScreen = "home" | "benefits" | "profile";
  export type ModuleScreen =
    | "activate" | "terms" | "kyc" | "kycPending" | "kycRejected" | "passkey"
    | "balance" | "deposit" | "cardRequest" | "cardAuthorize" | "card" | "addToWallet"
    | "bankAccount" | "send" | "sendReceipt" | "settings" | "demoPanel";
  export type Screen = HostScreen | ModuleScreen;

  export const HOST_SCREENS: readonly HostScreen[] = ["home", "benefits", "profile"];
  /** Orden del flujo del spec (Pantallas 2–16) más el panel oculto. */
  export const MODULE_SCREENS: readonly ModuleScreen[] = [
    "activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "balance", "deposit",
    "cardRequest", "cardAuthorize", "card", "addToWallet", "bankAccount", "send", "sendReceipt", "settings", "demoPanel",
  ];
  /** Se llega sin módulo activo: el alta (activar → términos → KYC → passkey) y el panel de demo. */
  export const MODULE_OPEN: readonly ModuleScreen[] = ["activate", "terms", "kyc", "kycPending", "kycRejected", "passkey", "demoPanel"];
  /** Exigen módulo activo: el gate manda a `activate` recordando el destino (spec «Navegación»). */
  export const MODULE_GATED: readonly ModuleScreen[] = MODULE_SCREENS.filter((s) => !MODULE_OPEN.includes(s));

  /** Raíces con tab bar. */
  export const SHOW_TABS: readonly Screen[] = HOST_SCREENS;
  /** Pantallas con botón ← (todas las del módulo: viven apiladas sobre Beneficios). */
  export const CAN_BACK: readonly Screen[] = MODULE_SCREENS;

  /** Pestaña que se ilumina en cada pantalla. */
  export const ROOT_OF: Record<Screen, HostScreen> = {
    home: "home", benefits: "benefits", profile: "profile",
    activate: "benefits", terms: "benefits", kyc: "benefits", kycPending: "benefits", kycRejected: "benefits", passkey: "benefits",
    balance: "benefits", deposit: "benefits", cardRequest: "benefits", cardAuthorize: "benefits", card: "benefits", addToWallet: "benefits",
    bankAccount: "benefits", send: "benefits", sendReceipt: "benefits", settings: "benefits", demoPanel: "benefits",
  };
  ```

- [ ] **Paso 3: `src/navigation/routes.ts`:**

  ```ts
  import type { NavigatorScreenParams } from "@react-navigation/native";
  import { HOST_SCREENS, MODULE_GATED, MODULE_SCREENS, type ModuleScreen, type Screen } from "./screens";

  // Tabla de rutas de react-navigation. Pura: sin react-native.

  export type TabName = "HomeTab" | "BenefitsTab" | "ProfileTab";

  export type HomeStackParamList = { home: undefined };
  export type BenefitsStackParamList = Record<"benefits" | ModuleScreen, undefined>;
  export type ProfileStackParamList = { profile: undefined };
  export type TabParamList = {
    HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
    BenefitsTab: NavigatorScreenParams<BenefitsStackParamList> | undefined;
    ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
  };
  export type RootParamList = { Tabs: NavigatorScreenParams<TabParamList> | undefined };

  export const TAB_ORDER: readonly TabName[] = ["HomeTab", "BenefitsTab", "ProfileTab"];

  export const TAB_ROOT: Record<TabName, Screen> = { HomeTab: "home", BenefitsTab: "benefits", ProfileTab: "profile" };

  export const TAB_OF: Record<Screen, TabName> = {
    home: "HomeTab", benefits: "BenefitsTab", profile: "ProfileTab",
    ...(Object.fromEntries(MODULE_SCREENS.map((s) => [s, "BenefitsTab"])) as Record<ModuleScreen, TabName>),
  };

  export const SCREENS_ALL: readonly Screen[] = [...HOST_SCREENS, ...MODULE_SCREENS];

  /** Nombre de ruta enfocada → pantalla; null para navegadores (`Tabs`, `*Tab`) o sin estado. */
  export function screenOfRoute(name: string | undefined): Screen | null {
    return name !== undefined && (SCREENS_ALL as readonly string[]).includes(name) ? (name as Screen) : null;
  }

  /** Gate del módulo: sin módulo activo, las pantallas de MODULE_GATED pasan por `activate` recordando el destino. */
  export function gateTarget(moduleActive: boolean, target: Screen): { screen: Screen; next?: ModuleScreen } {
    if (moduleActive || !(MODULE_GATED as readonly Screen[]).includes(target)) return { screen: target };
    return { screen: "activate", next: target as ModuleScreen };
  }
  ```

- [ ] **Paso 4: `src/navigation/deepLink.ts`:**

  ```ts
  // Deep link de regreso del KYC (spec «Navegación»): en la demo lo dispara la pantalla simulada de Persona; en la fase real,
  // el `redirect_uri` del KYC link de Bridge. Puro.
  export const SCHEME = "relayermobiledemo";
  export const KYC_RETURN_URL = `${SCHEME}://recibo/kyc-return`;

  export type DeepLink = { kind: "kyc-return" };

  export function parseDeepLink(url: string | null | undefined): DeepLink | null {
    if (!url) return null;
    const m = /^relayermobiledemo:\/\/recibo\/([a-z-]+)\/?(\?.*)?$/.exec(url);
    if (!m) return null;
    return m[1] === "kyc-return" ? { kind: "kyc-return" } : null;
  }
  ```

- [ ] **Paso 5: `src/store.ts`:**

  ```ts
  import { useCallback, useState } from "react";
  import { t } from "./i18n/es";
  import { goBackIfCan, navigateTo, switchTab as switchTabRoute } from "./navigation/ref";
  import { gateTarget, type TabName } from "./navigation/routes";
  import type { ModuleScreen, Screen } from "./navigation/screens";

  export { CAN_BACK, HOST_SCREENS, MODULE_GATED, MODULE_OPEN, MODULE_SCREENS, type ModuleScreen, ROOT_OF, type Screen, SHOW_TABS } from "./navigation/screens";

  /** Sólo datos: la pila y la pantalla activa viven en react-navigation. */
  export type StoreState = {
    /** Movimiento abierto en `deposit`. */
    depositId?: string;
    /** Recibo abierto en `sendReceipt`. */
    receiptId?: string;
    /** Destino que el gate retuvo (`activate` lo lleva al terminar el alta). */
    next?: ModuleScreen;
  };
  export type Patch = Partial<StoreState>;
  export const INITIAL: StoreState = {};

  /** Título y subtítulo de la cabecera propia (Page.tsx), desde i18n. */
  export function headerFor(screen: Screen): [string, string] {
    return [t(`screen.${screen}.title`), t(`screen.${screen}.sub`)];
  }

  export type AppStore = {
    S: StoreState;
    set: (patch: Patch) => void;
    nav: (screen: Screen, patch?: Patch) => void;
    back: () => void;
    /** Gate: con módulo activo navega; sin él, va a `activate` y guarda `next`. */
    requireModule: (target: Screen, patch?: Patch) => void;
    /** Tab bar: enfoca la pestaña conservando su pila. */
    switchTab: (tab: TabName) => void;
    /** Pantalla enfocada según react-navigation. */
    scr: Screen;
    moduleActive: boolean;
  };

  export function useAppStore({ moduleActive, scr }: { moduleActive: boolean; scr: Screen }): AppStore {
    const [S, setS] = useState<StoreState>(INITIAL);
    const set = useCallback((patch: Patch) => setS((s) => ({ ...s, ...patch })), []);
    const nav = useCallback((screen: Screen, patch?: Patch) => { if (patch) set(patch); navigateTo(screen); }, [set]);
    const back = useCallback(() => goBackIfCan(), []);
    const requireModule = useCallback((target: Screen, patch?: Patch) => {
      const g = gateTarget(moduleActive, target);
      nav(g.screen, g.next ? { ...patch, next: g.next } : patch);
    }, [moduleActive, nav]);
    const switchTab = useCallback((tab: TabName) => switchTabRoute(tab), []);
    return { S, set, nav, back, requireModule, switchTab, scr, moduleActive };
  }
  ```

  `ref.ts` llega en la Task 10; para que `store.ts` compile ya, crear ahora `src/navigation/ref.ts` con su versión definitiva (es puro adaptador y no importa pantallas):

  ```ts
  import { createNavigationContainerRef } from "@react-navigation/native";
  import { type RootParamList, screenOfRoute, TAB_OF, type TabName, TAB_ROOT } from "./routes";
  import type { Screen } from "./screens";

  // Adaptador de navegación (heredado de pickler): las pantallas hablan en `Screen`; aquí se traduce a rutas anidadas.
  // react-navigation v7: `navigate` a una ruta ya presente la APILA de nuevo; sólo vuelve a la existente con `pop: true`.
  // `initial: false` en pantallas no raíz: si la pila se monta en frío, la pantalla pedida se apila SOBRE la raíz de la pestaña.
  export const navigationRef = createNavigationContainerRef<RootParamList>();

  let pending: (() => void)[] = [];

  function run(fn: () => void): void {
    if (navigationRef.isReady()) fn();
    else pending.push(fn);
  }

  /** Lo llama `onReady` del container: aplica lo encolado antes de que estuviera listo (deep link en frío). */
  export function flushPending(): void {
    const q = pending;
    pending = [];
    for (const fn of q) fn();
  }

  /** Enfoca la pestaña dueña y apila (o vuelve a) la pantalla. */
  export function navigateTo(screen: Screen): void {
    run(() => {
      const tab = TAB_OF[screen];
      const nested = screen === TAB_ROOT[tab] ? { screen, pop: true } : { screen, initial: false, pop: true };
      navigationRef.navigate("Tabs", { screen: tab, params: nested } as never, { pop: true });
    });
  }

  /** Sólo enfoca la pestaña (tab bar): su pila se conserva tal cual. */
  export function switchTab(tab: TabName): void {
    run(() => navigationRef.navigate("Tabs", { screen: tab }, { pop: true }));
  }

  export function goBackIfCan(): void {
    run(() => { if (navigationRef.canGoBack()) navigationRef.goBack(); });
  }

  export function currentScreen(): Screen | null {
    return navigationRef.isReady() ? screenOfRoute(navigationRef.getCurrentRoute()?.name) : null;
  }
  ```

- [ ] **Paso 6: correr.** `npx jest __tests__/routes.test.ts __tests__/deepLink.test.ts __tests__/store.test.ts </dev/null` → verde (el de store requiere la Task 5 hecha). `npm run typecheck </dev/null` → 0 errores.

- [ ] **Paso 7: commit.**

  ```bash
  git add src/navigation/screens.ts src/navigation/routes.ts src/navigation/deepLink.ts src/navigation/ref.ts src/store.ts __tests__/routes.test.ts __tests__/deepLink.test.ts __tests__/store.test.ts
  git commit -m "feat(nav): host tabs + Recibo stack table, module gate and KYC deep link (pure, tested)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 7: tipos del módulo, máquina de estados y dinero

**Files:**
- Create: `src/relayer/types.ts`, `src/relayer/state.ts`, `src/relayer/money.ts`
- Create: `__tests__/state.test.ts`, `__tests__/money.test.ts`

- [ ] **Paso 1: `src/relayer/types.ts`** (sólo tipos; lo importan pantallas, mock y docs):

  ```ts
  // Tipos del módulo Recibo: lo que RelayerModuleApi devuelve y lo que la máquina de estados mueve (spec «Máquina de estados»).
  // Montos en CENTAVOS enteros: USDC se muestra con 2 decimales; MXN con 2. Tiempos en ms epoch.

  export type ModuleStatus = "off" | "terms_pending" | "kyc" | "wallet_ready" | "active";
  export type KycStatus = "not_started" | "incomplete" | "under_review" | "approved" | "rejected";
  export type WalletStatus = "none" | "passkey_created" | "address_ready";
  export type CardStatus = "none" | "requested" | "endorsement_pending" | "active" | "frozen" | "endorsement_expired";
  export type PassStatus = "not_added" | "added";
  export type BankStatus = "none" | "pending_verification" | "verified" | "failed";
  export type SendStatus = "idle" | "quoting" | "confirming" | "submitted" | "completed" | "failed";
  export type WalletProvider = "apple" | "google";

  export type ModuleState = {
    module: ModuleStatus;
    kyc: { status: KycStatus; approvedAt: number | null; rejectionReasons: readonly string[] };
    wallet: { status: WalletStatus; address: string | null; chain: "base" };
    /** `authorizedAt`: la autorización on-chain única (D3); la tarjeta gasta sólo después de ella. */
    card: { status: CardStatus; last4: string | null; expiry: string | null; authorizedAt: number | null };
    pass: { status: PassStatus; provider: WalletProvider | null };
    bank: { status: BankStatus; clabe: string | null; bankName: string | null; ownerName: string | null };
    send: { status: SendStatus; quoteId: string | null; receiptId: string | null };
    balanceUsdcCents: number;
  };

  export type MovementKind = "deposit" | "withdrawal";
  export type MovementStatus = "completed" | "pending" | "failed";
  export type Movement = {
    id: string; kind: MovementKind; status: MovementStatus; amountUsdcCents: number; at: number;
    /** Depósito: quién pagó, concepto y referencia que mandó la empresa (eco en `deposit.received`), hash on-chain. */
    fromLabel?: string; concept?: string; reference?: string; txHash?: string; amountMxnCents?: number;
    /** Retiro: recibo asociado. */
    receiptId?: string;
  };

  export type Balance = { usdcCents: number; mxnCents: number; rate: number };
  export type KycLinks = { tosLink: string; kycLink: string; redirectUri: string };
  export type CardDetails = ModuleState["card"] & { holder: string; number: string | null; cvv: string | null };
  export type BankAccount = ModuleState["bank"];
  export type Quote = { id: string; amountUsdcCents: number; feeUsdcCents: number; netUsdcCents: number; amountMxnCents: number; rate: number; expiresAt: number };
  export type ReceiptStatus = "submitted" | "completed" | "failed";
  export type Receipt = {
    id: string; folio: string; status: ReceiptStatus; amountUsdcCents: number; feeUsdcCents: number; amountMxnCents: number; rate: number;
    bankName: string; clabeLast4: string; createdAt: number; completedAt: number | null; failureCode: RelayerErrorCode | null;
  };

  export type EventType = "module.activated" | "kyc.approved" | "kyc.rejected" | "wallet.ready" | "card.issued" | "deposit.received" | "withdrawal.completed" | "module.deactivated";
  export type ModuleEvent = { id: string; type: EventType; at: number; payload: Record<string, string | number | null> };

  /** Todo lo que `useModule` entrega a las pantallas en una sola foto. */
  export type ModuleSnapshot = { state: ModuleState; movements: readonly Movement[]; events: readonly ModuleEvent[] };

  export type RelayerErrorCode =
    | "invalid_transition" | "kyc_rejected" | "cards_unavailable_region" | "endorsement_expired" | "send_failed"
    | "bank_verification_failed" | "bank_not_verified" | "insufficient_balance" | "below_minimum" | "card_not_active"
    | "clabe_invalid" | "quote_expired" | "passkey_cancelled" | "not_found";

  /** Error tipado del API (spec «Capa mock»): la UI lo traduce con i18n/errors.ts. */
  export class RelayerError extends Error {
    readonly code: RelayerErrorCode;
    constructor(code: RelayerErrorCode, message?: string) {
      super(message ?? code);
      this.name = "RelayerError";
      this.code = code;
    }
  }
  export const isRelayerError = (e: unknown): e is RelayerError => e instanceof RelayerError;
  ```

- [ ] **Paso 2: test de la máquina** `__tests__/state.test.ts` (debe fallar hasta el paso 3):

  ```ts
  import * as M from "../src/relayer/state";
  import type { ModuleState, Movement } from "../src/relayer/types";

  const NOW = Date.parse("2026-11-11T12:00:00Z");
  const H = 60 * 60 * 1000;

  function unwrap(r: M.Result): ModuleState {
    if (!r.ok) throw new Error(`expected ok, got ${r.code}`);
    return r.state;
  }
  const code = (r: M.Result) => (r.ok ? "ok" : r.code);

  // Estados de referencia construidos sólo con transiciones válidas.
  const atTerms = unwrap(M.activate(M.INITIAL_STATE));
  const atKyc = unwrap(M.acceptTerms(atTerms));
  const kycIncomplete = unwrap(M.startKyc(atKyc));
  const kycReview = unwrap(M.completeKycReturn(kycIncomplete));
  const kycApproved = unwrap(M.resolveKyc(kycReview, "approved", NOW));
  const passkey = unwrap(M.passkeyCreated(kycApproved));
  const active = unwrap(M.walletReady(passkey, "0xabc"));
  const DEP: Movement = { id: "mv_1", kind: "deposit", status: "completed", amountUsdcCents: 500_00, at: NOW };
  const funded = unwrap(M.deposit(active, DEP));
  const cardRequested = unwrap(M.requestCard(funded, NOW + H));
  const cardPending = unwrap(M.cardEndorsementPending(cardRequested));
  const cardIssued = unwrap(M.cardIssued(cardPending, "4821", "09/29"));
  const cardAuthorized = unwrap(M.authorizeCard(cardIssued, NOW + 2 * H));
  const bankPending = unwrap(M.addBankAccount(cardAuthorized, "012180001234567899", "BBVA México", "Ana Torres"));
  const bankVerified = unwrap(M.resolveBank(bankPending, "verified"));
  const quoting = unwrap(M.quoteSend(bankVerified, "q_1", 100_00));
  const confirming = unwrap(M.beginConfirm(quoting, "q_1"));
  const submitted = unwrap(M.submitSend(confirming, "q_1", 100_00, "rcpt_1"));

  test("camino feliz: module off → terms_pending → kyc → wallet_ready → active", () => {
    expect([M.INITIAL_STATE.module, atTerms.module, atKyc.module, passkey.module, active.module]).toEqual(["off", "terms_pending", "kyc", "wallet_ready", "active"]);
    expect([kycIncomplete.kyc.status, kycReview.kyc.status, kycApproved.kyc.status]).toEqual(["incomplete", "under_review", "approved"]);
    expect(kycApproved.kyc.approvedAt).toBe(NOW);
    expect(active.wallet).toEqual({ status: "address_ready", address: "0xabc", chain: "base" });
    expect(funded.balanceUsdcCents).toBe(500_00);
  });

  test("transiciones inválidas del alta", () => {
    expect(code(M.activate(atTerms))).toBe("invalid_transition");
    expect(code(M.acceptTerms(M.INITIAL_STATE))).toBe("invalid_transition");
    expect(code(M.acceptTerms(atKyc))).toBe("invalid_transition");
    expect(code(M.startKyc(atTerms))).toBe("invalid_transition");
    expect(code(M.startKyc(kycReview))).toBe("invalid_transition");
    expect(code(M.completeKycReturn(atKyc))).toBe("invalid_transition");
    expect(code(M.resolveKyc(kycIncomplete, "approved", NOW))).toBe("invalid_transition");
    expect(code(M.passkeyCreated(kycReview))).toBe("invalid_transition");
    expect(code(M.passkeyCreated(active))).toBe("invalid_transition");
    expect(code(M.walletReady(kycApproved, "0x1"))).toBe("invalid_transition");
    expect(code(M.deposit(kycApproved, DEP))).toBe("invalid_transition");
  });

  test("KYC rechazado guarda razones y permite reintentar", () => {
    const rejected = unwrap(M.resolveKyc(kycReview, "rejected", NOW, ["id_document_unreadable"]));
    expect(rejected.kyc).toEqual({ status: "rejected", approvedAt: null, rejectionReasons: ["id_document_unreadable"] });
    expect(unwrap(M.startKyc(rejected)).kyc.status).toBe("incomplete");
  });

  test("tarjeta: sólo con kyc approved + wallet address_ready + card none, dentro de las 24 h", () => {
    expect(code(M.requestCard(kycApproved, NOW))).toBe("invalid_transition");
    expect(code(M.requestCard(funded, NOW + 24 * H))).toBe("ok");          // justo 24 h: vale
    expect(code(M.requestCard(funded, NOW + 24 * H + 1))).toBe("endorsement_expired");
    expect(code(M.requestCard(funded, NOW, false))).toBe("cards_unavailable_region");
    expect(code(M.requestCard(cardRequested, NOW))).toBe("invalid_transition");
    expect([cardRequested.card.status, cardPending.card.status, cardIssued.card.status]).toEqual(["requested", "endorsement_pending", "active"]);
    expect(cardIssued.card).toEqual({ status: "active", last4: "4821", expiry: "09/29", authorizedAt: null });
    expect(cardAuthorized.card.authorizedAt).toBe(NOW + 2 * H);
    expect(code(M.authorizeCard(cardAuthorized, NOW))).toBe("invalid_transition");
    expect(code(M.cardIssued(cardRequested, "1", "1"))).toBe("invalid_transition");
  });

  test("endorsement caducado: marcar → confirma tus datos → under_review → approved deja la tarjeta en none con ventana nueva", () => {
    const expired = unwrap(M.markEndorsementExpired(funded));
    expect(expired.card.status).toBe("endorsement_expired");
    expect(code(M.markEndorsementExpired(expired))).toBe("invalid_transition");
    expect(code(M.reconfirmKyc(funded))).toBe("invalid_transition");
    const review = unwrap(M.reconfirmKyc(expired));
    expect(review.kyc.status).toBe("under_review");
    expect(review.card.status).toBe("endorsement_expired");
    const again = unwrap(M.resolveKyc(review, "approved", NOW + 30 * H));
    expect(again.kyc.approvedAt).toBe(NOW + 30 * H);
    expect(again.card.status).toBe("none");
    expect(code(M.requestCard(again, NOW + 31 * H))).toBe("ok");
  });

  test("congelar/descongelar y agregar al teléfono (exige activa y autorizada)", () => {
    expect(code(M.addToWallet(cardIssued, "apple"))).toBe("card_not_active");
    const added = unwrap(M.addToWallet(cardAuthorized, "apple"));
    expect(added.pass).toEqual({ status: "added", provider: "apple" });
    expect(code(M.addToWallet(added, "google"))).toBe("invalid_transition");
    const frozen = unwrap(M.freezeCard(cardAuthorized, true));
    expect(frozen.card.status).toBe("frozen");
    expect(code(M.freezeCard(frozen, true))).toBe("invalid_transition");
    expect(code(M.addToWallet(frozen, "apple"))).toBe("card_not_active");
    expect(unwrap(M.freezeCard(frozen, false)).card.status).toBe("active");
  });

  test("cuenta bancaria: none | failed → pending_verification → verified | failed", () => {
    expect(bankPending.bank).toEqual({ status: "pending_verification", clabe: "012180001234567899", bankName: "BBVA México", ownerName: "Ana Torres" });
    expect(code(M.addBankAccount(bankPending, "1", "b", "o"))).toBe("invalid_transition");
    expect(code(M.addBankAccount(kycApproved, "1", "b", "o"))).toBe("invalid_transition");
    const failed = unwrap(M.resolveBank(bankPending, "failed"));
    expect(failed.bank.status).toBe("failed");
    expect(code(M.addBankAccount(failed, "072225009876543217", "Banorte", "Ana Torres"))).toBe("ok");
    expect(code(M.resolveBank(bankVerified, "verified"))).toBe("invalid_transition");
  });

  test("envío: precondiciones (bank verified, saldo) y ciclo quoting → confirming → submitted → completed | failed", () => {
    expect(M.canSend(bankPending, 100_00)).toBe("bank_not_verified");
    expect(M.canSend(bankVerified, 500_01)).toBe("insufficient_balance");
    expect(M.canSend(bankVerified, 500_00)).toBeNull();
    expect(code(M.quoteSend(cardAuthorized, "q", 100_00))).toBe("bank_not_verified");
    expect(quoting.send).toEqual({ status: "quoting", quoteId: "q_1", receiptId: null });
    expect(code(M.quoteSend(quoting, "q_2", 50_00))).toBe("ok");                // recotizar reemplaza
    expect(code(M.beginConfirm(quoting, "q_other"))).toBe("invalid_transition");
    expect(code(M.submitSend(quoting, "q_1", 100_00, "r"))).toBe("invalid_transition"); // sin beginConfirm
    expect(submitted.send).toEqual({ status: "submitted", quoteId: "q_1", receiptId: "rcpt_1" });
    expect(submitted.balanceUsdcCents).toBe(400_00);
    const done = unwrap(M.resolveSend(submitted, "completed", 100_00));
    expect([done.send.status, done.balanceUsdcCents]).toEqual(["completed", 400_00]);
    const failed = unwrap(M.resolveSend(submitted, "failed", 100_00));
    expect([failed.send.status, failed.balanceUsdcCents]).toEqual(["failed", 500_00]);  // reembolso
    expect(code(M.resolveSend(done, "completed", 1))).toBe("invalid_transition");
    expect(code(M.resetSend(confirming))).toBe("invalid_transition");
    expect(code(M.resetSend(submitted))).toBe("invalid_transition");
    expect(unwrap(M.resetSend(done)).send.status).toBe("idle");
    expect(unwrap(M.resetSend(quoting)).send.status).toBe("idle");
    expect(code(M.quoteSend(done, "q_3", 100_00))).toBe("ok");
  });

  test("desactivar vuelve a cero; no se puede desactivar lo que está off", () => {
    expect(unwrap(M.deactivate(bankVerified))).toEqual(M.INITIAL_STATE);
    expect(code(M.deactivate(M.INITIAL_STATE))).toBe("invalid_transition");
  });

  test("resumeScreen: a dónde vuelve «Continuar» según el estado", () => {
    expect(M.resumeScreen(M.INITIAL_STATE)).toBe("terms");
    expect(M.resumeScreen(atTerms)).toBe("terms");
    expect(M.resumeScreen(atKyc)).toBe("kyc");
    expect(M.resumeScreen(kycIncomplete)).toBe("kyc");
    expect(M.resumeScreen(kycReview)).toBe("kycPending");
    expect(M.resumeScreen(unwrap(M.resolveKyc(kycReview, "rejected", NOW)))).toBe("kycRejected");
    expect(M.resumeScreen(kycApproved)).toBe("passkey");
    expect(M.resumeScreen(passkey)).toBe("passkey");
    expect(M.resumeScreen(active)).toBe("balance");
  });
  ```

- [ ] **Paso 3: `src/relayer/state.ts`:**

  ```ts
  import type { ModuleScreen } from "../navigation/screens";
  import type { CardStatus, ModuleState, Movement, RelayerErrorCode, WalletProvider } from "./types";

  // Máquina de estados del módulo (spec «Máquina de estados»). Pura: cada transición devuelve un estado nuevo o un código.
  // La capa mock aplica estas funciones y les pone latencia; el backend real tendrá las mismas reglas del lado del servidor.

  export type Result = { ok: true; state: ModuleState } | { ok: false; code: RelayerErrorCode };
  const ok = (state: ModuleState): Result => ({ ok: true, state });
  const fail = (code: RelayerErrorCode): Result => ({ ok: false, code });

  /** D5: la tarjeta debe pedirse dentro de las 24 h posteriores a la aprobación del KYC. */
  export const ENDORSEMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

  export const INITIAL_STATE: ModuleState = {
    module: "off",
    kyc: { status: "not_started", approvedAt: null, rejectionReasons: [] },
    wallet: { status: "none", address: null, chain: "base" },
    card: { status: "none", last4: null, expiry: null, authorizedAt: null },
    pass: { status: "not_added", provider: null },
    bank: { status: "none", clabe: null, bankName: null, ownerName: null },
    send: { status: "idle", quoteId: null, receiptId: null },
    balanceUsdcCents: 0,
  };

  // ── Alta ────────────────────────────────────────────────────────────────────
  /** Beneficios → Activar: off → terms_pending. */
  export function activate(s: ModuleState): Result {
    return s.module === "off" ? ok({ ...s, module: "terms_pending" }) : fail("invalid_transition");
  }
  /** Términos de Bridge + Relayer aceptados: terms_pending → kyc. */
  export function acceptTerms(s: ModuleState): Result {
    return s.module === "terms_pending" ? ok({ ...s, module: "kyc" }) : fail("invalid_transition");
  }
  /** Abrir el KYC link: not_started | incomplete | rejected → incomplete. */
  export function startKyc(s: ModuleState): Result {
    if (s.module !== "kyc") return fail("invalid_transition");
    if (!(["not_started", "incomplete", "rejected"] as const).some((k) => k === s.kyc.status)) return fail("invalid_transition");
    return ok({ ...s, kyc: { ...s.kyc, status: "incomplete", rejectionReasons: [] } });
  }
  /** Regreso por deep link: incomplete → under_review. */
  export function completeKycReturn(s: ModuleState): Result {
    return s.kyc.status === "incomplete" ? ok({ ...s, kyc: { ...s.kyc, status: "under_review" } }) : fail("invalid_transition");
  }
  /** Veredicto de Bridge: under_review → approved (sella approved_at) | rejected (con razones). Tras un re-KYC por
   *  endorsement caducado, la tarjeta vuelve a `none` con ventana de 24 h nueva. */
  export function resolveKyc(s: ModuleState, outcome: "approved" | "rejected", now: number, reasons: readonly string[] = []): Result {
    if (s.kyc.status !== "under_review") return fail("invalid_transition");
    if (outcome === "rejected") return ok({ ...s, kyc: { status: "rejected", approvedAt: null, rejectionReasons: reasons } });
    const card = s.card.status === "endorsement_expired" ? { ...s.card, status: "none" as const } : s.card;
    return ok({ ...s, kyc: { status: "approved", approvedAt: now, rejectionReasons: [] }, card });
  }
  /** Ceremonia de passkey (Face ID): kyc approved + wallet none → passkey_created, module wallet_ready. */
  export function passkeyCreated(s: ModuleState): Result {
    if (s.module !== "kyc" || s.kyc.status !== "approved" || s.wallet.status !== "none") return fail("invalid_transition");
    return ok({ ...s, module: "wallet_ready", wallet: { ...s.wallet, status: "passkey_created" } });
  }
  /** Dirección en Base lista: passkey_created → address_ready, module active. */
  export function walletReady(s: ModuleState, address: string): Result {
    if (s.wallet.status !== "passkey_created") return fail("invalid_transition");
    return ok({ ...s, module: "active", wallet: { status: "address_ready", address, chain: "base" } });
  }

  // ── Saldo ───────────────────────────────────────────────────────────────────
  /** Depósito de la empresa a la dirección: sólo con módulo activo. */
  export function deposit(s: ModuleState, m: Movement): Result {
    if (s.module !== "active" || m.kind !== "deposit") return fail("invalid_transition");
    return ok({ ...s, balanceUsdcCents: s.balanceUsdcCents + m.amountUsdcCents });
  }

  // ── Tarjeta ─────────────────────────────────────────────────────────────────
  export function endorsementExpired(s: ModuleState, now: number): boolean {
    return s.kyc.approvedAt !== null && now - s.kyc.approvedAt > ENDORSEMENT_WINDOW_MS;
  }
  /** Pedir tarjeta: kyc approved + wallet address_ready + card none, dentro de las 24 h; `cardsAvailable` = el programa cubre el país. */
  export function requestCard(s: ModuleState, now: number, cardsAvailable = true): Result {
    if (s.module !== "active" || s.kyc.status !== "approved" || s.wallet.status !== "address_ready") return fail("invalid_transition");
    if (s.card.status !== "none") return fail("invalid_transition");
    if (!cardsAvailable) return fail("cards_unavailable_region");
    if (endorsementExpired(s, now)) return fail("endorsement_expired");
    return ok({ ...s, card: { ...s.card, status: "requested" } });
  }
  /** El mock marca la caducidad para que la UI ofrezca «confirma tus datos». */
  export function markEndorsementExpired(s: ModuleState): Result {
    return s.card.status === "none" ? ok({ ...s, card: { ...s.card, status: "endorsement_expired" } }) : fail("invalid_transition");
  }
  /** «Confirma tus datos»: endorsement_expired → kyc under_review (corto); la tarjeta espera. */
  export function reconfirmKyc(s: ModuleState): Result {
    if (s.card.status !== "endorsement_expired" || s.kyc.status !== "approved") return fail("invalid_transition");
    return ok({ ...s, kyc: { ...s.kyc, status: "under_review", approvedAt: null } });
  }
  /** Bridge pide el endorsement `cards`: requested → endorsement_pending. */
  export function cardEndorsementPending(s: ModuleState): Result {
    return s.card.status === "requested" ? ok({ ...s, card: { ...s.card, status: "endorsement_pending" } }) : fail("invalid_transition");
  }
  /** Emitida (Stripe Issuing): endorsement_pending → active, todavía sin autorizar (authorizedAt null). */
  export function cardIssued(s: ModuleState, last4: string, expiry: string): Result {
    return s.card.status === "endorsement_pending" ? ok({ ...s, card: { status: "active", last4, expiry, authorizedAt: null } }) : fail("invalid_transition");
  }
  /** Autorización on-chain única (Face ID): active sin sello → active con sello. */
  export function authorizeCard(s: ModuleState, now: number): Result {
    if (s.card.status !== "active" || s.card.authorizedAt !== null) return fail("invalid_transition");
    return ok({ ...s, card: { ...s.card, authorizedAt: now } });
  }
  export function freezeCard(s: ModuleState, frozen: boolean): Result {
    const from: CardStatus = frozen ? "active" : "frozen";
    if (s.card.status !== from) return fail("invalid_transition");
    return ok({ ...s, card: { ...s.card, status: frozen ? "frozen" : "active" } });
  }
  /** Agregar al teléfono: exige tarjeta activa y autorizada. */
  export function addToWallet(s: ModuleState, provider: WalletProvider): Result {
    if (s.card.status !== "active" || s.card.authorizedAt === null) return fail("card_not_active");
    if (s.pass.status === "added") return fail("invalid_transition");
    return ok({ ...s, pass: { status: "added", provider } });
  }

  // ── Banco ───────────────────────────────────────────────────────────────────
  /** CLABE como cuenta externa: none | failed → pending_verification (depósito de 0.01 MXN). */
  export function addBankAccount(s: ModuleState, clabe: string, bankName: string, ownerName: string): Result {
    if (s.module !== "active") return fail("invalid_transition");
    if (s.bank.status !== "none" && s.bank.status !== "failed") return fail("invalid_transition");
    return ok({ ...s, bank: { status: "pending_verification", clabe, bankName, ownerName } });
  }
  export function resolveBank(s: ModuleState, outcome: "verified" | "failed"): Result {
    return s.bank.status === "pending_verification" ? ok({ ...s, bank: { ...s.bank, status: outcome } }) : fail("invalid_transition");
  }

  // ── Envío ───────────────────────────────────────────────────────────────────
  /** Precondiciones del spec: bank verified y saldo suficiente (el mínimo de 50 MXN lo valida money.ts al cotizar). */
  export function canSend(s: ModuleState, amountUsdcCents: number): RelayerErrorCode | null {
    if (s.module !== "active") return "invalid_transition";
    if (s.bank.status !== "verified") return "bank_not_verified";
    if (amountUsdcCents > s.balanceUsdcCents) return "insufficient_balance";
    return null;
  }
  export function quoteSend(s: ModuleState, quoteId: string, amountUsdcCents: number): Result {
    const why = canSend(s, amountUsdcCents);
    if (why) return fail(why);
    if (s.send.status === "confirming" || s.send.status === "submitted") return fail("invalid_transition");
    return ok({ ...s, send: { status: "quoting", quoteId, receiptId: null } });
  }
  /** Face ID en curso / Bridge recibiendo la orden: quoting → confirming. */
  export function beginConfirm(s: ModuleState, quoteId: string): Result {
    if (s.send.status !== "quoting" || s.send.quoteId !== quoteId) return fail("invalid_transition");
    return ok({ ...s, send: { ...s.send, status: "confirming" } });
  }
  /** Bridge aceptó la transferencia: confirming → submitted; descuenta el saldo. */
  export function submitSend(s: ModuleState, quoteId: string, amountUsdcCents: number, receiptId: string): Result {
    if (s.send.status !== "confirming" || s.send.quoteId !== quoteId) return fail("invalid_transition");
    const why = canSend(s, amountUsdcCents);
    if (why) return fail(why);
    return ok({ ...s, balanceUsdcCents: s.balanceUsdcCents - amountUsdcCents, send: { status: "submitted", quoteId, receiptId } });
  }
  /** SPEI liquidó o falló (reembolsa). */
  export function resolveSend(s: ModuleState, outcome: "completed" | "failed", amountUsdcCents: number): Result {
    if (s.send.status !== "submitted") return fail("invalid_transition");
    const balanceUsdcCents = outcome === "failed" ? s.balanceUsdcCents + amountUsdcCents : s.balanceUsdcCents;
    return ok({ ...s, balanceUsdcCents, send: { ...s.send, status: outcome } });
  }
  /** Cancelar la cotización o cerrar el recibo: vuelve a idle. */
  export function resetSend(s: ModuleState): Result {
    if (s.send.status === "confirming" || s.send.status === "submitted") return fail("invalid_transition");
    return ok({ ...s, send: { status: "idle", quoteId: null, receiptId: null } });
  }

  // ── Módulo ──────────────────────────────────────────────────────────────────
  /** Ajustes → Desactivar: todo a cero (la wallet sigue siendo del usuario on-chain; la demo la olvida). */
  export function deactivate(s: ModuleState): Result {
    return s.module === "off" ? fail("invalid_transition") : ok(INITIAL_STATE);
  }

  /** A qué pantalla lleva «Continuar» desde Activar según dónde se quedó el alta. */
  export function resumeScreen(s: ModuleState): ModuleScreen {
    if (s.module === "off" || s.module === "terms_pending") return "terms";
    if (s.module === "kyc") {
      switch (s.kyc.status) {
        case "under_review": return "kycPending";
        case "rejected": return "kycRejected";
        case "approved": return "passkey";
        default: return "kyc";
      }
    }
    if (s.module === "wallet_ready") return "passkey";
    return "balance";
  }
  ```

- [ ] **Paso 4: correr** `npx jest __tests__/state.test.ts </dev/null` → verde.

- [ ] **Paso 5: test de dinero** `__tests__/money.test.ts`:

  ```ts
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
  ```

- [ ] **Paso 6: `src/relayer/money.ts`:**

  ```ts
  import type { Quote, RelayerErrorCode } from "./types";

  // Dinero del módulo: centavos enteros, tipo de cambio fijo de demo, redondeo half-up, mínimo 50 MXN (D5). Puro.

  /** MXN por USDC, fijo en la demo (el real lo cotiza Bridge). */
  export const DEMO_RATE = 17.25;
  /** Comisión del envío a banco: 0.50 % del monto, dentro del monto. */
  export const SEND_FEE_BPS = 50;
  /** Retiro mínimo: 50 MXN recibidos. */
  export const MIN_SEND_MXN_CENTS = 50_00;
  /** Vigencia de una cotización. */
  export const QUOTE_TTL_MS = 60_000;

  const roundHalfUp = (n: number): number => Math.floor(n + 0.5);
  export const usdcToMxnCents = (usdcCents: number, rate = DEMO_RATE): number => roundHalfUp(usdcCents * rate);
  export const mxnToUsdcCents = (mxnCents: number, rate = DEMO_RATE): number => roundHalfUp(mxnCents / rate);
  export const feeCents = (usdcCents: number): number => roundHalfUp((usdcCents * SEND_FEE_BPS) / 10_000);

  const group = (int: string): string => int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  /** 125000 → "1,250.00"; negativos con «−» (U+2212). */
  export function formatCents(cents: number): string {
    const abs = Math.abs(cents);
    return `${cents < 0 ? "−" : ""}${group(String(Math.floor(abs / 100)))}.${String(abs % 100).padStart(2, "0")}`;
  }
  export const formatUsdc = (cents: number): string => `${formatCents(cents)} USDC`;
  export const formatMxn = (cents: number): string => `$${formatCents(cents)} MXN`;
  export const formatRate = (rate: number): string => `1 USDC = $${rate.toFixed(2)} MXN`;

  /** "1,250.5" | "1250" | "0.05" → centavos; null si no es un monto (comas = miles; punto = decimal; máx. 2 decimales). */
  export function parseAmount(input: string): number | null {
    const s = input.trim().replace(/,/g, "");
    if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
    const [i, d = ""] = s.split(".");
    return Number(i) * 100 + Number((d + "00").slice(0, 2));
  }

  export type QuoteCheck = { ok: true; quote: Omit<Quote, "id" | "expiresAt"> } | { ok: false; code: RelayerErrorCode };

  /** Cotización pura: comisión dentro del monto; el mínimo se mide en MXN recibidos; `balanceUsdcCents` para el saldo. */
  export function quoteFor(amountUsdcCents: number, balanceUsdcCents: number, rate = DEMO_RATE): QuoteCheck {
    if (!Number.isInteger(amountUsdcCents) || amountUsdcCents <= 0) return { ok: false, code: "below_minimum" };
    const feeUsdcCents = feeCents(amountUsdcCents);
    const netUsdcCents = amountUsdcCents - feeUsdcCents;
    const amountMxnCents = usdcToMxnCents(netUsdcCents, rate);
    if (amountMxnCents < MIN_SEND_MXN_CENTS) return { ok: false, code: "below_minimum" };
    if (amountUsdcCents > balanceUsdcCents) return { ok: false, code: "insufficient_balance" };
    return { ok: true, quote: { amountUsdcCents, feeUsdcCents, netUsdcCents, amountMxnCents, rate } };
  }
  ```

- [ ] **Paso 7: correr** `npx jest __tests__/money.test.ts __tests__/state.test.ts </dev/null` → verde; `npm run typecheck </dev/null` → 0.

- [ ] **Paso 8: commit.**

  ```bash
  git add src/relayer/types.ts src/relayer/state.ts src/relayer/money.ts __tests__/state.test.ts __tests__/money.test.ts
  git commit -m "feat(relayer): module types, pure state machine (24h endorsement rule, send preconditions) and money helpers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 8: contrato `RelayerModuleApi`, escenarios, fixtures y mock en memoria

**Files:**
- Create: `src/relayer/api.ts`, `src/relayer/clabe.ts`, `src/relayer/mock/scenarios.ts`, `src/relayer/mock/fixtures.ts`, `src/relayer/mock/mockApi.ts`
- Create: `__tests__/scenarios.test.ts`, `__tests__/mockApi.test.ts`

- [ ] **Paso 1: `src/relayer/api.ts`:**

  ```ts
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
  ```

- [ ] **Paso 2: test de escenarios** `__tests__/scenarios.test.ts`:

  ```ts
  import { memoryKv } from "../src/storage/kv";
  import { DEFAULT_SCENARIO, loadScenario, parseScenario, rulesFor, saveScenario, SCENARIO_KEY, SCENARIOS } from "../src/relayer/mock/scenarios";

  test("los seis escenarios del spec; happy es el default", () => {
    expect(SCENARIOS).toEqual(["happy", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed"]);
    expect(DEFAULT_SCENARIO).toBe("happy");
  });

  test("cada escenario cambia exactamente una regla respecto a happy", () => {
    const base = rulesFor("happy");
    expect(base).toEqual({ kycOutcome: "approved", kycRejectionReasons: [], kycApprovedAgoMs: 0, cardsAvailable: true, bankOutcome: "verified", sendOutcome: "completed" });
    expect(rulesFor("kyc_rejected")).toEqual({ ...base, kycOutcome: "rejected", kycRejectionReasons: ["id_document_unreadable", "address_mismatch"] });
    expect(rulesFor("cards_unavailable_region")).toEqual({ ...base, cardsAvailable: false });
    expect(rulesFor("endorsement_expired")).toEqual({ ...base, kycApprovedAgoMs: 25 * 60 * 60 * 1000 });
    expect(rulesFor("send_failed")).toEqual({ ...base, sendOutcome: "failed" });
    expect(rulesFor("bank_verification_failed")).toEqual({ ...base, bankOutcome: "failed" });
  });

  test("parseScenario cae a happy; load/save persisten bajo relayer.scenario.v1", async () => {
    expect(parseScenario("send_failed")).toBe("send_failed");
    expect(parseScenario("nope")).toBe("happy");
    expect(parseScenario(null)).toBe("happy");
    const kv = memoryKv();
    expect(await loadScenario(kv)).toBe("happy");
    await saveScenario(kv, "kyc_rejected");
    expect(kv.data[SCENARIO_KEY]).toBe("kyc_rejected");
    expect(await loadScenario(kv)).toBe("kyc_rejected");
  });
  ```

- [ ] **Paso 3: `src/relayer/mock/scenarios.ts`:**

  ```ts
  import type { KeyValueStorage } from "../../storage/kv";

  // Escenarios conmutables desde el panel de demo (spec «Capa mock»). Cada uno cambia una regla del mock; persisten en AsyncStorage.
  export type Scenario = "happy" | "kyc_rejected" | "cards_unavailable_region" | "endorsement_expired" | "send_failed" | "bank_verification_failed";
  export const SCENARIOS: readonly Scenario[] = ["happy", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed"];
  export const DEFAULT_SCENARIO: Scenario = "happy";
  export const SCENARIO_KEY = "relayer.scenario.v1";

  export type ScenarioRules = {
    kycOutcome: "approved" | "rejected";
    kycRejectionReasons: readonly string[];
    /** endorsement_expired: el KYC se aprueba "hace 25 h", así la tarjeta cae fuera de la ventana de 24 h. */
    kycApprovedAgoMs: number;
    cardsAvailable: boolean;
    bankOutcome: "verified" | "failed";
    sendOutcome: "completed" | "failed";
  };

  export function rulesFor(s: Scenario): ScenarioRules {
    const base: ScenarioRules = { kycOutcome: "approved", kycRejectionReasons: [], kycApprovedAgoMs: 0, cardsAvailable: true, bankOutcome: "verified", sendOutcome: "completed" };
    switch (s) {
      case "happy": return base;
      case "kyc_rejected": return { ...base, kycOutcome: "rejected", kycRejectionReasons: ["id_document_unreadable", "address_mismatch"] };
      case "cards_unavailable_region": return { ...base, cardsAvailable: false };
      case "endorsement_expired": return { ...base, kycApprovedAgoMs: 25 * 60 * 60 * 1000 };
      case "send_failed": return { ...base, sendOutcome: "failed" };
      case "bank_verification_failed": return { ...base, bankOutcome: "failed" };
    }
  }

  export function parseScenario(raw: string | null | undefined): Scenario {
    return (SCENARIOS as readonly string[]).includes(raw ?? "") ? (raw as Scenario) : DEFAULT_SCENARIO;
  }
  export async function loadScenario(kv: KeyValueStorage): Promise<Scenario> {
    try { return parseScenario(await kv.getItem(SCENARIO_KEY)); } catch { return DEFAULT_SCENARIO; }
  }
  export async function saveScenario(kv: KeyValueStorage, s: Scenario): Promise<void> {
    try { await kv.setItem(SCENARIO_KEY, s); } catch { /* sin persistencia, vuelve a happy al relanzar */ }
  }
  ```

- [ ] **Paso 4: CLABE y fixtures.** `src/relayer/clabe.ts` (puro; lo usan la pantalla de cuenta bancaria y el mock, por eso no vive en `mock/`):

  ```ts
  // CLABE interbancaria (Banxico): 18 dígitos, banco en los 3 primeros, dígito de control con pesos 3,7,1. Puro.
  export const BANKS: Record<string, string> = {
    "002": "Citibanamex", "012": "BBVA México", "014": "Santander", "021": "HSBC México", "036": "Inbursa",
    "058": "Banregio", "072": "Banorte", "127": "Azteca", "646": "STP",
  };
  export const bankFor = (clabe: string): string | null => BANKS[clabe.slice(0, 3)] ?? null;

  export function clabeValid(clabe: string): boolean {
    if (!/^\d{18}$/.test(clabe)) return false;
    const w = [3, 7, 1];
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += (Number(clabe[i]) * w[i % 3]) % 10;
    return (10 - (sum % 10)) % 10 === Number(clabe[17]);
  }
  ```

  `src/relayer/mock/fixtures.ts`:

  ```ts
  import { mxnToUsdcCents } from "../money";
  import type { KycLinks, Movement } from "../types";

  // Datos fijos de la demo (D2: empleada en México). Ningún valor es real; las URLs son ilustrativas.
  export const DEMO_USER = { name: "Ana Torres", email: "ana.torres@acme.example", country: "MX", locale: "es-MX" } as const;
  export const EMPLOYER = { name: "Acme Beneficios", legalName: "Acme Beneficios S.A. de C.V." } as const;
  export const DEMO_ADDRESS = "0x7A3f9C2e4B1d8E6f0A5c3D7b9E2f4A6c8B0d1E3f";
  export const DEMO_CARD = { last4: "4821", expiry: "09/29", number: "4000 1234 5678 4821", cvv: "317" } as const;
  export const KYC_LINKS: KycLinks = {
    tosLink: "https://bridge.example/accept-terms-of-service?session_token=demo",
    kycLink: "https://bridge.example/kyc?session_token=demo&redirect_uri=relayermobiledemo%3A%2F%2Frecibo%2Fkyc-return",
    redirectUri: "relayermobiledemo://recibo/kyc-return",
  };
  /** «Simular pago de Acme» con los valores por defecto del panel y el primer depósito tras activar. */
  export const DEFAULT_DEPOSIT = { amountMxnCents: 8_500_00, concept: "Nómina · 2.ª quincena", reference: "ACME-NOM-2026-11B" } as const;

  /** Depósito de la empresa: MXN → USDC al tipo de la demo, hash pseudoaleatorio derivado del id. */
  export function employerDeposit(id: string, at: number, input: { amountMxnCents: number; concept: string; reference: string }): Movement {
    const hex = Array.from({ length: 64 }, (_, i) => "0123456789abcdef"[(id.charCodeAt(i % id.length) * (i + 7)) % 16]).join("");
    return {
      id, kind: "deposit", status: "completed", at,
      amountUsdcCents: mxnToUsdcCents(input.amountMxnCents), amountMxnCents: input.amountMxnCents,
      fromLabel: EMPLOYER.name, concept: input.concept, reference: input.reference, txHash: `0x${hex}`,
    };
  }
  ```

- [ ] **Paso 5: test del mock** `__tests__/mockApi.test.ts` (latencia cero y procesos de fondo en una cola que se vacía a mano):

  ```ts
  import { bankFor, clabeValid } from "../src/relayer/clabe";
  import { createMockApi, type MockApi } from "../src/relayer/mock/mockApi";
  import { DEFAULT_DEPOSIT } from "../src/relayer/mock/fixtures";
  import type { Scenario } from "../src/relayer/mock/scenarios";
  import { RelayerError } from "../src/relayer/types";
  import { memoryKv } from "../src/storage/kv";

  const NOW = Date.parse("2026-11-11T12:00:00Z");

  function harness(scenario: Scenario = "happy") {
    const queue: (() => void)[] = [];
    const api = createMockApi({ storage: memoryKv({ "relayer.scenario.v1": scenario }), now: () => NOW, delay: async () => {}, later: (fn) => { queue.push(fn); } });
    const flush = () => { while (queue.length) queue.shift()!(); };
    return { api, flush };
  }

  async function codeOf(p: Promise<unknown>): Promise<string> {
    try { await p; return "ok"; } catch (e) { return e instanceof RelayerError ? e.code : "other"; }
  }

  /** Alta completa hasta módulo activo (sin tarjeta ni banco). */
  async function activate(api: MockApi, flush: () => void) {
    await api.acceptTerms();
    await api.startKyc();
    await api.completeKycReturn();
    flush(); // veredicto del KYC
    await api.createPasskey();
    flush(); // primer depósito de nómina
  }

  test("CLABE: 18 dígitos con dígito de control 3-7-1; banco por prefijo", () => {
    expect(clabeValid("002010077777777771")).toBe(true);
    expect(clabeValid("012180001234567899")).toBe(true);
    expect(clabeValid("012180001234567890")).toBe(false);
    expect(clabeValid("01218000123456789")).toBe(false);
    expect(clabeValid("abc")).toBe(false);
    expect(bankFor("012180001234567899")).toBe("BBVA México");
    expect(bankFor("646180111222333443")).toBe("STP");
    expect(bankFor("999180111222333443")).toBeNull();
  });

  test("happy: alta, nómina, tarjeta, teléfono, CLABE y envío completo; eventos en orden", async () => {
    const { api, flush } = harness();
    await api.getModule(); // carga el escenario persistido
    expect(api.getScenario()).toBe("happy");
    await api.acceptTerms();
    expect((await api.getModule()).module).toBe("kyc");
    const links = await api.startKyc();
    expect(links.redirectUri).toBe("relayermobiledemo://recibo/kyc-return");
    await api.completeKycReturn();
    expect((await api.getModule()).kyc.status).toBe("under_review");
    flush();
    expect((await api.getModule()).kyc).toMatchObject({ status: "approved", approvedAt: NOW });
    const { address } = await api.createPasskey();
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect((await api.getModule()).module).toBe("active");
    flush();
    const bal = await api.getBalance();
    expect(bal).toEqual({ usdcCents: 492_75, mxnCents: 8_499_94, rate: 17.25 });
    const movs = await api.listMovements();
    expect(movs).toHaveLength(1);
    expect(movs[0]).toMatchObject({ kind: "deposit", fromLabel: "Acme Beneficios", reference: DEFAULT_DEPOSIT.reference, amountUsdcCents: 492_75 });

    await api.requestCard();
    expect((await api.getModule()).card.status).toBe("requested");
    flush();
    expect((await api.getModule()).card).toMatchObject({ status: "active", last4: "4821", authorizedAt: null });
    expect(await codeOf(api.addToWallet("apple"))).toBe("card_not_active");
    await api.authorizeCard();
    const card = await api.getCard();
    expect(card).toMatchObject({ holder: "ANA TORRES", number: "4000 1234 5678 4821", cvv: "317" });
    await api.addToWallet("apple");
    expect((await api.getModule()).pass).toEqual({ status: "added", provider: "apple" });
    await api.freezeCard(true);
    expect((await api.getModule()).card.status).toBe("frozen");
    await api.freezeCard(false);

    expect(await codeOf(api.addBankAccount("012180001234567890"))).toBe("clabe_invalid");
    const bank = await api.addBankAccount("012 1800 0123 4567 899");
    expect(bank).toMatchObject({ status: "pending_verification", bankName: "BBVA México", ownerName: "Ana Torres" });
    flush();
    expect((await api.getModule()).bank.status).toBe("verified");

    expect(await codeOf(api.quoteSend(100))).toBe("below_minimum");
    expect(await codeOf(api.quoteSend(1_000_00))).toBe("insufficient_balance");
    const quote = await api.quoteSend(100_00);
    expect(quote).toMatchObject({ amountUsdcCents: 100_00, feeUsdcCents: 50, netUsdcCents: 99_50, amountMxnCents: 1716_38, expiresAt: NOW + 60_000 });
    const receipt = await api.confirmSend(quote.id);
    expect(receipt).toMatchObject({ status: "submitted", amountMxnCents: 1716_38, bankName: "BBVA México", clabeLast4: "7899", completedAt: null });
    expect((await api.getBalance()).usdcCents).toBe(392_75);
    expect(await codeOf(api.confirmSend(quote.id))).toBe("invalid_transition");
    flush();
    expect(await api.getReceipt(receipt.id)).toMatchObject({ status: "completed", completedAt: NOW });
    expect((await api.listMovements()).map((m) => [m.kind, m.status])).toEqual([["withdrawal", "completed"], ["deposit", "completed"]]);
    expect((await api.getEvents()).map((e) => e.type)).toEqual(["kyc.approved", "module.activated", "wallet.ready", "deposit.received", "card.issued", "withdrawal.completed"]);

    await api.deactivate();
    expect((await api.getModule()).module).toBe("off");
    expect(await api.listMovements()).toEqual([]);
    expect((await api.getEvents()).at(-1)?.type).toBe("module.deactivated");
  });

  test("kyc_rejected: veredicto rechazado con razones; se puede reintentar", async () => {
    const { api, flush } = harness("kyc_rejected");
    await api.acceptTerms(); await api.startKyc(); await api.completeKycReturn(); flush();
    const s = await api.getModule();
    expect(s.kyc).toEqual({ status: "rejected", approvedAt: null, rejectionReasons: ["id_document_unreadable", "address_mismatch"] });
    expect((await api.getEvents()).map((e) => e.type)).toEqual(["kyc.rejected"]);
    expect(await codeOf(api.createPasskey())).toBe("invalid_transition");
    await api.startKyc();
    expect((await api.getModule()).kyc.status).toBe("incomplete");
  });

  test("cards_unavailable_region: requestCard falla tipado y la tarjeta sigue en none", async () => {
    const { api, flush } = harness("cards_unavailable_region");
    await activate(api, flush);
    expect(await codeOf(api.requestCard())).toBe("cards_unavailable_region");
    expect((await api.getModule()).card.status).toBe("none");
  });

  test("endorsement_expired: requestCard falla, el estado marca la caducidad, reconfirmKyc lo arregla", async () => {
    const { api, flush } = harness("endorsement_expired");
    await activate(api, flush);
    expect((await api.getModule()).kyc.approvedAt).toBe(NOW - 25 * 60 * 60 * 1000);
    expect(await codeOf(api.requestCard())).toBe("endorsement_expired");
    expect((await api.getModule()).card.status).toBe("endorsement_expired");
    await api.reconfirmKyc();
    expect((await api.getModule()).kyc.status).toBe("under_review");
    flush();
    expect((await api.getModule()).kyc).toMatchObject({ status: "approved", approvedAt: NOW });
    expect((await api.getModule()).card.status).toBe("none");
    await api.requestCard();
    expect((await api.getModule()).card.status).toBe("requested");
  });

  test("bank_verification_failed: la CLABE queda en failed y se puede volver a intentar", async () => {
    const { api, flush } = harness("bank_verification_failed");
    await activate(api, flush);
    await api.addBankAccount("072225009876543217");
    flush();
    expect((await api.getModule()).bank).toMatchObject({ status: "failed", bankName: "Banorte" });
    expect(await codeOf(api.quoteSend(100_00))).toBe("bank_not_verified");
    await api.addBankAccount("014180005556667772");
    expect((await api.getModule()).bank.status).toBe("pending_verification");
  });

  test("send_failed: el recibo termina en failed con código y el saldo regresa", async () => {
    const { api, flush } = harness("send_failed");
    await activate(api, flush);
    await api.addBankAccount("646180111222333443"); flush();
    const q = await api.quoteSend(100_00);
    const r = await api.confirmSend(q.id);
    flush();
    expect(await api.getReceipt(r.id)).toMatchObject({ status: "failed", failureCode: "send_failed" });
    expect((await api.getBalance()).usdcCents).toBe(492_75);
    expect((await api.listMovements())[0]).toMatchObject({ kind: "withdrawal", status: "failed" });
    expect((await api.getEvents()).some((e) => e.type === "withdrawal.completed")).toBe(false);
  });

  test("simular pago de Acme: crea el movimiento, suma saldo y emite deposit.received con la referencia", async () => {
    const { api, flush } = harness();
    await activate(api, flush);
    const m = await api.simulateEmployerDeposit({ amountMxnCents: 1_000_00, concept: "Bono", reference: "ACME-BONO-1" });
    expect(m).toMatchObject({ kind: "deposit", amountUsdcCents: 57_97, reference: "ACME-BONO-1", concept: "Bono" });
    expect((await api.getBalance()).usdcCents).toBe(492_75 + 57_97);
    expect((await api.getEvents()).at(-1)).toMatchObject({ type: "deposit.received", payload: { reference: "ACME-BONO-1", amount_usdc_cents: 57_97 } });
  });

  test("setScenario persiste; reset vuelve a cero; subscribe recibe cada cambio", async () => {
    const kv = memoryKv();
    const api = createMockApi({ storage: kv, now: () => NOW, delay: async () => {}, later: (fn) => fn() });
    const seen: string[] = [];
    const off = api.subscribe((s) => { seen.push(s.state.module); });
    await api.setScenario("send_failed");
    expect(kv.data["relayer.scenario.v1"]).toBe("send_failed");
    expect(api.getScenario()).toBe("send_failed");
    await api.acceptTerms();
    expect(seen).toContain("kyc");
    await api.reset();
    expect(api.getSnapshot()).toEqual({ state: expect.objectContaining({ module: "off" }), movements: [], events: [] });
    off();
  });
  ```

- [ ] **Paso 6: `src/relayer/mock/mockApi.ts`:**

  ```ts
  import type { KeyValueStorage } from "../../storage/kv";
  import type { RelayerDemoApi, RelayerModuleApi } from "../api";
  import { DEMO_RATE, QUOTE_TTL_MS, quoteFor, usdcToMxnCents } from "../money";
  import * as M from "../state";
  import { type Balance, type EventType, type ModuleEvent, type ModuleSnapshot, type ModuleState, type Movement, type Quote, type Receipt, RelayerError } from "../types";
  import { bankFor, clabeValid } from "../clabe";
  import { DEFAULT_DEPOSIT, DEMO_ADDRESS, DEMO_CARD, DEMO_USER, employerDeposit, KYC_LINKS } from "./fixtures";
  import { DEFAULT_SCENARIO, loadScenario, rulesFor, saveScenario, type Scenario } from "./scenarios";

  // Implementación en memoria de RelayerModuleApi (spec «Capa mock»): latencias 300–1200 ms por llamada, procesos de fondo
  // (veredicto del KYC, endorsement, verificación de CLABE, liquidación SPEI) con `later`, y errores tipados RelayerError.
  // Todo inyectable para los tests: `now`, `delay`, `later`, `storage`.

  export type MockApi = RelayerModuleApi & RelayerDemoApi;
  export type MockOptions = {
    storage: KeyValueStorage;
    now?: () => number;
    /** Latencia de cada llamada. */
    delay?: () => Promise<void>;
    /** Procesos de fondo. */
    later?: (fn: () => void, ms: number) => void;
  };

  export const randomLatency = (): Promise<void> => new Promise((r) => setTimeout(r, 300 + Math.floor(Math.random() * 900)));

  /** Tiempos de los procesos de fondo (ms). */
  export const BACKGROUND_MS = { kycVerdict: 2500, reconfirmVerdict: 1500, cardEndorsement: 1500, cardIssued: 4000, firstPayroll: 4000, bankVerification: 3000, speiSettlement: 3500 } as const;

  export function createMockApi(opts: MockOptions): MockApi {
    const now = opts.now ?? Date.now;
    const delay = opts.delay ?? randomLatency;
    const later = opts.later ?? ((fn, ms) => { setTimeout(fn, ms); });

    let state: ModuleState = M.INITIAL_STATE;
    let movements: Movement[] = [];
    let events: ModuleEvent[] = [];
    const receipts = new Map<string, Receipt>();
    const quotes = new Map<string, Quote>();
    let scenario: Scenario = DEFAULT_SCENARIO;
    let seq = 0;
    const listeners = new Set<(snap: ModuleSnapshot) => void>();

    const id = (prefix: string) => `${prefix}_${String(++seq).padStart(4, "0")}`;
    // Más reciente primero; a igual instante (tests con `now` fijo), el id más alto primero.
    const snapshot = (): ModuleSnapshot => ({ state, movements: [...movements].sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)), events: [...events] });
    const emit = () => { const s = snapshot(); for (const l of listeners) l(s); };
    /** Aplica una transición o lanza el error tipado. */
    const apply = (r: M.Result): ModuleState => { if (!r.ok) throw new RelayerError(r.code); state = r.state; emit(); return state; };
    /** Procesos de fondo: una transición inválida (p. ej. el usuario desactivó mientras tanto) se ignora. */
    const applySafe = (r: M.Result): boolean => { if (!r.ok) return false; state = r.state; emit(); return true; };
    const event = (type: EventType, payload: ModuleEvent["payload"]) => { events = [...events, { id: id("evt"), type, at: now(), payload }]; };
    const rules = () => rulesFor(scenario);
    const setMovement = (mid: string, patch: Partial<Movement>) => { movements = movements.map((m) => (m.id === mid ? { ...m, ...patch } : m)); };

    const ready = loadScenario(opts.storage).then((s) => { scenario = s; emit(); });
    /** Toda llamada espera el escenario persistido y la latencia. */
    const tick = async () => { await ready; await delay(); };

    const simulateEmployerDeposit: MockApi["simulateEmployerDeposit"] = async (input) => {
      const m = employerDeposit(id("mv"), now(), input);
      apply(M.deposit(state, m));
      movements = [...movements, m];
      event("deposit.received", { movement_id: m.id, amount_usdc_cents: m.amountUsdcCents, reference: m.reference ?? null, tx_hash: m.txHash ?? null });
      emit();
      return m;
    };

    return {
      // ── RelayerModuleApi ────────────────────────────────────────────────────
      async getModule() { await tick(); return state; },

      async acceptTerms() {
        await tick();
        if (state.module === "off") apply(M.activate(state));
        return apply(M.acceptTerms(state));
      },

      async startKyc() { await tick(); apply(M.startKyc(state)); return KYC_LINKS; },

      async completeKycReturn() {
        await tick();
        const s = apply(M.completeKycReturn(state));
        later(() => {
          const r = rules();
          if (applySafe(M.resolveKyc(state, r.kycOutcome, now() - r.kycApprovedAgoMs, r.kycRejectionReasons))) {
            event(r.kycOutcome === "approved" ? "kyc.approved" : "kyc.rejected", { status: r.kycOutcome });
            emit();
          }
        }, BACKGROUND_MS.kycVerdict);
        return s;
      },

      async reconfirmKyc() {
        await tick();
        const s = apply(M.reconfirmKyc(state));
        later(() => { if (applySafe(M.resolveKyc(state, "approved", now()))) { event("kyc.approved", { status: "approved", reconfirm: 1 }); emit(); } }, BACKGROUND_MS.reconfirmVerdict);
        return s;
      },

      async createPasskey() {
        await tick();
        apply(M.passkeyCreated(state));
        await delay(); // segunda latencia: derivar la dirección
        apply(M.walletReady(state, DEMO_ADDRESS));
        event("module.activated", { end_user: DEMO_USER.email });
        event("wallet.ready", { address: DEMO_ADDRESS, chain: "base" });
        emit();
        later(() => { if (state.module === "active" && movements.length === 0) void simulateEmployerDeposit(DEFAULT_DEPOSIT); }, BACKGROUND_MS.firstPayroll);
        return { address: DEMO_ADDRESS };
      },

      async getBalance(): Promise<Balance> {
        await tick();
        return { usdcCents: state.balanceUsdcCents, mxnCents: usdcToMxnCents(state.balanceUsdcCents), rate: DEMO_RATE };
      },

      async listMovements() { await tick(); return snapshot().movements as Movement[]; },

      async requestCard() {
        await tick();
        const r = M.requestCard(state, now(), rules().cardsAvailable);
        if (!r.ok && r.code === "endorsement_expired") { applySafe(M.markEndorsementExpired(state)); throw new RelayerError(r.code); }
        const s = apply(r);
        later(() => { applySafe(M.cardEndorsementPending(state)); }, BACKGROUND_MS.cardEndorsement);
        later(() => {
          if (applySafe(M.cardIssued(state, DEMO_CARD.last4, DEMO_CARD.expiry))) { event("card.issued", { last4: DEMO_CARD.last4, expiry: DEMO_CARD.expiry }); emit(); }
        }, BACKGROUND_MS.cardIssued);
        return s;
      },

      async authorizeCard() { await tick(); return apply(M.authorizeCard(state, now())); },

      async getCard() {
        await tick();
        const issued = state.card.last4 !== null;
        return { ...state.card, holder: DEMO_USER.name.toUpperCase(), number: issued ? DEMO_CARD.number : null, cvv: issued ? DEMO_CARD.cvv : null };
      },

      async freezeCard(frozen) { await tick(); return apply(M.freezeCard(state, frozen)); },

      async addToWallet(provider) { await tick(); return apply(M.addToWallet(state, provider)); },

      async addBankAccount(clabe) {
        await tick();
        const digits = clabe.replace(/\s/g, "");
        if (!clabeValid(digits)) throw new RelayerError("clabe_invalid");
        apply(M.addBankAccount(state, digits, bankFor(digits) ?? "Banco", DEMO_USER.name));
        later(() => { applySafe(M.resolveBank(state, rules().bankOutcome)); }, BACKGROUND_MS.bankVerification);
        return state.bank;
      },

      async quoteSend(amountUsdcCents) {
        await tick();
        const q = quoteFor(amountUsdcCents, state.balanceUsdcCents);
        if (!q.ok) throw new RelayerError(q.code);
        const quote: Quote = { id: id("q"), ...q.quote, expiresAt: now() + QUOTE_TTL_MS };
        apply(M.quoteSend(state, quote.id, amountUsdcCents));
        quotes.set(quote.id, quote);
        return quote;
      },

      async confirmSend(quoteId) {
        await ready;
        const quote = quotes.get(quoteId);
        if (!quote) throw new RelayerError("not_found");
        if (now() > quote.expiresAt) throw new RelayerError("quote_expired");
        apply(M.beginConfirm(state, quoteId));
        await tick();
        const receiptId = id("rcpt");
        const receipt: Receipt = {
          id: receiptId, folio: `RCB-${String(seq).padStart(6, "0")}`, status: "submitted",
          amountUsdcCents: quote.amountUsdcCents, feeUsdcCents: quote.feeUsdcCents, amountMxnCents: quote.amountMxnCents, rate: quote.rate,
          bankName: state.bank.bankName ?? "Banco", clabeLast4: (state.bank.clabe ?? "").slice(-4), createdAt: now(), completedAt: null, failureCode: null,
        };
        receipts.set(receiptId, receipt);
        const mid = id("mv");
        movements = [...movements, { id: mid, kind: "withdrawal", status: "pending", amountUsdcCents: quote.amountUsdcCents, at: now(), receiptId }];
        apply(M.submitSend(state, quoteId, quote.amountUsdcCents, receiptId));
        later(() => {
          const outcome = rules().sendOutcome;
          if (!applySafe(M.resolveSend(state, outcome, quote.amountUsdcCents))) return;
          receipts.set(receiptId, { ...receipt, status: outcome, completedAt: now(), failureCode: outcome === "failed" ? "send_failed" : null });
          setMovement(mid, { status: outcome });
          if (outcome === "completed") event("withdrawal.completed", { receipt_id: receiptId, amount_usdc_cents: quote.amountUsdcCents, amount_mxn_cents: quote.amountMxnCents });
          emit();
        }, BACKGROUND_MS.speiSettlement);
        return receipt;
      },

      async getReceipt(rid) {
        await tick();
        const r = receipts.get(rid);
        if (!r) throw new RelayerError("not_found");
        return r;
      },

      async getEvents() { await tick(); return [...events]; },

      async deactivate() {
        await tick();
        const s = apply(M.deactivate(state));
        movements = []; receipts.clear(); quotes.clear();
        event("module.deactivated", { end_user: DEMO_USER.email });
        emit();
        return s;
      },

      // ── RelayerDemoApi ──────────────────────────────────────────────────────
      getSnapshot: snapshot,
      subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
      getScenario: () => scenario,
      async setScenario(s) { scenario = s; await saveScenario(opts.storage, s); emit(); },
      simulateEmployerDeposit,
      async reset() { state = M.INITIAL_STATE; movements = []; events = []; receipts.clear(); quotes.clear(); seq = 0; emit(); },
    };
  }
  ```

  Nota sobre la cifra de `getBalance` en el test happy: 8,500 MXN → 492.75 USDC (`mxnToUsdcCents`), y de vuelta 492.75 × 17.25 = 8,499.94 MXN: el redondeo de ida y vuelta pierde 6 centavos, y así se ve en el saldo; es correcto y el walkthrough lo menciona.

- [ ] **Paso 7: correr** `npx jest __tests__/scenarios.test.ts __tests__/mockApi.test.ts </dev/null` → verde. Si el test happy falla en los eventos, revisar el orden de `event(...)` dentro de `createPasskey` (activated antes que wallet.ready) y que `completeKycReturn` emite el veredicto en `later`. `npm run typecheck </dev/null` → 0.

- [ ] **Paso 8: commit.**

  ```bash
  git add src/relayer/api.ts src/relayer/clabe.ts src/relayer/mock/scenarios.ts src/relayer/mock/fixtures.ts src/relayer/mock/mockApi.ts __tests__/scenarios.test.ts __tests__/mockApi.test.ts
  git commit -m "feat(relayer): RelayerModuleApi contract, scenarios, fixtures and the in-memory mock with latencies" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 9: hooks (módulo, Face ID, notificaciones, acción) y helpers puros (notify, export, errors)

**Files:**
- Create: `src/hooks/useModule.ts`, `src/hooks/useFaceId.ts`, `src/hooks/useNotifications.ts`, `src/hooks/useAction.ts`, `src/hooks/useCurrentScreen.ts`, `src/hooks/useNow.ts`
- Create: `src/relayer/notify.ts`, `src/relayer/export.ts`, `src/i18n/errors.ts`
- Create: `__tests__/notify.test.ts`, `__tests__/export.test.ts`

- [ ] **Paso 1: tests primero.** `__tests__/notify.test.ts`:

  ```ts
  import { depositNotificationContent, pushTargetOf } from "../src/relayer/notify";
  import type { Movement } from "../src/relayer/types";

  const m: Movement = { id: "mv_0007", kind: "deposit", status: "completed", amountUsdcCents: 492_75, amountMxnCents: 8_500_00, at: 0, fromLabel: "Acme Beneficios", concept: "Nómina · 2.ª quincena", reference: "ACME-NOM-2026-11B" };

  test("la notificación local del depósito lleva empresa, monto y concepto, y el target al movimiento", () => {
    expect(depositNotificationContent(m)).toEqual({
      title: "Te pagó Acme Beneficios",
      body: "+492.75 USDC (≈ $8,500.00 MXN) · Nómina · 2.ª quincena",
      data: { recibo: { kind: "deposit", movementId: "mv_0007" } },
    });
  });

  test("pushTargetOf lee `recibo` de content.data y descarta lo demás", () => {
    expect(pushTargetOf({ recibo: { kind: "deposit", movementId: "mv_1" } })).toEqual({ kind: "deposit", movementId: "mv_1" });
    expect(pushTargetOf({ recibo: { kind: "otro", movementId: "mv_1" } })).toBeNull();
    expect(pushTargetOf({ pickler: { kind: "read" } })).toBeNull();
    expect(pushTargetOf(null)).toBeNull();
    expect(pushTargetOf(undefined)).toBeNull();
  });
  ```

  `__tests__/export.test.ts`:

  ```ts
  import { movementsCsv } from "../src/relayer/export";
  import type { Movement } from "../src/relayer/types";

  test("CSV con cabecera, una fila por movimiento, comas escapadas, fechas ISO", () => {
    const rows: Movement[] = [
      { id: "mv_1", kind: "deposit", status: "completed", amountUsdcCents: 492_75, amountMxnCents: 8_500_00, at: Date.UTC(2026, 10, 11, 12), fromLabel: "Acme Beneficios", concept: "Nómina, quincena", reference: "ACME-1", txHash: "0xabc" },
      { id: "mv_2", kind: "withdrawal", status: "failed", amountUsdcCents: 100_00, at: Date.UTC(2026, 10, 12, 9), receiptId: "rcpt_1" },
    ];
    expect(movementsCsv(rows)).toBe([
      "id,fecha,tipo,estado,usdc,mxn,origen,concepto,referencia,hash,recibo",
      'mv_1,2026-11-11T12:00:00.000Z,deposit,completed,492.75,8500.00,Acme Beneficios,"Nómina, quincena",ACME-1,0xabc,',
      "mv_2,2026-11-12T09:00:00.000Z,withdrawal,failed,-100.00,,,,,,rcpt_1",
    ].join("\n"));
    expect(movementsCsv([])).toBe("id,fecha,tipo,estado,usdc,mxn,origen,concepto,referencia,hash,recibo");
  });
  ```

  Correr `npx jest __tests__/notify.test.ts __tests__/export.test.ts </dev/null` → fallan.

- [ ] **Paso 2: `src/relayer/notify.ts`:**

  ```ts
  import { t } from "../i18n/es";
  import { formatCents, formatMxn } from "./money";
  import type { Movement } from "./types";

  // Notificación local del depósito (spec «Capa mock»: «simular pago de Acme … dispara una notificación local»). Puro.
  export type PushTarget = { kind: "deposit"; movementId: string };

  export function depositNotificationContent(m: Movement): { title: string; body: string; data: Record<string, unknown> } {
    const mxn = m.amountMxnCents !== undefined ? ` (≈ ${formatMxn(m.amountMxnCents)})` : "";
    return {
      title: t("notify.depositTitle", { from: m.fromLabel ?? t("common.employer") }),
      body: `+${formatCents(m.amountUsdcCents)} USDC${mxn}${m.concept ? ` · ${m.concept}` : ""}`,
      data: { recibo: { kind: "deposit", movementId: m.id } },
    };
  }

  /** Destino del tap en la notificación: `content.data.recibo`. */
  export function pushTargetOf(data: unknown): PushTarget | null {
    if (data === null || typeof data !== "object") return null;
    const r = (data as Record<string, unknown>).recibo;
    if (r === null || typeof r !== "object") return null;
    const { kind, movementId } = r as Record<string, unknown>;
    return kind === "deposit" && typeof movementId === "string" ? { kind: "deposit", movementId } : null;
  }
  ```

  `src/relayer/export.ts`:

  ```ts
  import { formatCents } from "./money";
  import type { Movement } from "./types";

  // Ajustes → Exportar movimientos: CSV plano que se comparte con la hoja nativa. Puro.
  const cell = (v: string | undefined): string => (v === undefined ? "" : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const plain = (cents: number): string => formatCents(cents).replace(/,/g, "");

  export function movementsCsv(rows: readonly Movement[]): string {
    const head = "id,fecha,tipo,estado,usdc,mxn,origen,concepto,referencia,hash,recibo";
    const lines = rows.map((m) => [
      m.id, new Date(m.at).toISOString(), m.kind, m.status,
      m.kind === "withdrawal" ? `-${plain(m.amountUsdcCents)}` : plain(m.amountUsdcCents),
      m.amountMxnCents === undefined ? "" : plain(m.amountMxnCents),
      cell(m.fromLabel), cell(m.concept), cell(m.reference), cell(m.txHash), cell(m.receiptId),
    ].join(","));
    return [head, ...lines].join("\n");
  }
  ```

  `src/i18n/errors.ts`:

  ```ts
  import { isRelayerError, type RelayerErrorCode } from "../relayer/types";
  import { t } from "./es";

  /** Copy de un error del API (RelayerError → `errors.<code>`); cualquier otro error, su mensaje o el genérico. */
  export function errorCopy(code: RelayerErrorCode): string {
    return t(`errors.${code}`);
  }
  export function describeError(e: unknown): string {
    if (isRelayerError(e)) return errorCopy(e.code);
    if (e instanceof Error && e.message) return e.message;
    return t("errors.unknown");
  }
  ```

- [ ] **Paso 3: hooks.** `src/hooks/useModule.ts`:

  ```ts
  import { useEffect, useRef, useState } from "react";
  import type { MockApi } from "../relayer/mock/mockApi";
  import type { ModuleSnapshot, Movement } from "../relayer/types";

  /** Lo que las pantallas ven del módulo: la foto del mock (estado, movimientos, eventos) y el api para actuar. */
  export type Module = ModuleSnapshot & { api: MockApi; active: boolean };

  /** Se suscribe al mock; cada depósito nuevo que aparece en la foto dispara `onDeposit` (notificación local). */
  export function useModule(api: MockApi, onDeposit: (m: Movement) => void): Module {
    const [snap, setSnap] = useState<ModuleSnapshot>(() => api.getSnapshot());
    const onDepositRef = useRef(onDeposit);
    onDepositRef.current = onDeposit;
    const seen = useRef<Set<string>>(new Set(api.getSnapshot().movements.map((m) => m.id)));
    useEffect(() => api.subscribe((s) => {
      setSnap(s);
      if (s.movements.length === 0) seen.current.clear(); // reset / desactivar: los ids vuelven a empezar
      for (const m of s.movements) {
        if (m.kind !== "deposit" || seen.current.has(m.id)) continue;
        seen.current.add(m.id);
        onDepositRef.current(m);
      }
    }), [api]);
    return { ...snap, api, active: snap.state.module === "active" };
  }
  ```

  `src/hooks/useFaceId.ts`:

  ```ts
  import * as LocalAuthentication from "expo-local-authentication";
  import { useCallback, useEffect, useState } from "react";
  import { t } from "../i18n/es";

  export type FaceId = {
    /** true si el usuario pasó Face ID (o el simulador no lo tiene inscrito: la demo no se bloquea). */
    authenticate: (reason: string) => Promise<boolean>;
    /** null mientras se consulta el hardware. */
    available: boolean | null;
  };

  /** Passkey simulada con Face ID local (D8): la ceremonia se siente real sin WebAuthn. */
  export function useFaceId(): FaceId {
    const [available, setAvailable] = useState<boolean | null>(null);
    useEffect(() => {
      let stale = false;
      Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()])
        .then(([hw, enrolled]) => { if (!stale) setAvailable(hw && enrolled); })
        .catch(() => { if (!stale) setAvailable(false); });
      return () => { stale = true; };
    }, []);
    const authenticate = useCallback(async (reason: string): Promise<boolean> => {
      if (available === false) { await new Promise((r) => setTimeout(r, 600)); return true; }
      try {
        const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: t("common.cancel"), disableDeviceFallback: false });
        return r.success;
      } catch {
        return false;
      }
    }, [available]);
    return { authenticate, available };
  }
  ```

  `src/hooks/useNotifications.ts`:

  ```ts
  import * as Notif from "expo-notifications";
  import { useCallback, useEffect, useRef, useState } from "react";
  import { depositNotificationContent, type PushTarget, pushTargetOf } from "../relayer/notify";
  import type { Movement } from "../relayer/types";

  export type PushPermission = "unknown" | "granted" | "denied" | "unavailable";
  export type Notifications = {
    permission: PushPermission;
    ensurePermission: () => Promise<boolean>;
    /** Notificación local inmediata por un depósito (también con la app en primer plano: así se ve llegar en el simulador). */
    notifyDeposit: (m: Movement) => Promise<void>;
  };

  Notif.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });

  export function useNotifications(onTarget: (t: PushTarget) => void): Notifications {
    const [permission, setPermission] = useState<PushPermission>("unknown");
    const onTargetRef = useRef(onTarget);
    onTargetRef.current = onTarget;
    const handled = useRef<string | null>(null);

    useEffect(() => {
      let stale = false;
      Notif.getPermissionsAsync()
        .then((p) => { if (stale) return; setPermission(p.granted ? "granted" : p.status === "denied" ? "denied" : "unknown"); })
        .catch(() => { if (!stale) setPermission("unavailable"); });
      return () => { stale = true; };
    }, []);

    // Tap en la notificación: en caliente (listener) y en frío (última respuesta), una sola vez por respuesta.
    useEffect(() => {
      const handle = (r: Notif.NotificationResponse | null) => {
        if (!r || handled.current === r.notification.request.identifier) return;
        handled.current = r.notification.request.identifier;
        const target = pushTargetOf(r.notification.request.content.data);
        if (target) onTargetRef.current(target);
      };
      const sub = Notif.addNotificationResponseReceivedListener(handle);
      Notif.getLastNotificationResponseAsync().then(handle).catch(() => {});
      return () => sub.remove();
    }, []);

    const ensurePermission = useCallback(async (): Promise<boolean> => {
      if (permission === "granted") return true;
      if (permission === "denied" || permission === "unavailable") return false;
      try {
        const p = await Notif.requestPermissionsAsync();
        setPermission(p.granted ? "granted" : "denied");
        return p.granted;
      } catch {
        setPermission("unavailable");
        return false;
      }
    }, [permission]);

    const notifyDeposit = useCallback(async (m: Movement) => {
      if (!(await ensurePermission())) return;
      try {
        await Notif.scheduleNotificationAsync({ identifier: `deposit-${m.id}`, content: depositNotificationContent(m), trigger: null });
      } catch (e) {
        console.warn(`notificación local: ${e instanceof Error ? e.message : e}`);
      }
    }, [ensurePermission]);

    return { permission, ensurePermission, notifyDeposit };
  }
  ```

  `src/hooks/useAction.ts`:

  ```ts
  import { useCallback, useState } from "react";
  import { describeError } from "../i18n/errors";
  import { isRelayerError, type RelayerErrorCode } from "../relayer/types";

  /** busy/error alrededor de una llamada al api: `run` devuelve el resultado o undefined si falló (el copy queda en `error`
   *  y, si fue un RelayerError, su código en `code` para que la pantalla ramifique). */
  export function useAction() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [code, setCode] = useState<RelayerErrorCode | null>(null);
    const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      setError("");
      setCode(null);
      try {
        return await fn();
      } catch (e) {
        setError(describeError(e));
        setCode(isRelayerError(e) ? e.code : null);
        return undefined;
      } finally {
        setBusy(false);
      }
    }, []);
    return { busy, error, code, run, setError };
  }
  ```

  `src/hooks/useCurrentScreen.ts`:

  ```ts
  import { useEffect, useState } from "react";
  import { currentScreen, navigationRef } from "../navigation/ref";
  import type { Screen } from "../navigation/screens";

  /** Pantalla enfocada según react-navigation. Vale "home" hasta que el container tiene estado. */
  export function useCurrentScreen(): Screen {
    const [scr, setScr] = useState<Screen>(() => currentScreen() ?? "home");
    useEffect(() => {
      const read = () => { const s = currentScreen(); if (s !== null) setScr(s); };
      read();
      return navigationRef.addListener("state", read);
    }, []);
    return scr;
  }
  ```

  `src/hooks/useNow.ts` (heredado tal cual):

  ```ts
  import { useEffect, useState } from "react";

  /** Tick de `everyMs` para cuentas regresivas (vigencia de la cotización). */
  export function useNow(everyMs: number): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), everyMs); return () => clearInterval(t); }, [everyMs]);
    return now;
  }
  ```

- [ ] **Paso 4: correr** `npx jest __tests__/notify.test.ts __tests__/export.test.ts </dev/null` → verde; `npm run typecheck </dev/null` → 0 (los hooks compilan aunque nadie los use todavía).

- [ ] **Paso 5: commit.**

  ```bash
  git add src/hooks/useModule.ts src/hooks/useFaceId.ts src/hooks/useNotifications.ts src/hooks/useAction.ts src/hooks/useCurrentScreen.ts src/hooks/useNow.ts src/relayer/notify.ts src/relayer/export.ts src/i18n/errors.ts __tests__/notify.test.ts __tests__/export.test.ts
  git commit -m "feat(hooks): useModule over the mock, Face ID passkey ceremony, local deposit notifications, CSV export" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

---

# Fase E — App anfitriona y módulo Recibo

### Task 10: cascarón navegable — Page, TabBar, Navigator, App y las tres pantallas de Acme

**Files:**
- Create: `src/ctx.ts`, `src/navigation/context.tsx`, `src/navigation/Navigator.tsx`, `src/ui/Page.tsx`, `src/ui/TabBar.tsx`
- Create: `src/host/screens/home.tsx`, `src/host/screens/benefits.tsx`, `src/host/screens/profile.tsx`
- Create: `src/relayer/screens/index.ts`, `src/relayer/screens/placeholder.tsx`, `src/relayer/format.ts`
- Rewrite: `App.tsx`

Al terminar, la app arranca a las tres pestañas de Acme; Beneficios muestra la tarjeta «Recibo · powered by Relayer» con «Activar», y cada `recibo/*` es un placeholder que las Tasks 11–15 van reemplazando (`MODULE_COMPONENTS`).

- [ ] **Paso 1: `src/ctx.ts`:**

  ```ts
  import type { FaceId } from "./hooks/useFaceId";
  import type { Module } from "./hooks/useModule";
  import type { Notifications } from "./hooks/useNotifications";
  import type { AppStore } from "./store";

  /** Todo lo que reciben Page, Navigator y las pantallas (vía withPage). */
  export type AppCtx = AppStore & {
    module: Module;
    faceId: FaceId;
    notifications: Notifications;
    /** Regreso del KYC (deep link o fallback de la pantalla simulada): completeKycReturn + ir a kycPending. */
    kycReturn: () => Promise<void>;
  };
  ```

  `src/navigation/context.tsx`:

  ```tsx
  import { createContext, type ReactNode, useContext } from "react";
  import type { AppCtx } from "../ctx";

  // AppCtx por contexto: react-navigation monta las pantallas con route/navigation; las nuestras reciben ctx como props vía withPage.
  // Vive aparte de Navigator.tsx para que Page/TabBar no importen el navegador (ciclo de módulos).
  const Ctx = createContext<AppCtx | null>(null);
  export function AppCtxProvider({ value, children }: { value: AppCtx; children: ReactNode }) {
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
  }
  export function useAppCtx(): AppCtx {
    const v = useContext(Ctx);
    if (v === null) throw new Error("useAppCtx fuera de AppCtxProvider");
    return v;
  }
  ```

  `src/relayer/format.ts` (helpers de presentación sin test: envuelven `Intl`):

  ```ts
  /** Fecha corta en es-MX: "11 nov, 12:00". */
  export const formatWhen = (at: number): string =>
    new Date(at).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  /** 0x7A3f…1E3f */
  export const shortAddress = (address: string | null): string => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—");

  /** Soporte del módulo (ilustrativo). */
  export const SUPPORT_URL = "mailto:soporte@relayer.example";
  ```

- [ ] **Paso 2: `src/ui/Page.tsx`:**

  ```tsx
  import { useNavigation } from "@react-navigation/native";
  import type { ReactElement, ReactNode } from "react";
  import { ScrollView, View } from "react-native";
  import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
  import type { AppCtx } from "../ctx";
  import { useAppCtx } from "../navigation/context";
  import { CAN_BACK, headerFor, ROOT_OF, type Screen, SHOW_TABS } from "../store";
  import { Icon, T, Touch } from "./primitives";
  import { tabBarHeight } from "./tabBarLayout";
  import { RADIUS } from "./theme";
  import { useTheme } from "./ThemeProvider";

  /** Una página de react-navigation: cabecera propia (viaja con el gesto), fondo opaco, scroll. */
  export function Page({ screen, children, headerRight }: { screen: Screen; children: ReactNode; headerRight?: ReactNode }) {
    const { c } = useTheme();
    const { back } = useAppCtx();
    const navigation = useNavigation();
    const [title, sub] = headerFor(screen);
    const isRoot = ROOT_OF[screen] === screen;
    const canBack = CAN_BACK.includes(screen) && navigation.canGoBack();
    const showTabs = SHOW_TABS.includes(screen);
    return (
      <View style={{ flex: 1, backgroundColor: c.page }}>
        <SafeAreaView style={{ flex: 1 }} edges={showTabs ? ["top"] : ["top", "bottom"]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingHorizontal: 18, paddingBottom: 12, backgroundColor: c.page }}>
            {canBack ? (
              <Touch onPress={back} accessibilityLabel="back" style={{ width: 38, height: 38, borderRadius: RADIUS.control, borderWidth: 1, borderColor: c.ink15, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }}>
                <Icon name="back" size={17} />
              </Touch>
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <T w={600} s={isRoot ? 24 : 20} lh={1.1} ls={-0.02} numberOfLines={1}>{title}</T>
              {sub ? <T w={500} s={10.5} lh={1.2} ls={0.08} mono color={c.ink55} numberOfLines={1} style={{ marginTop: 4 }}>{sub.toUpperCase()}</T> : null}
            </View>
            {headerRight}
          </View>
          <PageScroll screen={screen}>{children}</PageScroll>
        </SafeAreaView>
      </View>
    );
  }

  export function PageScroll({ screen, children }: { screen: Screen; children: ReactNode }) {
    const insets = useSafeAreaInsets();
    const showTabs = SHOW_TABS.includes(screen);
    return (
      <ScrollView
        style={{ flex: 1 }}
        // Las raíces reservan el hueco de la tab bar absoluta; las del módulo no lo necesitan.
        contentContainerStyle={{ flexGrow: 1, paddingBottom: showTabs ? tabBarHeight(insets.bottom) : 0 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    );
  }

  /** Registra una pantalla como ruta: recibe el ctx por contexto y lo pasa como props. */
  export function withPage(screen: Screen, Component: (ctx: AppCtx) => ReactElement, opts?: { headerRight?: (ctx: AppCtx) => ReactNode }): () => ReactElement {
    const Wrapped = () => {
      const ctx = useAppCtx();
      return <Page screen={screen} headerRight={opts?.headerRight?.(ctx)}><Component {...ctx} /></Page>;
    };
    Wrapped.displayName = `Page(${screen})`;
    return Wrapped;
  }
  ```

- [ ] **Paso 3: `src/ui/TabBar.tsx`:**

  ```tsx
  import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
  import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
  import { useEffect } from "react";
  import { View } from "react-native";
  import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
  import { type Key, t } from "../i18n/es";
  import { useAppCtx } from "../navigation/context";
  import { type TabName, TAB_ORDER, TAB_ROOT } from "../navigation/routes";
  import { type HostScreen, ROOT_OF, type Screen, SHOW_TABS } from "../navigation/screens";
  import { Icon, type IconName, T, Touch } from "./primitives";
  import { ROW_BOTTOM, ROW_H, ROW_TOP, tabBarHeight } from "./tabBarLayout";
  import { RADIUS } from "./theme";
  import { useTheme } from "./ThemeProvider";

  /** Pestañas de la anfitriona: etiqueta (clave i18n) e icono. */
  export const TABS: Record<HostScreen, [Key, IconName]> = { home: ["tab.home", "home"], benefits: ["tab.benefits", "gift"], profile: ["tab.profile", "user"] };
  const HIDE_MS = 220;

  /** Tab bar custom (heredada): siempre montada, absoluta; se esconde deslizando en pantallas no raíz. */
  export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
    const { c } = useTheme();
    const { switchTab } = useAppCtx();
    const focusedTab = state.routes[state.index];
    const focusedScreen = (getFocusedRouteNameFromRoute(focusedTab) ?? TAB_ROOT[focusedTab.name as TabName]) as Screen;
    const visible = SHOW_TABS.includes(focusedScreen);
    const height = tabBarHeight(insets.bottom);
    const ty = useSharedValue(visible ? 0 : height);
    useEffect(() => { ty.value = withTiming(visible ? 0 : height, { duration: HIDE_MS }); }, [visible, height, ty]);
    const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

    const select = (name: TabName) => {
      const route = state.routes.find((r) => r.name === name)!;
      // tabPress siempre se emite: el listener de native-stack hace popToTop al re-tocar la pestaña enfocada.
      const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (route.key !== focusedTab.key && !e.defaultPrevented) switchTab(name);
    };

    return (
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height, paddingTop: ROW_TOP, paddingBottom: insets.bottom + ROW_BOTTOM, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: c.ink08, backgroundColor: c.page }, barStyle]}
      >
        <View style={{ flexDirection: "row", height: ROW_H, gap: 4 }}>
          {TAB_ORDER.map((name) => {
            const root = TAB_ROOT[name] as HostScreen;
            const [labelKey, icon] = TABS[root];
            const on = ROOT_OF[focusedScreen] === root;
            const fg = on ? c.brand : c.ink55;
            return (
              <Touch key={name} onPress={() => select(name)} accessibilityLabel={`tab-${root}`}
                style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: RADIUS.control, backgroundColor: on ? c.sub : "transparent" }}>
                <Icon name={icon} size={19} color={fg} />
                <T w={500} s={10.5} lh={1} ls={0.06} mono color={fg}>{t(labelKey).toUpperCase()}</T>
              </Touch>
            );
          })}
        </View>
      </Animated.View>
    );
  }
  ```

- [ ] **Paso 4: placeholder y registro de pantallas del módulo.** `src/relayer/screens/placeholder.tsx`:

  ```tsx
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import { Body, Btn, Card, T, Tag } from "../../ui/primitives";

  /** Relleno mientras la pantalla real llega (Tasks 11–15). Se borra en la Task 15. */
  export function PlaceholderScreen({ scr, nav }: AppCtx) {
    return (
      <Body gap={12}>
        <Card gap={6}>
          <Tag>{scr}</Tag>
          <T w={400} s={13} lh={1.45}>{t("common.placeholder")}</T>
        </Card>
        <Btn label={t("common.back")} variant="control" onPress={() => nav("benefits")} />
      </Body>
    );
  }
  ```

  `src/relayer/screens/index.ts`:

  ```ts
  import type { ReactElement, ReactNode } from "react";
  import type { AppCtx } from "../../ctx";
  import type { ModuleScreen } from "../../navigation/screens";
  import { PlaceholderScreen } from "./placeholder";

  /** Pantalla de cada ruta recibo/*. Las Tasks 11–15 sustituyen cada placeholder por la pantalla real. */
  export const MODULE_COMPONENTS: Record<ModuleScreen, (ctx: AppCtx) => ReactElement> = {
    activate: PlaceholderScreen, terms: PlaceholderScreen, kyc: PlaceholderScreen, kycPending: PlaceholderScreen, kycRejected: PlaceholderScreen,
    passkey: PlaceholderScreen, balance: PlaceholderScreen, deposit: PlaceholderScreen, cardRequest: PlaceholderScreen, cardAuthorize: PlaceholderScreen,
    card: PlaceholderScreen, addToWallet: PlaceholderScreen, bankAccount: PlaceholderScreen, send: PlaceholderScreen, sendReceipt: PlaceholderScreen,
    settings: PlaceholderScreen, demoPanel: PlaceholderScreen,
  };

  /** Botón a la derecha de la cabecera (balance → ajustes, Task 12). */
  export const MODULE_HEADER_RIGHT: Partial<Record<ModuleScreen, (ctx: AppCtx) => ReactNode>> = {};
  ```

- [ ] **Paso 5: `src/navigation/Navigator.tsx`:**

  ```tsx
  import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
  import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
  import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
  import { useMemo } from "react";
  import { BenefitsScreen } from "../host/screens/benefits";
  import { HomeScreen } from "../host/screens/home";
  import { ProfileScreen } from "../host/screens/profile";
  import { MODULE_COMPONENTS, MODULE_HEADER_RIGHT } from "../relayer/screens";
  import { withPage } from "../ui/Page";
  import { TabBar } from "../ui/TabBar";
  import { useTheme } from "../ui/ThemeProvider";
  import { flushPending, navigationRef } from "./ref";
  import type { BenefitsStackParamList, HomeStackParamList, ProfileStackParamList, RootParamList, TabParamList } from "./routes";
  import { MODULE_SCREENS } from "./screens";

  const Root = createNativeStackNavigator<RootParamList>();
  const Tabs = createBottomTabNavigator<TabParamList>();
  const HomeStack = createNativeStackNavigator<HomeStackParamList>();
  const BenefitsStack = createNativeStackNavigator<BenefitsStackParamList>();
  const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

  const Home = withPage("home", HomeScreen);
  const Benefits = withPage("benefits", BenefitsScreen);
  const Profile = withPage("profile", ProfileScreen);
  const MODULE_PAGES = MODULE_SCREENS.map((s) => [s, withPage(s, MODULE_COMPONENTS[s], { headerRight: MODULE_HEADER_RIGHT[s] })] as const);

  /** Cabecera propia y gesto estándar de iOS; fondo de la paleta para que no haya flash blanco en dark. */
  function useStackOptions(): NativeStackNavigationOptions {
    const { c } = useTheme();
    return useMemo(() => ({ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: false, animation: "default", contentStyle: { backgroundColor: c.page } }), [c]);
  }

  function HomeTab() {
    const o = useStackOptions();
    return <HomeStack.Navigator screenOptions={o}><HomeStack.Screen name="home" component={Home} /></HomeStack.Navigator>;
  }
  function BenefitsTab() {
    const o = useStackOptions();
    return (
      <BenefitsStack.Navigator screenOptions={o}>
        <BenefitsStack.Screen name="benefits" component={Benefits} />
        {MODULE_PAGES.map(([name, component]) => <BenefitsStack.Screen key={name} name={name} component={component} />)}
      </BenefitsStack.Navigator>
    );
  }
  function ProfileTab() {
    const o = useStackOptions();
    return <ProfileStack.Navigator screenOptions={o}><ProfileStack.Screen name="profile" component={Profile} /></ProfileStack.Navigator>;
  }

  function TabsNav() {
    const { c } = useTheme();
    return (
      // backBehavior="none": el default v7 (`firstRoute`) deja `canGoBack()` en true en las pestañas que no son la primera.
      <Tabs.Navigator initialRouteName="HomeTab" backBehavior="none" tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: "none", sceneStyle: { backgroundColor: c.page } }}>
        <Tabs.Screen name="HomeTab" component={HomeTab} />
        <Tabs.Screen name="BenefitsTab" component={BenefitsTab} />
        <Tabs.Screen name="ProfileTab" component={ProfileTab} />
      </Tabs.Navigator>
    );
  }

  export function Navigator() {
    const { c, scheme } = useTheme();
    const o = useStackOptions();
    const theme = useMemo(() => { const base = scheme === "dark" ? DarkTheme : DefaultTheme; return { ...base, colors: { ...base.colors, background: c.page, card: c.card, text: c.inkStrong, border: c.ink08, primary: c.brand } }; }, [c, scheme]);
    return (
      <NavigationContainer ref={navigationRef} onReady={flushPending} theme={theme}>
        <Root.Navigator screenOptions={o}>
          <Root.Screen name="Tabs" component={TabsNav} />
        </Root.Navigator>
      </NavigationContainer>
    );
  }
  ```

- [ ] **Paso 6: pantallas de Acme.** `src/host/screens/home.tsx`:

  ```tsx
  import { View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import { formatMxn, formatUsdc, usdcToMxnCents } from "../../relayer/money";
  import { Body, Card, Icon, Row, T, Tag, TouchCard } from "../../ui/primitives";
  import { alpha } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";

  /** Inicio de la anfitriona: relleno estático de "Acme Beneficios" + atajo a Recibo. */
  export function HomeScreen({ nav, requireModule, module }: AppCtx) {
    const { c } = useTheme();
    const balance = module.state.balanceUsdcCents;
    return (
      <Body gap={14}>
        <Card bg={c.brand} bd={c.brand} gap={6}>
          <Tag color={alpha(c.onBrand, 0.7)}>{t("home.greetingTag")}</Tag>
          <T w={600} s={24} lh={1.1} ls={-0.02} color={c.onBrand}>{t("home.greeting")}</T>
          <T w={400} s={13} lh={1.45} color={alpha(c.onBrand, 0.85)}>{t("home.subtitle")}</T>
        </Card>
        <Tag>{t("home.sectionNext")}</Tag>
        <Row icon="banknote" title={t("home.payrollTitle")} sub={t("home.payrollSub")} right={t("home.payrollRight")} />
        <Row icon="gift" title={t("home.vouchersTitle")} sub={t("home.vouchersSub")} right={t("home.vouchersRight")} />
        <Tag>{t("home.sectionRecibo")}</Tag>
        {module.active ? (
          <TouchCard onPress={() => requireModule("balance")} accessibilityLabel="home-recibo" style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="coins" size={16} color={c.brand} /><Tag color={c.brand}>{t("home.reciboTag")}</Tag></View>
            <T w={600} s={22} lh={1.1} mono>{formatUsdc(balance)}</T>
            <T w={400} s={12.5} lh={1.4} color={c.ink55}>≈ {formatMxn(usdcToMxnCents(balance))}</T>
          </TouchCard>
        ) : (
          <TouchCard onPress={() => nav("activate")} accessibilityLabel="home-recibo" style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon name="coins" size={16} color={c.brand} /><Tag color={c.brand}>{t("home.reciboTag")}</Tag></View>
            <T w={600} s={15} lh={1.3}>{t("home.reciboOff")}</T>
            <T w={500} s={13} lh={1.3} color={c.brand}>{t("home.reciboCta")} →</T>
          </TouchCard>
        )}
      </Body>
    );
  }
  ```

  `src/host/screens/benefits.tsx`:

  ```tsx
  import { View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import { resumeScreen } from "../../relayer/state";
  import { Body, Btn, Card, Chip, Dot, Icon, type IconName, T, Tag } from "../../ui/primitives";
  import { RL } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";

  const FILLERS: readonly { key: "health" | "gym" | "vouchers"; icon: IconName; status: "active" | "available" }[] = [
    { key: "health", icon: "shield", status: "active" },
    { key: "gym", icon: "sparkles", status: "available" },
    { key: "vouchers", icon: "gift", status: "active" },
  ];

  /** Beneficios (pantalla 1 del spec): la tarjeta «Recibo · powered by Relayer» con Activar + relleno estático. */
  export function BenefitsScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state } = module;
    const cta = state.module === "active" ? t("benefits.recibo.open") : state.module === "off" ? t("benefits.recibo.activate") : t("benefits.recibo.resume");
    const go = () => nav(state.module === "active" ? "balance" : state.module === "off" ? "activate" : resumeScreen(state));
    return (
      <Body gap={14}>
        <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("benefits.intro")}</T>
        <Card gap={10} bd={c.brand}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="coins" size={18} color={c.brand} />
            <T w={600} s={17} lh={1.2} style={{ flex: 1 }}>{t("benefits.recibo.title")}</T>
            {state.module === "active" ? <Chip label={t("benefits.status.active")} mono /> : null}
          </View>
          <T w={400} s={13.5} lh={1.5} color={c.ink72}>{t("benefits.recibo.sub")}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Dot color={RL.turq} size={7} />
            <Tag>{t("common.poweredBy")}</Tag>
          </View>
          <Btn label={cta} variant="primary" arrow onPress={go} accessibilityLabel="benefits-recibo-cta" />
        </Card>
        {FILLERS.map((f) => (
          <Card key={f.key} gap={8}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name={f.icon} size={18} color={c.ink72} />
              <T w={600} s={15} lh={1.2} style={{ flex: 1 }}>{t(`benefits.${f.key}.title`)}</T>
              <Chip label={t(`benefits.status.${f.status}`)} mono />
            </View>
            <T w={400} s={13} lh={1.45} color={c.ink72}>{t(`benefits.${f.key}.sub`)}</T>
          </Card>
        ))}
      </Body>
    );
  }
  ```

  `src/host/screens/profile.tsx`:

  ```tsx
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import { Body, Card, Row, Segmented, T, Tag } from "../../ui/primitives";
  import type { ThemeOverride } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";

  /** Perfil de la anfitriona: datos fijos, apariencia (override del tema) y atajo a los ajustes de Recibo. */
  export function ProfileScreen({ requireModule, module }: AppCtx) {
    const { c, override, setOverride } = useTheme();
    return (
      <Body gap={14}>
        <Card gap={4}>
          <T w={600} s={20} lh={1.2}>{t("profile.name")}</T>
          <T w={400} s={13} lh={1.4} color={c.ink72}>{t("profile.role")}</T>
          <T w={500} s={11} lh={1.4} mono color={c.ink55}>{t("profile.employeeId")}</T>
        </Card>
        <Tag>{t("profile.appearance")}</Tag>
        <Segmented
          options={[["system", t("profile.theme.system")], ["light", t("profile.theme.light")], ["dark", t("profile.theme.dark")]] as const}
          value={override}
          onChange={(o: ThemeOverride) => setOverride(o)}
        />
        <Tag>{t("profile.accountTag")}</Tag>
        <Row icon="user" title={t("profile.rows.personal")} sub={t("profile.rows.personalSub")} />
        <Row icon="bell" title={t("profile.rows.notifications")} sub={t("profile.rows.notificationsSub")} />
        {module.active ? <Row icon="settings" title={t("profile.rows.recibo")} sub={t("profile.rows.reciboSub")} onPress={() => requireModule("settings")} accessibilityLabel="profile-recibo" /> : null}
        <T w={400} s={11.5} lh={1.4} color={c.ink40} style={{ textAlign: "center", marginTop: 12 }}>{t("profile.footer")}</T>
      </Body>
    );
  }
  ```

- [ ] **Paso 7: `App.tsx`** definitivo:

  ```tsx
  import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold } from "@expo-google-fonts/instrument-sans";
  import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
  import { useFonts } from "expo-font";
  import * as SplashScreen from "expo-splash-screen";
  import { useCallback, useEffect, useRef } from "react";
  import { Linking, StatusBar } from "react-native";
  import { GestureHandlerRootView } from "react-native-gesture-handler";
  import { SafeAreaProvider } from "react-native-safe-area-context";
  import type { AppCtx } from "./src/ctx";
  import { useCurrentScreen } from "./src/hooks/useCurrentScreen";
  import { useFaceId } from "./src/hooks/useFaceId";
  import { useModule } from "./src/hooks/useModule";
  import { useNotifications } from "./src/hooks/useNotifications";
  import { AppCtxProvider } from "./src/navigation/context";
  import { parseDeepLink } from "./src/navigation/deepLink";
  import { Navigator } from "./src/navigation/Navigator";
  import { createMockApi } from "./src/relayer/mock/mockApi";
  import { type AppStore, useAppStore } from "./src/store";
  import { asyncStorageKv } from "./src/storage/asyncKv";
  import { ThemeProvider, useTheme } from "./src/ui/ThemeProvider";

  void SplashScreen.preventAutoHideAsync();
  SplashScreen.setOptions({ fade: true, duration: 200 });

  // Único punto que crea la implementación del API (D6): cambiar esta línea es cambiar el mock por el backend real.
  const api = createMockApi({ storage: asyncStorageKv });

  function Shell() {
    const { scheme } = useTheme();
    const scr = useCurrentScreen();
    const storeRef = useRef<AppStore | null>(null);
    // Tap en la notificación de depósito: abre el detalle respetando el gate.
    const notifications = useNotifications((target) => { storeRef.current?.requireModule("deposit", { depositId: target.movementId }); });
    const module = useModule(api, (m) => { void notifications.notifyDeposit(m); });
    const store = useAppStore({ moduleActive: module.active, scr });
    storeRef.current = store;
    const faceId = useFaceId();
    const { nav } = store;
    const kycReturn = useCallback(async () => {
      try { await api.completeKycReturn(); } catch { /* ya estaba en revisión o no había KYC abierto: kycPending lo explica */ }
      nav("kycPending");
    }, [nav]);
    // Deep link relayermobiledemo://recibo/kyc-return: en caliente (listener) y en frío (initial URL).
    useEffect(() => {
      const handle = (url: string | null) => { if (parseDeepLink(url)?.kind === "kyc-return") void kycReturn(); };
      Linking.getInitialURL().then(handle).catch(() => {});
      const sub = Linking.addEventListener("url", (e) => handle(e.url));
      return () => sub.remove();
    }, [kycReturn]);
    const ctx: AppCtx = { ...store, module, faceId, notifications, kycReturn };
    return (
      <>
        <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
        <AppCtxProvider value={ctx}><Navigator /></AppCtxProvider>
      </>
    );
  }

  export default function App() {
    const [fontsLoaded] = useFonts({
      InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
      JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_700Bold,
    });
    useEffect(() => { if (fontsLoaded) void SplashScreen.hideAsync(); }, [fontsLoaded]);
    if (!fontsLoaded) return null; // el splash nativo sigue en pantalla
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider><Shell /></ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  ```

- [ ] **Paso 8: verificar.** `npm run typecheck </dev/null` → 0; `npm test </dev/null` → todo verde (14 suites). Arranque real en simulador (no bloquea el commit si no hay simulador a mano; sí es obligatorio en la Task 17):

  ```bash
  npx expo prebuild --platform ios --clean </dev/null
  npx expo run:ios </dev/null
  ```

  Esperado: tres pestañas Inicio · Beneficios · Perfil; Beneficios muestra la tarjeta Recibo con «Activar»; tocarla abre el placeholder de `activate` con botón ←; Perfil cambia el tema en vivo.

- [ ] **Paso 9: commit.**

  ```bash
  git add App.tsx src/ctx.ts src/navigation/context.tsx src/navigation/Navigator.tsx src/ui/Page.tsx src/ui/TabBar.tsx src/host/screens/home.tsx src/host/screens/benefits.tsx src/host/screens/profile.tsx src/relayer/screens/index.ts src/relayer/screens/placeholder.tsx src/relayer/format.ts
  git commit -m "feat(host): Acme Beneficios shell with Home / Benefits / Profile tabs and the Recibo stack wired to placeholders" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 11: pantallas del alta — Activar, Términos, KYC, KYC en revisión, KYC rechazado

**Files:**
- Create: `src/relayer/screens/PoweredBy.tsx`, `src/relayer/screens/activate.tsx`, `src/relayer/screens/terms.tsx`, `src/relayer/screens/kyc.tsx`, `src/relayer/screens/kycPending.tsx`, `src/relayer/screens/kycRejected.tsx`
- Modify: `src/relayer/screens/index.ts` (entradas `activate`, `terms`, `kyc`, `kycPending`, `kycRejected`)

Patrón de toda pantalla del módulo: props `AppCtx` (vía `withPage`), `const { c } = useTheme()`, copy con `t()`, acciones con `useAction()` sobre `module.api`, navegación con `nav`. Nada importa `mock/`.

- [ ] **Paso 1: `src/relayer/screens/PoweredBy.tsx`:**

  ```tsx
  import { useAppCtx } from "../../navigation/context";
  import { t } from "../../i18n/es";
  import { Dot, Tag, Touch } from "../../ui/primitives";
  import { RL } from "../../ui/theme";

  /** Pie «powered by Relayer» (D4). Toque largo de 5 s → panel de demo (spec «Capa mock»). */
  export function PoweredBy({ center }: { center?: boolean }) {
    const { nav } = useAppCtx();
    return (
      <Touch onLongPress={() => nav("demoPanel")} delayLongPress={5000} accessibilityLabel="powered-by-relayer"
        style={{ flexDirection: "row", alignItems: "center", justifyContent: center ? "center" : "flex-start", gap: 8, paddingVertical: 10 }}>
        <Dot color={RL.turq} size={7} />
        <Tag>{t("common.poweredBy")}</Tag>
      </Touch>
    );
  }
  ```

- [ ] **Paso 2: `src/relayer/screens/activate.tsx`** (pantalla 2: qué es, qué vas a poder hacer, 3 pasos):

  ```tsx
  import { View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import { resumeScreen } from "../state";
  import { Body, Btn, Card, Icon, Steps, T, Tag, Warn } from "../../ui/primitives";
  import { alpha } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  const WHAT = [["receive", "coins"], ["spend", "card"], ["send", "bank"]] as const;

  export function ActivateScreen({ nav, module, S, set }: AppCtx) {
    const { c } = useTheme();
    const { state } = module;
    const cta = () => {
      if (state.module === "active") { const next = S.next ?? "balance"; set({ next: undefined }); nav(next); return; }
      nav(resumeScreen(state));
    };
    const label = state.module === "active" ? t("activate.ctaOpen") : state.module === "off" ? t("activate.ctaStart") : t("activate.ctaResume");
    return (
      <Body gap={16}>
        <Card bg={c.brand} bd={c.brand} gap={8}>
          <Tag color={alpha(c.onBrand, 0.7)}>{t("common.poweredBy")}</Tag>
          <T w={600} s={26} lh={1.1} ls={-0.02} color={c.onBrand}>{t("activate.title")}</T>
          <T w={400} s={14} lh={1.5} color={alpha(c.onBrand, 0.85)}>{t("activate.lede")}</T>
        </Card>
        {S.next && state.module !== "active" ? <Warn tone="info" title={t("activate.heldTitle")} body={t("activate.heldBody")} /> : null}
        <Tag>{t("activate.whatTag")}</Tag>
        <Card gap={12}>
          {WHAT.map(([k, icon]) => (
            <View key={k} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <Icon name={icon} size={18} color={c.brand} />
              <View style={{ flex: 1 }}>
                <T w={600} s={14} lh={1.3}>{t(`activate.what.${k}.title`)}</T>
                <T w={400} s={13} lh={1.45} color={c.ink72}>{t(`activate.what.${k}.body`)}</T>
              </View>
            </View>
          ))}
        </Card>
        <Tag>{t("activate.stepsTag")}</Tag>
        <Steps items={(["1", "2", "3"] as const).map((i) => ({ title: t(`activate.step${i}.title`), body: t(`activate.step${i}.body`) }))} />
        <Btn label={label} variant="primary" arrow onPress={cta} accessibilityLabel="activate-cta" />
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("activate.footnote")}</T>
        <PoweredBy />
      </Body>
    );
  }
  ```

- [ ] **Paso 3: `src/relayer/screens/terms.tsx`** (pantalla 3: Bridge + Relayer, checkbox):

  ```tsx
  import { useState } from "react";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { Body, Btn, Card, Check, T, Tag } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  export function TermsScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const [checked, setChecked] = useState(false);
    const { busy, error, run } = useAction();
    const accept = async () => {
      // Ya aceptados (volvió con ←): sigue al KYC sin volver a llamar al api.
      if (module.state.module !== "off" && module.state.module !== "terms_pending") { nav("kyc"); return; }
      const s = await run(() => module.api.acceptTerms());
      if (s) nav("kyc");
    };
    return (
      <Body gap={14}>
        <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("terms.lede")}</T>
        <Card gap={8}>
          <Tag>{t("terms.bridgeTag")}</Tag>
          <T w={600} s={15} lh={1.3}>{t("terms.bridgeTitle")}</T>
          <T w={400} s={13} lh={1.5} color={c.ink72}>{t("terms.bridgeBody")}</T>
        </Card>
        <Card gap={8}>
          <Tag>{t("terms.relayerTag")}</Tag>
          <T w={600} s={15} lh={1.3}>{t("terms.relayerTitle")}</T>
          <T w={400} s={13} lh={1.5} color={c.ink72}>{t("terms.relayerBody")}</T>
        </Card>
        <Card bg={c.sub} pad={12}>
          <T w={400} s={12.5} lh={1.5} color={c.ink72}>{t("terms.custodyNote")}</T>
        </Card>
        <Check checked={checked} onChange={setChecked} accessibilityLabel="terms-accept">
          <T w={400} s={13.5} lh={1.45}>{t("terms.checkbox")}</T>
        </Check>
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Btn label={t("terms.cta")} variant="primary" arrow disabled={!checked} busy={busy} onPress={() => { void accept(); }} accessibilityLabel="terms-cta" />
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 4: `src/relayer/screens/kyc.tsx`** (pantalla 4: intro + proveedor simulado de 3 pasos + regreso por deep link):

  ```tsx
  import { useEffect, useRef, useState } from "react";
  import { Linking, View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { KYC_RETURN_URL } from "../../navigation/deepLink";
  import type { KycLinks } from "../types";
  import { Body, Btn, Card, Chip, Icon, type IconName, Row, StatusCard, T, Tag, Warn } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";

  type StepName = "document" | "selfie" | "address";
  type Step = "intro" | StepName | "done";
  const STEPS: readonly StepName[] = ["document", "selfie", "address"];
  const STEP_ICON: Record<StepName, IconName> = { document: "doc", selfie: "faceId", address: "home" };
  const NEED: readonly { key: "id" | "selfie" | "address"; icon: IconName }[] = [{ key: "id", icon: "doc" }, { key: "selfie", icon: "faceId" }, { key: "address", icon: "home" }];
  const RETURN_FALLBACK_MS = 1500;

  export function KycScreen({ nav, module, kycReturn }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const [step, setStep] = useState<Step>(state.kyc.status === "incomplete" ? "document" : "intro");
    const [links, setLinks] = useState<KycLinks | null>(null);
    const { busy, error, run } = useAction();
    const kycRef = useRef(state.kyc.status);
    kycRef.current = state.kyc.status;
    useEffect(() => { if (state.kyc.status === "approved") nav("passkey"); }, [state.kyc.status, nav]);

    const open = async () => {
      const l = await run(() => api.startKyc());
      if (l) { setLinks(l); setStep("document"); }
    };
    // Fin del proveedor: regresa a la app por el deep link del redirect_uri. Si el sistema no lo entrega (o tarda), el fallback
    // llama al mismo manejador que usaría el listener de Linking.
    const finish = async () => {
      setStep("done");
      try {
        await Linking.openURL(KYC_RETURN_URL);
        setTimeout(() => { if (kycRef.current === "incomplete") void kycReturn(); }, RETURN_FALLBACK_MS);
      } catch {
        await kycReturn();
      }
    };

    if (step === "intro") {
      return (
        <Body gap={14}>
          <StatusCard tag={t("kyc.tag")} title={t("kyc.introTitle")} body={t("kyc.introBody")} tone="info" />
          <Tag>{t("kyc.needTag")}</Tag>
          {NEED.map((n) => <Row key={n.key} icon={n.icon} title={t(`kyc.need.${n.key}.title`)} sub={t(`kyc.need.${n.key}.sub`)} />)}
          {state.kyc.status === "rejected" ? <Warn tone="warning" title={t("kyc.retryTitle")} body={t("kyc.retryBody")} /> : null}
          {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
          <Btn label={t("kyc.open")} variant="primary" arrow busy={busy} onPress={() => { void open(); }} accessibilityLabel="kyc-open" />
          <T w={400} s={12} lh={1.45} color={c.ink55}>{t("kyc.footnote")}</T>
        </Body>
      );
    }

    const idx = step === "done" ? STEPS.length : STEPS.indexOf(step);
    return (
      <Body gap={14}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Chip label={t("kyc.providerTag")} mono />
          {links ? <T w={500} s={10} mono color={c.ink40} numberOfLines={1} style={{ flexShrink: 1 }}>{links.redirectUri}</T> : null}
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 3, backgroundColor: i < idx || (i === idx && step !== "done") ? c.brand : c.ink15 }} />)}
        </View>
        {step === "done" ? (
          <StatusCard tag={t("kyc.doneTag")} title={t("kyc.doneTitle")} body={t("kyc.doneBody")} tone="success" busy />
        ) : (
          <>
            <Card gap={8} style={{ minHeight: 220, justifyContent: "center", alignItems: "center" }}>
              <Icon name={STEP_ICON[step]} size={44} color={c.ink40} />
              <T w={600} s={18} lh={1.2}>{t(`kyc.step.${step}.title`)}</T>
              <T w={400} s={13} lh={1.5} color={c.ink72} style={{ textAlign: "center" }}>{t(`kyc.step.${step}.body`)}</T>
            </Card>
            <Btn label={step === "address" ? t("kyc.finish") : t("common.continue")} variant="primary" arrow
              onPress={() => { if (step === "address") void finish(); else setStep(STEPS[idx + 1]); }} accessibilityLabel={`kyc-step-${step}`} />
            <Btn label={t("common.cancel")} variant="ghost" onPress={() => setStep("intro")} />
          </>
        )}
      </Body>
    );
  }
  ```

- [ ] **Paso 5: `src/relayer/screens/kycPending.tsx`** y **`kycRejected.tsx`** (pantalla 5):

  ```tsx
  // kycPending.tsx
  import { useEffect } from "react";
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import { Body, Btn, Card, StatusCard, T, Tag, Warn } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  export function KycPendingScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state } = module;
    // El veredicto llega por el mock (2.5 s): aprobado → passkey (alta) o tarjeta (re-KYC con módulo activo); rechazado → razones.
    useEffect(() => {
      if (state.kyc.status === "approved") nav(state.module === "active" ? "cardRequest" : "passkey");
      if (state.kyc.status === "rejected") nav("kycRejected");
    }, [state.kyc.status, state.module, nav]);
    const inReview = state.kyc.status === "under_review";
    return (
      <Body gap={14}>
        {inReview ? (
          <StatusCard tag={t("kycPending.tag")} title={t("kycPending.title")} body={t("kycPending.body")} tone="info" busy />
        ) : (
          <Warn tone="neutral" title={t("kycPending.noneTitle")} body={t("kycPending.noneBody")}>
            <Btn label={t("kycPending.noneCta")} variant="control" onPress={() => nav("activate")} style={{ alignSelf: "flex-start", marginTop: 4 }} />
          </Warn>
        )}
        <Card gap={6}>
          <Tag>{t("kycPending.whatTag")}</Tag>
          <T w={400} s={13} lh={1.5} color={c.ink72}>{t("kycPending.whatBody")}</T>
        </Card>
        <Btn label={t("kycPending.back")} variant="ghost" onPress={() => nav("benefits")} />
        <PoweredBy center />
      </Body>
    );
  }
  ```

  ```tsx
  // kycRejected.tsx
  import { Linking, View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { reasonCopy, t } from "../../i18n/es";
  import { SUPPORT_URL } from "../format";
  import { Body, Btn, Card, Icon, StatusCard, T, Tag } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  export function KycRejectedScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const reasons = module.state.kyc.rejectionReasons;
    return (
      <Body gap={14}>
        <StatusCard tag={t("kycRejected.tag")} title={t("kycRejected.title")} body={t("kycRejected.body")} tone="error" />
        <Tag>{t("kycRejected.reasonsTag")}</Tag>
        <Card gap={10}>
          {reasons.length === 0 ? <T w={400} s={13} lh={1.45} color={c.ink72}>{t("kycRejected.noReasons")}</T> : reasons.map((r) => (
            <View key={r} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Icon name="alert" size={16} color={c.error} />
              <T w={400} s={13.5} lh={1.45} style={{ flex: 1 }}>{reasonCopy(r)}</T>
            </View>
          ))}
        </Card>
        <Btn label={t("kycRejected.retry")} variant="primary" arrow onPress={() => nav("kyc")} accessibilityLabel="kyc-retry" />
        <Btn label={t("kycRejected.support")} variant="ghost" onPress={() => { void Linking.openURL(SUPPORT_URL); }} />
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 6: registrar.** En `src/relayer/screens/index.ts` importar las cinco pantallas y reemplazar sus entradas:

  ```ts
  import { ActivateScreen } from "./activate";
  import { KycScreen } from "./kyc";
  import { KycPendingScreen } from "./kycPending";
  import { KycRejectedScreen } from "./kycRejected";
  import { TermsScreen } from "./terms";
  // …
    activate: ActivateScreen, terms: TermsScreen, kyc: KycScreen, kycPending: KycPendingScreen, kycRejected: KycRejectedScreen,
  ```

- [ ] **Paso 7: verificar.** `npm run typecheck </dev/null`, `npm test </dev/null`. En simulador: Beneficios → Activar → Empezar → Términos (checkbox, Aceptar) → KYC (Abrir verificación → 3 pasos → Regresar a Acme) → «En revisión» 2.5 s → cae en el placeholder de `passkey`. Con escenario `kyc_rejected` (todavía sin panel: cambiarlo a mano con `await AsyncStorage.setItem` no es posible desde fuera; verificar este escenario en la Task 15), el regreso cae en «Rechazado» con dos razones.

- [ ] **Paso 8: commit.**

  ```bash
  git add src/relayer/screens/PoweredBy.tsx src/relayer/screens/activate.tsx src/relayer/screens/terms.tsx src/relayer/screens/kyc.tsx src/relayer/screens/kycPending.tsx src/relayer/screens/kycRejected.tsx src/relayer/screens/index.ts
  git commit -m "feat(recibo): activate, terms and KYC screens (simulated provider + deep-link return)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 12: passkey, saldo y detalle de depósito

**Files:**
- Create: `src/relayer/screens/passkey.tsx`, `src/relayer/screens/balance.tsx`, `src/relayer/screens/deposit.tsx`
- Modify: `src/relayer/screens/index.ts` (entradas + `MODULE_HEADER_RIGHT.balance`)

- [ ] **Paso 1: `src/relayer/screens/passkey.tsx`** (pantalla 6: ceremonia con Face ID, resultado con dirección y QR):

  ```tsx
  import * as Clipboard from "expo-clipboard";
  import { useState } from "react";
  import { ActivityIndicator, View } from "react-native";
  import QRCode from "react-native-qrcode-svg";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { Body, Btn, Card, Chip, Icon, KVList, StatusCard, Steps, T, Tag, TouchCard } from "../../ui/primitives";
  import { alpha } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  export function PasskeyScreen({ nav, module, faceId, S, set }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const { busy, error, run, setError } = useAction();
    const address = state.wallet.address;
    const create = async () => {
      const ok = await faceId.authenticate(t("passkey.prompt"));
      if (!ok) { setError(t("errors.passkey_cancelled")); return; }
      await run(() => api.createPasskey());
    };
    const next = () => { const target = S.next ?? "balance"; set({ next: undefined }); nav(target); };

    if (address) {
      return (
        <Body gap={14}>
          <StatusCard tag={t("passkey.doneTag")} title={t("passkey.doneTitle")} body={t("passkey.doneBody")} tone="success" />
          <Card gap={12} style={{ alignItems: "center" }}>
            <QRCode value={address} size={160} color={c.inkStrong} backgroundColor={c.card} />
            <Tag>{t("passkey.addressTag")}</Tag>
            <T w={500} s={12} lh={1.5} mono selectable style={{ textAlign: "center" }}>{address}</T>
            <Chip label={t("common.copy")} onPress={() => { void Clipboard.setStringAsync(address); }} accessibilityLabel="passkey-copy" />
          </Card>
          <Card><KVList rows={[{ label: t("passkey.chain"), value: "Base" }, { label: t("passkey.custody"), value: t("passkey.custodyValue") }]} /></Card>
          <Btn label={t("common.continue")} variant="primary" arrow onPress={next} accessibilityLabel="passkey-continue" />
          <PoweredBy center />
        </Body>
      );
    }

    return (
      <Body gap={14}>
        <Card bg={c.brand} bd={c.brand} gap={8}>
          <Tag color={alpha(c.onBrand, 0.7)}>{t("passkey.tag")}</Tag>
          <T w={600} s={24} lh={1.1} ls={-0.02} color={c.onBrand}>{t("passkey.title")}</T>
          <T w={400} s={13.5} lh={1.5} color={alpha(c.onBrand, 0.85)}>{t("passkey.lede")}</T>
        </Card>
        <Steps items={(["1", "2", "3"] as const).map((i) => ({ title: t(`passkey.how${i}.title`), body: t(`passkey.how${i}.body`) }))} />
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <TouchCard onPress={() => { void create(); }} disabled={busy} bg={c.btnPrimary} bd={c.btnPrimary} accessibilityLabel="passkey-create" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            {busy ? <ActivityIndicator color={c.onBtnPrimary} /> : <Icon name="faceId" size={26} color={c.onBtnPrimary} />}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T w={600} s={16} lh={1.2} color={c.onBtnPrimary}>{busy ? t("passkey.creating") : t("passkey.create")}</T>
            <Tag color={alpha(c.onBtnPrimary, 0.7)}>{t("passkey.createSub")}</Tag>
          </View>
        </TouchCard>
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("passkey.footnote")}</T>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 2: `src/relayer/screens/balance.tsx`** (pantalla 7: USDC y MXN, tipo de cambio, movimientos, acciones Tarjeta / Enviar):

  ```tsx
  import { useEffect, useState } from "react";
  import { View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import type { Screen } from "../../navigation/screens";
  import { formatWhen, shortAddress } from "../format";
  import { formatCents, formatMxn, formatRate } from "../money";
  import type { Balance, Movement } from "../types";
  import { Body, Btn, Card, Icon, KVList, Reveal, Row, Skeleton, T, Tag, Touch } from "../../ui/primitives";
  import { alpha } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  /** Botón ⚙ de la cabecera (MODULE_HEADER_RIGHT.balance). */
  export function SettingsButton({ nav }: AppCtx) {
    return (
      <Touch onPress={() => nav("settings")} hitSlop={10} accessibilityLabel="balance-settings"><Icon name="settings" size={20} /></Touch>
    );
  }

  function MovementRow({ m, onPress }: { m: Movement; onPress: () => void }) {
    const { c } = useTheme();
    const dot = m.status === "pending" ? c.warning : m.status === "failed" ? c.error : m.kind === "deposit" ? c.success : c.ink40;
    const sign = m.kind === "deposit" ? "+" : "−";
    return (
      <Row dot={dot} title={m.kind === "deposit" ? (m.fromLabel ?? t("movement.kind.deposit")) : t("movement.kind.withdrawal")}
        sub={`${formatWhen(m.at)} · ${m.concept ?? t(`movement.status.${m.status}`)}`}
        right={`${sign}${formatCents(m.amountUsdcCents)}`} rightFg={m.status === "failed" ? c.ink40 : m.kind === "deposit" ? c.success : c.inkStrong}
        onPress={onPress} accessibilityLabel={`movement-${m.id}`} />
    );
  }

  export function BalanceScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state, movements, api } = module;
    const [bal, setBal] = useState<Balance | null>(null);
    // getBalance es del contrato (latencia real); después, el saldo del snapshot dispara el refresco.
    useEffect(() => {
      let stale = false;
      api.getBalance().then((b) => { if (!stale) setBal(b); }).catch(() => {});
      return () => { stale = true; };
    }, [api, state.balanceUsdcCents]);
    const hasCard = state.card.status === "active" || state.card.status === "frozen";
    const cardTarget: Screen = hasCard ? (state.card.authorizedAt ? "card" : "cardAuthorize") : "cardRequest";
    const sendTarget: Screen = state.bank.status === "verified" ? "send" : "bankAccount";
    return (
      <Body gap={14}>
        <Card bg={c.brand} bd={c.brand} gap={10}>
          <Tag color={alpha(c.onBrand, 0.7)}>{t("balance.availableTag")}</Tag>
          {bal === null ? <Skeleton h={40} w="60%" /> : (
            <Reveal>
              <T w={600} s={40} lh={1} ls={-0.03} mono color={c.onBrand}>{formatCents(bal.usdcCents)} <T w={500} s={16} mono color={alpha(c.onBrand, 0.7)}>USDC</T></T>
              <T w={500} s={12.5} lh={1.3} mono color={alpha(c.onBrand, 0.85)} style={{ marginTop: 6 }}>≈ {formatMxn(bal.mxnCents)} · {formatRate(bal.rate)}</T>
            </Reveal>
          )}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <Btn label={t("balance.card")} icon="card" variant="control" flex={1} onPress={() => nav(cardTarget)} accessibilityLabel="balance-card" />
            <Btn label={t("balance.send")} icon="send" variant="control" flex={1} onPress={() => nav(sendTarget)} accessibilityLabel="balance-send" />
          </View>
        </Card>
        <Card><KVList rows={[
          { label: t("balance.kvWallet"), value: `${shortAddress(state.wallet.address)} · Base` },
          { label: t("balance.kvCard"), value: t(`card.status.${state.card.status}`) },
          { label: t("balance.kvBank"), value: state.bank.status === "verified" ? `${state.bank.bankName} ···· ${(state.bank.clabe ?? "").slice(-4)}` : t(`bank.status.${state.bank.status}`) },
        ]} /></Card>
        <Tag>{t("balance.movementsTag")}</Tag>
        {movements.length === 0 ? (
          <Card><T w={400} s={13} lh={1.45} color={c.ink55}>{t("balance.empty")}</T></Card>
        ) : movements.map((m) => (
          <MovementRow key={m.id} m={m} onPress={() => (m.kind === "deposit" ? nav("deposit", { depositId: m.id }) : nav("sendReceipt", { receiptId: m.receiptId }))} />
        ))}
        <PoweredBy />
      </Body>
    );
  }
  ```

- [ ] **Paso 3: `src/relayer/screens/deposit.tsx`** (pantalla 8: empresa, concepto, referencia, hash):

  ```tsx
  import * as Clipboard from "expo-clipboard";
  import type { AppCtx } from "../../ctx";
  import { t } from "../../i18n/es";
  import { formatWhen } from "../format";
  import { formatCents, formatMxn } from "../money";
  import { Body, Btn, Card, Chip, KVList, T, Tag, Warn } from "../../ui/primitives";
  import { alpha } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";

  export function DepositScreen({ S, module, nav }: AppCtx) {
    const { c } = useTheme();
    const m = module.movements.find((x) => x.id === S.depositId && x.kind === "deposit");
    if (!m) {
      return (
        <Body gap={12}>
          <Warn tone="neutral" title={t("deposit.missingTitle")} body={t("deposit.missingBody")} />
          <Btn label={t("balance.back")} variant="control" onPress={() => nav("balance")} />
        </Body>
      );
    }
    return (
      <Body gap={14}>
        <Card bg={c.brand} bd={c.brand} gap={6}>
          <Tag color={alpha(c.onBrand, 0.7)}>{t("deposit.receivedTag")}</Tag>
          <T w={600} s={34} lh={1} ls={-0.03} mono color={c.onBrand}>+{formatCents(m.amountUsdcCents)}</T>
          <T w={500} s={12} lh={1.3} mono color={alpha(c.onBrand, 0.85)}>USDC{m.amountMxnCents !== undefined ? ` · ≈ ${formatMxn(m.amountMxnCents)}` : ""}</T>
        </Card>
        <Card><KVList rows={[
          { label: t("deposit.from"), value: m.fromLabel ?? "—" },
          { label: t("deposit.concept"), value: m.concept ?? "—" },
          { label: t("deposit.reference"), value: m.reference ?? "—" },
          { label: t("deposit.when"), value: formatWhen(m.at) },
          { label: t("deposit.network"), value: "Base" },
          { label: t("deposit.status"), value: t(`movement.status.${m.status}`) },
        ]} /></Card>
        <Card gap={8}>
          <Tag>{t("deposit.hashTag")}</Tag>
          <T w={500} s={11.5} lh={1.5} mono selectable>{m.txHash ?? "—"}</T>
          {m.txHash ? <Chip label={t("common.copy")} onPress={() => { void Clipboard.setStringAsync(m.txHash ?? ""); }} style={{ alignSelf: "flex-start" }} accessibilityLabel="deposit-copy-hash" /> : null}
        </Card>
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("deposit.footnote")}</T>
      </Body>
    );
  }
  ```

- [ ] **Paso 4: registrar.** En `index.ts`: importar `PasskeyScreen`, `BalanceScreen`, `SettingsButton`, `DepositScreen`; entradas `passkey`, `balance`, `deposit`; y `MODULE_HEADER_RIGHT = { balance: (ctx) => <SettingsButton {...ctx} /> }` → como `index.ts` no es `.tsx`, escribirlo sin JSX: `balance: (ctx) => SettingsButton(ctx)`.

- [ ] **Paso 5: verificar.** typecheck + tests. Simulador: tras el KYC aprobado, Passkey → «Crear con Face ID» (Face ID del simulador o 600 ms de fallback) → dirección con QR → Continuar → Saldo con 0.00; a los 4 s llega la nómina (banner de notificación + fila); tocar la fila abre el detalle con hash y «Copiar».

- [ ] **Paso 6: commit.**

  ```bash
  git add src/relayer/screens/passkey.tsx src/relayer/screens/balance.tsx src/relayer/screens/deposit.tsx src/relayer/screens/index.ts
  git commit -m "feat(recibo): passkey ceremony with Face ID, balance with movements, deposit detail" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 13: tarjeta — pedir, autorizar, ver, agregar al teléfono

**Files:**
- Create: `src/relayer/screens/cardRequest.tsx`, `src/relayer/screens/cardAuthorize.tsx`, `src/relayer/screens/card.tsx`, `src/relayer/screens/addToWallet.tsx`
- Modify: `src/relayer/screens/index.ts`

- [ ] **Paso 1: `cardRequest.tsx`** (pantalla 9: condiciones, botón, endorsement pendiente, «confirma tus datos»):

  ```tsx
  import { useEffect } from "react";
  import { View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { Body, Btn, StatusCard, Steps, T, Tag, Warn } from "../../ui/primitives";
  import { DARK, RADIUS, RL } from "../../ui/theme";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  /** Arte de la tarjeta (siempre carbon, con la paleta dark encima; independiente del esquema). */
  export function CardArt({ last4, expiry, holder, number, cvv, dim }: { last4: string | null; expiry: string | null; holder: string; number?: string | null; cvv?: string | null; dim?: boolean }) {
    return (
      <View style={{ backgroundColor: RL.carbon, borderRadius: RADIUS.card, padding: 20, gap: 28, opacity: dim ? 0.55 : 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Tag color={RL.turq}>{t("card.artTag")}</Tag>
          <T w={700} s={14} ls={0.1} color={DARK.inkStrong}>VISA</T>
        </View>
        <T w={500} s={20} lh={1} ls={0.08} mono color={DARK.inkStrong}>{number ?? `•••• •••• •••• ${last4 ?? "••••"}`}</T>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View><Tag color={DARK.ink55}>{t("card.holder")}</Tag><T w={500} s={12.5} mono color={DARK.inkStrong} style={{ marginTop: 4 }}>{holder}</T></View>
          <View><Tag color={DARK.ink55}>{t("card.expiry")}</Tag><T w={500} s={12.5} mono color={DARK.inkStrong} style={{ marginTop: 4 }}>{expiry ?? "••/••"}</T></View>
          <View><Tag color={DARK.ink55}>CVV</Tag><T w={500} s={12.5} mono color={DARK.inkStrong} style={{ marginTop: 4 }}>{cvv ?? "•••"}</T></View>
        </View>
      </View>
    );
  }

  export function CardRequestScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const { busy, error, code, run } = useAction();
    const st = state.card.status;
    useEffect(() => { if (st === "active" || st === "frozen") nav(state.card.authorizedAt ? "card" : "cardAuthorize"); }, [st, state.card.authorizedAt, nav]);
    const request = async () => { await run(() => api.requestCard()); };
    const reconfirm = async () => { const s = await run(() => api.reconfirmKyc()); if (s) nav("kycPending"); };
    return (
      <Body gap={14}>
        {st === "none" ? (
          <>
            <CardArt last4={null} expiry={null} holder={t("card.holderPlaceholder")} dim />
            <Tag>{t("cardRequest.conditionsTag")}</Tag>
            <Steps items={(["1", "2", "3"] as const).map((i) => ({ title: t(`cardRequest.cond${i}.title`), body: t(`cardRequest.cond${i}.body`) }))} />
            {code === "cards_unavailable_region" ? (
              <Warn tone="warning" title={t("cardRequest.unavailableTitle")} body={t("cardRequest.unavailableBody")}>
                <Btn label={t("cardRequest.notify")} variant="control" onPress={() => nav("balance")} style={{ alignSelf: "flex-start", marginTop: 4 }} accessibilityLabel="card-notify" />
              </Warn>
            ) : error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
            <Btn label={t("cardRequest.cta")} variant="primary" arrow busy={busy} onPress={() => { void request(); }} accessibilityLabel="card-request" />
          </>
        ) : null}
        {st === "endorsement_expired" ? (
          <>
            <StatusCard tag={t("cardRequest.expiredTag")} title={t("cardRequest.expiredTitle")} body={t("cardRequest.expiredBody")} tone="warning" />
            {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
            <Btn label={t("cardRequest.reconfirm")} variant="primary" arrow busy={busy} onPress={() => { void reconfirm(); }} accessibilityLabel="card-reconfirm" />
          </>
        ) : null}
        {st === "requested" || st === "endorsement_pending" ? (
          <StatusCard tag={t(`cardRequest.pending.${st}.tag`)} title={t(`cardRequest.pending.${st}.title`)} body={t(`cardRequest.pending.${st}.body`)} tone="info" busy />
        ) : null}
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("cardRequest.footnote")}</T>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 2: `cardAuthorize.tsx`** (pantalla 10: autorización on-chain única con Face ID):

  ```tsx
  import { useEffect } from "react";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { shortAddress } from "../format";
  import { Body, Btn, Card, KVList, StatusCard, T, Tag } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  export function CardAuthorizeScreen({ nav, module, faceId }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const { busy, error, run, setError } = useAction();
    useEffect(() => { if (state.card.authorizedAt !== null) nav("card"); }, [state.card.authorizedAt, nav]);
    const authorize = async () => {
      const ok = await faceId.authenticate(t("cardAuthorize.prompt"));
      if (!ok) { setError(t("errors.passkey_cancelled")); return; }
      const s = await run(() => api.authorizeCard());
      if (s) nav("card");
    };
    return (
      <Body gap={14}>
        <StatusCard tag={t("cardAuthorize.tag")} title={t("cardAuthorize.title")} body={t("cardAuthorize.body")} tone="info" />
        <Card gap={8}>
          <Tag>{t("cardAuthorize.whatTag")}</Tag>
          <KVList rows={[
            { label: t("cardAuthorize.kvWallet"), value: shortAddress(state.wallet.address) },
            { label: t("cardAuthorize.kvSpender"), value: t("cardAuthorize.kvSpenderValue") },
            { label: t("cardAuthorize.kvLimit"), value: t("cardAuthorize.kvLimitValue") },
            { label: t("cardAuthorize.kvRevoke"), value: t("cardAuthorize.kvRevokeValue") },
          ]} />
        </Card>
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Btn label={t("cardAuthorize.cta")} icon="faceId" variant="primary" busy={busy} onPress={() => { void authorize(); }} accessibilityLabel="card-authorize" />
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("cardAuthorize.footnote")}</T>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 3: `card.tsx`** (pantalla 11: arte, últimos 4, vencimiento, congelar, ver datos):

  ```tsx
  import { useEffect, useState } from "react";
  import { View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { formatWhen } from "../format";
  import type { CardDetails } from "../types";
  import { Body, Btn, Card, KVList, Row, T, Warn } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { CardArt } from "./cardRequest";
  import { PoweredBy } from "./PoweredBy";

  export function CardScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const { busy, error, run } = useAction();
    const [details, setDetails] = useState<CardDetails | null>(null);
    const [revealed, setRevealed] = useState(false);
    const frozen = state.card.status === "frozen";
    useEffect(() => { if (state.card.status === "none" || state.card.status === "endorsement_expired") nav("cardRequest"); }, [state.card.status, nav]);
    // Los datos completos (PAN, CVV) se piden al api pero sólo se pintan con «Ver datos».
    useEffect(() => {
      let stale = false;
      api.getCard().then((d) => { if (!stale) setDetails(d); }).catch(() => {});
      return () => { stale = true; };
    }, [api, state.card.status]);
    const toggleFreeze = async () => { await run(() => api.freezeCard(!frozen)); };
    return (
      <Body gap={14}>
        <CardArt last4={state.card.last4} expiry={state.card.expiry} holder={details?.holder ?? "—"} number={revealed ? details?.number : null} cvv={revealed ? details?.cvv : null} dim={frozen} />
        {frozen ? <Warn tone="info" title={t("card.frozenTitle")} body={t("card.frozenBody")} /> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label={revealed ? t("card.hide") : t("card.reveal")} icon={revealed ? "eyeOff" : "eye"} variant="control" flex={1} disabled={details === null} onPress={() => setRevealed((v) => !v)} accessibilityLabel="card-reveal" />
          <Btn label={frozen ? t("card.unfreeze") : t("card.freeze")} icon={frozen ? "sparkles" : "freeze"} variant="control" flex={1} busy={busy} onPress={() => { void toggleFreeze(); }} accessibilityLabel="card-freeze" />
        </View>
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Card><KVList rows={[
          { label: t("card.kvStatus"), value: t(`card.status.${state.card.status}`) },
          { label: t("card.kvAuthorized"), value: state.card.authorizedAt ? formatWhen(state.card.authorizedAt) : "—" },
          { label: t("card.kvNetwork"), value: t("card.kvNetworkValue") },
        ]} /></Card>
        {state.pass.status === "added" ? (
          <Row icon="phone" title={t("card.inWalletTitle")} sub={t(`addToWallet.provider.${state.pass.provider ?? "apple"}`)} right={t("common.ready")} rightFg={c.success} />
        ) : (
          <Btn label={t("card.addToPhone")} icon="phone" variant="primary" arrow disabled={frozen} onPress={() => nav("addToWallet")} accessibilityLabel="card-add-to-wallet" />
        )}
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("card.footnote")}</T>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 4: `addToWallet.tsx`** (pantalla 12: Apple Wallet / Google Pay simulado):

  ```tsx
  import { useState } from "react";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import type { WalletProvider } from "../types";
  import { Body, Btn, Card, Icon, Segmented, StatusCard, Steps, T } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  export function AddToWalletScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const { busy, error, run } = useAction();
    const [provider, setProvider] = useState<WalletProvider>("apple");
    const add = async () => { await run(() => api.addToWallet(provider)); };
    if (state.pass.status === "added") {
      const p = t(`addToWallet.provider.${state.pass.provider ?? "apple"}`);
      return (
        <Body gap={14}>
          <StatusCard tag={t("addToWallet.doneTag")} title={t("addToWallet.doneTitle", { provider: p })} body={t("addToWallet.doneBody")} tone="success" />
          <Btn label={t("addToWallet.backToCard")} variant="primary" onPress={() => nav("card")} accessibilityLabel="add-to-wallet-back" />
          <PoweredBy center />
        </Body>
      );
    }
    const p = t(`addToWallet.provider.${provider}`);
    return (
      <Body gap={14}>
        <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("addToWallet.lede")}</T>
        <Segmented options={[["apple", t("addToWallet.provider.apple")], ["google", t("addToWallet.provider.google")]] as const} value={provider} onChange={setProvider} />
        <Card gap={8} style={{ alignItems: "center", paddingVertical: 28 }}>
          <Icon name="phone" size={40} color={c.ink40} />
          <T w={600} s={16} lh={1.2}>{t("addToWallet.preview", { provider: p })}</T>
          <T w={400} s={12.5} lh={1.4} color={c.ink55}>{t("addToWallet.previewSub")}</T>
        </Card>
        <Steps items={(["1", "2"] as const).map((i) => ({ title: t(`addToWallet.step${i}.title`), body: t(`addToWallet.step${i}.body`) }))} />
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Btn label={t("addToWallet.cta", { provider: p })} variant="primary" arrow busy={busy} onPress={() => { void add(); }} accessibilityLabel="add-to-wallet" />
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("addToWallet.footnote")}</T>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 5: registrar** en `index.ts` (`cardRequest`, `cardAuthorize`, `card`, `addToWallet`). Verificar typecheck + tests. Simulador: Saldo → Tarjeta → Pedir tarjeta → «Solicitada» → «Endorsement pendiente» → salta a Autorizar → Face ID → Tarjeta (ver datos, congelar) → Agregar al teléfono → Apple Wallet → listo.

- [ ] **Paso 6: commit.**

  ```bash
  git add src/relayer/screens/cardRequest.tsx src/relayer/screens/cardAuthorize.tsx src/relayer/screens/card.tsx src/relayer/screens/addToWallet.tsx src/relayer/screens/index.ts
  git commit -m "feat(recibo): card request with 24h endorsement rule, on-chain authorization, card view, add to phone" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 14: cuenta bancaria, envío a banco y recibo

**Files:**
- Create: `src/relayer/screens/bankAccount.tsx`, `src/relayer/screens/send.tsx`, `src/relayer/screens/sendReceipt.tsx`
- Modify: `src/relayer/screens/index.ts`

- [ ] **Paso 1: `bankAccount.tsx`** (pantalla 13: CLABE, banco detectado, titular, verificación):

  ```tsx
  import { useState } from "react";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { bankFor, clabeValid } from "../clabe";
  import type { BankAccount } from "../types";
  import { Body, Btn, Card, Field, KVList, StatusCard, T } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  function AccountCard({ bank }: { bank: BankAccount }) {
    return (
      <Card><KVList rows={[
        { label: t("bank.bank"), value: bank.bankName ?? "—" },
        { label: t("bank.clabeLabel"), value: `•••• •••• •••• ${(bank.clabe ?? "").slice(-4)}` },
        { label: t("bank.owner"), value: bank.ownerName ?? "—" },
        { label: t("bank.rail"), value: "SPEI" },
      ]} /></Card>
    );
  }

  export function BankAccountScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const { busy, error, run } = useAction();
    const [clabe, setClabe] = useState("");
    const digits = clabe.replace(/\D/g, "");
    const bank = digits.length >= 3 ? bankFor(digits) : null;
    const valid = clabeValid(digits);
    const add = async () => { const b = await run(() => api.addBankAccount(digits)); if (b) setClabe(""); };
    const st = state.bank.status;
    const hint = digits.length === 18
      ? (valid ? t("bank.clabeOk", { bank: bank ?? t("bank.unknownBank") }) : t("errors.clabe_invalid"))
      : t("bank.clabeHint", { n: digits.length });
    return (
      <Body gap={14}>
        {st === "none" || st === "failed" ? (
          <>
            {st === "failed"
              ? <StatusCard tag={t("bank.failedTag")} title={t("bank.failedTitle")} body={t("bank.failedBody")} tone="error" />
              : <T w={400} s={14} lh={1.5} color={c.inkBody}>{t("bank.lede")}</T>}
            <Field label={t("bank.clabeLabel")} value={clabe} onChangeText={(v) => setClabe(v.replace(/[^\d ]/g, "").slice(0, 22))} keyboardType="number-pad"
              placeholder="000 0000 0000 0000 00" hint={hint} error={digits.length === 18 && !valid ? t("errors.clabe_invalid") : undefined} accessibilityLabel="bank-clabe" />
            <Card><KVList rows={[
              { label: t("bank.bank"), value: bank ?? "—" },
              { label: t("bank.owner"), value: t("bank.ownerValue") },
              { label: t("bank.rail"), value: "SPEI" },
            ]} /></Card>
            {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
            <Btn label={t("bank.cta")} variant="primary" arrow busy={busy} disabled={!valid} onPress={() => { void add(); }} accessibilityLabel="bank-add" />
            <T w={400} s={12} lh={1.45} color={c.ink55}>{t("bank.footnote")}</T>
          </>
        ) : null}
        {st === "pending_verification" ? (
          <>
            <StatusCard tag={t("bank.pendingTag")} title={t("bank.pendingTitle")} body={t("bank.pendingBody")} tone="info" busy />
            <AccountCard bank={state.bank} />
          </>
        ) : null}
        {st === "verified" ? (
          <>
            <StatusCard tag={t("bank.verifiedTag")} title={t("bank.verifiedTitle")} body={t("bank.verifiedBody")} tone="success" />
            <AccountCard bank={state.bank} />
            <Btn label={t("bank.goSend")} variant="primary" arrow onPress={() => nav("send")} accessibilityLabel="bank-go-send" />
          </>
        ) : null}
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 2: `send.tsx`** (pantalla 14: monto en USDC o MXN, cotización, comisión, confirmación con Face ID):

  ```tsx
  import { useEffect, useState } from "react";
  import { View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { useNow } from "../../hooks/useNow";
  import { errorCopy } from "../../i18n/errors";
  import { t } from "../../i18n/es";
  import { formatCents, formatMxn, formatRate, formatUsdc, MIN_SEND_MXN_CENTS, mxnToUsdcCents, parseAmount, quoteFor, usdcToMxnCents } from "../money";
  import type { Quote } from "../types";
  import { Body, Btn, Card, Chip, Field, KVList, Segmented, T, Tag } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  type Unit = "mxn" | "usdc";

  export function SendScreen({ nav, module, faceId }: AppCtx) {
    const { c } = useTheme();
    const { state, api } = module;
    const { busy, error, run, setError } = useAction();
    const [unit, setUnit] = useState<Unit>("mxn");
    const [input, setInput] = useState("");
    const [quote, setQuote] = useState<Quote | null>(null);
    const now = useNow(1000);
    useEffect(() => { if (state.bank.status !== "verified") nav("bankAccount"); }, [state.bank.status, nav]);

    const balance = state.balanceUsdcCents;
    const cents = parseAmount(input);
    const amountUsdc = cents === null ? null : unit === "usdc" ? cents : mxnToUsdcCents(cents);
    const preview = amountUsdc === null ? null : quoteFor(amountUsdc, balance);
    const account = `${state.bank.bankName ?? ""} ···· ${(state.bank.clabe ?? "").slice(-4)}`;
    const max = () => setInput(formatCents(unit === "usdc" ? balance : usdcToMxnCents(balance)).replace(/,/g, ""));
    const getQuote = async () => { if (amountUsdc === null) return; const q = await run(() => api.quoteSend(amountUsdc)); if (q) setQuote(q); };
    const confirm = async () => {
      if (!quote) return;
      const ok = await faceId.authenticate(t("send.prompt"));
      if (!ok) { setError(t("errors.passkey_cancelled")); return; }
      const r = await run(() => api.confirmSend(quote.id));
      if (r) { setQuote(null); nav("sendReceipt", { receiptId: r.id }); }
    };

    if (quote) {
      const left = Math.max(0, Math.ceil((quote.expiresAt - now) / 1000));
      return (
        <Body gap={14}>
          <Card gap={6}>
            <Tag>{t("send.youSendTag")}</Tag>
            <T w={600} s={32} lh={1} ls={-0.02} mono>{formatUsdc(quote.amountUsdcCents)}</T>
            <KVList top rows={[
              { label: t("send.fee"), value: formatUsdc(quote.feeUsdcCents) },
              { label: t("send.rate"), value: formatRate(quote.rate) },
              { label: t("send.receives"), value: formatMxn(quote.amountMxnCents), fg: c.success },
              { label: t("send.to"), value: account },
              { label: t("send.rail"), value: "SPEI" },
            ]} />
          </Card>
          <T w={500} s={11} lh={1.3} mono color={left === 0 ? c.error : c.ink55}>{left === 0 ? t("send.quoteExpired") : t("send.quoteTtl", { s: left })}</T>
          {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label={t("common.edit")} variant="outline" disabled={busy} onPress={() => { setQuote(null); setError(""); }} style={{ width: 104 }} accessibilityLabel="send-edit" />
            <Btn label={t("send.confirm")} icon="faceId" variant="primary" flex={1} busy={busy} disabled={left === 0} onPress={() => { void confirm(); }} accessibilityLabel="send-confirm" />
          </View>
          <T w={400} s={12} lh={1.45} color={c.ink55}>{t("send.confirmFootnote")}</T>
        </Body>
      );
    }

    return (
      <Body gap={14}>
        <Segmented options={[["mxn", t("send.unitMxn")], ["usdc", t("send.unitUsdc")]] as const} value={unit} onChange={(u) => { setUnit(u); setInput(""); }} />
        <Field label={unit === "mxn" ? t("send.amountMxn") : t("send.amountUsdc")} value={input} onChangeText={setInput} keyboardType="decimal-pad" placeholder="0.00"
          right={<Chip label="MAX" mono onPress={max} accessibilityLabel="send-max" />}
          hint={preview === null
            ? t("send.available", { usdc: formatUsdc(balance), mxn: formatMxn(usdcToMxnCents(balance)) })
            : preview.ok ? t("send.preview", { usdc: formatUsdc(preview.quote.amountUsdcCents), mxn: formatMxn(preview.quote.amountMxnCents) }) : undefined}
          error={preview !== null && !preview.ok ? errorCopy(preview.code) : undefined}
          accessibilityLabel="send-amount" />
        <Card><KVList rows={[
          { label: t("send.to"), value: account },
          { label: t("send.minimum"), value: formatMxn(MIN_SEND_MXN_CENTS) },
          { label: t("send.feeLabel"), value: t("send.feeValue") },
        ]} /></Card>
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Btn label={t("send.quote")} variant="primary" arrow busy={busy} disabled={preview === null || !preview.ok} onPress={() => { void getQuote(); }} accessibilityLabel="send-quote" />
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("send.footnote")}</T>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 3: `sendReceipt.tsx`** (pantalla 15: estado, folio, compartir):

  ```tsx
  import { useEffect, useState } from "react";
  import { Share, View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { errorCopy } from "../../i18n/errors";
  import { t } from "../../i18n/es";
  import { formatWhen } from "../format";
  import { formatMxn, formatRate, formatUsdc } from "../money";
  import type { Receipt } from "../types";
  import { Body, Btn, Card, KVList, Skeleton, StatusCard, T, Tag, type ToneName, Warn } from "../../ui/primitives";
  import { PoweredBy } from "./PoweredBy";

  export function SendReceiptScreen({ S, module, nav }: AppCtx) {
    const { api, state } = module;
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [missing, setMissing] = useState(false);
    const id = S.receiptId;
    // Se vuelve a pedir cuando el envío cambia de estado (submitted → completed | failed).
    useEffect(() => {
      if (!id) { setMissing(true); return; }
      let stale = false;
      api.getReceipt(id).then((r) => { if (!stale) setReceipt(r); }).catch(() => { if (!stale) setMissing(true); });
      return () => { stale = true; };
    }, [api, id, state.send.status]);

    if (missing) {
      return (
        <Body gap={12}>
          <Warn tone="neutral" title={t("receipt.missingTitle")} body={t("receipt.missingBody")} />
          <Btn label={t("balance.back")} variant="control" onPress={() => nav("balance")} />
        </Body>
      );
    }
    if (!receipt) return <Body gap={12}><Skeleton h={120} /><Skeleton.Row /><Skeleton.Row /></Body>;

    const tone: ToneName = receipt.status === "completed" ? "success" : receipt.status === "failed" ? "error" : "info";
    const body = receipt.status === "failed" && receipt.failureCode ? errorCopy(receipt.failureCode) : t(`receipt.status.${receipt.status}.body`);
    const share = () => {
      void Share.share({ message: t("receipt.shareMessage", { folio: receipt.folio, mxn: formatMxn(receipt.amountMxnCents), usdc: formatUsdc(receipt.amountUsdcCents), bank: receipt.bankName, last4: receipt.clabeLast4 }) });
    };
    return (
      <Body gap={14}>
        <StatusCard tag={t(`receipt.status.${receipt.status}.tag`)} title={t(`receipt.status.${receipt.status}.title`)} body={body} tone={tone} busy={receipt.status === "submitted"} />
        <Card gap={6}>
          <Tag>{t("receipt.folio")}</Tag>
          <T w={600} s={20} lh={1.1} mono selectable>{receipt.folio}</T>
          <KVList top rows={[
            { label: t("send.youSendTag"), value: formatUsdc(receipt.amountUsdcCents) },
            { label: t("send.fee"), value: formatUsdc(receipt.feeUsdcCents) },
            { label: t("send.rate"), value: formatRate(receipt.rate) },
            { label: t("send.receives"), value: formatMxn(receipt.amountMxnCents) },
            { label: t("send.to"), value: `${receipt.bankName} ···· ${receipt.clabeLast4}` },
            { label: t("receipt.created"), value: formatWhen(receipt.createdAt) },
            { label: t("receipt.completed"), value: receipt.completedAt ? formatWhen(receipt.completedAt) : "—" },
          ]} />
        </Card>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label={t("common.share")} icon="share" variant="control" flex={1} onPress={share} accessibilityLabel="receipt-share" />
          <Btn label={t("balance.back")} variant="primary" flex={1} onPress={() => nav("balance")} accessibilityLabel="receipt-back" />
        </View>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 4: registrar** (`bankAccount`, `send`, `sendReceipt`), typecheck + tests. Simulador: Saldo → Enviar → CLABE `012 1800 0123 4567 899` (BBVA) → «Verificando» 3 s → «Verificada» → Enviar a banco → 500 MXN → Cotizar → Confirmar con Face ID → Recibo «Enviado» → 3.5 s → «Completado»; Compartir abre la hoja nativa.

- [ ] **Paso 5: commit.**

  ```bash
  git add src/relayer/screens/bankAccount.tsx src/relayer/screens/send.tsx src/relayer/screens/sendReceipt.tsx src/relayer/screens/index.ts
  git commit -m "feat(recibo): CLABE with ownership verification, send to bank with quote + Face ID, receipt" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 15: ajustes del módulo y panel de demo

**Files:**
- Create: `src/relayer/screens/settings.tsx`, `src/relayer/screens/demoPanel.tsx`
- Modify: `src/relayer/screens/index.ts`
- Delete: `src/relayer/screens/placeholder.tsx`

- [ ] **Paso 1: `settings.tsx`** (pantalla 16: desactivar, exportar, soporte, pie con toque largo):

  ```tsx
  import { Alert, Linking, Share } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { movementsCsv } from "../export";
  import { shortAddress, SUPPORT_URL } from "../format";
  import { Body, Btn, Card, KVList, Row, T } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";
  import { PoweredBy } from "./PoweredBy";

  export function SettingsScreen({ nav, module }: AppCtx) {
    const { c } = useTheme();
    const { state, movements, api } = module;
    const { busy, error, run } = useAction();
    const exportCsv = () => { void Share.share({ title: t("settings.exportTitle"), message: movementsCsv(movements) }); };
    const deactivate = () => {
      Alert.alert(t("settings.deactivateTitle"), t("settings.deactivateBody"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("settings.deactivateConfirm"), style: "destructive", onPress: () => { void run(() => api.deactivate()).then((s) => { if (s) nav("benefits"); }); } },
      ]);
    };
    return (
      <Body gap={14}>
        <Card><KVList rows={[
          { label: t("settings.kvStatus"), value: t(`module.status.${state.module}`) },
          { label: t("settings.kvWallet"), value: shortAddress(state.wallet.address) },
          { label: t("settings.kvCard"), value: t(`card.status.${state.card.status}`) },
          { label: t("settings.kvBank"), value: t(`bank.status.${state.bank.status}`) },
        ]} /></Card>
        <Row icon="download" title={t("settings.export")} sub={t("settings.exportSub", { n: movements.length })} onPress={exportCsv} accessibilityLabel="settings-export" />
        <Row icon="bell" title={t("settings.support")} sub={t("settings.supportSub")} onPress={() => { void Linking.openURL(SUPPORT_URL); }} accessibilityLabel="settings-support" />
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Btn label={t("settings.deactivate")} icon="logout" variant="danger" busy={busy} onPress={deactivate} accessibilityLabel="settings-deactivate" />
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t("settings.footnote")}</T>
        <PoweredBy center />
      </Body>
    );
  }
  ```

- [ ] **Paso 2: `demoPanel.tsx`** (escenarios, estado, «simular pago de Acme», eventos «lo que recibiría Acme», reiniciar). Única pantalla que importa de `mock/` (escenarios y defaults del depósito), porque es del panel y no del producto:

  ```tsx
  import { useState } from "react";
  import { Alert, View } from "react-native";
  import type { AppCtx } from "../../ctx";
  import { useAction } from "../../hooks/useAction";
  import { t } from "../../i18n/es";
  import { formatWhen } from "../format";
  import { DEFAULT_DEPOSIT } from "../mock/fixtures";
  import { type Scenario, SCENARIOS } from "../mock/scenarios";
  import { formatCents, formatUsdc, parseAmount } from "../money";
  import { Body, Btn, Card, Chip, Field, KV, T, Tag, Warn } from "../../ui/primitives";
  import { useTheme } from "../../ui/ThemeProvider";

  export function DemoPanelScreen({ nav, module, faceId, notifications }: AppCtx) {
    const { c } = useTheme();
    const { state, events, api } = module;
    const { busy, error, run } = useAction();
    const [scenario, setScenario] = useState<Scenario>(api.getScenario());
    const [amount, setAmount] = useState(formatCents(DEFAULT_DEPOSIT.amountMxnCents).replace(/,/g, ""));
    const [concept, setConcept] = useState<string>(DEFAULT_DEPOSIT.concept);
    const [reference, setReference] = useState<string>(DEFAULT_DEPOSIT.reference);
    const amountCents = parseAmount(amount);
    const pick = (s: Scenario) => { void api.setScenario(s).then(() => setScenario(s)); };
    const pay = async () => { if (amountCents === null) return; await run(() => api.simulateEmployerDeposit({ amountMxnCents: amountCents, concept, reference })); };
    const reset = () => {
      Alert.alert(t("demo.resetTitle"), t("demo.resetBody"), [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("demo.resetConfirm"), style: "destructive", onPress: () => { void api.reset().then(() => nav("benefits")); } },
      ]);
    };
    const rows = [["module", state.module], ["kyc", state.kyc.status], ["wallet", state.wallet.status], ["card", state.card.status], ["pass", state.pass.status], ["bank", state.bank.status], ["send", state.send.status]] as const;
    return (
      <Body gap={14}>
        <Warn tone="info" title={t("demo.title")} body={t("demo.body")} />
        <Tag>{t("demo.scenarioTag")}</Tag>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {SCENARIOS.map((s) => <Chip key={s} label={t(`scenario.${s}`)} on={s === scenario} onPress={() => pick(s)} accessibilityLabel={`scenario-${s}`} />)}
        </View>
        <T w={400} s={12} lh={1.45} color={c.ink55}>{t(`scenario.${scenario}.hint`)}</T>
        <Tag>{t("demo.stateTag")}</Tag>
        <Card gap={6}>
          {rows.map(([k, v]) => <KV key={k} k={k} v={v} />)}
          <KV k={t("demo.kvBalance")} v={formatUsdc(state.balanceUsdcCents)} />
          <KV k={t("demo.kvFaceId")} v={faceId.available === null ? "…" : faceId.available ? t("common.yes") : t("demo.faceIdSimulated")} />
          <KV k={t("demo.kvPush")} v={notifications.permission} />
        </Card>
        <Tag>{t("demo.payTag")}</Tag>
        <Field label={t("demo.payAmount")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" accessibilityLabel="demo-amount" />
        <Field label={t("demo.payConcept")} value={concept} onChangeText={setConcept} accessibilityLabel="demo-concept" />
        <Field label={t("demo.payReference")} value={reference} onChangeText={setReference} autoCapitalize="characters" accessibilityLabel="demo-reference" />
        {error ? <T w={400} s={12.5} lh={1.4} color={c.error}>{error}</T> : null}
        <Btn label={t("demo.payCta")} icon="banknote" variant="brand" busy={busy} disabled={!module.active || amountCents === null} onPress={() => { void pay(); }} accessibilityLabel="demo-pay" />
        {!module.active ? <T w={400} s={12} lh={1.45} color={c.ink55}>{t("demo.payNeedsActive")}</T> : null}
        <Tag>{t("demo.eventsTag")}</Tag>
        {events.length === 0 ? <Card><T w={400} s={13} lh={1.45} color={c.ink55}>{t("demo.noEvents")}</T></Card> : [...events].reverse().map((e) => (
          <Card key={e.id} gap={4} pad={12}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <T w={600} s={12.5} mono>{e.type}</T>
              <T w={500} s={10.5} mono color={c.ink55}>{formatWhen(e.at)}</T>
            </View>
            <T w={400} s={11} lh={1.4} mono color={c.ink72}>{JSON.stringify(e.payload)}</T>
          </Card>
        ))}
        <Btn label={t("demo.reset")} icon="bug" variant="danger" onPress={reset} accessibilityLabel="demo-reset" />
        <Btn label={t("demo.goBenefits")} variant="ghost" onPress={() => nav("benefits")} />
      </Body>
    );
  }
  ```

- [ ] **Paso 3: registrar y limpiar.** En `index.ts` entradas `settings` y `demoPanel`; quitar el import de `PlaceholderScreen` y `git rm src/relayer/screens/placeholder.tsx`. `npm run typecheck </dev/null` debe quedar en cero (ninguna entrada sigue apuntando al placeholder).

- [ ] **Paso 4: verificar en simulador** con `docs/walkthrough.md` todavía por escribir (Task 16) — como mínimo: toque largo 5 s en «powered by Relayer» (Saldo) abre el panel; cambiar a `send_failed`, volver, enviar: el recibo termina en «Falló» con el saldo de vuelta; «Simular pago de Acme» crea el movimiento y la notificación; «Reiniciar demo» vuelve a Beneficios con «Activar».

- [ ] **Paso 5: commit.**

  ```bash
  git rm -q src/relayer/screens/placeholder.tsx
  git add src/relayer/screens/settings.tsx src/relayer/screens/demoPanel.tsx src/relayer/screens/index.ts
  git commit -m "feat(recibo): module settings (export, support, deactivate) and the hidden demo panel" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

---

# Fase F — Documentación y puertas finales

### Task 16: `docs/data-model.md`, `docs/events.md`, `docs/walkthrough.md` y README

**Files:**
- Create: `docs/data-model.md`, `docs/events.md`, `docs/walkthrough.md`
- Rewrite: `README.md`
- Modify: `CLAUDE.md` (una línea: Face ID del simulador y panel de demo)

- [ ] **Paso 1: `docs/data-model.md`** (lo que el backend real persistirá; espejo de `src/relayer/types.ts` y del spec):

  ```markdown
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
  ```

- [ ] **Paso 2: `docs/events.md`** (contrato de webhooks hacia la empresa):

  ````markdown
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
  ````

- [ ] **Paso 3: `docs/walkthrough.md`** (checklist manual por escenario):

  ```markdown
  # Recibo · recorrido manual en simulador

  Antes: `npx expo prebuild --platform ios --clean </dev/null && npx expo run:ios </dev/null`; inscribir Face ID en el simulador
  (Features → Face ID → Enrolled; al pedirlo, Features → Face ID → Matching Face). Sin inscripción la ceremonia se da por buena a los 600 ms.
  El panel de demo: mantener 5 s «powered by Relayer» (Saldo, Ajustes o cualquier pantalla del módulo). «Reiniciar demo» entre escenarios.

  ## happy
  - [ ] Inicio muestra «Hola, Ana» y la tarjeta Recibo con «Activar»; Beneficios muestra «Recibo · powered by Relayer» → Activar.
  - [ ] Activar → Empezar → Términos: el botón se habilita sólo con la casilla → Aceptar y continuar.
  - [ ] KYC → Abrir verificación → tres pasos → Regresar a Acme → «En revisión» ~2.5 s → Passkey.
  - [ ] Crear con Face ID → dirección con QR → Continuar → Saldo en 0.00; a los ~4 s llega «Nómina · 2.ª quincena» (banner + fila) y el saldo marca 492.75 USDC ≈ $8,499.94 MXN (ida y vuelta del redondeo: documentado).
  - [ ] Tocar la nómina → Depósito con empresa, concepto, referencia, hash y Copiar.
  - [ ] Saldo → Tarjeta → Pedir tarjeta → Solicitada → Endorsement pendiente (~4 s) → Autorizar con Face ID → Tarjeta: Ver datos muestra PAN y CVV; Congelar atenúa el arte; Descongelar.
  - [ ] Agregar al teléfono → Apple Wallet → «Tu tarjeta está en Apple Wallet» → Volver a la tarjeta muestra la fila «En tu teléfono».
  - [ ] Saldo → Enviar → CLABE `012 1800 0123 4567 899` (BBVA México) → Verificando (~3 s) → Verificada → Enviar a banco.
  - [ ] En pesos: 500 → hint «28.99 USDC → $497.66 MXN después de comisión» (28.99 USDC − 0.14 de comisión = 28.85 × 17.25) → Cotizar → revisar comisión y vence en 60 s → Confirmar con Face ID → Recibo «Enviado» → «Completado» (~3.5 s) con folio RCB-… → Compartir abre la hoja.
  - [ ] Saldo: la fila del envío aparece arriba con «−»; Ajustes (⚙) → Exportar movimientos abre la hoja con el CSV.
  - [ ] Perfil → Apariencia Oscuro: toda la app cambia (fondo carbon, marca turquesa); Sistema vuelve a seguir el simulador.
  - [ ] Panel de demo: eventos en orden kyc.approved · module.activated · wallet.ready · deposit.received · card.issued · withdrawal.completed.
  - [ ] Ajustes → Desactivar Recibo → confirmar → Beneficios vuelve a «Activar»; el panel lista module.deactivated.

  ## kyc_rejected
  - [ ] Panel → escenario «KYC rechazado» → Reiniciar demo → activar hasta Regresar a Acme → «No aprobada» con dos razones legibles.
  - [ ] Intentar de nuevo → la intro del KYC muestra el aviso «Tu intento anterior…»; cambiar a happy en el panel y repetir: aprobado.

  ## cards_unavailable_region
  - [ ] Escenario «Tarjeta no disponible» → activar → Tarjeta → Pedir tarjeta → aviso «Todavía no en tu país» con «Avisarme cuando esté»; el saldo y el envío siguen funcionando.

  ## endorsement_expired
  - [ ] Escenario «Endorsement vencido» → activar → Tarjeta → Pedir tarjeta → «Pasaron más de 24 horas» → Confirmar mis datos → En revisión (~1.5 s) → vuelve a Tarjeta con el estado limpio → Pedir tarjeta funciona.

  ## bank_verification_failed
  - [ ] Escenario «CLABE no verificada» → Enviar → CLABE `072 2250 0987 6543 217` → Verificando → «No pudimos confirmar la titularidad» → otra CLABE (`014 1800 0555 6667 772`) vuelve a Verificando.

  ## send_failed
  - [ ] Escenario «Envío fallido» (con CLABE verificada en happy) → enviar 500 MXN → Recibo «Enviado» → «Falló» con «El banco rechazó…»; Saldo recuperó el monto y la fila queda en «Fallido»; el panel no lista withdrawal.completed.

  ## Notificación y deep link
  - [ ] Panel → Simular pago de Acme (1000 MXN, «Bono», ACME-BONO-1) → banner «Te pagó Acme Beneficios» → tocarlo abre el Depósito.
  - [ ] Con el KYC en el paso Domicilio, desde la terminal: `xcrun simctl openurl booted "relayermobiledemo://recibo/kyc-return"` → la app pasa a «En revisión».
  ```


- [ ] **Paso 4: `README.md`** completo:

  ````markdown
  # relayer-mobiledemo

  Demo Expo del módulo **Recibo** («powered by Relayer») embebido en una app de beneficios genérica, **Acme Beneficios**.
  Todo corre contra una capa mock: no hay backend, ni Bridge, ni Turnkey, ni Stripe. Spec: `docs/specs/2026-11-11-relayer-mobiledemo-design.md`.

  - Anfitriona: Inicio · Beneficios · Perfil (relleno estático). Beneficios tiene la tarjeta «Recibo · powered by Relayer».
  - Módulo: activar → términos → KYC (proveedor simulado, regreso por deep link) → passkey con Face ID → saldo y depósitos → tarjeta Visa virtual
    (pedir, autorizar on-chain, ver, congelar, agregar al teléfono) → CLABE con verificación → envío por SPEI con cotización → recibo → ajustes.
  - Panel de demo oculto (5 s sobre «powered by Relayer»): escenarios, simular pago de Acme, eventos que recibiría la empresa, reiniciar.
  - Docs: `docs/data-model.md` (lo que persistirá el backend), `docs/events.md` (webhooks a la empresa), `docs/walkthrough.md` (checklist manual).

  ## Correr

  ```bash
  npm install
  npx expo prebuild --platform ios --clean   # genera ./ios (gitignored); repetir tras cambiar deps nativas o assets
  npx expo run:ios                            # build + simulador por defecto (o --device <nombre-o-udid>)
  npx expo start --ios                        # sólo Metro, con el dev client ya instalado
  npm test && npm run typecheck
  ```

  Face ID del simulador se pierde al reiniciarlo: Features → Face ID → Enrolled antes de un recorrido; sin inscripción la ceremonia se simula.
  Deep link de prueba: `xcrun simctl openurl booted "relayermobiledemo://recibo/kyc-return"`.

  ## Arquitectura

  ```
  App.tsx                 fuentes, ThemeProvider, AppCtx (store + module + faceId + notifications), deep link, Navigator
  src/ui/                 theme.ts (tokens Relayer light/dark, portados de relayer-core apps/web/app/tokens.css), primitives, Page, TabBar
  src/navigation/         screens.ts / routes.ts (tabla pura + gate por módulo activo), ref.ts (adaptador), Navigator.tsx
  src/relayer/            types.ts · api.ts (RelayerModuleApi, la frontera) · state.ts (máquina pura) · money.ts · clabe.ts
  src/relayer/mock/       mockApi.ts (memoria + latencias 300–1200 ms + procesos de fondo) · scenarios.ts · fixtures.ts
  src/relayer/screens/    las 17 pantallas del módulo
  src/host/screens/       las 3 de Acme
  src/i18n/es.ts          todo el copy
  __tests__/              lógica pura (jest-expo)
  ```

  La fase de backend reemplaza `createMockApi` en `App.tsx` por un cliente HTTP que implemente `RelayerModuleApi`; las pantallas no cambian.

  ## Identidad

  `fi.relayer.mobiledemo`, esquema `relayermobiledemo://`, nombre «Acme Beneficios». Icono y splash son placeholders (`node scripts/make-placeholder-assets.mjs`).
  TestFlight: `scripts/ios-archive.sh` y `scripts/ios-upload.sh` (heredados; requieren `.env.asc` con la API key de App Store Connect, nunca commiteado;
  subir `ios.buildNumber` en `app.config.ts` antes de cada subida).
  ````

- [ ] **Paso 5: `CLAUDE.md`.** Agregar al final de la lista:

  ```
  - Panel de demo: 5 s sobre «powered by Relayer». Face ID del simulador: inscribirlo antes de un recorrido (sin inscripción se simula). Checklist: `docs/walkthrough.md`.
  ```

- [ ] **Paso 6: commit.**

  ```bash
  git add docs/data-model.md docs/events.md docs/walkthrough.md README.md CLAUDE.md
  git commit -m "docs: data model, event contract, manual walkthrough and README for the Recibo demo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
  ```

### Task 17: puertas finales

**Files:** ninguno nuevo; sólo verificación (y, si algo falla, el arreglo con su propio commit).

- [ ] **Paso 1: estático.**

  ```bash
  npm run typecheck </dev/null       # 0 errores
  npm test </dev/null                # 14 suites verdes: theme, variants, tabBarLayout, storage-theme, i18n, routes, deepLink, store, state, money, scenarios, mockApi, notify, export
  grep -rn "#[0-9A-Fa-f]\{6\}" src --include='*.tsx' --include='*.ts' | grep -v "src/ui/theme.ts"   # debe salir vacío: hex sólo en theme.ts
  grep -rn "from \"../mock\|from \"../../relayer/mock\|from \"./mock" src/relayer/screens src/host src/ui src/hooks | grep -v demoPanel.tsx   # vacío: sólo demoPanel y App.tsx importan el mock
  grep -rn "PICKLER\|pickler\|Perpl\|Monad" src App.tsx app.config.ts package.json   # vacío
  ```

- [ ] **Paso 2: bundle.**

  ```bash
  npx expo export --platform ios --output-dir /tmp/relayer-mobiledemo-export </dev/null
  ls /tmp/relayer-mobiledemo-export/_expo/static/js/ios/   # un .hbc o .js
  rm -rf /tmp/relayer-mobiledemo-export
  ```

  Si `expo export` no es viable sin red (p. ej. pide descargar algo), la alternativa es `npx expo prebuild --platform ios --no-install </dev/null` seguida de `npx react-native bundle --platform ios --dev false --entry-file index.ts --bundle-output /tmp/main.jsbundle </dev/null` y comprobar que `/tmp/main.jsbundle` existe y pesa más de 1 MB.

- [ ] **Paso 3: simulador.** `npx expo prebuild --platform ios --clean </dev/null && npx expo run:ios </dev/null`; recorrer `docs/walkthrough.md` completo (los seis escenarios, la notificación y el deep link). Para iterar en JS sin rebuild nativo: `npx expo start --ios </dev/null` con el dev client ya instalado. Cualquier desviación se corrige en la pantalla correspondiente con un commit `fix(recibo): …` con el trailer.

- [ ] **Paso 4: estado del árbol.** `git status` limpio (sin archivos sin seguimiento salvo `ios/` y `build/`, ignorados). `git log --oneline` muestra los 15 commits de este plan encima de `7d9e018`.

---

## Auto-revisión del plan (hecha al escribirlo)

- **Cobertura del spec:** D1 (Tasks 1, 6, 10), D2 (fixtures Task 8, copy Task 5), D3 (passkey Task 12, autorización Task 13, envío Task 14), D4 (Tasks 3–4, PoweredBy Task 11), D5 (KYC links Task 8, regla 24 h Task 7, CLABE/0.01 MXN Task 14, mínimo 50 MXN Task 7, push provisioning Task 13), D6 (api.ts Task 8, App.tsx Task 10), D7 (Task 5), D8 (useFaceId Task 9), D9 (scripts Task 2, gates Task 17). Máquina de estados: Task 7. Capa mock + escenarios + depósito simulado + notificación: Tasks 8–9, 15. Modelo de datos y eventos: Task 16. Las 16 pantallas: Beneficios (10), 2–5 (11), 6–8 (12), 9–12 (13), 13–15 (14), 16 (15). Deep link: Tasks 6, 10, 11. Tests del spec: state, money, routes, theme, scenarios (+ i18n, mockApi, notify, export, deepLink, store, storage-theme).
- **Desviaciones declaradas:** `RelayerModuleApi` lleva dos métodos más que la lista del spec (`deactivate`, `reconfirmKyc`) y `freezeCard(frozen)` cubre congelar y descongelar; `Movement.kind` no incluye `card_purchase` (no hay pantalla que lo genere). El orden de tareas pone i18n (Task 5) antes de navegación porque `headerFor` la importa.
- **Consistencia de nombres:** `useTheme().c` + `Palette`; `btnVariants(c)` con variantes `primary|brand|control|outline|ghost|danger`; `tone(c, name)`; `Body` (padding) vs `Page` (ruta); `MODULE_COMPONENTS`/`MODULE_HEADER_RIGHT`; `ctx.module.api` (`MockApi = RelayerModuleApi & RelayerDemoApi`); `useAction()` → `{ busy, error, code, run, setError }`; `requireModule` (gate) / `nav` / `back` / `switchTab`; `S.next|depositId|receiptId`; claves i18n listadas en Task 5 y usadas tal cual en Tasks 10–15.

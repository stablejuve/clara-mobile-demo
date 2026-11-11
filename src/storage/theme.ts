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

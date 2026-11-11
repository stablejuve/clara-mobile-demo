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

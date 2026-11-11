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

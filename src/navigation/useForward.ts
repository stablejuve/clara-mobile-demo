import { StackActions, useIsFocused, useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import type { Screen } from "./screens";

/**
 * Salto automático de una pantalla de paso a la siguiente (KYC aprobado → passkey, tarjeta autorizada → tarjeta, …).
 * Reemplaza la pantalla actual en su pila en vez de apilar: así «atrás» no regresa a un paso que vuelve a reenviar
 * (el bucle tarjeta ↔ autorizar). Solo actúa si la pantalla está en foco; las que quedan montadas bajo la pila no navegan.
 */
export function useForward(): { focused: boolean; forward: (screen: Screen) => void } {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const forward = useCallback((screen: Screen) => {
    if (navigation.isFocused()) navigation.dispatch(StackActions.replace(screen));
  }, [navigation]);
  return { focused, forward };
}

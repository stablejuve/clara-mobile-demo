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

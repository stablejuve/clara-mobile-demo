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

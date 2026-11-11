/** Fecha corta en es-MX: "11 nov, 12:00". */
export const formatWhen = (at: number): string =>
  new Date(at).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** 0x7A3f…1E3f */
export const shortAddress = (address: string | null): string => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—");

/** Soporte del módulo (ilustrativo). */
export const SUPPORT_URL = "mailto:soporte@relayer.example";

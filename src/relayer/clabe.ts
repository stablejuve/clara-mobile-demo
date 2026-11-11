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

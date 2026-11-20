// Cuentas guardadas para retirar (beneficiarios), en Colombia. Asistente «Nueva cuenta»: de quién es → identidad → cuenta →
// revisar. Los datos son los que Bridge pide para una cuenta externa en pesos colombianos: una llave Bre-B, o una cuenta bancaria
// con banco, tipo y número de cuenta, documento del titular y teléfono. Puro: borrador, pasos, validación, ejemplo y lo que se
// guarda.

export type BeneOwner = "self" | "individual" | "business";
export const BENE_OWNERS: readonly BeneOwner[] = ["self", "individual", "business"];
export type BeneMethod = "bre_b" | "bank";
export const BENE_METHODS: readonly BeneMethod[] = ["bank", "bre_b"];
export type AccountType = "savings" | "checking";
export const ACCOUNT_TYPES: readonly AccountType[] = ["savings", "checking"];
/** Documento del titular: cédula de ciudadanía, cédula de extranjería, NIT (empresas) o pasaporte. */
export type DocType = "cc" | "ce" | "nit" | "passport";
export const DOC_TYPES: readonly DocType[] = ["cc", "ce", "nit", "passport"];

/** Bancos de la demo (ficticios), con el código que se mandaría a Bridge. */
export const BANKS: Record<string, string> = { "9001": "Banco Andino", "9002": "Banco del Café", "9003": "Banco Cordillera" };
export const BANK_CODES: readonly string[] = Object.keys(BANKS);

export type BeneStep = "owner" | "identity" | "bank" | "review";
export const BENE_STEPS: readonly BeneStep[] = ["owner", "identity", "bank", "review"];

export type BeneDraft = {
  owner: BeneOwner;
  firstName: string; lastName: string; businessName: string; alias: string;
  method: BeneMethod; breBKey: string;
  bankCode: string; accountType: AccountType; accountNumber: string; docType: DocType; docNumber: string; phone: string;
  confirm: boolean;
};
export const EMPTY_BENE: BeneDraft = {
  owner: "self", firstName: "", lastName: "", businessName: "", alias: "",
  method: "bank", breBKey: "", bankCode: "", accountType: "savings", accountNumber: "", docType: "cc", docNumber: "", phone: "",
  confirm: false,
};

/** `verifying`: Bridge está validando la cuenta · `verified`: lista para recibir · `failed`: la cuenta no existe o no coincide. */
export type BeneStatus = "verifying" | "verified" | "failed";
export type Beneficiary = {
  id: string; owner: BeneOwner; name: string; alias: string; method: BeneMethod;
  /** Nombre del banco, o «Bre-B» si es una llave. */ bankName: string;
  /** Número de cuenta o llave Bre-B. */ account: string;
  status: BeneStatus; createdAt: number;
};

const digits = (v: string) => v.replace(/\D/g, "");
/** Llave Bre-B: celular, documento, correo o llave alfanumérica (6 a 40 caracteres, sin espacios). */
export const breBValid = (k: string): boolean => /^[A-Za-z0-9@._-]{6,40}$/.test(k.trim());
/** Cuenta bancaria colombiana: de 9 a 16 dígitos. */
export const accountValid = (n: string): boolean => /^\d{9,16}$/.test(n);
/** Documento: de 6 a 10 dígitos (el pasaporte admite letras). */
export const docValid = (type: DocType, n: string): boolean => (type === "passport" ? /^[A-Z0-9]{6,12}$/i.test(n.trim()) : /^\d{6,10}$/.test(n.trim()));

/** Campos que faltan o están mal en un paso (claves de copy `bene.f.*`); vacío = paso completo. */
export function beneMissing(d: BeneDraft, step: BeneStep): string[] {
  const m: string[] = [];
  switch (step) {
    case "owner": return m;
    case "identity":
      if (d.owner === "business") { if (!d.businessName.trim()) m.push("businessName"); }
      else { if (!d.firstName.trim()) m.push("firstName"); if (!d.lastName.trim()) m.push("lastName"); }
      return m;
    case "bank":
      if (d.method === "bre_b") { if (!breBValid(d.breBKey)) m.push("breBKey"); return m; }
      if (!BANKS[d.bankCode]) m.push("bankCode");
      if (!accountValid(d.accountNumber)) m.push("accountNumber");
      if (!docValid(d.docType, d.docNumber)) m.push("docNumber");
      if (digits(d.phone).length !== 10) m.push("phone");
      return m;
    case "review":
      if (!d.confirm) m.push("confirm");
      return m;
  }
}
export const stepDone = (d: BeneDraft, s: BeneStep): boolean => beneMissing(d, s).length === 0;
export const beneDone = (d: BeneDraft): boolean => BENE_STEPS.every((s) => stepDone(d, s));

/** Nombre del titular como lo verá Bridge. */
export const holderName = (d: BeneDraft): string => (d.owner === "business" ? d.businessName.trim() : `${d.firstName.trim()} ${d.lastName.trim()}`.trim());

/** Ejemplo de un toque por tipo de titular (datos ficticios). La cuenta propia toma el nombre del empleado. */
export function fillBene(d: BeneDraft, step: BeneStep, self: { firstName: string; lastName: string }): BeneDraft {
  const WHO: Record<BeneOwner, Partial<BeneDraft>> = {
    self: { firstName: self.firstName, lastName: self.lastName, alias: "Banco del Café" },
    individual: { firstName: "Laura", lastName: "Méndez Ríos", alias: "Laura" },
    business: { businessName: "Papelería Luna S.A.S.", alias: "Papelería Luna" },
  };
  const ACCOUNT: Record<BeneOwner, Partial<BeneDraft>> = {
    self: { method: "bank", bankCode: "9002", accountType: "savings", accountNumber: "45612378901", docType: "cc", docNumber: "1020304050", phone: "300 123 4567" },
    individual: { method: "bre_b", breBKey: "3109876543" },
    business: { method: "bank", bankCode: "9003", accountType: "checking", accountNumber: "78945612300", docType: "nit", docNumber: "900123456", phone: "601 555 0188" },
  };
  switch (step) {
    case "identity": return { ...d, ...WHO[d.owner] };
    case "bank": return { ...d, ...ACCOUNT[d.owner] };
    case "review": return { ...d, confirm: true };
    default: return d;
  }
}

/** Lo que se guarda al terminar el asistente (queda en verificación). */
export function toBeneficiary(d: BeneDraft, id: string, now: number): Beneficiary {
  const bank = d.method === "bank";
  return {
    id, owner: d.owner, name: holderName(d), alias: d.alias.trim(), method: d.method,
    bankName: bank ? BANKS[d.bankCode] : "Bre-B", account: bank ? d.accountNumber : d.breBKey.trim(), status: "verifying", createdAt: now,
  };
}

/** Cuerpo con forma de Bridge para crear la cuenta externa en pesos (`POST /v0/customers/{id}/external_accounts`). */
export function toExternalAccount(d: BeneDraft): Record<string, unknown> {
  const base = { currency: "cop", account_owner_name: holderName(d), account_owner_type: d.owner === "business" ? "business" : "individual" };
  if (d.method === "bre_b") return { ...base, account_type: "bre_b", account: { bre_b_key: d.breBKey.trim() } };
  return {
    ...base, account_type: "co_bank_transfer", ...(d.owner === "business" ? {} : { first_name: d.firstName.trim(), last_name: d.lastName.trim() }),
    account: { document_type: d.docType, document_number: d.docNumber.trim(), bank_code: d.bankCode, account_number: d.accountNumber, account_type: d.accountType, phone_number: `+57${digits(d.phone)}` },
  };
}

/** «Laura» (o el nombre si no tiene alias). */
export const beneTitle = (b: Pick<Beneficiary, "alias" | "name">): string => b.alias || b.name;
/** «Banco Andino •••• 7890». */
export const beneBank = (b: Pick<Beneficiary, "bankName" | "account">): string => `${b.bankName} •••• ${b.account.slice(-4)}`;
/** Iniciales del avatar: nombre + primer apellido («Laura Méndez Ríos» → «LM»); empresas sin «S.A.S.». */
export function initials(name: string): string {
  const w = name.replace(/\s+S\.?\s?A\.?.*$/i, "").trim().split(/\s+/).filter(Boolean);
  const second = w.length >= 3 ? w[w.length - 2] : w[1];
  return ((w[0]?.[0] ?? "") + (second?.[0] ?? "")).toUpperCase() || "·";
}
/** La cuenta propia primero; después, lo más reciente. */
export const sortBenes = (list: readonly Beneficiary[]): Beneficiary[] =>
  [...list].sort((a, b) => (a.owner === "self" ? -1 : 0) - (b.owner === "self" ? -1 : 0) || b.createdAt - a.createdAt);

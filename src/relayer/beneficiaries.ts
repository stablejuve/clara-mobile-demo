import { bankFor, clabeValid } from "./clabe";
import type { Beneficiary, BeneficiaryOwner, NewBeneficiary } from "./types";

// Asistente «Nueva cuenta» (como `add-beneficiary-wizard` de relayer-core): tipo de titular → identidad → domicilio (terceros)
// → CLABE → revisar. Puro: borrador, pasos, validación, ejemplo y lo que se manda a `addBeneficiary`.

export type BeneStep = "owner" | "identity" | "address" | "bank" | "review";
export type BeneDraft = {
  owner: BeneficiaryOwner;
  firstName: string; lastName: string; businessName: string; alias: string; email: string;
  street: string; city: string; state: string; postalCode: string;
  clabe: string; rfc: string; confirm: boolean;
};
export const EMPTY_BENE: BeneDraft = {
  owner: "individual", firstName: "", lastName: "", businessName: "", alias: "", email: "",
  street: "", city: "", state: "", postalCode: "", clabe: "", rfc: "", confirm: false,
};

/** Cuenta propia: se salta el domicilio (ya está en el KYC), igual que en relayer-core. */
export const stepsFor = (owner: BeneficiaryOwner): readonly BeneStep[] =>
  owner === "self" ? ["owner", "identity", "bank", "review"] : ["owner", "identity", "address", "bank", "review"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

/** Campos que faltan o están mal en un paso (claves `bene.field.*`). */
export function beneMissing(d: BeneDraft, step: BeneStep): string[] {
  const m: string[] = [];
  switch (step) {
    case "owner": return m;
    case "identity":
      if (d.owner === "business") { if (!d.businessName.trim()) m.push("businessName"); }
      else { if (!d.firstName.trim()) m.push("firstName"); if (!d.lastName.trim()) m.push("lastName"); }
      if (d.email.trim() && !EMAIL_RE.test(d.email.trim())) m.push("email");
      return m;
    case "address":
      if (!d.street.trim()) m.push("street");
      if (!d.city.trim()) m.push("city");
      if (!d.state.trim()) m.push("state");
      if (!/^\d{5}$/.test(d.postalCode)) m.push("postalCode");
      return m;
    case "bank":
      if (!clabeValid(d.clabe)) m.push("clabe");
      if (d.rfc.trim() && !RFC_RE.test(d.rfc.trim().toUpperCase())) m.push("rfc");
      return m;
    case "review":
      if (!d.confirm) m.push("confirm");
      return m;
  }
}
export const stepDone = (d: BeneDraft, s: BeneStep) => beneMissing(d, s).length === 0;

/** Nombre del titular como lo verá Bridge. */
export const holderName = (d: BeneDraft) => (d.owner === "business" ? d.businessName.trim() : `${d.firstName.trim()} ${d.lastName.trim()}`.trim());

/** Ejemplo de un toque por tipo de titular (datos ficticios). `self` toma el nombre del KYC. */
export function fillBene(d: BeneDraft, step: BeneStep, self: { firstName: string; lastName: string }): BeneDraft {
  const S: Record<BeneficiaryOwner, Partial<BeneDraft>> = {
    self: { firstName: d.firstName || self.firstName || "Ana Lucía", lastName: d.lastName || self.lastName || "Torres Medina", alias: "Mi Banorte", email: "" },
    individual: { firstName: "Luis Fernando", lastName: "Gómez Paredes", alias: "Luis (roomie)", email: "luis.gomez@correo.example" },
    business: { businessName: "Papelería Lupita S.A. de C.V.", alias: "Papelería", email: "cobranza@lupita.example" },
  };
  const ADDR: Partial<BeneDraft> = { street: "Av. Revolución 820", city: "Benito Juárez", state: "Ciudad de México", postalCode: "03720" };
  const BANK: Record<BeneficiaryOwner, Partial<BeneDraft>> = {
    self: { clabe: "072180001122334459", rfc: "" },
    individual: { clabe: "002180700912345673", rfc: "" },
    business: { clabe: "021180040053362816", rfc: "PLU150923QX4" },
  };
  switch (step) {
    case "identity": return { ...d, ...S[d.owner] };
    case "address": return { ...d, ...ADDR };
    case "bank": return { ...d, ...BANK[d.owner] };
    case "review": return { ...d, confirm: true };
    default: return d;
  }
}

export function toNewBeneficiary(d: BeneDraft): NewBeneficiary {
  return {
    owner: d.owner, name: holderName(d), alias: d.alias.trim(), email: d.email.trim(), rfc: d.rfc.trim().toUpperCase(),
    address: d.owner === "self" ? null : { street: d.street.trim(), city: d.city.trim(), state: d.state.trim(), postalCode: d.postalCode },
    clabe: d.clabe,
  };
}

/** «Mamá» (o el nombre si no tiene alias). */
export const beneTitle = (b: Pick<Beneficiary, "alias" | "name">) => b.alias || b.name;
/** «Banorte ···· 4310». */
export const beneBank = (b: Pick<Beneficiary, "bankName" | "clabe">) => `${b.bankName || bankFor(b.clabe) || "Banco"} ···· ${b.clabe.slice(-4)}`;
/** Iniciales del avatar: nombre + primer apellido («Ana Lucía Torres Medina» → «AT»); empresas sin «S.A. de C.V.». */
export function initials(name: string): string {
  const w = name.replace(/\s+S\.?\s?A\.?.*$/i, "").trim().split(/\s+/).filter(Boolean);
  const second = w.length >= 3 ? w[w.length - 2] : w[1];
  return ((w[0]?.[0] ?? "") + (second?.[0] ?? "")).toUpperCase() || "·";
}

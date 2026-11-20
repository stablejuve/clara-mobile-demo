// Expediente KYC del empleado (persona física en Colombia): los mismos bloques que Bridge pide para crear al cliente
// (`POST /v0/customers`): datos personales, domicilio, identificación con foto + número tributario (NIT/RUT), prueba de vida y
// evaluación de riesgo («uso de la cuenta»). Puro: validación, datos de ejemplo para «Llenar con ejemplo», el cuerpo con forma de
// Bridge y el mapeo de razones de rechazo a la sección que hay que rehacer.

export type KycSection = "personal" | "address" | "id" | "selfie" | "usage";
export const KYC_SECTIONS: readonly KycSection[] = ["personal", "address", "id", "selfie", "usage"];

export type IdType = "cedula" | "passport";
export const ID_TYPES: readonly IdType[] = ["cedula", "passport"];

export type KycPersonal = { firstName: string; middleName: string; lastName: string; email: string; phone: string; birthDate: string; nationality: string };
export type KycAddress = { streetLine1: string; streetLine2: string; city: string; subdivision: string; postalCode: string; country: string };
/** `front`/`back`: la foto ya está agregada. En la demo no hay cámara: se agrega una credencial de muestra dibujada. */
export type KycId = { type: IdType; number: string; expiration: string; taxId: string; front: boolean; back: boolean };
/** `ownUse`: el empleado confirma que la cuenta es para él. No se puede usar a nombre de otra persona, así que es obligatorio. */
export type KycUsage = { accountPurpose: string; employmentStatus: string; occupation: string; monthlyPayments: string; sourceOfFunds: string; ownUse: boolean };
export type KycDraft = { personal: KycPersonal; address: KycAddress; id: KycId; selfie: boolean; usage: KycUsage };

/** Catálogos de Bridge (sus mismos códigos). */
export const ACCOUNT_PURPOSES = ["receive_salary", "personal_or_living_expenses", "purchase_goods_and_services", "payments_to_friends_or_family_abroad", "protect_wealth", "other"] as const;
export const EMPLOYMENT = ["employed", "self_employed", "student", "retired", "homemaker", "unemployed"] as const;
export const MONTHLY = ["0_4999", "5000_9999", "10000_49999", "50000_plus"] as const;
export const SOURCES = ["salary", "savings", "investments_loans", "pension_retirement", "government_benefits", "inheritance"] as const;
export const NATIONALITIES = ["COL", "MEX", "USA", "ARG", "ESP"] as const;
export const DEPARTMENTS_CO = ["Bogotá D.C.", "Antioquia", "Valle del Cauca", "Atlántico", "Cundinamarca", "Santander", "Bolívar"] as const;

export const EMPTY_DRAFT: KycDraft = {
  personal: { firstName: "", middleName: "", lastName: "", email: "", phone: "", birthDate: "", nationality: "COL" },
  address: { streetLine1: "", streetLine2: "", city: "", subdivision: "", postalCode: "", country: "COL" },
  id: { type: "cedula", number: "", expiration: "", taxId: "", front: false, back: false },
  selfie: false,
  usage: { accountPurpose: "", employmentStatus: "", occupation: "", monthlyPayments: "", sourceOfFunds: "", ownUse: false },
};

/** Datos de ejemplo por hoja (ficticios: Alex Rivera, el empleado de la demo). */
export const SAMPLE: KycDraft = {
  personal: { firstName: "Alex", middleName: "", lastName: "Rivera Gómez", email: "alex.rivera@acme.example", phone: "300 123 4567", birthDate: "1994-03-18", nationality: "COL" },
  address: { streetLine1: "Cra. 7 # 71-21, Apto 502", streetLine2: "Chapinero", city: "Bogotá", subdivision: "Bogotá D.C.", postalCode: "110231", country: "COL" },
  id: { type: "cedula", number: "1020304050", expiration: "", taxId: "1020304050-7", front: true, back: true },
  selfie: true,
  usage: { accountPurpose: "receive_salary", employmentStatus: "employed", occupation: "Diseñador de producto", monthlyPayments: "0_4999", sourceOfFunds: "salary", ownUse: true },
};

export function fillSample(d: KycDraft, s: KycSection): KycDraft {
  return { ...d, [s]: SAMPLE[s] };
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const filled = (v: string) => v.trim().length > 0;

/** Mayor de edad a la fecha `now`. */
export function isAdult(birthDate: string, now: Date): boolean {
  const m = DATE_RE.exec(birthDate);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const age = now.getFullYear() - y - (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d) ? 1 : 0);
  return age >= 18 && age < 120;
}
/** NIT de persona natural: la cédula (6 a 10 dígitos) con dígito de verificación opcional («1020304050-7»). */
export const taxIdValid = (v: string): boolean => /^\d{6,10}(-?\d)?$/.test(v.trim());
export const emailValid = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
/** Celular colombiano: 10 dígitos. */
export const phoneValid = (p: string): boolean => p.replace(/\D/g, "").length === 10;
/** Código postal colombiano: 6 dígitos. */
export const postalValid = (cp: string): boolean => /^\d{6}$/.test(cp.trim());
/** Vigencia AAAA-MM no vencida. */
export function expirationValid(exp: string, now: Date): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(exp.trim());
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return false;
  return Number(m[1]) * 12 + Number(m[2]) >= now.getFullYear() * 12 + now.getMonth() + 1;
}

/** Campos que faltan o están mal en una hoja (claves de copy `kyc.f.*`); vacío = hoja completa. */
export function missing(d: KycDraft, s: KycSection, now: Date): string[] {
  const out: string[] = [];
  const need = (ok: boolean, f: string) => { if (!ok) out.push(f); };
  switch (s) {
    case "personal": {
      const p = d.personal;
      need(filled(p.firstName), "firstName"); need(filled(p.lastName), "lastName");
      need(emailValid(p.email), "email"); need(phoneValid(p.phone), "phone");
      need(isAdult(p.birthDate, now), "birthDate"); need(filled(p.nationality), "nationality");
      break;
    }
    case "address": {
      const a = d.address;
      need(filled(a.streetLine1), "streetLine1"); need(filled(a.city), "city"); need(filled(a.subdivision), "subdivision"); need(postalValid(a.postalCode), "postalCode");
      break;
    }
    case "id": {
      const i = d.id;
      need(i.number.trim().length >= 6, "idNumber");
      // La cédula de ciudadanía no vence; el pasaporte sí.
      if (i.type === "passport") need(expirationValid(i.expiration, now), "expiration");
      need(taxIdValid(i.taxId), "taxId");
      need(i.front, "front");
      if (i.type === "cedula") need(i.back, "back");
      break;
    }
    case "selfie": need(d.selfie, "selfie"); break;
    case "usage": {
      const u = d.usage;
      need(filled(u.accountPurpose), "accountPurpose"); need(filled(u.employmentStatus), "employmentStatus");
      need(filled(u.occupation), "occupation"); need(filled(u.monthlyPayments), "monthlyPayments"); need(filled(u.sourceOfFunds), "sourceOfFunds");
      need(u.ownUse, "ownUse");
      break;
    }
  }
  return out;
}
export const sectionDone = (d: KycDraft, s: KycSection, now: Date): boolean => missing(d, s, now).length === 0;
export const draftDone = (d: KycDraft, now: Date): boolean => KYC_SECTIONS.every((s) => sectionDone(d, s, now));

/** Lo que recibiría Bridge: el expediente con su forma (`identifying_information` lleva el documento con foto y el NIT aparte). */
export type KycSubmission = {
  type: "individual";
  first_name: string; middle_name: string | null; last_name: string; email: string; phone: string; birth_date: string; nationality: string;
  residential_address: { street_line_1: string; street_line_2: string | null; city: string; subdivision: string; postal_code: string; country: string };
  identifying_information: { type: "national_id" | "passport" | "nit"; issuing_country: "COL"; number: string; expiration?: string; image_front?: string; image_back?: string }[];
  selfie_image: string;
  account_purpose: string; employment_status: string; most_recent_occupation: string; expected_monthly_payments: string; source_of_funds: string; acting_as_intermediary: boolean;
};

const img = (added: boolean): string | undefined => (added ? "sample://demo" : undefined);

export function toSubmission(d: KycDraft): KycSubmission {
  const { personal: p, address: a, id, usage: u } = d;
  return {
    type: "individual",
    first_name: p.firstName.trim(), middle_name: p.middleName.trim() || null, last_name: p.lastName.trim(), email: p.email.trim(),
    phone: `+57${p.phone.replace(/\D/g, "")}`, birth_date: p.birthDate, nationality: p.nationality,
    residential_address: { street_line_1: a.streetLine1.trim(), street_line_2: a.streetLine2.trim() || null, city: a.city.trim(), subdivision: a.subdivision, postal_code: a.postalCode.trim(), country: a.country },
    identifying_information: [
      { type: id.type === "cedula" ? "national_id" : "passport", issuing_country: "COL", number: id.number.trim(), ...(id.type === "passport" ? { expiration: id.expiration } : {}), image_front: img(id.front), image_back: img(id.back) },
      { type: "nit", issuing_country: "COL", number: id.taxId.trim() },
    ],
    selfie_image: img(d.selfie) ?? "",
    account_purpose: u.accountPurpose, employment_status: u.employmentStatus, most_recent_occupation: u.occupation.trim(),
    expected_monthly_payments: u.monthlyPayments, source_of_funds: u.sourceOfFunds, acting_as_intermediary: !u.ownUse, // siempre false: sin la confirmación no se puede enviar
  };
}

/** Razón de rechazo de Bridge → sección del expediente que hay que rehacer. Las que no mapean se piden en «Datos personales». */
export const REJECTION_SECTION: Record<string, KycSection> = {
  id_document_unreadable: "id", id_document_expired: "id", id_document_mismatch: "id",
  address_mismatch: "address", proof_of_address_missing: "address",
  selfie_mismatch: "selfie", liveness_failed: "selfie",
  name_mismatch: "personal", date_of_birth_mismatch: "personal",
};
/** Razones que la demo sabe explicar en lenguaje claro (`kyc.reason.*`). */
export const KNOWN_REASONS = ["id_document_unreadable", "address_mismatch", "selfie_mismatch", "liveness_failed"] as const;
/** Secciones a corregir, en el orden del expediente. */
export function sectionsToFix(reasons: readonly string[]): KycSection[] {
  const set = new Set(reasons.map((r) => REJECTION_SECTION[r] ?? "personal"));
  return KYC_SECTIONS.filter((s) => set.has(s));
}
/** Razones que tocan una sección. */
export const reasonsFor = (reasons: readonly string[], s: KycSection): string[] => reasons.filter((r) => (REJECTION_SECTION[r] ?? "personal") === s);

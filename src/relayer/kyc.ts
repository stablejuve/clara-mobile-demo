// Expediente KYC del empleado (persona física en México). Mismos campos que el wizard de relayer-core
// (apps/web/components/settings/kyc: personal, residentialAddress, identifyingInformation + RFC, riskAssessment) y que el
// `POST /customers` de Bridge, más la selfie de prueba de vida. Puro: validación y datos de ejemplo para «Llenar con ejemplo».

export type KycSection = "personal" | "address" | "id" | "selfie" | "usage";
export const KYC_SECTIONS: readonly KycSection[] = ["personal", "address", "id", "selfie", "usage"];

/** Foto subida: la del teléfono (uri local) o la muestra de la demo (se dibuja, no es un archivo). */
export type KycImage = { kind: "uri"; uri: string } | { kind: "sample" };

export type IdType = "ine" | "passport";
export const ID_TYPES: readonly IdType[] = ["ine", "passport"];

export type KycPersonal = { firstName: string; middleName: string; lastName: string; email: string; phone: string; birthDate: string; nationality: string };
export type KycAddress = { streetLine1: string; streetLine2: string; city: string; subdivision: string; postalCode: string; country: string };
export type KycId = { type: IdType; number: string; expiration: string; rfc: string; front: KycImage | null; back: KycImage | null };
export type KycUsage = { accountPurpose: string; employmentStatus: string; occupation: string; monthlyPayments: string; sourceOfFunds: string; intermediary: boolean };
export type KycDraft = { personal: KycPersonal; address: KycAddress; id: KycId; selfie: KycImage | null; usage: KycUsage };

/** Catálogos de Bridge (los mismos códigos que relayer-core). */
export const ACCOUNT_PURPOSES = ["receive_salary", "personal_or_living_expenses", "purchase_goods_and_services", "payments_to_friends_or_family_abroad", "protect_wealth", "other"] as const;
export const EMPLOYMENT = ["employed", "self_employed", "student", "retired", "homemaker", "unemployed"] as const;
export const MONTHLY = ["0_4999", "5000_9999", "10000_49999", "50000_plus"] as const;
export const SOURCES = ["salary", "savings", "investments_loans", "pension_retirement", "government_benefits", "inheritance"] as const;
export const NATIONALITIES = ["MEX", "USA", "COL", "ARG", "ESP"] as const;
export const STATES_MX = ["CDMX", "Jalisco", "Nuevo León", "Estado de México", "Puebla", "Querétaro", "Yucatán"] as const;

export const EMPTY_DRAFT: KycDraft = {
  personal: { firstName: "", middleName: "", lastName: "", email: "", phone: "", birthDate: "", nationality: "MEX" },
  address: { streetLine1: "", streetLine2: "", city: "", subdivision: "", postalCode: "", country: "MEX" },
  id: { type: "ine", number: "", expiration: "", rfc: "", front: null, back: null },
  selfie: null,
  usage: { accountPurpose: "", employmentStatus: "", occupation: "", monthlyPayments: "", sourceOfFunds: "", intermediary: false },
};

/** Datos de ejemplo por hoja (ficticios: Ana Torres de la demo). */
export const SAMPLE: { personal: KycPersonal; address: KycAddress; id: KycId; selfie: KycImage; usage: KycUsage } = {
  personal: { firstName: "Ana", middleName: "Lucía", lastName: "Torres Medina", email: "ana.torres@acme.example", phone: "55 1234 5678", birthDate: "1994-03-18", nationality: "MEX" },
  address: { streetLine1: "Av. Insurgentes Sur 1458, Int. 702", streetLine2: "Col. Actipan", city: "Benito Juárez", subdivision: "CDMX", postalCode: "03230", country: "MEX" },
  id: { type: "ine", number: "TRMDAN94031809M700", expiration: "2031-12", rfc: "TOMA940318KJ3", front: { kind: "sample" }, back: { kind: "sample" } },
  selfie: { kind: "sample" },
  usage: { accountPurpose: "receive_salary", employmentStatus: "employed", occupation: "Analista de nómina", monthlyPayments: "0_4999", sourceOfFunds: "salary", intermediary: false },
};

export function fillSample(d: KycDraft, s: KycSection): KycDraft {
  return { ...d, [s]: SAMPLE[s] } as KycDraft;
}

const RFC_RE = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
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
export const rfcValid = (rfc: string): boolean => RFC_RE.test(rfc.trim().toUpperCase());
export const emailValid = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
export const phoneValid = (p: string): boolean => p.replace(/\D/g, "").length === 10;
export const postalValid = (cp: string): boolean => /^\d{5}$/.test(cp.trim());
/** Vigencia AAAA-MM no vencida. */
export function expirationValid(exp: string, now: Date): boolean {
  const m = /^(\d{4})-(\d{2})$/.exec(exp.trim());
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return false;
  return Number(m[1]) * 12 + Number(m[2]) >= now.getFullYear() * 12 + now.getMonth() + 1;
}

/** Campos que faltan o están mal en una hoja (claves de i18n `kyc2.field.*`); vacío = hoja completa. */
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
      need(i.number.trim().length >= 6, "idNumber"); need(expirationValid(i.expiration, now), "expiration"); need(rfcValid(i.rfc), "rfc");
      need(i.front !== null, "front");
      if (i.type === "ine") need(i.back !== null, "back");
      break;
    }
    case "selfie": need(d.selfie !== null, "selfie"); break;
    case "usage": {
      const u = d.usage;
      need(filled(u.accountPurpose), "accountPurpose"); need(filled(u.employmentStatus), "employmentStatus");
      need(filled(u.occupation), "occupation"); need(filled(u.monthlyPayments), "monthlyPayments"); need(filled(u.sourceOfFunds), "sourceOfFunds");
      break;
    }
  }
  return out;
}
export const sectionDone = (d: KycDraft, s: KycSection, now: Date): boolean => missing(d, s, now).length === 0;
export const draftDone = (d: KycDraft, now: Date): boolean => KYC_SECTIONS.every((s) => sectionDone(d, s, now));

/** Lo que el API recibe: el expediente con forma de Bridge (`identifying_information` lleva el ID con foto y el RFC). */
export type KycSubmission = {
  first_name: string; middle_name: string | null; last_name: string; email: string; phone: string; birth_date: string; nationality: string;
  residential_address: { street_line_1: string; street_line_2: string | null; city: string; subdivision: string; postal_code: string; country: string };
  identifying_information: { type: "national_id" | "passport" | "rfc"; issuing_country: "MEX"; number: string; expiration?: string; image_front?: string; image_back?: string }[];
  selfie_image: string;
  account_purpose: string; employment_status: string; most_recent_occupation: string; expected_monthly_payments_usd: string; source_of_funds: string; acting_as_intermediary: boolean;
};

const img = (i: KycImage | null): string | undefined => (i === null ? undefined : i.kind === "uri" ? i.uri : "sample://recibo-demo");

export function toSubmission(d: KycDraft): KycSubmission {
  const { personal: p, address: a, id, usage: u } = d;
  return {
    first_name: p.firstName.trim(), middle_name: p.middleName.trim() || null, last_name: p.lastName.trim(), email: p.email.trim(),
    phone: `+52${p.phone.replace(/\D/g, "")}`, birth_date: p.birthDate, nationality: p.nationality,
    residential_address: { street_line_1: a.streetLine1.trim(), street_line_2: a.streetLine2.trim() || null, city: a.city.trim(), subdivision: a.subdivision, postal_code: a.postalCode.trim(), country: a.country },
    identifying_information: [
      { type: id.type === "ine" ? "national_id" : "passport", issuing_country: "MEX", number: id.number.trim(), expiration: id.expiration, image_front: img(id.front), image_back: img(id.back) },
      { type: "rfc", issuing_country: "MEX", number: id.rfc.trim().toUpperCase() },
    ],
    selfie_image: img(d.selfie) ?? "",
    account_purpose: u.accountPurpose, employment_status: u.employmentStatus, most_recent_occupation: u.occupation.trim(),
    expected_monthly_payments_usd: u.monthlyPayments, source_of_funds: u.sourceOfFunds, acting_as_intermediary: u.intermediary,
  };
}

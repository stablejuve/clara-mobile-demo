import { es, isKey, type Key, reasonCopy, t } from "../src/i18n/es";

const SCREENS = ["demoPanel"] as const;
const ERROR_CODES = [
  "invalid_transition", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed",
  "bank_not_verified", "insufficient_balance", "below_minimum", "card_not_active", "clabe_invalid", "quote_expired", "passkey_cancelled", "not_found", "unknown",
] as const;

test("toda clave tiene copy (los subtítulos de pantalla pueden ir vacíos) y nada quedó pendiente", () => {
  for (const [k, v] of Object.entries(es)) {
    if (/^screen\..+\.sub$/.test(k)) continue;
    expect([k, v.trim().length > 0]).toEqual([k, true]);
    expect(v).not.toMatch(/TODO|TBD|lorem/); // sin /i: "Todo" es español válido
  }
});

test("cada pantalla tiene título y subtítulo; cada código de error tiene copy; los estados tienen etiqueta", () => {
  for (const s of SCREENS) { expect(isKey(`screen.${s}.title`)).toBe(true); expect(isKey(`screen.${s}.sub`)).toBe(true); }
  for (const c of ERROR_CODES) expect(isKey(`errors.${c}`)).toBe(true);
  for (const s of ["off", "terms_pending", "kyc", "wallet_ready", "active"]) expect(isKey(`module.status.${s}`)).toBe(true);
  for (const s of ["none", "requested", "endorsement_pending", "active", "frozen", "endorsement_expired"]) expect(isKey(`card.status.${s}`)).toBe(true);
  for (const s of ["none", "pending_verification", "verified", "failed"]) expect(isKey(`bank.status.${s}`)).toBe(true);
  for (const s of ["happy", "kyc_rejected", "cards_unavailable_region", "endorsement_expired", "send_failed", "bank_verification_failed"]) {
    expect(isKey(`scenario.${s}`)).toBe(true);
    expect(isKey(`scenario.${s}.hint`)).toBe(true);
  }
});

test("t interpola {var} y deja las que no vienen", () => {
  expect(t("home.greeting")).toBe("Hola, Ana");
  expect(t("notify.depositTitle", { from: "Acme Beneficios" })).toBe("Te pagó Acme Beneficios");
  expect(t("send.quoteTtl", { s: 42 })).toBe("La cotización vence en 42 s");
  expect(t("bank.clabeHint", {})).toBe("{n} de 18 dígitos");
});

test("cada sección y cada campo del KYC tiene copy", () => {
  for (const s of ["personal", "address", "id", "selfie", "usage"]) { expect(isKey(`kyc2.section.${s}`)).toBe(true); expect(isKey(`kyc2.intro.${s}`)).toBe(true); }
  for (const f of ["firstName", "lastName", "email", "phone", "birthDate", "nationality", "streetLine1", "city", "subdivision", "postalCode", "idNumber", "expiration", "rfc", "front", "back", "selfie", "accountPurpose", "employmentStatus", "occupation", "monthlyPayments", "sourceOfFunds"]) {
    expect(isKey(`kyc2.field.${f}`)).toBe(true);
  }
});

test("reasonCopy traduce las razones conocidas y devuelve el código si no la conoce", () => {
  expect(reasonCopy("id_document_unreadable")).toBe("La identificación no se pudo leer. Toma la foto sin reflejos y con las cuatro esquinas visibles.");
  expect(reasonCopy("something_else")).toBe("something_else");
});

test("el pie dice powered by Clara y las pestañas son Inicio · Beneficios · Perfil", () => {
  expect(t("common.poweredBy")).toBe("powered by Clara");
  expect([t("tab.home"), t("tab.benefits"), t("tab.profile")]).toEqual(["Inicio", "Beneficios", "Perfil"]);
  const k: Key = "balance.back";
  expect(t(k)).toBe("Volver al saldo");
});

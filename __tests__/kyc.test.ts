import { draftDone, EMPTY_DRAFT, expirationValid, fillSample, isAdult, KYC_SECTIONS, missing, rfcValid, sectionDone, toSubmission } from "../src/relayer/kyc";

const NOW = new Date(2026, 10, 12);

test("el expediente vacío no tiene ninguna sección completa", () => {
  for (const s of KYC_SECTIONS) expect(sectionDone(EMPTY_DRAFT, s, NOW)).toBe(false);
  expect(missing(EMPTY_DRAFT, "personal", NOW)).toEqual(["firstName", "lastName", "email", "phone", "birthDate"]);
  expect(missing(EMPTY_DRAFT, "id", NOW)).toEqual(["idNumber", "expiration", "rfc", "front", "back"]);
});

test("«Llenar con ejemplo» completa sólo la hoja pedida; las cinco completan el expediente", () => {
  const one = fillSample(EMPTY_DRAFT, "address");
  expect(sectionDone(one, "address", NOW)).toBe(true);
  expect(sectionDone(one, "personal", NOW)).toBe(false);
  const all = KYC_SECTIONS.reduce(fillSample, EMPTY_DRAFT);
  expect(draftDone(all, NOW)).toBe(true);
});

test("pasaporte no pide reverso; INE sí", () => {
  const d = fillSample(EMPTY_DRAFT, "id");
  expect(missing({ ...d, id: { ...d.id, back: null } }, "id", NOW)).toEqual(["back"]);
  expect(missing({ ...d, id: { ...d.id, type: "passport", back: null } }, "id", NOW)).toEqual([]);
});

test("validaciones: mayoría de edad, RFC de persona física, vigencia no vencida", () => {
  expect(isAdult("1994-03-18", NOW)).toBe(true);
  expect(isAdult("2010-01-01", NOW)).toBe(false);
  expect(isAdult("1994-13-01", NOW)).toBe(false);
  expect(rfcValid("TOMA940318KJ3")).toBe(true);
  expect(rfcValid("toma940318kj3")).toBe(true);
  expect(rfcValid("ABC123")).toBe(false);
  expect(expirationValid("2026-11", NOW)).toBe(true);
  expect(expirationValid("2026-10", NOW)).toBe(false);
});

test("toSubmission arma el cuerpo con forma de Bridge: ID con fotos + RFC aparte, teléfono E.164", () => {
  const body = toSubmission(KYC_SECTIONS.reduce(fillSample, EMPTY_DRAFT));
  expect(body.phone).toBe("+525512345678");
  expect(body.residential_address.country).toBe("MEX");
  expect(body.identifying_information.map((i) => i.type)).toEqual(["national_id", "rfc"]);
  expect(body.identifying_information[0].image_front).toBeTruthy();
  expect(body.account_purpose).toBe("receive_salary");
});

test("rechazo: cada razón apunta a la sección que hay que rehacer", () => {
  const { sectionsToFix, reasonsFor } = require("../src/relayer/kyc");
  expect(sectionsToFix(["address_mismatch", "id_document_unreadable"])).toEqual(["address", "id"]);
  expect(sectionsToFix(["selfie_mismatch", "algo_raro"])).toEqual(["personal", "selfie"]);
  expect(reasonsFor(["id_document_unreadable", "address_mismatch"], "id")).toEqual(["id_document_unreadable"]);
});

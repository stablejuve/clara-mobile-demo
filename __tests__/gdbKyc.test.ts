import { draftDone, EMPTY_DRAFT, expirationValid, fillSample, isAdult, KYC_SECTIONS, missing, postalValid, reasonsFor, sectionDone, sectionsToFix, taxIdValid, toSubmission } from "../src/gdb/kyc";

const NOW = new Date(2026, 10, 18);

test("el expediente vacío no tiene ninguna sección completa", () => {
  for (const s of KYC_SECTIONS) expect(sectionDone(EMPTY_DRAFT, s, NOW)).toBe(false);
  expect(missing(EMPTY_DRAFT, "personal", NOW)).toEqual(["firstName", "lastName", "email", "phone", "birthDate"]);
  expect(missing(EMPTY_DRAFT, "id", NOW)).toEqual(["idNumber", "taxId", "front", "back"]);
});

test("«Llenar con ejemplo» completa sólo la hoja pedida; las cinco completan el expediente", () => {
  const one = fillSample(EMPTY_DRAFT, "address");
  expect(sectionDone(one, "address", NOW)).toBe(true);
  expect(sectionDone(one, "personal", NOW)).toBe(false);
  expect(draftDone(KYC_SECTIONS.reduce(fillSample, EMPTY_DRAFT), NOW)).toBe(true);
});

test("la cédula pide frente y reverso y no vence; el pasaporte pide vigencia y sólo el frente", () => {
  const d = fillSample(EMPTY_DRAFT, "id");
  expect(missing({ ...d, id: { ...d.id, back: false } }, "id", NOW)).toEqual(["back"]);
  expect(missing({ ...d, id: { ...d.id, type: "passport", back: false } }, "id", NOW)).toEqual(["expiration"]);
  expect(missing({ ...d, id: { ...d.id, type: "passport", back: false, expiration: "2031-12" } }, "id", NOW)).toEqual([]);
});

test("validaciones: mayoría de edad, NIT, código postal de 6 dígitos, vigencia no vencida", () => {
  expect(isAdult("1994-03-18", NOW)).toBe(true);
  expect(isAdult("2010-01-01", NOW)).toBe(false);
  expect(isAdult("1994-13-01", NOW)).toBe(false);
  expect(taxIdValid("1020304050-7")).toBe(true);
  expect(taxIdValid("1020304050")).toBe(true);
  expect(taxIdValid("ABC123")).toBe(false);
  expect(postalValid("110231")).toBe(true);
  expect(postalValid("11023")).toBe(false);
  expect(expirationValid("2026-11", NOW)).toBe(true);
  expect(expirationValid("2026-10", NOW)).toBe(false);
});

test("toSubmission arma el cuerpo con forma de Bridge: documento con fotos + NIT aparte, teléfono E.164", () => {
  const body = toSubmission(KYC_SECTIONS.reduce(fillSample, EMPTY_DRAFT));
  expect(body.phone).toBe("+573001234567");
  expect(body.residential_address.country).toBe("COL");
  expect(body.identifying_information.map((i) => i.type)).toEqual(["national_id", "nit"]);
  expect(body.identifying_information[0].image_front).toBeTruthy();
  expect(body.identifying_information[0].expiration).toBeUndefined();
  expect(body.account_purpose).toBe("receive_salary");
  expect(body.acting_as_intermediary).toBe(false);
});

test("el empleado debe confirmar que la cuenta es para él: sin eso, «Uso de la cuenta» no está completa", () => {
  const d = fillSample(EMPTY_DRAFT, "usage");
  expect(sectionDone(d, "usage", NOW)).toBe(true);
  expect(missing({ ...d, usage: { ...d.usage, ownUse: false } }, "usage", NOW)).toEqual(["ownUse"]);
  expect(missing(EMPTY_DRAFT, "usage", NOW)).toContain("ownUse");
});

test("rechazo: cada razón apunta a la sección que hay que rehacer", () => {
  expect(sectionsToFix(["address_mismatch", "id_document_unreadable"])).toEqual(["address", "id"]);
  expect(sectionsToFix(["selfie_mismatch", "algo_raro"])).toEqual(["personal", "selfie"]);
  expect(reasonsFor(["id_document_unreadable", "address_mismatch"], "id")).toEqual(["id_document_unreadable"]);
});

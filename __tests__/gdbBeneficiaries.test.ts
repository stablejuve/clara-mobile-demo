import { accountValid, beneBank, beneDone, beneMissing, beneTitle, breBValid, EMPTY_BENE, fillBene, initials, sortBenes, toBeneficiary, toExternalAccount, type BeneDraft } from "../src/gdb/beneficiaries";

const SELF = { firstName: "Alex", lastName: "Rivera Gómez" };
const full = (owner: BeneDraft["owner"]): BeneDraft => (["identity", "bank", "review"] as const).reduce((d, s) => fillBene(d, s, SELF), { ...EMPTY_BENE, owner });

test("el asistente vacío pide nombre, cuenta y confirmación", () => {
  expect(beneMissing(EMPTY_BENE, "identity")).toEqual(["firstName", "lastName"]);
  expect(beneMissing(EMPTY_BENE, "bank")).toEqual(["bankCode", "accountNumber", "docNumber", "phone"]);
  expect(beneMissing({ ...EMPTY_BENE, method: "bre_b" }, "bank")).toEqual(["breBKey"]);
  expect(beneMissing(EMPTY_BENE, "review")).toEqual(["confirm"]);
  expect(beneMissing({ ...EMPTY_BENE, owner: "business" }, "identity")).toEqual(["businessName"]);
});

test("«Llenar con ejemplo» completa cada tipo de titular", () => {
  for (const owner of ["self", "individual", "business"] as const) expect(beneDone(full(owner))).toBe(true);
  expect(full("self")).toMatchObject({ firstName: "Alex", lastName: "Rivera Gómez", method: "bank" });
  expect(full("individual").method).toBe("bre_b");
});

test("validaciones: cuenta de 9 a 16 dígitos, llave Bre-B sin espacios", () => {
  expect(accountValid("45612378901")).toBe(true);
  expect(accountValid("1234")).toBe(false);
  expect(breBValid("3109876543")).toBe(true);
  expect(breBValid("laura@correo.example")).toBe(true);
  expect(breBValid("con espacio")).toBe(false);
});

test("lo que se guarda y lo que recibiría Bridge: cuenta bancaria o llave Bre-B", () => {
  const bank = toBeneficiary(full("business"), "bene_2", 5);
  expect(bank).toMatchObject({ name: "Papelería Luna S.A.S.", bankName: "Banco Cordillera", account: "78945612300", status: "verifying" });
  expect(beneBank(bank)).toBe("Banco Cordillera •••• 2300");
  expect(toExternalAccount(full("business"))).toMatchObject({ currency: "cop", account_type: "co_bank_transfer", account_owner_type: "business", account: { document_type: "nit", bank_code: "9003", account_type: "checking", phone_number: "+576015550188" } });
  const key = toBeneficiary(full("individual"), "bene_3", 6);
  expect(key).toMatchObject({ bankName: "Bre-B", account: "3109876543" });
  expect(toExternalAccount(full("individual"))).toMatchObject({ account_type: "bre_b", account: { bre_b_key: "3109876543" }, account_owner_name: "Laura Méndez Ríos" });
});

test("títulos, iniciales y orden: la cuenta propia primero", () => {
  expect(beneTitle({ alias: "", name: "Laura Méndez Ríos" })).toBe("Laura Méndez Ríos");
  expect(initials("Laura Méndez Ríos")).toBe("LM");
  expect(initials("Papelería Luna S.A.S.")).toBe("PL");
  const a = toBeneficiary(full("individual"), "a", 10), me = toBeneficiary(full("self"), "me", 1), c = toBeneficiary(full("business"), "c", 20);
  expect(sortBenes([a, me, c]).map((b) => b.id)).toEqual(["me", "c", "a"]);
});

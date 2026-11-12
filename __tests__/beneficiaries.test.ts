import { beneBank, beneMissing, beneTitle, EMPTY_BENE, fillBene, holderName, initials, stepDone, stepsFor, toNewBeneficiary } from "../src/relayer/beneficiaries";
import type { BeneficiaryOwner } from "../src/relayer/types";

const ME = { firstName: "Ana Lucía", lastName: "Torres Medina" };
const filled = (owner: BeneficiaryOwner) => stepsFor(owner).reduce((d, s) => fillBene(d, s, ME), { ...EMPTY_BENE, owner });

test("pasos: la cuenta propia se salta el domicilio (como relayer-core)", () => {
  expect(stepsFor("self")).toEqual(["owner", "identity", "bank", "review"]);
  expect(stepsFor("individual")).toEqual(["owner", "identity", "address", "bank", "review"]);
  expect(stepsFor("business")).toEqual(["owner", "identity", "address", "bank", "review"]);
});

test("validación por paso", () => {
  expect(beneMissing(EMPTY_BENE, "identity")).toEqual(["firstName", "lastName"]);
  expect(beneMissing({ ...EMPTY_BENE, owner: "business" }, "identity")).toEqual(["businessName"]);
  expect(beneMissing({ ...EMPTY_BENE, firstName: "a", lastName: "b", email: "mal" }, "identity")).toEqual(["email"]);
  expect(beneMissing({ ...EMPTY_BENE, postalCode: "123" }, "address")).toEqual(["street", "city", "state", "postalCode"]);
  expect(beneMissing({ ...EMPTY_BENE, clabe: "012180001234567890" }, "bank")).toEqual(["clabe"]);
  expect(beneMissing({ ...EMPTY_BENE, clabe: "012180001234567899", rfc: "X" }, "bank")).toEqual(["rfc"]);
  expect(beneMissing(EMPTY_BENE, "review")).toEqual(["confirm"]);
});

test("«Llenar con ejemplo» deja cada paso válido para los tres tipos", () => {
  for (const owner of ["self", "individual", "business"] as const) {
    const d = filled(owner);
    for (const s of stepsFor(owner)) expect([owner, s, stepDone(d, s)]).toEqual([owner, s, true]);
  }
  expect(holderName(filled("self"))).toBe("Ana Lucía Torres Medina");
});

test("lo que se manda: la propia sin domicilio, RFC en mayúsculas", () => {
  expect(toNewBeneficiary(filled("self"))).toMatchObject({ owner: "self", name: "Ana Lucía Torres Medina", address: null, clabe: "072180001122334459" });
  expect(toNewBeneficiary({ ...filled("business"), rfc: "plu150923qx4" })).toMatchObject({ owner: "business", name: "Papelería Lupita S.A. de C.V.", rfc: "PLU150923QX4", address: { postalCode: "03720" } });
});

test("cómo se lee", () => {
  expect(beneTitle({ alias: "Mamá", name: "María" })).toBe("Mamá");
  expect(beneTitle({ alias: "", name: "María" })).toBe("María");
  expect(beneBank({ bankName: "Banorte", clabe: "072180004310562470" })).toBe("Banorte ···· 2470");
  expect(initials("María Elena Medina Ruiz")).toBe("MM");
  expect(initials("Ana Lucía Torres Medina")).toBe("AT");
  expect(initials("Jorge Ruiz Salgado")).toBe("JR");
  expect(initials("Luis Gómez")).toBe("LG");
  expect(initials("Gimnasio Fortis S.A. de C.V.")).toBe("GF");
});

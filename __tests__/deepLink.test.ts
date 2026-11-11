import { KYC_RETURN_URL, parseDeepLink } from "../src/navigation/deepLink";

test("el regreso del KYC es relayermobiledemo://recibo/kyc-return (con o sin query)", () => {
  expect(KYC_RETURN_URL).toBe("relayermobiledemo://recibo/kyc-return");
  expect(parseDeepLink(KYC_RETURN_URL)).toEqual({ kind: "kyc-return" });
  expect(parseDeepLink("relayermobiledemo://recibo/kyc-return?status=complete")).toEqual({ kind: "kyc-return" });
  expect(parseDeepLink("relayermobiledemo://recibo/kyc-return/")).toEqual({ kind: "kyc-return" });
});

test("todo lo demás se ignora", () => {
  expect(parseDeepLink("relayermobiledemo://recibo/otra")).toBeNull();
  expect(parseDeepLink("https://relayer.fi/recibo/kyc-return")).toBeNull();
  expect(parseDeepLink("")).toBeNull();
  expect(parseDeepLink(null)).toBeNull();
  expect(parseDeepLink(undefined)).toBeNull();
});

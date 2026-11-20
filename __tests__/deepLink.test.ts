import { parseDeepLink } from "../src/navigation/deepLink";

test("los deep links de la demo sólo existen en desarrollo", () => {
  expect(parseDeepLink("relayermobiledemo://demo/seed/active", true)).toEqual({ kind: "seed", to: "active" });
  expect(parseDeepLink("relayermobiledemo://demo/run/rail", true)).toEqual({ kind: "run", action: "rail" });
  expect(parseDeepLink("relayermobiledemo://demo/open/card?scrollEnd=1", true)).toEqual({ kind: "open", screen: "card", scrollEnd: true });
  expect(parseDeepLink("relayermobiledemo://demo/seed/active", false)).toBeNull();
  expect(parseDeepLink("relayermobiledemo://demo/run/rail")).toBeNull();
});

test("todo lo demás se ignora", () => {
  expect(parseDeepLink("relayermobiledemo://recibo/kyc-return", true)).toBeNull();
  expect(parseDeepLink("https://relayer.fi/demo/seed/active", true)).toBeNull();
  expect(parseDeepLink("", true)).toBeNull();
  expect(parseDeepLink(null, true)).toBeNull();
  expect(parseDeepLink(undefined, true)).toBeNull();
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAlphaCatalog, readXofRates, normalizeCountry, countryIncludes, sameOperator } from "./alphapayCatalog";
import { AlphaPayService, getAlphaPayNetwork } from "./alphapay";
import { amountInXOF, paymentWalletDelta } from "./paymentAccounting";

test("catalog follows all pages and merchant direction availability, not a static country list", async () => {
  const paths: string[] = [];
  const catalog = await buildAlphaCatalog(async path => {
    paths.push(path);
    if (path === "/countries/") return [
      { id: "bj", iso_code: "BJ", name: "Bénin", default_currency: "XOF" },
      { id: "gh", iso_code: "GH", name: "Ghana", default_currency: "GHS" },
      { id: "xx", iso_code: "XX", name: "International", default_currency: "USD" },
    ];
    if (path.startsWith("/networks/")) return path.endsWith("page=1")
      ? { results: [{ country: "bj", code: "celtiis_bj", is_active: true }], next: "page2" }
      : { results: [{ country: "gh", code: "mtn_gh", is_active: true }, { country: "xx", code: "crypto", is_active: true }, { country: "bj", code: "inactive_bj", is_active: false }], next: null };
    if (path === "/pricing/my-rates/") return [
      { country_code: "BJ", currency: "XOF", network_code: "celtiis_bj", network_name: "Celtiis Cash", payin: { available: true, otp_required: true, otp_instructions: "Code client" }, payout: { available: true } },
      { country_code: "GH", currency: "GHS", network_code: "mtn_gh", network_name: "MTN Ghana", payin: { available: false }, payout: { available: true } },
      { country_code: "XX", currency: "USD", network_code: "crypto", network_name: "Crypto", payin: { available: true }, payout: { available: false } },
      { country_code: "BJ", currency: "XOF", network_code: "inactive_bj", payin: { available: true } },
      { country_code: "BJ", currency: "XOF", network_code: "not_in_networks", payin: { available: true } },
    ];
    return { results: [{ from_currency: "USD", to_currency: "XOF", rate: "600" }, { from_currency: "USD", to_currency: "GHS", rate: "10" }], next: null };
  });
  assert.equal(catalog.networks.length, 3);
  assert.deepEqual(catalog.countries.map(c => c.code), ["BJ", "GH", "XX"]);
  assert.equal(catalog.networks.find(n => n.code === "mtn_gh")?.payin, false);
  assert.equal(catalog.networks.find(n => n.code === "crypto")?.requiresRedirect, true);
  assert.equal(catalog.networks[0].otpInstructions, "Code client");
  assert.equal(catalog.rateToXof.GHS, 60);
  assert.equal(catalog.rateToXof.USD, 600);
  assert.ok(paths.includes("/networks/?page_size=100&page=2"));
});

test("missing FX is explicit, never treated as XOF and never causes exhaustive redundant pagination", async () => {
  let reads = 0;
  const rates = await readXofRates(async () => {
    reads++;
    return { results: [{ from_currency: "AED", to_currency: "XOF", rate: "150" }, { from_currency: "AFN", to_currency: "XOF", rate: "8" }], next: "more" };
  }, ["SLE"]);
  assert.equal(rates.SLE, undefined);
  assert.equal(reads, 1);
  assert.throws(() => amountInXOF(100, "SLE"));
});

test("new currencies settle and refund with the saved quote, not today's changing rate", () => {
  const payout = { type: "withdrawal", status: "pending", amount: "100", fees: "420", currency: "GHS" };
  const reserved = amountInXOF(100, "GHS", 60) + 420;
  assert.equal(paymentWalletDelta(payout, "failed", 60), reserved);
  assert.notEqual(paymentWalletDelta(payout, "failed", 70), reserved);
  assert.equal(paymentWalletDelta({ ...payout, status: "failed" }, "failed", 60), 0);
  assert.equal(paymentWalletDelta({ ...payout, type: "deposit", fees: "7" }, "completed", 60), 5580);
});

test("legacy country/operator maintenance aliases remain effective for exact network codes", () => {
  assert.equal(normalizeCountry("COD"), "CD");
  assert.equal(normalizeCountry("COG"), "CG");
  assert.equal(countryIncludes(["COD"], "CD"), true);
  assert.equal(sameOperator("MTN", "mtn_gh"), true);
  assert.equal(sameOperator("TMoney", "togocel"), true);
  assert.equal(sameOperator("Orange", "mtn_gh"), false);
  assert.equal(getAlphaPayNetwork("MTN_GH", "GH"), "mtn_gh");
});

test("new network contexts use country currency, including Congo USD technical country", () => {
  const service = new AlphaPayService("unit-test");
  const base = { msisdn: "+233123456789", amount: 100, reference: "test", firstName: "Test", lastName: "Client", email: "test@example.com" };
  for (const [country, network, currency] of [
    ["GH", "mtn_gh", "GHS"], ["GA", "airtel_ga", "XAF"], ["CG", "mtn_cg", "XAF"],
    ["XC", "orange_cd_usd", "USD"], ["XX", "crypto", "USD"], ["TZ", "mpesa_tz", "TZS"],
  ]) {
    assert.equal(service.context({ ...base, country, operator: network, currency }).currency, currency);
  }
  assert.throws(() => service.context({ ...base, country: "GH", operator: "mtn_gh", currency: "XOF" }));
});

test("allowed external payments preserve the HTTPS URL and never report a phone push", async () => {
  const service = new AlphaPayService("unit-test", { http: { request: async () => ({ id: "remote", status: "PENDING", checkout_url: "https://provider.example/pay" }) } } as any);
  const result = await service.deposit({ amount: 100, msisdn: "+2290197505050", country: "XX", currency: "USD", operator: "crypto", firstName: "Test", lastName: "Client", email: "test@example.com", reference: "test", returnUrl: "https://shop.example/status", directOnly: false });
  assert.equal(result.payment_url, "https://provider.example/pay");
  assert.equal(result.requires_redirect, true);
  assert.equal(result.status, "PENDING");
});

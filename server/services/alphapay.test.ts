import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { AlphaPayService, getAlphaPayNetwork, alphapayStatusToString, verifyAlphaPaySignature, directPaymentResponse } from "./alphapay";
import { paymentWalletDelta, amountInXOF } from "./paymentAccounting";
import type { AlphaPayClient } from "alphapay-node";
import { PAYMENT_COUNTRIES, PAYMENT_OPERATORS, getPaymentNetwork, alphaCountryCode, solvexCountryCode, needsPaymentConfirmation } from "@shared/payment-catalog";

const now = 1_800_000_000_000;
const timestamp = String(now / 1000);
const raw = Buffer.from('{"event":"transaction.success","data":{"id":"example"}}');
const secret = "test-only-webhook-secret";
const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(raw).digest("hex");
const params = { msisdn: "+2290190000000", amount: 1000, reference: "test-reference", firstName: "Test", lastName: "Client", operator: "mtn_bj", country: "BJ", currency: "XOF", email: "test@example.invalid" };

test("webhook signature checks the exact raw payload and signed timestamp", () => {
  assert.equal(verifyAlphaPaySignature(raw, signature, timestamp, secret, now), true);
  assert.equal(verifyAlphaPaySignature(Buffer.concat([raw, Buffer.from(" ")]), signature, timestamp, secret, now), false);
  assert.equal(verifyAlphaPaySignature(raw, signature, timestamp, secret, now + 301_000), false);
  assert.equal(verifyAlphaPaySignature(raw, signature, timestamp, secret, now - 301_000), false);
  assert.equal(verifyAlphaPaySignature(raw, signature, "NaN", secret, now), false);
  assert.equal(verifyAlphaPaySignature(raw, signature, timestamp, "", now), false);
  assert.equal(verifyAlphaPaySignature(raw, "bad", timestamp, secret, now), false);
});

test("only documented terminal statuses settle a payment", () => {
  for (const status of ["SUCCESS", "COMPLETED", "PAID"]) assert.equal(alphapayStatusToString(status), "completed");
  for (const status of ["FAILED", "CANCELLED", "EXPIRED"]) assert.equal(alphapayStatusToString(status), "failed");
  for (const status of ["PENDING", "PROCESSING", "unknown", undefined, 3, 4]) assert.equal(alphapayStatusToString(status), "pending");
});

test("AlphaPay networks use exact country-specific codes; unsupported pairs fail closed", () => {
  assert.equal(getAlphaPayNetwork("MTN", "BJ"), "mtn_bj");
  assert.equal(getAlphaPayNetwork("TMoney", "TG"), "togocel");
  assert.equal(getAlphaPayNetwork("Vodacom", "COD"), "vodacom_cd");
  assert.equal(getAlphaPayNetwork("Free", "SN"), "freemoney_sn");
  assert.equal(getAlphaPayNetwork("Airtel", "COG"), "airtel_cg");
  assert.throws(() => getAlphaPayNetwork("Wave", "BJ"));
});

test("every country/operator choice maps to an active AlphaPay network checked in the live catalogue", () => {
  const active = new Set("celtiis_bj moov_bj mtn_bj moov_ci mtn_ci orange_ci wave_ci moov_bf orange_bf moov_tg togocel expresso_sn freemoney_sn orange_sn wave_sn moov_ml orange_ml wave_ml mtn_cm orange_cm airtel_cd orange_cd vodacom_cd airtel_cg mtn_cg".split(" "));
  const actual: string[] = [];
  for (const country of PAYMENT_COUNTRIES) {
    for (const operator of country.operators) {
      const network = getPaymentNetwork(operator, country.code);
      assert.equal(active.has(network), true, `${country.code}/${operator}`);
      actual.push(network);
      assert.equal(PAYMENT_OPERATORS.some(entry => entry.code === operator && entry.countries.includes(country.code)), true);
    }
  }
  assert.equal(PAYMENT_COUNTRIES.length, 9);
  assert.equal(actual.length, 25);
  assert.equal(new Set(actual).size, 25);
  assert.deepEqual(new Set(actual), active);
  assert.throws(() => getPaymentNetwork("Wave", "BF")); // Listed by AlphaPay, but inactive.
  assert.throws(() => getPaymentNetwork("MTN", "SLE")); // Not an existing operational country.
});

test("country aliases and network-specific confirmation remain distinct", () => {
  assert.equal(alphaCountryCode("COG"), "CG");
  assert.equal(alphaCountryCode("COD"), "CD");
  assert.equal(solvexCountryCode("CG"), "COG");
  assert.equal(solvexCountryCode("CD"), "COD");
  assert.throws(() => getPaymentNetwork("Mixx", "TG"));
  assert.equal(getPaymentNetwork("TMoney", "TG"), "togocel");
  assert.throws(() => getPaymentNetwork("Mobi Cash", "ML"));
  assert.equal(needsPaymentConfirmation("coris_bj"), true);
  assert.equal(needsPaymentConfirmation("wizall_sn"), true);
  assert.equal(needsPaymentConfirmation("mtn_bj"), false);
});

test("Congo-Brazzaville uses XAF with the exact AlphaPay country and network", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async (_method, _path, options) => {
    assert.equal(options.body.country, "CG");
    assert.equal(options.body.currency, "XAF");
    assert.equal(options.body.method, "mtn_cg");
    return { id: "example-payout", status: "PENDING" };
  }));
  await client.transfer({ ...params, country: "COG", currency: "XAF", operator: "mtn_cg" });
});

test("Coris/Wizall confirmation is optional only for appropriate direct pending payments", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async () => ({ id: "example-coris", status: "PENDING", checkout_url: "" })));
  assert.equal((await client.deposit({ ...params, operator: "coris_bj", directOnly: true })).requires_otp, true);
  const blocked = new AlphaPayService("sk_test_example", fakeClient(async () => ({ id: "example-coris", status: "PENDING", checkout_url: "https://checkout.alphapay.me/example" })));
  assert.equal((await blocked.deposit({ ...params, operator: "coris_bj", directOnly: true })).requires_otp, false);
});

test("operator OTP confirmation calls the dedicated endpoint without persisting or reinitializing a payment", async () => {
  const calls: any[] = [];
  const client = new AlphaPayService("sk_test_example", fakeClient(async (...args) => { calls.push(args); return { status: "SUCCESS" }; }));
  await client.confirmOtp("provider-id", "123456");
  assert.deepEqual(calls, [["POST", "/payments/provider-id/confirm-otp/", { body: { otp: "123456" }, idempotencyKey: undefined }]]);
  await assert.rejects(client.confirmOtp("provider-id", ""));
  assert.equal(calls.length, 1);
});

function fakeClient(run: (...args: any[]) => any) {
  return { http: { request: run } } as unknown as AlphaPayClient;
}

test("crypto uses a fixed USD invoice and external validation; crypto payouts fail before any request", async () => {
  let calls = 0;
  const client = new AlphaPayService("sk_test_example", fakeClient(async (_method, path, options) => {
    calls++;
    assert.equal(path, "/payments/softpay/");
    assert.equal(options.body.network, "crypto");
    assert.equal(options.body.currency, "USD");
    assert.equal(options.body.country, "XX");
    assert.equal(options.body.amount, "4.41");
    assert.equal(options.body.return_url, "https://example.invalid/return");
    return { id: "crypto-example", status: "PENDING", checkout_url: "https://example.invalid/secure-crypto" };
  }));
  const payment = { ...params, operator: "crypto", country: "XX", currency: "USD", amount: 4.41, sourceAmount: 2500, sourceCurrency: "XOF", returnUrl: "https://example.invalid/return", directOnly: false };
  const receipt = await client.deposit(payment);
  assert.equal(receipt.payment_url, "https://example.invalid/secure-crypto");
  await assert.rejects(client.transfer(payment));
  await assert.rejects(client.deposit({ ...payment, returnUrl: undefined }));
  assert.equal(calls, 1);
});

test("collection sends the documented payload and stable idempotency key through the SDK", async () => {
  const calls: any[] = [];
  const client = new AlphaPayService("sk_test_example", fakeClient(async (...args) => {
    calls.push(args); return { id: "provider-payment", status: "PENDING", checkout_url: "https://checkout.alphapay.me/example" };
  }));
  const payment = await client.deposit(params);
  assert.equal(payment.payment_url, "https://checkout.alphapay.me/example");
  assert.equal(payment.reference, params.reference);
  assert.equal(calls[0][1], "/payments/softpay/");
  assert.equal(calls[0][2].idempotencyKey, params.reference);
  assert.equal(calls[0][2].body.network, "mtn_bj");
  assert.deepEqual(calls[0][2].body.metadata, { solvexpay_reference: params.reference });
  assert.equal(calls[0][2].body.fee_charge_mode, "ADD_ON");
  assert.equal(JSON.stringify(calls).includes("sk_test_example"), false);
});

test("server-created checkout never exposes a merchant secret in its response", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async (_method, path, options) => {
    assert.equal(path, "/checkout-sessions/");
    assert.equal(options.body.customer_email, params.email);
    return { id: "session-id", status: "PENDING", checkout_url: "https://checkout.alphapay.me/safe" };
  }));
  const result = await client.deposit({ ...params, checkout: true });
  assert.equal(result.kind, "checkout");
  assert.equal(JSON.stringify(result).includes("sk_test_example"), false);
});

test("direct-only payment uses Softpay even if a caller requests hosted checkout", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async (_method, path, options) => {
    assert.equal(path, "/payments/softpay/");
    assert.equal(options.body.customer.email, params.email);
    assert.equal(options.body.otp, "123456");
    return { id: "direct-id", status: "PENDING", checkout_url: "", instructions: "Validez la demande sur votre téléphone." };
  }));
  const result = await client.deposit({ ...params, checkout: true, directOnly: true, otp: "123456" });
  assert.equal(result.kind, "payment");
  assert.equal(result.requires_redirect, false);
  assert.equal(result.payment_url, undefined);
  assert.equal(result.instructions, "Validez la demande sur votre téléphone.");
});

test("an operator redirect is reported as unavailable, never disguised as a phone push", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async () => ({
    id: "redirect-id", status: "PENDING",
    checkout_url: "https://checkout.alphapay.me/operator",
    instructions: "Do not show these instructions for an external flow",
  })));
  const result = await client.deposit({ ...params, directOnly: true });
  assert.equal(result.id, "redirect-id");
  assert.equal(result.status, "PENDING");
  assert.equal(result.requires_redirect, true);
  assert.equal(result.payment_url, undefined);
  assert.equal(result.instructions, undefined);
  assert.match(result.message!, /pas disponible sans redirection/);
  assert.equal(directPaymentResponse(result).requires_redirect, true);
});

test("historical checkout receipts stay reconcilable without exposing their redirect URL", () => {
  const result = directPaymentResponse({ success: 1, id: "old-session", kind: "checkout", reference: "old-reference", payment_url: "https://checkout.alphapay.me/old" });
  assert.equal(result.id, "old-session");
  assert.equal(result.reference, "old-reference");
  assert.equal(result.kind, "checkout");
  assert.equal(result.requires_redirect, true);
  assert.equal(result.payment_url, undefined);
});

test("payout uses the dedicated endpoint and recipient, never a payin endpoint", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async (method, path, options) => {
    assert.equal(method, "POST");
    assert.equal(path, "/payouts/initialize/");
    assert.equal(options.body.recipient.msisdn, params.msisdn);
    assert.equal(options.body.method, "mtn_bj");
    assert.equal(options.idempotencyKey, params.reference);
    return { id: "payout-id", status: "PENDING" };
  }));
  assert.equal((await client.transfer(params)).kind, "payout");
});

test("paid checkout is verified against the underlying payment, not trusted as a browser success", async () => {
  const paths: string[] = [];
  const client = new AlphaPayService("sk_test_example", fakeClient(async (_method, path) => {
    paths.push(path);
    return path.includes("checkout-sessions") ? { status: "PAID", transaction_id: "payment-id" } : { id: "payment-id", status: "SUCCESS", requested_amount: "1000.00", currency: "XOF" };
  }));
  assert.equal((await client.verify("session-id", "checkout")).id, "payment-id");
  assert.deepEqual(paths, ["/checkout-sessions/session-id/status/", "/payments/payment-id/verify/"]);
});

test("payout verification uses payouts and uncertainty never becomes a definitive failure", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async (_method, path) => {
    assert.equal(path, "/payouts/payout-id/verify/");
    throw { status: 503, message: "sensitive upstream error", headers: { Authorization: "secret" } };
  }));
  await assert.rejects(client.verify("payout-id", "payout"), (error: any) => error.code === "ALPHAPAY_UNCERTAIN" && !error.message.includes("sensitive") && !error.message.includes("secret"));
  const denied = new AlphaPayService("sk_test_example", fakeClient(async () => { throw { status: 403 }; }));
  await assert.rejects(denied.transfer(params), (error: any) => error.code === "ALPHAPAY_REJECTED");
});

test("invalid currency, fractional amount and unsupported networks never initiate a request", async () => {
  const client = new AlphaPayService("sk_test_example", fakeClient(async () => { assert.fail("must not call the provider"); }));
  await assert.rejects(client.transfer({ ...params, amount: 100.5 }));
  await assert.rejects(client.deposit({ ...params, currency: "USD" }));
  await assert.rejects(client.transfer({ ...params, country: "COG" }));
});

test("deposit credits net funds only once and never credits pending or failed payments", () => {
  const tx = { type: "deposit", status: "pending", amount: "1000", fees: "60", currency: "XOF" };
  assert.equal(paymentWalletDelta(tx, "completed"), 940);
  assert.equal(paymentWalletDelta(tx, "pending"), 0);
  assert.equal(paymentWalletDelta(tx, "failed"), 0);
  assert.equal(paymentWalletDelta({ ...tx, status: "completed" }, "completed"), 0);
  assert.equal(paymentWalletDelta({ ...tx, status: "failed" }, "completed"), 0);
  assert.throws(() => paymentWalletDelta({ ...tx, fees: "1001" }, "completed"));
});

test("payout failure refunds the exact XOF reservation for withdrawal and transfer", () => {
  for (const type of ["withdrawal", "transfer"]) {
    const tx = { type, status: "pending", amount: "1000", fees: "50", currency: "CDF" };
    assert.equal(paymentWalletDelta(tx, "failed"), amountInXOF(1000, "CDF") + 50);
    assert.equal(paymentWalletDelta(tx, "completed"), 0);
    assert.equal(paymentWalletDelta(tx, "pending"), 0);
    assert.equal(paymentWalletDelta({ ...tx, status: "failed" }, "failed"), 0);
  }
});

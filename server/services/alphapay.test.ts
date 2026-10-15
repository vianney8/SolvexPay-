import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { AlphaPayService, getAlphaPayNetwork, alphapayStatusToString, verifyAlphaPaySignature } from "./alphapay";
import { paymentWalletDelta, amountInXOF } from "./paymentAccounting";
import type { AlphaPayClient } from "alphapay-node";

const now = 1_800_000_000_000;
const timestamp = String(now / 1000);
const raw = Buffer.from('{"event":"transaction.success","data":{"id":"example"}}');
const secret = "test-only-webhook-secret";
const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(raw).digest("hex");

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
  assert.throws(() => getAlphaPayNetwork("Airtel", "COG"));
  assert.throws(() => getAlphaPayNetwork("Wave", "BJ"));
});

const params = { msisdn: "+2290190000000", amount: 1000, reference: "test-reference", firstName: "Test", lastName: "Client", operator: "mtn_bj", country: "BJ", currency: "XOF", email: "test@example.invalid" };
function fakeClient(run: (...args: any[]) => any) {
  return { http: { request: run } } as unknown as AlphaPayClient;
}

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

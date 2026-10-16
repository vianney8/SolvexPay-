import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import express from "express";
import crypto from "node:crypto";
import type { Server } from "node:http";

// Bundle the real service with ONLY its DB module replaced. No provider HTTP or
// database connection is possible in this suite, even if live secrets exist.
const dialect = new PgDialect();
const key = (column: string) => column.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
class MemoryDatabase {
  rows: Record<string, any[]> = {};
  locks = 0;
  failStatusUpdate = false;
  private queue: Promise<any> = Promise.resolve();
  reset() {
    this.rows = {
      payment_provider_logs: [{
        id: "binding", reference: "local-ref", providerCode: "alphapay", action: "binding",
        status: "success", createdAt: new Date(),
        request: { action: "deposit", params: { reference: "local-ref", amount: 1000, currency: "XOF", country: "BJ", operator: "mtn_bj", email: "simulation@example.invalid", returnUrl: "https://example.invalid/return" } },
        response: { id: "provider-id", kind: "payment", status: "PENDING" },
      }],
      transactions: [{ id: "tx", reference: "local-ref", userId: "test-user", type: "deposit", amount: "1000", currency: "XOF", fees: "70", status: "pending" }],
      wallets: [{ userId: "test-user", balanceXOF: 100 }],
      admin_withdrawals: [],
    };
    this.locks = 0;
    this.failStatusUpdate = false;
  }
  matches(row: any, condition: any) {
    if (!condition) return true;
    const query = dialect.sqlToQuery(condition);
    for (const match of query.sql.matchAll(/"[^"]+"\."([^"]+)" = \$(\d+)/g)) {
      if (row[key(match[1])] !== query.params[Number(match[2]) - 1]) return false;
    }
    if (query.sql.includes("->>'id'")) {
      const id = query.params.at(-1);
      if (row.response?.id !== id && row.response?.transactionId !== id) return false;
    }
    return true;
  }
  select() {
    let table: string, condition: any, limit = Infinity;
    const run = () => (this.rows[table] || []).filter(row => this.matches(row, condition)).slice(0, limit).map(row => structuredClone(row));
    const chain: any = {
      from: (value: any) => { table = getTableName(value); return chain; },
      where: (value: any) => { condition = value; return chain; },
      limit: (value: number) => { limit = value; return chain; },
      orderBy: () => chain,
      for: (mode: string) => { assert.equal(mode, "update"); this.locks++; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve().then(run).then(resolve, reject),
    };
    return chain;
  }
  insert(table: any) {
    let values: any;
    const chain: any = {
      values: (value: any) => { values = value; return chain; },
      onConflictDoNothing: async () => {
        const rows = this.rows[getTableName(table)];
        if (!rows.some(row => row.userId === values.userId)) rows.push({ balanceXOF: 0, ...values });
      },
    };
    return chain;
  }
  update(table: any) {
    let values: any, condition: any;
    const run = () => {
      const name = getTableName(table);
      if (name === "transactions" && this.failStatusUpdate) throw new Error("simulated write failure");
      return (this.rows[name] || []).filter(row => this.matches(row, condition)).map(row => {
        for (const [field, value] of Object.entries(values)) {
          row[field] = field === "balanceXOF" ? row[field] + Number(dialect.sqlToQuery(value as any).params[0]) : value;
        }
        return structuredClone(row);
      });
    };
    const chain: any = {
      set: (value: any) => { values = value; return chain; },
      where: (value: any) => { condition = value; return chain; },
      returning: () => chain,
      then: (resolve: any, reject: any) => Promise.resolve().then(run).then(resolve, reject),
    };
    return chain;
  }
  transaction(run: (tx: this) => Promise<any>) {
    const next = this.queue.then(async () => {
      const snapshot = structuredClone(this.rows);
      try { return await run(this); }
      catch (error) { this.rows = snapshot; throw error; }
    });
    this.queue = next.catch(() => {});
    return next;
  }
}

const memory = new MemoryDatabase();
let service: any, AlphaPayService: any, registerWebhook: any, registerReturn: any;
let directory: string, server: Server, base: string;
let result: any, verifyCalls: number, notifications: number;
const signingSecret = "simulation-only-signing-secret";
const realFetch = globalThis.fetch;
before(async () => {
  directory = await mkdtemp(`${process.cwd()}/node_modules/.payment-tests-`);
  (globalThis as any).__alphaPayTestDb = memory;
  const output = `${directory}/service.mjs`;
  await build({
    stdin: { contents: `export * from "./server/services/paymentService"; export { AlphaPayService } from "./server/services/alphapay"; export * from "./server/services/paymentNotifications";`, resolveDir: process.cwd() },
    outfile: output, bundle: true, platform: "node", format: "esm", packages: "external",
    define: { "process.env.ALPHAPAY_SECRET_KEY": '"sk_test_simulation"' },
    plugins: [{ name: "isolated-database", setup(builder) {
      builder.onLoad({ filter: /\/server\/db\.ts$/ }, () => ({ contents: "export const db = globalThis.__alphaPayTestDb;", loader: "ts" }));
    } }],
  });
  const module = await import(pathToFileURL(output).href);
  service = module.paymentService;
  AlphaPayService = module.AlphaPayService;
  // Override the transport, not verify(): endpoint selection and response mapping remain real.
  AlphaPayService.prototype.request = async (method: string, path: string) => {
    assert.equal(method, "get");
    assert.equal(path, "/payments/provider-id/verify/");
    verifyCalls++;
    if (result instanceof Error) throw result;
    return structuredClone(result);
  };
  module.onPaymentSettled(async () => { notifications++; });
  registerWebhook = module.alphaPayWebhook;
  registerReturn = module.alphaPayBrowserReturn;
  const app = express();
  app.use(express.json({ verify(req, _res, buffer) { (req as any).rawBody = buffer; } }));
  app.post("/api/webhooks/alphapay", registerWebhook(service, async () => [], () => signingSecret));
  app.get("/api/payment/callback", registerReturn(service));
  app.get("/api/v1/sr/wave-callback", module.alphaPayWaveReturn(service, async (id: string) => {
    return structuredClone(memory.rows.transactions.find(row => row.id === id));
  }));
  server = await new Promise<Server>(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
  delete (globalThis as any).__alphaPayTestDb;
});
function reset() {
  memory.reset(); verifyCalls = 0; notifications = 0;
  result = { id: "provider-id", status: "SUCCESS", requested_amount: "1000", net_amount: "930", currency: "XOF", flow_direction: "INBOUND" };
}
async function webhook(body: any = { event: "transaction.success", data: { id: "provider-id" } }, options: { timestamp?: string; signature?: string; suffix?: string } = {}) {
  const timestamp = options.timestamp || String(Math.floor(Date.now() / 1000));
  const raw = JSON.stringify(body);
  const signature = options.signature ?? crypto.createHmac("sha256", signingSecret).update(`${timestamp}.${raw}`).digest("hex");
  return realFetch(`${base}/api/webhooks/alphapay`, { method: "POST", headers: { "Content-Type": "application/json", "X-Webhook-Timestamp": timestamp, "X-Webhook-Signature": signature }, body: raw + (options.suffix || "") });
}
const balance = () => memory.rows.wallets[0].balanceXOF;
const status = () => memory.rows.transactions[0].status;

test("signed event resolves persisted provider ID, verifies server-side and credits once", async () => {
  reset();
  const responses = await Promise.all(Array.from({ length: 8 }, () => webhook()));
  assert.ok(responses.every(response => response.status === 200));
  assert.equal(balance(), 1030); assert.equal(status(), "completed");
  assert.equal(notifications, 1); assert.ok(memory.locks >= 1);
  assert.equal((await webhook({ event: "transaction.failed", data: { id: "provider-id" } })).status, 200);
  assert.equal(balance(), 1030); assert.equal(notifications, 1);
});

test("event success cannot override pending, failed or unavailable authenticated verification", async () => {
  for (const state of ["PENDING", "FAILED", "CANCELLED", new Error("timeout")]) {
    reset();
    if (state instanceof Error) result = state; else result.status = state;
    assert.equal((await webhook()).status, state instanceof Error ? 503 : 200);
    assert.equal(balance(), 100); assert.notEqual(status(), "completed");
  }
});

test("invalid, missing, altered and expired signatures never reach verification", async () => {
  for (const options of [{ signature: "" }, { signature: "bad" }, { suffix: " " }, { timestamp: String(Math.floor(Date.now() / 1000) - 301) }]) {
    reset();
    assert.equal((await webhook(undefined, options)).status, 401);
    assert.equal(verifyCalls, 0); assert.equal(balance(), 100); assert.equal(status(), "pending");
  }
});

test("local references and payload amounts cannot substitute an unknown provider ID", async () => {
  reset();
  assert.equal((await webhook({ event: "transaction.success", reference: "local-ref", data: { id: "unknown", reference: "local-ref", amount: 1000 } })).status, 409);
  assert.equal(verifyCalls, 0); assert.equal(balance(), 100);
  assert.equal((await webhook({ event: "transaction.success", data: {} })).status, 400);
  assert.equal((await webhook({ event: "webhook.test" })).status, 200);
  assert.equal((await webhook({ event: "wallet_transfer.completed" })).status, 200);
  assert.equal(verifyCalls, 0);
});

test("mismatched provider ID, amount, currency, direction or net amount blocks credit", async () => {
  for (const patch of [{ id: "other" }, { requested_amount: "2000" }, { currency: "USD" }, { flow_direction: "OUTBOUND" }, { net_amount: "929" }, { net_amount: undefined }]) {
    reset(); Object.assign(result, patch);
    assert.equal((await webhook()).status, 503);
    assert.equal(balance(), 100); assert.equal(status(), "pending");
  }
});

test("local accounting amount and currency must match the persisted payment intent", async () => {
  for (const patch of [{ amount: "2000" }, { currency: "XAF" }]) {
    reset(); Object.assign(memory.rows.transactions[0], patch);
    assert.equal((await webhook()).status, 503);
    assert.equal(balance(), 100); assert.equal(status(), "pending");
  }
});

test("crypto verifies the USD invoice but credits the persisted local source minus local fees", async () => {
  for (const [currency, amount, fees, credit] of [["XOF", 2500, 175, 2325], ["XAF", 2500, 175, 2325], ["CDF", 10000, 700, 2046]] as const) {
    reset();
    const binding = memory.rows.payment_provider_logs[0];
    binding.request.params = { ...binding.request.params, country: "XX", operator: "crypto", currency: "USD", amount: 4.41, sourceAmount: amount, sourceCurrency: currency };
    Object.assign(memory.rows.transactions[0], { currency, amount: String(amount), fees: String(fees) });
    Object.assign(result, { requested_amount: "4.41", net_amount: "4.41", currency: "USD" });
    assert.equal((await webhook()).status, 200);
    assert.equal(balance(), 100 + credit);
    assert.equal((await webhook()).status, 200); assert.equal(balance(), 100 + credit);
  }
});

test("crypto source mismatch and verifying local amount instead of USD leave funds untouched", async () => {
  for (const mismatch of ["amount", "currency", "provider"]) {
    reset();
    memory.rows.payment_provider_logs[0].request.params = { reference: "local-ref", country: "XX", operator: "crypto", currency: "USD", amount: 4.41, sourceAmount: 2500, sourceCurrency: "XOF", email: "simulation@example.invalid", returnUrl: "https://example.invalid/return" };
    Object.assign(memory.rows.transactions[0], { amount: mismatch === "amount" ? "2499" : "2500", currency: mismatch === "currency" ? "XAF" : "XOF", fees: "175" });
    Object.assign(result, { requested_amount: mismatch === "provider" ? "2500" : "4.41", currency: "USD", net_amount: "4.41" });
    assert.equal((await webhook()).status, 503); assert.equal(balance(), 100); assert.equal(status(), "pending");
  }
});

test("wallet credit rolls back if final status fails, and retry settles exactly once", async () => {
  reset(); memory.failStatusUpdate = true;
  assert.equal((await webhook()).status, 503);
  assert.equal(balance(), 100); assert.equal(status(), "pending"); assert.equal(notifications, 0);
  memory.failStatusUpdate = false;
  assert.equal((await webhook()).status, 200);
  assert.equal(balance(), 1030); assert.equal(notifications, 1);
});

test("forged browser success and merchant redirect never credit pending payments or redirect externally", async () => {
  reset(); result.status = "PENDING";
  const response = await realFetch(`${base}/api/payment/callback?reference=local-ref&status=SUCCESS&amount=999999&merchant_redirect=https://evil.invalid`, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/deposit?status=callback&reference=local-ref");
  assert.equal(balance(), 100); assert.equal(status(), "pending"); assert.equal(verifyCalls, 1);
  result.status = "SUCCESS";
  await Promise.all([webhook(), realFetch(`${base}/api/payment/callback?reference=local-ref&status=FAILED`, { redirect: "manual" })]);
  assert.equal(balance(), 1030); assert.equal(notifications, 1);
});

test("unsigned legacy endpoint stays absent; unknown browser reference cannot initiate a payment", async () => {
  reset();
  const response = await realFetch(`${base}/api/webhook`, { method: "POST", body: "{}" });
  assert.equal(response.status, 404);
  const callback = await realFetch(`${base}/api/payment/callback?reference=unknown&status=SUCCESS`, { redirect: "manual" });
  assert.equal(callback.status, 302); assert.equal(verifyCalls, 0); assert.equal(balance(), 100);
});

test("Wave return cannot pair a completed reference A with pending transaction B", async () => {
  reset();
  assert.equal((await webhook()).status, 200); // A is genuinely verified and settled.
  memory.rows.transactions.push({ ...memory.rows.transactions[0], id: "other-tx", reference: "other-ref", userId: "other-user", amount: "90000", status: "pending" });
  memory.rows.wallets.push({ userId: "other-user", balanceXOF: 0 });
  const previousCalls = verifyCalls;
  const response = await realFetch(`${base}/api/v1/sr/wave-callback?id=other-tx&reference=local-ref&status=SUCCESS`, { redirect: "manual" });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("location"), null);
  assert.equal(verifyCalls, previousCalls);
  assert.equal(memory.rows.transactions[1].status, "pending");
  assert.equal(memory.rows.wallets[1].balanceXOF, 0);
  assert.equal(balance(), 1030); assert.equal(notifications, 1);
});

test("valid Wave return verifies only its bound reference and remains idempotent across callbacks", async () => {
  reset(); result.status = "PENDING";
  const url = `${base}/api/v1/sr/wave-callback?id=tx&reference=local-ref&status=SUCCESS&merchant_redirect=https://evil.invalid`;
  const response = await realFetch(url, { redirect: "manual" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/pay-api/tx?status=callback&reference=local-ref");
  assert.equal(status(), "pending"); assert.equal(balance(), 100);
  result.status = "SUCCESS";
  await Promise.all([webhook(), realFetch(url, { redirect: "manual" }), realFetch(`${base}/api/payment/callback?reference=local-ref`, { redirect: "manual" })]);
  assert.equal(status(), "completed"); assert.equal(balance(), 1030); assert.equal(notifications, 1);
  await realFetch(url, { redirect: "manual" });
  assert.equal(balance(), 1030); assert.equal(notifications, 1);
});

test("Wave return rejects missing, malformed and unknown ID/reference before verification", async () => {
  for (const [query, expected] of [["id=tx", 400], ["reference=local-ref", 400], ["id=tx&id=other&reference=local-ref", 400], ["id=missing&reference=local-ref", 404], ["id=tx&reference=unknown", 404]] as const) {
    reset();
    const response = await realFetch(`${base}/api/v1/sr/wave-callback?${query}`, { redirect: "manual" });
    assert.equal(response.status, expected);
    assert.equal(verifyCalls, 0); assert.equal(balance(), 100); assert.equal(status(), "pending");
  }
});

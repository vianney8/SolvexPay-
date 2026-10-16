import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import express from "express";
import crypto from "node:crypto";
import type { Server } from "node:http";
import { createServer } from "node:http";

// Bundle the real service with ONLY its DB module replaced. No provider HTTP or
// database connection is possible in this suite, even if live secrets exist.
const dialect = new PgDialect();
const key = (column: string) => column.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
class MemoryDatabase {
  rows: Record<string, any[]> = {};
  locks = 0;
  failStatusUpdate = false;
  failPolicyReads = false;
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
      system_settings: [],
      payment_methods: [],
      users: [{ id: "test-user", kycStatus: "verified", apiSrEnabled: true }],
    };
    this.locks = 0;
    this.failStatusUpdate = false;
    this.failPolicyReads = false;
  }
  matches(row: any, condition: any) {
    if (!condition) return true;
    const query = dialect.sqlToQuery(condition);
    for (const match of query.sql.matchAll(/"[^"]+"\."([^"]+)" = \$(\d+)/g)) {
      if (row[key(match[1])] !== query.params[Number(match[2]) - 1]) return false;
    }
    if (query.sql.includes('"balance_xof" >=')) {
      if (row.balanceXOF < Number(query.params.at(-1))) return false;
    }
    if (query.sql.includes("->>'id'")) {
      const id = query.params.at(-1);
      if (row.response?.id !== id && row.response?.transactionId !== id) return false;
    }
    return true;
  }
  select() {
    let table: string, condition: any, limit = Infinity;
    const run = () => {
      if (this.failPolicyReads && ["system_settings", "payment_methods"].includes(table)) throw new Error("simulated policy outage");
      return (this.rows[table] || []).filter(row => this.matches(row, condition)).slice(0, limit).map(row => structuredClone(row));
    };
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
    const run = () => {
      const rows = this.rows[getTableName(table)] ||= [];
      const created = { id: `row-${rows.length}`, createdAt: new Date(), ...structuredClone(values) };
      rows.push(created);
      return [structuredClone(created)];
    };
    const chain: any = {
      values: (value: any) => { values = value; return chain; },
      onConflictDoNothing: async () => {
        const rows = this.rows[getTableName(table)];
        if (!rows.some(row => row.userId === values.userId)) rows.push({ balanceXOF: 0, ...values });
      },
      returning: () => chain,
      then: (resolve: any, reject: any) => Promise.resolve().then(run).then(resolve, reject),
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
          if (field === "balanceXOF") {
            const query = dialect.sqlToQuery(value as any);
            row[field] += (query.sql.includes(" - ") ? -1 : 1) * Number(query.params[0]);
          } else row[field] = value;
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
  async execute() {}
}

const memory = new MemoryDatabase();
let service: any, AlphaPayService: any, registerWebhook: any, registerReturn: any;
let directory: string, server: Server, base: string;
let result: any, verifyCalls: number, notifications: number;
let module: any, routeServer: Server, routeBase: string;
let payoutCalls = 0, payoutResult: any, policyTransport = false, storageWrites = 0;
let payoutGate: Promise<void> | undefined, onPayoutStarted: (() => void) | undefined;
const signingSecret = "simulation-only-signing-secret";
const realFetch = globalThis.fetch;
before(async () => {
  directory = await mkdtemp(`${process.cwd()}/node_modules/.payment-tests-`);
  (globalThis as any).__alphaPayTestDb = memory;
  const output = `${directory}/service.mjs`;
  await build({
    stdin: { contents: `export * from "./server/services/paymentService"; export { AlphaPayService } from "./server/services/alphapay"; export * from "./server/services/paymentNotifications"; export * from "./server/services/paymentPolicy"; export { registerRoutes } from "./server/routes";`, resolveDir: process.cwd() },
    outfile: output, bundle: true, platform: "node", format: "esm", packages: "external",
    define: { "process.env.ALPHAPAY_SECRET_KEY": '"sk_test_simulation"' },
    plugins: [{ name: "isolated-database", setup(builder) {
      builder.onLoad({ filter: /\/server\/db\.ts$/ }, () => ({ contents: "export const db = globalThis.__alphaPayTestDb;", loader: "ts" }));
      builder.onLoad({ filter: /\/server\/routes\.ts$/ }, async args => ({
        contents: `const setTimeout = () => 0;\n` + await readFile(args.path, "utf8"), loader: "ts",
      }));
      builder.onLoad({ filter: /\/server\/storage\.ts$/ }, () => ({ contents: `
        export const storage = globalThis.__paymentTestStorage;
        export const generateReference = () => "simulated-new-reference";
        export const generateSlug = generateReference;
        export const generateApiKey = generateReference;`, loader: "ts" }));
      builder.onLoad({ filter: /\/server\/replit_integrations\/auth\/index\.ts$/ }, () => ({ contents: `
        export async function setupAuth(app) {
          app.use((req, res, next) => {
            const role = req.get("x-test-role");
            if (role) { req.session = {userId: "test-user"}; req.user = {id: "test-user", isAdmin: role === "admin", kycStatus: "verified"}; }
            next();
          });
        }
        export function isAuthenticated(req, res, next) { req.user ? next() : res.sendStatus(401); }
        export function isAdmin(req, res, next) { req.user?.isAdmin ? next() : res.sendStatus(403); }
        export function registerAuthRoutes() {}`, loader: "ts" }));
      builder.onLoad({ filter: /\/server\/services\/paymentCatalog\.ts$/ }, () => ({ contents: "export async function ensurePaymentCatalog() {}", loader: "ts" }));
      builder.onLoad({ filter: /\/server\/services\/telegram\.ts$/ }, () => ({ contents: "export async function notifyTransactionCompleted() {} export async function notifyWithdrawal() {} export async function handleTelegramCallback() {}", loader: "ts" }));
      builder.onLoad({ filter: /\/server\/services\/resend\.ts$/ }, () => ({ contents: "export async function testResendConnection() {} export async function sendKycStatusEmail() {}", loader: "ts" }));
    } }],
  });
  (globalThis as any).__paymentTestStorage = new Proxy({}, { get(_target, property) {
    if (property === "getTransactionById") return async (id: string) => memory.rows.transactions.find(t => t.id === id);
    if (property === "getTransactionByReference") return async (reference: string) => memory.rows.transactions.find(t => t.reference === reference);
    if (property === "findApiKeyByFullKey") return async () => ({ id: "api-test", userId: "test-user", isActive: true, isSrKey: true });
    if (property === "updateApiKey") return async () => ({ id: "api-test" });
    if (property === "getSystemSetting") return async (key: string) => memory.rows.system_settings.find(r => r.key === key)?.value;
    return async () => { storageWrites++; throw new Error(`Unexpected storage access: ${String(property)}`); };
  } });
  module = await import(pathToFileURL(output).href);
  service = module.paymentService;
  AlphaPayService = module.AlphaPayService;
  // Override the transport, not verify(): endpoint selection and response mapping remain real.
  AlphaPayService.prototype.request = async (method: string, path: string) => {
    if (policyTransport) {
      if (path === "/pricing/my-rates/") return [
        { network_code: "mtn_bj", country_code: "BJ", payout: { available: true, tiers: [{ currency: "XOF", min_amount: 1, max_amount: 1000000, percent: 0, fixed: 0 }] } },
        { network_code: "airtel_cd", country_code: "CD", payout: { available: true, tiers: [{ currency: "CDF", min_amount: 1, max_amount: 1000000, percent: 0, fixed: 0 }] } },
      ];
      if (path === "/payouts/initialize/") {
        payoutCalls++;
        onPayoutStarted?.();
        if (payoutGate) await payoutGate;
        if (payoutResult instanceof Error) throw payoutResult;
        return payoutResult;
      }
      if (path === "/payouts/provider-id/verify/") {
        assert.equal(method, "get");
        verifyCalls++;
        if (result instanceof Error) throw result;
        return structuredClone(result);
      }
      if (path !== "/payments/provider-id/verify/") throw new Error(`Unexpected transport ${method} ${path}`);
    }
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
  const routes = express();
  routes.use(express.json());
  routeServer = createServer(routes);
  await module.registerRoutes(routeServer, routes);
  module.onPaymentSettled(async () => { notifications++; });
  await new Promise<void>(resolve => routeServer.listen(0, "127.0.0.1", resolve));
  routeBase = `http://127.0.0.1:${(routeServer.address() as any).port}`;
});
after(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  if (routeServer) await new Promise<void>(resolve => routeServer.close(() => resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
  delete (globalThis as any).__alphaPayTestDb;
  delete (globalThis as any).__paymentTestStorage;
});
function reset() {
  memory.reset(); verifyCalls = 0; notifications = 0;
  payoutCalls = 0; policyTransport = false; storageWrites = 0;
  payoutGate = undefined; onPayoutStarted = undefined;
  payoutResult = { id: "provider-id", status: "PENDING" };
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

function setting(key: string, value: string) {
  const rows = memory.rows.system_settings;
  const row = rows.find(r => r.key === key);
  if (row) row.value = value; else rows.push({ key, value });
}
const payoutParams = (patch = {}) => ({
  reference: "manual-ref", amount: 1000, currency: "XOF", country: "BJ", operator: "mtn_bj",
  msisdn: "2290197000000", firstName: "Simulation", lastName: "Only", email: "test@example.invalid", ...patch,
});
function resetPayout() {
  reset(); policyTransport = true;
  memory.rows.transactions = []; memory.rows.payment_provider_logs = [];
  memory.rows.wallets[0].balanceXOF = 10000;
  setting("withdrawalMode", "manual");
}
const paymentPaths = [
  "/api/transactions/deposit", "/api/transactions/withdraw", "/api/transactions/transfer",
  "/api/payment-api/public/tx/pay", "/api/payment-links/public/test/pay",
  "/api/v1/deposit", "/api/v1/sr/pay",
];
async function route(path: string, body: any, role = "user", method = "POST") {
  return realFetch(`${routeBase}${path}`, {
    method, headers: { "Content-Type": "application/json", "x-test-role": role, "Authorization": "Bearer sk_live_simulation_only" },
    body: JSON.stringify(body),
  });
}
test("all seven payment routes block general maintenance before any business write or HTTP provider call", async () => {
  reset(); setting("globalMaintenance", "true");
  for (const path of paymentPaths) {
    const response = await route(path, { operator: "MTN", country: "BJ" });
    assert.equal(response.status, 503, path);
  }
  assert.equal(storageWrites, 0); assert.equal(verifyCalls, 0); assert.equal(payoutCalls, 0);
  assert.equal(balance(), 100);
  assert.equal((await realFetch(`${routeBase}/api/v1/checkout?key=simulation&amount=100`)).status, 503);
});

test("every payment route enforces suspended countries including CG alias, even for administrators", async () => {
  for (const role of ["user", "admin"]) for (const country of ["COG", "cg"]) {
    reset(); setting("suspended_countries", '["COG"]');
    for (const path of paymentPaths) {
      const response = await route(path, { operator: "MTN", country }, role);
      assert.equal(response.status, 503, `${role} ${path} ${country}`);
      assert.equal((await response.json()).error.code, "COUNTRY_SUSPENDED");
    }
    assert.equal(storageWrites, 0); assert.equal(balance(), 100);
  }
});

test("all entry routes enforce operator disablement, general and deposit maintenance; payouts enforce withdrawal maintenance", async () => {
  for (const restriction of [{ isActive: false }, { inMaintenance: true }, { maintenanceCountries: ["BJ"] }]) {
    reset(); memory.rows.payment_methods = [{ code: "MTN", ...restriction }];
    for (const path of paymentPaths) assert.equal((await route(path, { operator: "MTN", country: "BJ" }, "admin")).status, 503, path);
    assert.equal(storageWrites, 0);
  }
  for (const restriction of [{ depositMaintenance: true }, { depositMaintenanceCountries: ["BJ"] }]) {
    reset(); memory.rows.payment_methods = [{ code: "MTN", ...restriction }];
    for (const path of paymentPaths.filter(p => !/withdraw|transfer/.test(p))) {
      assert.equal((await route(path, { operator: "MTN", country: "BJ" }, "admin")).status, 503, path);
    }
  }
  for (const restriction of [{ withdrawalMaintenance: true }, { withdrawalMaintenanceCountries: ["BJ"] }]) {
    reset(); memory.rows.payment_methods = [{ code: "MTN", ...restriction }];
    for (const path of ["/api/transactions/withdraw", "/api/transactions/transfer"]) {
      assert.equal((await route(path, { operator: "MTN", country: "BJ" }, "admin")).status, 503, path);
    }
    assert.equal(storageWrites, 0);
  }
});

test("authenticated administrators only bypass global maintenance, never country/operator restrictions", async () => {
  reset(); setting("globalMaintenance", "true");
  assert.equal((await route("/api/transactions/deposit", {}, "admin")).status, 400);
  assert.equal((await route("/api/transactions/deposit", {}, "user")).status, 503);
  // API keys and body flags do not create an administrator session.
  assert.equal((await route("/api/v1/deposit", { isAdmin: true, amount: 100 }, "")).status, 503);
  setting("suspended_countries", '["COG"]');
  assert.equal((await route("/api/transactions/deposit", { operator: "mtn_cg", country: "CG" }, "admin")).status, 503);
});

test("policy read failures and malformed suspension settings fail closed", async () => {
  reset(); memory.failPolicyReads = true;
  for (const path of paymentPaths) assert.equal((await route(path, { operator: "MTN", country: "BJ" })).status, 503);
  memory.failPolicyReads = false; setting("suspended_countries", '{"not":"a list"}');
  await assert.rejects(module.paymentService.deposit(payoutParams()), /Restrictions pays/);
  assert.equal(storageWrites, 0);
});

test("service layer guards direct entry, reservation, direct payout and binding retries", async () => {
  resetPayout(); setting("globalMaintenance", "true");
  for (const run of [
    () => module.paymentService.deposit(payoutParams()),
    () => module.paymentService.transfer(payoutParams()),
    () => module.reservePayout("test-user", payoutParams(), 70, "withdrawal"),
  ]) await assert.rejects(run(), /maintenance/);
  assert.equal(balance(), 10000); assert.equal(memory.rows.transactions.length, 0); assert.equal(payoutCalls, 0);
  reset(); memory.rows.payment_provider_logs[0].response = null;
  setting("globalMaintenance", "true");
  await assert.rejects(module.paymentService.getStatus("local-ref"), /maintenance/);
  assert.equal(verifyCalls, 0); assert.equal(balance(), 100);
});

test("crypto remains incoming only and source-country suspension cannot be bypassed by conversion", async () => {
  resetPayout();
  await module.assertPaymentAllowed("Crypto", "BJ", "payin");
  await assert.rejects(module.reservePayout("test-user", payoutParams({ operator: "crypto" }), 70, "withdrawal"), /disponible/);
  await assert.rejects(module.paymentService.transfer(payoutParams({ operator: "crypto" })), /disponible/);
  setting("suspended_countries", '["COG"]');
  await assert.rejects(module.paymentService.deposit(payoutParams({ country: "CG", operator: "crypto" })), /suspendus/);
  assert.equal(balance(), 10000); assert.equal(payoutCalls, 0);
});

test("manual withdrawal and transfer atomically reserve principal plus fees without provider initiation or binding", async () => {
  for (const type of ["withdrawal", "transfer"]) {
    resetPayout();
    const tx = await module.reservePayout("test-user", payoutParams(), 70, type);
    assert.equal(tx.approvalRequired, true); assert.equal(tx.status, "pending");
    assert.equal(balance(), 8930); assert.equal(payoutCalls, 0);
    assert.equal(memory.rows.payment_provider_logs[0].action, "payout_approval");
    const pending = await module.paymentService.getStatus("manual-ref");
    assert.equal(pending.approvalRequired, true); assert.equal(pending.status, "PENDING");
    assert.equal(verifyCalls, 0); assert.equal(payoutCalls, 0);
    await assert.rejects(module.paymentService.transfer(payoutParams()), /Validation administrateur/);
    setting("withdrawalMode", "auto");
    await assert.rejects(module.paymentService.transfer(payoutParams()), /Validation administrateur/);
  }
});

test("country-only API intentions and checkout cannot bypass suspensions without selecting an operator", async () => {
  reset(); setting("suspended_countries", '["COG"]');
  assert.equal((await route("/api/v1/deposit", { country: "CG", amount: 1000 })).status, 503);
  assert.equal((await realFetch(`${routeBase}/api/v1/checkout?country=CG&amount=1000`)).status, 503);
  assert.equal(storageWrites, 0);
});

test("the configured directional restrictions remain distinct and do not open crypto payouts", async () => {
  reset();
  memory.rows.payment_methods = [
    { code: "Orange", depositMaintenanceCountries: ["CI"], withdrawalMaintenance: true, withdrawalMaintenanceCountries: ["COD"] },
    { code: "Moov", withdrawalMaintenanceCountries: ["BJ", "CI", "BF", "ML"] },
    { code: "Free", withdrawalMaintenance: true },
    { code: "TMoney", withdrawalMaintenance: true },
  ];
  await assert.rejects(module.assertPaymentAllowed("orange_ci", "CI", "payin"), /dépôts/);
  await module.assertPaymentAllowed("Orange", "CM", "payin");
  for (const country of ["CI", "BF", "ML", "CM", "SN", "CD"]) {
    await assert.rejects(module.assertPaymentAllowed("Orange", country, "payout"), /retraits/);
  }
  for (const country of ["BJ", "CI", "BF", "ML"]) {
    await assert.rejects(module.assertPaymentAllowed("Moov", country, "payout"), /retraits/);
    await module.assertPaymentAllowed("Moov", country, "payin");
  }
  await module.assertPaymentAllowed("Moov", "TG", "payout");
  await assert.rejects(module.assertPaymentAllowed("freemoney_sn", "SN", "payout"), /retraits/);
  await assert.rejects(module.assertPaymentAllowed("togocel", "TG", "payout"), /retraits/);
  await assert.rejects(module.assertPaymentAllowed("Crypto", "BJ", "payout"), /disponible/);
});

test("atomic reservations reject overspending and roll back when the approval record cannot be saved", async () => {
  resetPayout();
  memory.rows.wallets[0].balanceXOF = 1100;
  const results = await Promise.allSettled([
    module.reservePayout("test-user", payoutParams(), 70, "withdrawal"),
    module.reservePayout("test-user", payoutParams({ reference: "other-ref" }), 70, "transfer"),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(balance(), 30); assert.equal(memory.rows.transactions.length, 1); assert.equal(payoutCalls, 0);
  resetPayout();
  const insert = memory.insert;
  memory.insert = function(table: any) {
    if (getTableName(table) === "payment_provider_logs") throw new Error("simulated approval failure");
    return insert.call(this, table);
  };
  try { await assert.rejects(module.reservePayout("test-user", payoutParams(), 70, "withdrawal"), /approval failure/); }
  finally { memory.insert = insert; }
  assert.equal(balance(), 10000); assert.equal(memory.rows.transactions.length, 0);
});

test("concurrent approvals send exact principal once, do not debit again and never mark success locally", async () => {
  resetPayout();
  const tx = await module.reservePayout("test-user", payoutParams(), 70, "withdrawal");
  const results = await Promise.all(Array.from({ length: 6 }, () => route(`/api/admin/transactions/${tx.id}/status`, { status: "completed" }, "admin", "PATCH")));
  assert.ok(results.every(r => r.status === 200));
  assert.equal(payoutCalls, 1); assert.equal(balance(), 8930); assert.equal(status(), "pending");
  const binding = memory.rows.payment_provider_logs.find(r => r.action === "binding");
  assert.equal(binding.request.params.amount, 1000);
  assert.equal(binding.request.params.country, "BJ");
  assert.equal(binding.request.params.email, "test@example.invalid");
  await module.decidePayout("manual-ref", "approve");
  await module.decidePayout("manual-ref", "reject");
  assert.equal(payoutCalls, 1); assert.equal(balance(), 8930); assert.equal(status(), "pending");
});

test("manual rejection is single-refund under concurrency, including XOF fees on CDF principal", async () => {
  for (const type of ["withdrawal", "transfer"]) {
    resetPayout();
    const tx = await module.reservePayout("test-user", payoutParams({ country: "COD", currency: "CDF", operator: "airtel_cd" }), 70, type);
    assert.equal(balance(), 9710);
    const responses = await Promise.all(Array.from({ length: 5 }, () => route(`/api/admin/transactions/${tx.id}/status`, { status: "failed" }, "admin", "PATCH")));
    assert.ok(responses.every(r => r.status === 200));
    assert.equal(balance(), 10000); assert.equal(status(), "failed"); assert.equal(payoutCalls, 0);
    await module.decidePayout("manual-ref", "approve");
    assert.equal(payoutCalls, 0);
  }
});

test("new restrictions block approval without losing reservations; administrator exemption is limited to maintenance", async () => {
  resetPayout();
  const tx = await module.reservePayout("test-user", payoutParams(), 70, "transfer");
  memory.rows.payment_methods = [{ code: "MTN", withdrawalMaintenance: true }];
  assert.equal((await route(`/api/admin/transactions/${tx.id}/status`, { status: "completed" }, "admin", "PATCH")).status, 503);
  assert.equal(balance(), 8930); assert.equal(payoutCalls, 0);
  assert.equal(memory.rows.payment_provider_logs[0].status, "awaiting_approval");
  memory.rows.payment_methods = []; setting("globalMaintenance", "true");
  assert.equal((await route(`/api/admin/transactions/${tx.id}/status`, { status: "completed" }, "user", "PATCH")).status, 403);
  assert.equal((await route(`/api/admin/transactions/${tx.id}/status`, { status: "completed" }, "admin", "PATCH")).status, 200);
  assert.equal(payoutCalls, 1); assert.equal(balance(), 8930);
});

test("uncertain approval preserves funds and repeated administrator decisions never send twice", async () => {
  resetPayout(); payoutResult = new Error("simulated timeout");
  await module.reservePayout("test-user", payoutParams(), 70, "withdrawal");
  await module.decidePayout("manual-ref", "approve");
  await module.decidePayout("manual-ref", "approve");
  await module.decidePayout("manual-ref", "reject");
  // A mode change must not make this manually approved payout retryable.
  setting("withdrawalMode", "auto");
  for (let i = 0; i < 4; i++) {
    await assert.rejects(module.paymentService.getStatus("manual-ref"), { code: "PAYOUT_RECONCILIATION_REQUIRED", status: 409 });
  }
  for (const path of ["/api/transactions/verify", "/api/payment-links/verify-public"]) {
    for (let i = 0; i < 3; i++) {
      const response = await route(path, { reference: "manual-ref" });
      assert.notEqual(response.status, 200);
      assert.match((await response.json()).message, /rapprochement/);
    }
  }
  assert.equal(payoutCalls, 1); assert.equal(balance(), 8930); assert.equal(status(), "pending");
  assert.equal(verifyCalls, 0); assert.equal(storageWrites, 0);
  assert.equal(memory.rows.payment_provider_logs.find(r => r.action === "payout_approval").status, "submitted");
});

test("status verification overlapping a manual approval never resends its in-flight payout", async () => {
  for (const type of ["withdrawal", "transfer"]) {
    resetPayout();
    await module.reservePayout("test-user", payoutParams(), 70, type);
    let release!: () => void;
    payoutGate = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { onPayoutStarted = resolve; });
    const approval = module.decidePayout("manual-ref", "approve");
    await started;
    try {
      const binding = memory.rows.payment_provider_logs.find(row => row.action === "binding");
      assert.equal(binding.response, undefined);
      await Promise.all(Array.from({ length: 5 }, () =>
        assert.rejects(module.paymentService.getStatus("manual-ref"), { code: "PAYOUT_RECONCILIATION_REQUIRED", status: 409 })));
      const responses = await Promise.all([
        route("/api/transactions/verify", { reference: "manual-ref" }),
        route("/api/payment-links/verify-public", { reference: "manual-ref" }),
        route("/api/payment-links/verify-public", { reference: "manual-ref" }, ""),
      ]);
      assert.ok(responses.every(response => response.status !== 200));
      assert.equal(payoutCalls, 1); assert.equal(verifyCalls, 0);
      assert.equal(balance(), 8930); assert.equal(status(), "pending"); assert.equal(storageWrites, 0);
    } finally {
      release();
      await approval;
    }
    assert.equal(payoutCalls, 1);
    // Once the receipt is persisted, status checks verify it rather than send.
    Object.assign(result, { status: "PENDING", net_amount: "1000", flow_direction: "OUTBOUND" });
    assert.equal((await module.paymentService.getStatus("manual-ref")).status, "PENDING");
    assert.equal(verifyCalls, 1); assert.equal(payoutCalls, 1); assert.equal(balance(), 8930);
  }
});

test("definitive provider rejection refunds once, while automatic mode still submits after reservation", async () => {
  resetPayout(); payoutResult = Object.assign(new Error("simulated rejection"), { code: "ALPHAPAY_REJECTED" });
  await module.reservePayout("test-user", payoutParams(), 70, "withdrawal");
  await assert.rejects(module.decidePayout("manual-ref", "approve"), /simulated rejection/);
  await module.decidePayout("manual-ref", "reject");
  assert.equal(balance(), 10000); assert.equal(status(), "failed"); assert.equal(payoutCalls, 1);
  resetPayout(); setting("withdrawalMode", "auto");
  await module.reservePayout("test-user", payoutParams(), 70, "transfer");
  assert.equal(payoutCalls, 1); assert.equal(balance(), 8930); assert.equal(status(), "pending");
});

import test from "node:test";
import assert from "node:assert/strict";
import { calculateProviderFee, quotePayment } from "./paymentQuote";
import { AlphaPayService } from "./alphapay";

test("provider fees round up by currency and respect floors and caps", () => {
  assert.equal(calculateProviderFee(2500, { percent: 4.5, fixed: 0 }, "XOF"), 113);
  assert.equal(calculateProviderFee(4.41, { percent: 2.7, fixed: 0 }, "USD"), 0.12);
  assert.equal(calculateProviderFee(100, { percent: 1, fixed: 0, floor_amount: 50 }, "XOF"), 50);
  assert.equal(calculateProviderFee(100000, { percent: 10, fixed: 0, cap_amount: 500 }, "XOF"), 500);
});

test("quotes enforce live directions, OTP totals and explicit USD crypto conversion without initiating payments", async () => {
  const original = AlphaPayService.prototype.request;
  const calls: string[] = [];
  AlphaPayService.prototype.request = async function(method, path) {
    assert.equal(method.toLowerCase(), "get");
    calls.push(path);
    if (path.includes("exchange-rates")) return { count: 3, results: [
      { from_currency: "USD", to_currency: "XOF", rate: 568 },
      { from_currency: "USD", to_currency: "XAF", rate: 568 },
      { from_currency: "CDF", to_currency: "USD", rate: 0.00044 },
    ] };
    return [
      { country_code: "BF", network_code: "orange_bf", payin: { available: true, otp_required: false, tiers: [{ min_amount: 200, max_amount: 1e8, currency: "XOF", percent: 4.5, fixed: 0, fee_charge_mode: "ADD_ON" }] }, payout: { available: true, otp_required: true, tiers: [{ min_amount: 200, max_amount: 1e8, currency: "XOF", percent: 0, fixed: 0, fee_charge_mode: "ADD_ON" }] } },
      { country_code: "SN", network_code: "orange_sn", payin: { available: true, otp_required: true, otp_instructions: "Obtenez un code", tiers: [{ min_amount: 200, max_amount: 1e8, currency: "XOF", percent: 0, fixed: 0, fee_charge_mode: "ADD_ON" }] } },
      { country_code: "CI", network_code: "orange_ci", payin: { available: true, otp_required: true, otp_instructions: "#144*82#", tiers: [{ min_amount: 200, max_amount: 1e8, currency: "XOF", percent: 0, fixed: 0, fee_charge_mode: "ADD_ON" }] } },
      { country_code: "XX", network_code: "crypto", payin: { available: true, tiers: [{ min_amount: 1, max_amount: 50000, currency: "USD", percent: 2.7, fixed: 0, fee_charge_mode: "ADD_ON" }] }, payout: { available: false } },
    ];
  };
  try {
    const orange = await quotePayment({ country: "BF", operator: "Orange", amount: 2500, currency: "XOF" });
    assert.equal(orange.otpRequired, true);
    assert.ok(orange.otpInstructions.includes("*144*4*6*2613.00#"));
    const senegal = await quotePayment({ country: "SN", operator: "Orange", amount: 2500, currency: "XOF" });
    assert.equal(senegal.otpRequired, false);
    assert.equal(senegal.otpInstructions, "");
    const ivoryCoast = await quotePayment({ country: "CI", operator: "Orange", amount: 2500, currency: "XOF" });
    assert.equal(ivoryCoast.otpRequired, true);
    assert.equal(ivoryCoast.otpInstructions, "#144*82#");
    const payout = await quotePayment({ country: "BF", operator: "Orange", amount: 2500, currency: "XOF", direction: "payout" });
    assert.equal(payout.otpRequired, false);
    assert.equal(payout.otpInstructions, "");
    const crypto = await quotePayment({ country: "BJ", operator: "Crypto", amount: 2500, currency: "XOF" });
    assert.equal(crypto.providerAmount, 4.41);
    assert.equal(crypto.providerCurrency, "USD");
    assert.equal(crypto.sourceAmount, 2500);
    assert.equal(crypto.sourceCurrency, "XOF");
    assert.equal(crypto.providerTotal, 4.53);
    await assert.rejects(quotePayment({ country: "BJ", operator: "Crypto", amount: 2500, currency: "XOF", direction: "payout" }));
    await assert.rejects(quotePayment({ country: "BJ", operator: "Coris", amount: 2500, currency: "XOF" }));
    await assert.rejects(quotePayment({ country: "BJ", operator: "Crypto", amount: 1, currency: "XOF" }));
    assert.ok(calls.every(path => !path.includes("softpay") && !path.includes("initialize")));
  } finally { AlphaPayService.prototype.request = original; }
});

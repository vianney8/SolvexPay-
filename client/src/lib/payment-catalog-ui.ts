import { PAYMENT_COUNTRIES, PAYMENT_DEPOSIT_COUNTRIES, PAYMENT_OPERATORS } from "@shared/payment-catalog";

export { PAYMENT_COUNTRIES, PAYMENT_DEPOSIT_COUNTRIES, PAYMENT_OPERATORS };

export function supportedPaymentMethod(method: { code: string }) {
  return PAYMENT_OPERATORS.some(operator => operator.code === method.code);
}

export function paymentOperatorLabel(operator: string) {
  const labels: Record<string, string> = {
    MTN: "MTN Money",
    Orange: "Orange Money",
    Moov: "Moov Money",
    TMoney: "T-Money",
    Mixx: "Mixx",
    Vodacom: "Vodacom M-Pesa",
    Airtel: "Airtel Money",
    Free: "Free Money",
    Celtiis: "Celtiis Cash",
    Crypto: "Crypto / Stablecoin",
    MobiCash: "Mobi Cash",
  };
  return labels[operator] || operator;
}

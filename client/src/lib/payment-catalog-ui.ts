import { PAYMENT_COUNTRIES, PAYMENT_OPERATORS } from "@shared/payment-catalog";

export { PAYMENT_COUNTRIES, PAYMENT_OPERATORS };

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
    MobiCash: "Mobi Cash",
  };
  return labels[operator] || operator;
}

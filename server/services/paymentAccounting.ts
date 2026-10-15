export function amountInXOF(amount: number, currency: string, walletRate?: number) {
  const rate = walletRate ?? ({ XOF: 1, XAF: 1, CDF: 0.22 } as Record<string, number>)[currency];
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) throw new Error("Montant ou taux de conversion non pris en charge.");
  return Math.floor(amount * rate);
}

export function paymentWalletDelta(transaction: { type: string; status: string; amount: string; fees: string | null; currency: string }, state: string, walletRate?: number) {
  if (transaction.status !== "pending" || !["completed", "failed"].includes(state)) return 0;
  const amount = Number(transaction.amount), fees = Number(transaction.fees || 0);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(fees) || fees < 0) throw new Error("Comptabilité invalide.");
  if (transaction.type === "deposit" && state === "completed") {
    if (fees > amount) throw new Error("Frais de dépôt invalides.");
    return amountInXOF(amount - fees, transaction.currency, walletRate);
  }
  // Payout fees are persisted in XOF, unlike deposit fees (transaction currency).
  if (["withdrawal", "transfer"].includes(transaction.type) && state === "failed") {
    return amountInXOF(amount, transaction.currency, walletRate) + fees;
  }
  return 0;
}

export function amountInXOF(amount: number, currency: string) {
  if (!["XOF", "XAF", "CDF"].includes(currency) || !Number.isFinite(amount)) throw new Error("Montant ou devise non pris en charge.");
  return Math.floor(currency === "CDF" ? amount * 0.22 : amount);
}

export function paymentWalletDelta(transaction: { type: string; status: string; amount: string; fees: string | null; currency: string }, state: string) {
  if (transaction.status !== "pending" || !["completed", "failed"].includes(state)) return 0;
  const amount = Number(transaction.amount), fees = Number(transaction.fees || 0);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(fees) || fees < 0) throw new Error("Comptabilité invalide.");
  if (transaction.type === "deposit" && state === "completed") {
    if (fees > amount) throw new Error("Frais de dépôt invalides.");
    return amountInXOF(amount - fees, transaction.currency);
  }
  // Payout fees are persisted in XOF, unlike deposit fees (transaction currency).
  if (["withdrawal", "transfer"].includes(transaction.type) && state === "failed") {
    return amountInXOF(amount, transaction.currency) + fees;
  }
  return 0;
}

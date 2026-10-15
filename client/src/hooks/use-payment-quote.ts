import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface PaymentQuote {
  available: boolean;
  otpRequired: boolean;
  otpInstructions: string;
  providerAmount: number;
  providerFee: number;
  providerTotal: number;
  providerCurrency: string;
  sourceAmount: number;
  sourceCurrency: string;
}

export function usePaymentQuote(country: string, operator: string, amount: number, currency: string) {
  const key = JSON.stringify([country, operator, amount, currency]);
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSettled(key), 450);
    return () => clearTimeout(timer);
  }, [key]);
  const enabled = !!country && !!operator && Number.isFinite(amount) && amount > 0 && !!currency;
  const query = useQuery<PaymentQuote>({
    queryKey: ["/api/payments/quote", key],
    enabled: enabled && settled === key,
    queryFn: async () => {
      const params = new URLSearchParams({ country, operator, amount: String(amount), currency, direction: "payin" });
      const res = await apiRequest("GET", `/api/payments/quote?${params}`);
      const data = await res.json();
      if (typeof data.available !== "boolean" || typeof data.otpRequired !== "boolean" ||
          !["providerAmount", "providerFee", "providerTotal", "sourceAmount"].every(field =>
            data[field] !== null && data[field] !== "" && Number.isFinite(Number(data[field])) && Number(data[field]) >= 0) ||
          !data.providerCurrency || !data.sourceCurrency) throw new Error("Devis prestataire incomplet. Réessayez.");
      return data;
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const quote = settled === key && !query.isFetching && !query.isError ? query.data : undefined;
  return {
    quote,
    ready: enabled && !!quote?.available,
    loading: enabled && (settled !== key || query.isFetching || query.isPending),
    error: enabled && query.isError ? "Impossible de confirmer les frais prestataire. Le paiement est désactivé." : "",
    retry: () => query.refetch(),
  };
}

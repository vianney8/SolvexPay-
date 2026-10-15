import { useQuery } from "@tanstack/react-query";
import type { AlphaCatalog, AlphaCountry } from "@shared/alphapayCatalog";

export const normalizeAlphaCountry = (code: string) => ({ COD: "CD", COG: "CG" }[code.toUpperCase()] || code.toUpperCase());
export function operatorAlias(code: string) {
  const head = code.toLowerCase().split("_")[0];
  return ({ mtn: "MTN", moov: "Moov", orange: "Orange", wave: "Wave", airtel: "Airtel", vodacom: "Vodacom", freemoney: "Free", togocel: "TMoney", mixx: "TMoney" } as Record<string, string>)[head] || code;
}
export function operatorMatches(configured: string, requested: string) {
  return configured.toLowerCase() === requested.toLowerCase() || configured.toLowerCase() === operatorAlias(requested).toLowerCase();
}
const placeholder: AlphaCountry = { code: "", name: "Catalogue indisponible", flag: "", prefix: "", currency: "XOF", operators: [], phonePlaceholder: "Numéro de téléphone" };

export function useAlphaCatalog(direction: "payin" | "payout" = "payin") {
  const suspended = useQuery<{ codes: string[] }>({
    queryKey: ["/api/public/suspended-countries"], staleTime: 60_000,
  });
  const query = useQuery<AlphaCatalog>({
    queryKey: ["/api/public/alphapay/catalog"],
    queryFn: async () => {
      const res = await fetch("/api/public/alphapay/catalog");
      if (!res.ok) throw new Error("Le catalogue AlphaPay est temporairement indisponible.");
      return res.json();
    },
    staleTime: 60_000, refetchInterval: 60_000, retry: 1,
  });
  const countries = (query.data?.countries || []).map(c => ({
    ...c,
    operators: c.operators.filter(code => query.data?.networks.some(n => n.country === c.code && n.code === code && n[direction])),
  })).filter(c => c.operators.length > 0 && !(suspended.data?.codes || []).some(code => normalizeAlphaCountry(code) === c.code));
  return {
    ...query, isLoading: query.isLoading || suspended.isLoading, isError: query.isError || suspended.isError,
    countries, safeCountries: countries.length ? countries : [placeholder],
    ready: !query.isError && !suspended.isError && !!suspended.data && countries.length > 0,
    network: (code: string, country: string) => query.data?.networks.find(n => n.code === code && n.country === normalizeAlphaCountry(country)),
    label: (code: string) => query.data?.networks.find(n => n.code === code)?.name || operatorAlias(code),
    rate: (currency: string) => query.data?.rateToXof[currency] || 0,
    operators: (query.data?.networks || []).filter(n => n[direction]).map(n => ({
      code: n.code, label: n.name, countries: [n.country], otp: n.otpRequired,
      note: n.otpInstructions || (n.requiresRedirect ? "Page externe sécurisée requise" : "Suivre les instructions retournées"),
    })),
  };
}

export function CatalogNotice({ loading, error, empty, currency, rate }: { loading: boolean; error: boolean; empty?: boolean; currency?: string; rate?: number }) {
  const missingRate = !!currency && rate === 0;
  if (!loading && !error && !empty && !missingRate) return null;
  return <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm my-3">
    {loading ? "Chargement des pays et moyens AlphaPay…" : error ? "Catalogue AlphaPay indisponible. Réessayez plus tard ; aucune opération ne peut être envoyée." : missingRate ? `Taux ${currency}/XOF indisponible chez AlphaPay. Cette devise est temporairement bloquée pour protéger votre solde.` : "Aucun moyen disponible pour cette opération et cette devise."}
  </p>;
}

export function safePaymentUrl(data: any) {
  const value = data?.paymentUrl || data?.payment_url;
  if (typeof value !== "string") return "";
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : ""; } catch { return ""; }
}

export function ExternalPayment({ url }: { url: string }) {
  if (!url) return null;
  return <a href={url} className="block my-4 rounded-xl bg-violet-600 text-white text-center font-semibold py-3 px-4" data-testid="button-external-payment">
    Continuer sur la page de paiement sécurisée
  </a>;
}

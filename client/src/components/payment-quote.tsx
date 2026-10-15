import { ShieldCheck, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePaymentQuote } from "@/hooks/use-payment-quote";

export function PaymentQuoteSummary({ state, otp, onOtpChange, crypto }: {
  state: ReturnType<typeof usePaymentQuote>; otp: string; onOtpChange: (value: string) => void; crypto: boolean;
}) {
  const money = (value: number, currency: string) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 }).format(Number(value))} ${currency}`;
  return <section className="rounded-2xl border border-emerald-600/20 bg-emerald-50/70 p-4 space-y-3 text-slate-800" aria-live="polite">
    <div className="flex items-center gap-2 text-xs font-bold"><ShieldCheck className="h-4 w-4 text-emerald-700" />Confirmation du prestataire</div>
    {state.loading ? <div className="space-y-2 animate-pulse"><div className="h-3 w-2/3 rounded bg-emerald-200/60" /><div className="h-4 w-1/2 rounded bg-emerald-200/60" /></div>
      : state.error ? <div role="alert"><p className="text-sm text-red-700">{state.error}</p><Button type="button" variant="outline" size="sm" onClick={state.retry}>Réessayer le devis</Button></div>
      : state.quote ? state.quote.available ? <>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3"><dt>Montant prestataire</dt><dd>{money(state.quote.providerAmount, state.quote.providerCurrency)}</dd></div>
          <div className="flex justify-between gap-3"><dt>Frais prestataire</dt><dd>{money(state.quote.providerFee, state.quote.providerCurrency)}</dd></div>
          <div className="flex justify-between gap-3 border-t border-emerald-600/15 pt-2 font-bold"><dt>Total à régler au prestataire</dt><dd>{money(state.quote.providerTotal, state.quote.providerCurrency)}</dd></div>
        </dl>
        <p className="text-[11px] text-slate-600">Ces frais prestataire sont distincts des frais de service SolvexPay affichés dans le récapitulatif.</p>
        {state.quote.otpRequired && <label className="block text-xs font-semibold space-y-2"><span>Code opérateur requis</span><p className="font-normal whitespace-pre-wrap">{state.quote.otpInstructions}</p><Input value={otp} onChange={e => onOtpChange(e.target.value)} required autoComplete="off" type="password" placeholder="Code opérateur" /></label>}
      </> : <p className="text-sm text-red-700" role="alert">Ce moyen de paiement est indisponible pour ce montant.</p>
      : <p className="text-xs text-slate-600">Choisissez votre opérateur et un montant pour confirmer les frais.</p>}
    {crypto && <p className="text-xs leading-relaxed text-slate-600">Encaissement Crypto uniquement. Le choix de l’actif et du réseau se fait sur la page sécurisée du prestataire. Votre téléphone est un numéro de contact, sans demande USSD.</p>}
  </section>;
}

export function securePaymentUrl(raw: unknown): string | null {
  try {
    const url = new URL(String(raw));
    return url.protocol === "https:" && !url.username && !url.password && url.origin !== window.location.origin ? url.href : null;
  } catch { return null; }
}

export function ProviderContinue({ url }: { url: string | null }) {
  return <div className="rounded-2xl border border-amber-400/40 bg-amber-50 p-4 space-y-3 text-slate-800">
    <p className="text-sm font-bold">Validation externe requise</p>
    <p className="text-xs leading-relaxed">Autorisez la poursuite sur la page HTTPS du prestataire. Vous pouvez la rouvrir tant que le paiement est en attente. Seule la vérification serveur confirme le paiement.</p>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" />Continuer chez le prestataire</a>
      : <p className="text-xs text-amber-800">Récupération du lien sécurisé en cours. Vous pouvez relancer la vérification.</p>}
  </div>;
}

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { OperatorLogo } from "@/components/operator-logo";
import { CheckCircle2, XCircle, Loader2, ChevronDown, Shield, ChevronUp, Smartphone, RefreshCw, Clock, Wifi } from "lucide-react";
import solvexpayLogo from "@/assets/images/solvexpay-logo.png";
import type { PaymentLink } from "@shared/schema";

function formatAmount(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF", operators: ["MTN", "Moov"], phonePlaceholder: "01 90 12 34 56" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"], phonePlaceholder: "07 12 34 56 78" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF", operators: ["Moov", "Orange"], phonePlaceholder: "70 12 34 56" },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF", operators: ["TMoney", "Moov"], phonePlaceholder: "90 12 34 56" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF", operators: ["Orange", "Wave", "Free"], phonePlaceholder: "77 123 45 67" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF", operators: ["MTN", "Orange"], phonePlaceholder: "6 12 34 56 12" },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"], phonePlaceholder: "81 234 56 78" },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", prefix: "+242", currency: "XAF", operators: ["Airtel", "MTN"], phonePlaceholder: "06 123 45 67" },
];

const OPERATOR_LABEL: Record<string, string> = {
  MTN: "MTN Money", Orange: "Orange Money", Moov: "Moov Money", Wave: "Wave",
  TMoney: "T-Money", Vodacom: "Vodacom M-Pesa", Airtel: "Airtel Money", Free: "Free Money",
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <a href="https://solvexpay.site" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={solvexpayLogo} alt="SolvexPay" className="w-8 h-8 rounded-xl object-cover" />
          <span className="font-black text-lg bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
        </a>
        <Badge variant="outline" className="text-xs font-mono border-gray-300 text-gray-500">Paiement sécurisé</Badge>
      </header>
      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
      <footer className="text-center py-5 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Paiement sécurisé par{" "}
            <a href="https://solvexpay.site" target="_blank" rel="noopener noreferrer" className="text-violet-600 font-semibold hover:underline">SolvexPay</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function PayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string>("PENDING");
  const [verifyCount, setVerifyCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  const selectedCountry = COUNTRIES.find(c => c.code === country)!;

  useEffect(() => { setOperator(""); }, [country]);

  const redirectUrl = (paymentLink as any)?.redirectUrl as string | undefined;
  useEffect(() => {
    if (verifyStatus === "SUCCESS" && redirectUrl) {
      const timer = setTimeout(() => { window.location.href = redirectUrl; }, 3000);
      return () => clearTimeout(timer);
    }
  }, [verifyStatus, redirectUrl]);

  const { data: paymentMethods } = useQuery<any[]>({
    queryKey: ["/api/payment-methods/public"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods/public");
      if (!res.ok) return [];
      return res.json();
    },
  });

  function getOperatorStatus(op: string) {
    if (!paymentMethods || paymentMethods.length === 0) return { available: true, maintenance: false };
    const pm = paymentMethods.find((m: any) => m.code === op);
    if (!pm) return { available: true, maintenance: false };
    const globalMaint = pm.inMaintenance === true;
    const countryMaint = (pm.maintenanceCountries || []).includes(country);
    return { available: pm.isActive !== false, maintenance: globalMaint || countryMaint };
  }

  const { data: paymentLink, isLoading, error } = useQuery<PaymentLink>({
    queryKey: ["/api/payment-links/public", slug],
    queryFn: async () => {
      const res = await fetch(`/api/payment-links/public/${slug}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
  });

  const payMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; operator: string; country: string; customerName?: string; customerEmail?: string }) => {
      const res = await apiRequest("POST", `/api/payment-links/public/${slug}/pay`, data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setPendingReference(data.sendavaReference || data.reference);
      setPaymentStatus("processing");
      if (data.paymentUrl) {
        window.open(data.paymentUrl, "_blank");
      }
      toast({ title: "Paiement initié", description: "Confirmez le paiement sur votre téléphone." });
    },
    onError: () => {
      setPaymentStatus("error");
      toast({ title: "Erreur", description: "Le paiement n'a pas pu être initié.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!pendingReference || ["SUCCESS", "FAILED", "CANCELLED"].includes(verifyStatus)) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/payment-links/verify-public", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: pendingReference }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status) setVerifyStatus(data.status);
          setVerifyCount(c => c + 1);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [pendingReference, verifyStatus]);

  useEffect(() => {
    if (paymentStatus !== "processing" || ["SUCCESS", "FAILED", "CANCELLED"].includes(verifyStatus)) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [paymentStatus, verifyStatus]);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (payMutation.isPending) return;
    if (!phone || !operator || !country) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    const isCustom = (paymentLink as any)?.allowCustomAmount;
    const parsedCustom = parseFloat(customAmount);
    if (isCustom && (!customAmount || parsedCustom < 100)) return;
    const fullPhone = phone.startsWith("+") ? phone : `${selectedCountry.prefix}${phone}`;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    payMutation.mutate({
      phoneNumber: fullPhone,
      operator,
      country,
      customerName: fullName || undefined,
      customerEmail: customerEmail || undefined,
      ...(isCustom ? { customAmount: parsedCustom } : {}),
    } as any);
  };

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="bg-white rounded-3xl shadow-lg p-6 space-y-5">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-14 w-48 mx-auto" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !paymentLink) {
    return (
      <PageWrapper>
        <div className="bg-white rounded-3xl shadow-lg p-10 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold">Lien non trouvé</h2>
          <p className="text-sm text-gray-500">Ce lien de paiement n'existe pas ou a été désactivé.</p>
        </div>
      </PageWrapper>
    );
  }

  if (!paymentLink.isActive) {
    return (
      <PageWrapper>
        <div className="bg-white rounded-3xl shadow-lg p-10 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold">Lien désactivé</h2>
          <p className="text-sm text-gray-500">Ce lien de paiement a été désactivé par le marchand.</p>
        </div>
      </PageWrapper>
    );
  }

  if (paymentStatus === "processing" || paymentStatus === "success" || paymentStatus === "error") {
    const isSuccess = verifyStatus === "SUCCESS";
    const isFailed = ["FAILED", "CANCELLED"].includes(verifyStatus);
    const isPending = !isSuccess && !isFailed;
    const displayAmount = customAmount && parseFloat(customAmount) > 0
      ? formatAmount(parseFloat(customAmount))
      : formatAmount(paymentLink.amount);
    const shouldRedirect = isSuccess && redirectUrl;
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    const elapsedStr = elapsedMin > 0 ? `${elapsedMin}m ${elapsedSec}s` : `${elapsedSec}s`;

    const stepIndex = isSuccess ? 2 : isFailed ? 2 : verifyStatus === "PROCESSING" ? 1 : 1;
    const steps = [
      { label: "Initié", done: true },
      { label: "Confirmation", done: isSuccess || isFailed },
      { label: "Crédité", done: isSuccess },
    ];

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(145deg, #020617 0%, #0b1d3a 50%, #03111f 100%)" }}>
        <header className="px-4 py-4 flex items-center justify-between">
          <a href="https://solvexpay.site" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-black text-base text-white/90">SolvexPay</span>
          </a>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Shield className="h-3 w-3" />
            <span>Paiement sécurisé</span>
          </div>
        </header>

        <div className="flex-1 flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="w-full max-w-sm space-y-4">

            {/* ── ICÔNE ANIMÉE ── */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex items-center justify-center h-40 w-40" style={{ overflow: "visible" }}>
                {isPending && (
                  <>
                    <div className="absolute h-40 w-40 rounded-full border border-amber-400/20 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="absolute h-32 w-32 rounded-full border border-amber-400/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
                    <div className="absolute h-24 w-24 rounded-full bg-amber-400/10" />
                  </>
                )}
                {isSuccess && (
                  <>
                    <div className="absolute h-40 w-40 rounded-full border border-emerald-400/20 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="absolute h-32 w-32 rounded-full bg-emerald-400/10" />
                  </>
                )}
                {isFailed && (
                  <div className="absolute h-32 w-32 rounded-full bg-rose-400/10" />
                )}
                <div className={`relative h-20 w-20 rounded-full flex items-center justify-center shadow-2xl ${
                  isSuccess ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                  : isFailed ? "bg-gradient-to-br from-rose-500 to-red-600"
                  : "bg-gradient-to-br from-amber-400 to-orange-500"
                }`}>
                  {isPending && <Loader2 className="h-9 w-9 text-white animate-spin" />}
                  {isSuccess && <CheckCircle2 className="h-9 w-9 text-white" />}
                  {isFailed && <XCircle className="h-9 w-9 text-white" />}
                </div>
              </div>

              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-black text-white" data-testid="text-payment-status">
                  {isSuccess ? "Paiement confirmé !" : isFailed ? (verifyStatus === "CANCELLED" ? "Paiement annulé" : "Paiement échoué") : "En attente de confirmation"}
                </h2>
                <p className="text-sm text-white/50 max-w-xs mx-auto leading-relaxed">
                  {isSuccess ? "Votre paiement a été traité avec succès. Merci !"
                  : isFailed ? "Le paiement n'a pas abouti. Vérifiez votre solde ou réessayez."
                  : "Ouvrez votre téléphone et confirmez le prompt USSD envoyé par votre opérateur."}
                </p>
              </div>
            </div>

            {/* ── CARTE MONTANT + INDICATEURS ── */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="p-5 flex items-stretch gap-4">

                {/* Gauche : montant + étapes */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/40 font-medium mb-0.5">Montant</p>
                  <p className="text-xl font-black text-white tracking-tight">{displayAmount} <span className="text-sm font-bold text-white/40">{paymentLink.currency}</span></p>
                  <p className="text-[11px] font-semibold text-white/50 mt-0.5 mb-3">{paymentLink.name}</p>
                  <div className="flex items-center gap-1">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                            step.done
                              ? isSuccess ? "bg-emerald-400 text-white" : isFailed && i === 2 ? "bg-rose-400 text-white" : "bg-amber-400 text-white"
                              : "bg-white/10 text-white/30"
                          }`}>
                            {step.done ? (isFailed && i === 2 ? "✗" : "✓") : ""}
                          </div>
                          <p className="text-[8px] text-white/35 font-semibold mt-0.5 text-center leading-tight">{step.label}</p>
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-1 mb-3 rounded-full transition-all ${step.done ? (isSuccess ? "bg-emerald-400/50" : "bg-amber-400/50") : "bg-white/10"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Droite : temps + vérifications */}
                {isPending && (
                  <div className="flex flex-col justify-center gap-3 pl-4 border-l border-white/10 min-w-[88px]">
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <Clock className="h-2.5 w-2.5 text-white/30" />
                        <p className="text-[9px] text-white/35 font-medium">Temps écoulé</p>
                      </div>
                      <p className="text-sm font-black text-white/80">{elapsedStr}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <p className="text-[9px] text-white/35 font-medium">Vérifications</p>
                      </div>
                      <p className="text-sm font-black text-white/80">{verifyCount}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ── INSTRUCTIONS TÉLÉPHONE ── */}
            {isPending && (
              <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                <Smartphone className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-300 mb-0.5">Action requise sur votre téléphone</p>
                  <p className="text-[11px] text-amber-200/60 leading-relaxed">Vous avez reçu un <strong className="text-amber-300">prompt USSD</strong>. Entrez votre code PIN pour valider le paiement. La vérification est automatique toutes les <strong className="text-amber-300">5 secondes</strong>.</p>
                </div>
              </div>
            )}

            {/* ── RÉFÉRENCE ── */}
            {pendingReference && (
              <div className="text-center">
                <p className="text-[10px] text-white/25 font-mono">Réf : {pendingReference}</p>
              </div>
            )}

            {/* ── STATUT VÉRIFICATION LIVE ── */}
            {isPending && (
              <div className="flex items-center justify-center gap-2 text-xs text-white/40">
                <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>vérification automatique active...</span>
              </div>
            )}

            {/* ── REDIRECT NOTICE ── */}
            {shouldRedirect && (
              <p className="text-center text-xs text-emerald-400/60 animate-pulse" data-testid="text-redirect-notice">
                Redirection dans 3 secondes...
              </p>
            )}

            {/* ── BOUTONS ── */}
            {isFailed && (
              <Button
                className="w-full h-13 font-black text-base rounded-2xl"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
                onClick={() => { setPaymentStatus("idle"); setPendingReference(null); setVerifyStatus("PENDING"); setVerifyCount(0); setElapsed(0); }}
                data-testid="button-retry-payment"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer le paiement
              </Button>
            )}
            {isSuccess && (
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-emerald-300">Paiement traité avec succès</p>
                <p className="text-[11px] text-emerald-400/50 mt-1">Vous pouvez fermer cette fenêtre</p>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  const descriptionText = paymentLink.description || "";
  const truncatedDesc = descriptionText.length > 600 ? descriptionText.slice(0, 600) + "..." : descriptionText;

  return (
    <PageWrapper>
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        {paymentLink.imageUrl && (
          <div className="w-full h-52 overflow-hidden">
            <img
              src={paymentLink.imageUrl}
              alt={paymentLink.name}
              className="w-full h-full object-cover"
              data-testid="img-payment-product-thumb"
              onError={(e) => { const el = e.target as HTMLImageElement; el.parentElement!.style.display = "none"; }}
            />
          </div>
        )}
        <div className="p-6 space-y-5">
          <div className="text-center">
            {(paymentLink as any).allowCustomAmount ? (
              <>
                <p className="text-sm font-bold text-gray-700 mb-3" data-testid="text-payment-name">{paymentLink.name}</p>
                {(paymentLink as any).merchantName && (
                  <p className="text-xs text-gray-400 mb-4" data-testid="text-payment-merchant">à {(paymentLink as any).merchantName}</p>
                )}
                <p className="text-xs text-gray-500 font-medium mb-2">Choisissez le montant à payer</p>
                <div className="flex items-center gap-2 rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-2 focus-within:border-blue-500 transition-all w-full max-w-[280px] mx-auto">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={parseFloat(paymentLink.amount) > 0 ? `${formatAmount(paymentLink.amount)}` : "Montant"}
                    min={parseFloat(paymentLink.amount) > 0 ? parseFloat(paymentLink.amount) : 100}
                    className="flex-1 text-2xl font-black text-blue-600 bg-transparent outline-none text-center placeholder:text-blue-300 w-full"
                    data-testid="input-custom-amount"
                  />
                  <span className="text-base font-bold text-blue-400">{paymentLink.currency}</span>
                </div>
                {parseFloat(paymentLink.amount) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Minimum : {formatAmount(paymentLink.amount)} {paymentLink.currency}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Total à payer</p>
                <p className="text-4xl font-black text-blue-600 tracking-tight leading-none" data-testid="text-payment-amount">
                  {formatAmount(paymentLink.amount)} <span className="text-xl font-bold text-blue-400">{paymentLink.currency}</span>
                </p>
                <p className="text-sm font-bold text-gray-700 mt-1" data-testid="text-payment-name">{paymentLink.name}</p>
                {(paymentLink as any).merchantName && (
                  <p className="text-xs text-gray-400 mt-0.5" data-testid="text-payment-merchant">à {(paymentLink as any).merchantName}</p>
                )}
              </>
            )}
          </div>

          {descriptionText && (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDescription(!showDescription)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                data-testid="button-toggle-description"
              >
                <span>Voir la description</span>
                {showDescription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showDescription && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{truncatedDesc}</p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Pays Mobile Money</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-left"
                  data-testid="button-pay-country"
                >
                  <span className="text-xl">{selectedCountry.flag}</span>
                  <span className="flex-1 font-semibold text-sm text-gray-800">{selectedCountry.name}</span>
                  <span className="text-xs text-gray-400 font-mono">({selectedCountry.currency})</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
                </button>
                {showCountryPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => { setCountry(c.code); setShowCountryPicker(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${country === c.code ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
                        data-testid={`option-pay-country-${c.code}`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="flex-1 text-left">{c.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{c.prefix}</span>
                        {country === c.code && <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Opérateur Mobile Money</Label>
              <div className={`grid gap-2 ${selectedCountry.operators.length <= 2 ? "grid-cols-2" : selectedCountry.operators.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                {selectedCountry.operators.map((op) => {
                  const opStatus = getOperatorStatus(op);
                  const isDisabled = !opStatus.available || opStatus.maintenance;
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        setOperator(op);
                        setTimeout(() => phoneInputRef.current?.focus(), 50);
                      }}
                      disabled={isDisabled}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                        isDisabled
                          ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                          : operator === op
                          ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                      data-testid={`option-pay-operator-${op}`}
                    >
                      {opStatus.maintenance && (
                        <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">
                          Maint.
                        </span>
                      )}
                      {!opStatus.available && !opStatus.maintenance && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none z-10">
                          Indispo
                        </span>
                      )}
                      <div className={`rounded-2xl overflow-hidden transition-transform ${operator === op ? "scale-110" : ""}`}>
                        <OperatorLogo operator={op} size={52} />
                      </div>
                      <span className={`text-[11px] font-bold text-center leading-tight ${operator === op ? "text-blue-700" : isDisabled ? "text-gray-400" : "text-gray-500"}`}>
                        {OPERATOR_LABEL[op] || op}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Numéro {operator ? OPERATOR_LABEL[operator] || operator : "Mobile Money"}
              </Label>
              <div className="flex gap-0 rounded-xl border border-gray-200 overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <div className="flex items-center gap-2 px-3 bg-gray-50 border-r border-gray-200 flex-shrink-0">
                  <span className="text-base">{selectedCountry.flag}</span>
                  <span className="text-sm font-semibold text-gray-500">{selectedCountry.prefix}</span>
                </div>
                <Input
                  ref={phoneInputRef}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                  type="tel"
                  inputMode="numeric"
                  placeholder={selectedCountry.phonePlaceholder}
                  required
                  className="flex-1 h-12 border-0 rounded-none focus-visible:ring-0 bg-white"
                  data-testid="input-pay-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Prénom <span className="text-red-500">*</span></Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  required
                  className="h-11 border-gray-200 rounded-xl"
                  data-testid="input-pay-firstname"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nom <span className="text-red-500">*</span></Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  required
                  className="h-11 border-gray-200 rounded-xl"
                  data-testid="input-pay-lastname"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email (optionnel)</Label>
              <Input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                type="email"
                placeholder="jean@exemple.com"
                className="h-11 border-gray-200 rounded-xl"
                data-testid="input-pay-email"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-base font-black rounded-2xl shadow-lg gap-2"
              style={{ background: !phone || !operator ? undefined : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" }}
              disabled={
                payMutation.isPending || !phone || !operator || !country || !firstName.trim() || !lastName.trim() ||
                ((paymentLink as any).allowCustomAmount && (!customAmount || parseFloat(customAmount) < 100))
              }
              data-testid="button-confirm-pay"
            >
              {payMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Traitement...</>
              ) : (paymentLink as any).allowCustomAmount && customAmount ? (
                `Payer ${formatAmount(parseFloat(customAmount))} ${paymentLink.currency}`
              ) : (paymentLink as any).allowCustomAmount ? (
                "Entrez un montant pour continuer"
              ) : (
                `Payer ${formatAmount(paymentLink.amount)} ${paymentLink.currency}`
              )}
            </Button>

          </form>
        </div>
      </div>
    </PageWrapper>
  );
}

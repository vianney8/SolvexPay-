import { useState, useEffect } from "react";
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
import { CheckCircle2, XCircle, Loader2, ChevronDown, Shield, ChevronUp } from "lucide-react";
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

export default function PayPage() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string>("PENDING");
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
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [pendingReference, verifyStatus]);

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

  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
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
    const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; sub: string; spin: boolean }> = {
      PENDING: { icon: Loader2, color: "text-amber-500", bg: "bg-amber-50", label: "En attente de confirmation", sub: "Un prompt USSD a été envoyé sur votre téléphone. Confirmez le paiement.", spin: true },
      PROCESSING: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-50", label: "Traitement en cours...", sub: "Votre paiement est en cours de traitement.", spin: true },
      SUCCESS: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Paiement confirmé !", sub: "Votre paiement a été effectué avec succès. Merci !", spin: false },
      FAILED: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Paiement échoué", sub: "Le paiement n'a pas abouti. Veuillez réessayer.", spin: false },
      CANCELLED: { icon: XCircle, color: "text-gray-400", bg: "bg-gray-50", label: "Paiement annulé", sub: "Le paiement a été annulé.", spin: false },
    };
    const cfg = statusConfig[verifyStatus] || statusConfig.PENDING;
    const StatusIcon = cfg.icon;
    return (
      <PageWrapper>
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center space-y-5">
          <div className={`h-20 w-20 rounded-3xl ${cfg.bg} flex items-center justify-center mx-auto`}>
            <StatusIcon className={`h-10 w-10 ${cfg.color} ${cfg.spin ? "animate-spin" : ""}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold" data-testid="text-payment-status">{cfg.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{cfg.sub}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-500">Montant</p>
            <p className="text-3xl font-black text-gray-900">{formatAmount(paymentLink.amount)} <span className="text-lg font-bold text-gray-400">{paymentLink.currency}</span></p>
            <p className="text-sm font-medium text-gray-700 mt-1">{paymentLink.name}</p>
          </div>
          {pendingReference && <p className="text-xs text-gray-400 font-mono">Réf : {pendingReference}</p>}
          {["FAILED", "CANCELLED"].includes(verifyStatus) && (
            <Button
              className="w-full h-12 font-bold rounded-2xl"
              onClick={() => { setPaymentStatus("idle"); setPendingReference(null); setVerifyStatus("PENDING"); }}
              data-testid="button-retry-payment"
            >
              Réessayer
            </Button>
          )}
        </div>
      </PageWrapper>
    );
  }

  const descriptionText = paymentLink.description || "";
  const truncatedDesc = descriptionText.length > 600 ? descriptionText.slice(0, 600) + "..." : descriptionText;

  return (
    <PageWrapper>
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        {paymentLink.imageUrl && (
          <div className="w-full h-52 overflow-hidden">
            <img src={paymentLink.imageUrl} alt={paymentLink.name} className="w-full h-full object-cover" data-testid="img-payment-product-thumb" />
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
                {selectedCountry.operators.map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                      operator === op
                        ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    data-testid={`option-pay-operator-${op}`}
                  >
                    <div className={`rounded-2xl overflow-hidden transition-transform ${operator === op ? "scale-110" : ""}`}>
                      <OperatorLogo operator={op} size={52} />
                    </div>
                    <span className={`text-[11px] font-bold text-center leading-tight ${operator === op ? "text-blue-700" : "text-gray-500"}`}>
                      {OPERATOR_LABEL[op] || op}
                    </span>
                  </button>
                ))}
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                  type="tel"
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

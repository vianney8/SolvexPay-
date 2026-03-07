import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OperatorLogo } from "@/components/operator-logo";
import {
  ArrowDownLeft, Info, CheckCircle2, Loader2, XCircle, ChevronDown, ArrowLeft, Zap,
  Smartphone, RefreshCw, Clock, Wifi,
} from "lucide-react";
import { Link } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF", operators: ["MTN", "Moov"], phonePlaceholder: "01 90 12 34 56" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"], phonePlaceholder: "07 12 34 56 78" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF", operators: ["Moov", "Orange"], phonePlaceholder: "70 12 34 56" },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF", operators: ["TMoney", "Moov"], phonePlaceholder: "90 12 34 56" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF", operators: ["Orange", "Wave", "Free"], phonePlaceholder: "77 123 45 67" },
  { code: "ML", name: "Mali", flag: "🇲🇱", prefix: "+223", currency: "XOF", operators: ["Orange", "Moov"], phonePlaceholder: "70 12 34 56" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF", operators: ["MTN", "Orange"], phonePlaceholder: "6 12 34 56 12" },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"], phonePlaceholder: "81 234 56 78" },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", prefix: "+242", currency: "XAF", operators: ["Airtel", "MTN"], phonePlaceholder: "06 123 45 67" },
];


export default function DepositPage() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const needsOtp = country === "CM" && (operator === "Orange" || operator === "MTN");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [verifyCount, setVerifyCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const selectedCountry = COUNTRIES.find(c => c.code === country)!;
  const currency = selectedCountry.currency;
  const parsedAmount = parseFloat(amount) || 0;

  useEffect(() => { setOperator(""); setOtp(""); }, [country]);
  useEffect(() => { setOtp(""); }, [operator]);

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const { data: paymentMethods } = useQuery<any[]>({ queryKey: ["/api/payment-methods/public"] });
  const { data: serviceFees } = useQuery<{ deposit: number; withdrawal: number; transfer: number }>({ queryKey: ["/api/service-fees"] });

  const feeRate = (serviceFees?.deposit ?? 7) / 100;
  const feesAmount = Math.round(parsedAmount * feeRate);
  const netAmount = parsedAmount - feesAmount;
  const balanceXOF = parseFloat(String(wallet?.balanceXOF || 0));
  const balance = currency === "CDF" ? Math.floor(balanceXOF / 0.22) : balanceXOF;

  function getOperatorStatus(op: string) {
    if (!paymentMethods || paymentMethods.length === 0) return { available: true, maintenance: false };
    const pm = paymentMethods.find((m: any) => m.code === op);
    if (!pm) return { available: true, maintenance: false };
    const globalMaint = pm.inMaintenance === true;
    const countryMaint = (pm.maintenanceCountries || []).includes(country);
    return { available: pm.isActive !== false, maintenance: globalMaint || countryMaint };
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "callback") {
      const ref = params.get("reference");
      if (ref) setPendingReference(ref);
      setPaymentStatus("processing");
      toast({ title: "Vérification en cours", description: "Nous vérifions votre paiement Wave..." });
    }
  }, []);

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; phoneNumber: string; operator: string; country: string; otp?: string; customerName?: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/transactions/deposit", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setPendingReference(data.sendavaReference || data.reference);
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      setPaymentStatus("processing");
      toast({ title: "Paiement initié", description: "Un prompt USSD a été envoyé sur votre téléphone." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le dépôt.", variant: "destructive" });
    },
  });

  const [verifyStatus, setVerifyStatus] = useState<"PENDING" | "SUCCESS" | "FAILED" | "CANCELLED">("PENDING");

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const res = await apiRequest("POST", "/api/transactions/verify", { reference });
      return res.json();
    },
    onSuccess: (data: any) => {
      setVerifyCount(c => c + 1);
      if (data.status === "SUCCESS") {
        setVerifyStatus("SUCCESS");
        setPaymentStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "Paiement confirmé !" });
      } else if (data.status === "FAILED" || data.status === "CANCELLED") {
        setVerifyStatus(data.status as "FAILED" | "CANCELLED");
        setPaymentStatus("error");
        toast({ title: "Paiement échoué", variant: "destructive" });
      }
    },
  });

  useEffect(() => {
    if (!pendingReference || paymentStatus !== "processing") return;
    const interval = setInterval(() => { verifyMutation.mutate(pendingReference); }, 5000);
    return () => clearInterval(interval);
  }, [pendingReference, paymentStatus]);

  useEffect(() => {
    if (paymentStatus !== "processing") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [paymentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || !phone || !operator || !country) return;
    if (needsOtp && !otp.trim()) return;
    const fullPhone = phone.startsWith("+") ? phone : `${selectedCountry.prefix}${phone}`;
    depositMutation.mutate({ amount: parsedAmount, currency, phoneNumber: fullPhone, operator, country, otp: needsOtp ? otp.trim() : undefined, customerName: customerName || undefined, description: description || undefined });
  };

  const resetForm = () => {
    setPaymentStatus("idle"); setAmount(""); setPhone(""); setOtp(""); setCustomerName(""); setDescription(""); setPendingReference(null);
    setVerifyCount(0); setElapsed(0); setVerifyStatus("PENDING");
    window.history.replaceState({}, "", "/deposit");
  };

  if (paymentStatus !== "idle") {
    const isSuccess = paymentStatus === "success";
    const isFailed = paymentStatus === "error";
    const isPending = paymentStatus === "processing";
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    const elapsedStr = elapsedMin > 0 ? `${elapsedMin}m ${elapsedSec}s` : `${elapsedSec}s`;

    const steps = [
      { label: "Initié", done: true },
      { label: "Confirmation", done: isSuccess || isFailed },
      { label: "Crédité", done: isSuccess },
    ];

    return (
      <DashboardLayout title="" breadcrumbs={[{ label: "Dépôt" }]}>
        <div className="max-w-md mx-auto space-y-4">

          {/* Bannière statut */}
          <div className={`rounded-3xl p-6 text-white overflow-hidden shadow-lg relative ${
            isSuccess ? "bg-gradient-to-br from-emerald-500 to-teal-600"
            : isFailed ? "bg-gradient-to-br from-rose-500 to-red-600"
            : "bg-gradient-to-br from-amber-500 to-orange-500"
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 bg-white transform translate-x-8 -translate-y-8" />
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center h-16 w-16 flex-shrink-0" style={{ overflow: "visible" }}>
                {isPending && (
                  <>
                    <div className="absolute h-16 w-16 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: "2s" }} />
                    <div className="absolute h-12 w-12 rounded-full border border-white/20 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.7s" }} />
                  </>
                )}
                <div className="relative h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                  {isPending && <Loader2 className="h-6 w-6 text-white animate-spin" />}
                  {isSuccess && <CheckCircle2 className="h-6 w-6 text-white" />}
                  {isFailed && <XCircle className="h-6 w-6 text-white" />}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black leading-tight" data-testid="text-deposit-status">
                  {isSuccess ? "Dépôt confirmé !" : isFailed ? "Paiement échoué" : "En attente..."}
                </h2>
                <p className="text-sm text-white/75 mt-0.5 leading-snug">
                  {isSuccess ? "Votre solde a été crédité avec succès."
                  : isFailed ? "Le paiement n'a pas abouti."
                  : "Confirmez le prompt USSD sur votre téléphone."}
                </p>
              </div>
            </div>
          </div>

          {/* Carte montant + étapes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Montant déposé</p>
              <p className="text-2xl font-black text-gray-900 tracking-tight" data-testid="text-deposit-amount">
                {formatCurrency(parsedAmount)} <span className="text-base font-bold text-gray-400">{currency}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{operator} · {selectedCountry.name}</p>

              <div className="flex items-center gap-1 mt-4">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                        step.done
                          ? isSuccess ? "bg-emerald-500 text-white" : isFailed && i === 2 ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        {step.done ? (isFailed && i === 2 ? "✗" : "✓") : ""}
                      </div>
                      <p className="text-[9px] text-gray-400 font-semibold mt-1 text-center leading-tight">{step.label}</p>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 mb-4 rounded-full ${step.done ? (isSuccess ? "bg-emerald-200" : "bg-amber-200") : "bg-gray-100"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isPending && (
              <div className="border-t border-gray-50 px-5 py-4 flex gap-6">
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <p className="text-[10px] text-gray-400 font-medium">Temps écoulé</p>
                  </div>
                  <p className="text-sm font-black text-gray-800">{elapsedStr}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-gray-400 font-medium">Vérifications</p>
                  </div>
                  <p className="text-sm font-black text-gray-800">{verifyCount}</p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions mobile */}
          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800 mb-0.5">Action requise sur votre téléphone</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Vous avez reçu un <strong>prompt USSD</strong>. Entrez votre code PIN pour valider. Vérification automatique toutes les <strong>5 secondes</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Référence */}
          {pendingReference && (
            <p className="text-center text-[10px] text-gray-400 font-mono" data-testid="text-deposit-ref">Réf : {pendingReference}</p>
          )}

          {/* Live status */}
          {isPending && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span>Vérification automatique active...</span>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full h-12 font-bold" data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                {isSuccess ? "Tableau de bord" : "Retour"}
              </Button>
            </Link>
            {(isSuccess || isFailed) && (
              <Button
                className="flex-1 h-12 font-black"
                style={{ background: isFailed ? "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" : "linear-gradient(135deg, #059669 0%, #047857 100%)" }}
                onClick={resetForm}
                data-testid="button-new-deposit"
              >
                {isFailed ? <><RefreshCw className="h-4 w-4 mr-1.5" />Réessayer</> : "Nouveau dépôt"}
              </Button>
            )}
          </div>

        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="" breadcrumbs={[{ label: "Dépôt" }]}>
      <div className="max-w-md mx-auto space-y-5">
        <div
          className="relative rounded-3xl p-5 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(160 84% 28%) 0%, hsl(160 84% 40%) 60%, hsl(180 70% 34%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-base" data-testid="text-deposit-title">Recharge Mobile Money</p>
                <p className="text-white/70 text-xs">Dépôt instantané sécurisé</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white/60 text-xs">Solde</p>
              <p className="font-black text-xl" data-testid="text-current-balance">{formatCurrency(balance)} {currency}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pays</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/70 bg-background hover:bg-muted/30 transition-colors"
                    data-testid="button-select-country"
                  >
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="flex-1 text-left font-semibold text-sm">{selectedCountry.name}</span>
                    <Badge variant="secondary" className="text-xs font-mono">{selectedCountry.currency}</Badge>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
                  </button>
                  {showCountryPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setCountry(c.code); setShowCountryPicker(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors ${country === c.code ? "bg-primary/5 text-primary font-semibold" : "text-foreground"}`}
                          data-testid={`option-country-${c.code}`}
                        >
                          <span className="text-lg">{c.flag}</span>
                          <span className="flex-1 text-left">{c.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{c.prefix}</span>
                          {country === c.code && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur Mobile Money</Label>
                <div className={`grid gap-3 ${selectedCountry.operators.length <= 2 ? "grid-cols-2" : selectedCountry.operators.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {selectedCountry.operators.map((op) => {
                    const opStatus = getOperatorStatus(op);
                    const isDisabled = !opStatus.available || opStatus.maintenance;
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => { if (!isDisabled) setOperator(op); }}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                          isDisabled
                            ? "border-border/20 bg-muted/30 opacity-60 cursor-not-allowed"
                            : operator === op
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                            : "border-border/50 hover:border-border bg-card hover:bg-muted/20"
                        }`}
                        data-testid={`option-operator-${op}`}
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
                        <span className={`text-xs font-bold text-center leading-tight ${operator === op ? "text-primary" : isDisabled ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          {op === "MTN" ? "MTN Money" : op === "Orange" ? "Orange Money" : op === "Moov" ? "Moov Money" : op === "Wave" ? "Wave" : op === "TMoney" ? "T-Money" : op === "Vodacom" ? "Vodacom M-Pesa" : op === "Airtel" ? "Airtel Money" : op}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Numéro de téléphone Mobile Money
                </Label>
                {operator && (
                  <p className="text-xs text-muted-foreground -mt-1">
                    Entrez le numéro local associé à votre compte {operator}
                  </p>
                )}
                <div className="flex gap-0 rounded-xl border border-border/70 overflow-hidden focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <div className="flex items-center gap-2 px-3 bg-muted/40 border-r border-border/70 flex-shrink-0">
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{selectedCountry.prefix}</span>
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                    type="tel"
                    placeholder={selectedCountry.phonePlaceholder}
                    required
                    className="flex-1 h-12 border-0 rounded-none focus-visible:ring-0 bg-transparent"
                    data-testid="input-deposit-phone"
                  />
                </div>
              </div>

              {needsOtp && (
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Code OTP {operator} Money
                  </Label>
                  {operator === "Orange" ? (
                    <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">Comment obtenir votre code OTP :</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-none">
                        <li className="flex gap-2"><span className="font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">1.</span> Composez <strong>#144#</strong> sur votre téléphone Orange</li>
                        <li className="flex gap-2"><span className="font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">2.</span> Sélectionnez <strong>"Générer un OTP"</strong> pour paiement en ligne</li>
                        <li className="flex gap-2"><span className="font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">3.</span> Entrez votre code secret Orange Money (4 chiffres)</li>
                        <li className="flex gap-2"><span className="font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">4.</span> Entrez le code OTP reçu ci-dessous</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Comment obtenir votre code OTP :</p>
                      <ol className="text-xs text-muted-foreground space-y-1 list-none">
                        <li className="flex gap-2"><span className="font-bold text-yellow-600 dark:text-yellow-400 flex-shrink-0">1.</span> Composez <strong>*126#</strong> sur votre téléphone MTN</li>
                        <li className="flex gap-2"><span className="font-bold text-yellow-600 dark:text-yellow-400 flex-shrink-0">2.</span> Sélectionnez l'option <strong>paiement en ligne / OTP</strong></li>
                        <li className="flex gap-2"><span className="font-bold text-yellow-600 dark:text-yellow-400 flex-shrink-0">3.</span> Entrez votre code PIN MoMo (5 chiffres)</li>
                        <li className="flex gap-2"><span className="font-bold text-yellow-600 dark:text-yellow-400 flex-shrink-0">4.</span> Entrez le code OTP reçu par SMS ci-dessous</li>
                      </ol>
                    </div>
                  )}
                  <Input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    type="text"
                    inputMode="numeric"
                    placeholder="Entrez votre code OTP"
                    required={needsOtp}
                    className="h-12 border-border/70 text-center tracking-widest text-lg font-bold"
                    data-testid="input-deposit-otp"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Montant ({currency})
                </Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Entrez le montant"
                  min="100"
                  required
                  className="text-xl font-bold h-14 border-border/70 text-center tracking-wide"
                  data-testid="input-deposit-amount"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom du payeur (optionnel)</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Jean Dupont" className="h-11 border-border/70" data-testid="input-deposit-name" />
              </div>
            </CardContent>
          </Card>

          {parsedAmount > 0 && (
            <Card className="border-border/60 bg-emerald-500/3">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Montant brut</span>
                  <span className="font-semibold">{formatCurrency(parsedAmount)} {currency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frais d'encaissement ({Math.round(feeRate * 100)}%)</span>
                  <span className="text-orange-600 font-semibold">- {formatCurrency(feesAmount)} {currency}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Montant crédité</span>
                  <span className="font-black text-xl text-emerald-600 dark:text-emerald-400" data-testid="text-deposit-total">{formatCurrency(netAmount)} {currency}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {needsOtp
                ? <>Générez votre code OTP sur votre téléphone, puis entrez-le ci-dessus. Les frais de service (<strong>{Math.round(feeRate * 100)}%</strong>) sont déduits du montant déposé.</>
                : <>Un prompt <strong>USSD</strong> sera envoyé sur votre téléphone. Les frais de service (<strong>{Math.round(feeRate * 100)}%</strong>) sont déduits du montant déposé.</>
              }
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-13 text-base font-bold gap-2 shadow-xl"
            style={{ background: "linear-gradient(135deg, hsl(160 84% 34%) 0%, hsl(160 84% 44%) 100%)" }}
            disabled={depositMutation.isPending || !parsedAmount || !phone || !operator || !country || (needsOtp && !otp.trim())}
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Traitement...</>
            ) : (
              <><Zap className="h-4 w-4" /> Déposer {parsedAmount > 0 ? `${formatCurrency(parsedAmount)} ${currency}` : ""}</>
            )}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OperatorLogo } from "@/components/operator-logo";
import {
  ArrowDownLeft, CheckCircle2, Loader2, XCircle, ChevronDown,
  ArrowLeft, Smartphone, RefreshCw, Clock, Wifi, Zap, Shield,
} from "lucide-react";
import { Link } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function fmt(amount: number) {
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

const OP_LABEL: Record<string, string> = {
  MTN: "MTN Money", Orange: "Orange Money", Moov: "Moov Money", Wave: "Wave",
  TMoney: "T-Money", Vodacom: "M-Pesa", Airtel: "Airtel Money", Free: "Free Money",
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function DepositPage() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [verifyCount, setVerifyCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [verifyStatus, setVerifyStatus] = useState<"PENDING" | "SUCCESS" | "FAILED" | "CANCELLED">("PENDING");
  const pickerRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === country)!;
  const currency = selectedCountry.currency;
  const parsedAmount = parseFloat(amount) || 0;

  useEffect(() => { setOperator(""); }, [country]);

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const { data: paymentMethods } = useQuery<any[]>({ queryKey: ["/api/payment-methods/public"] });
  const { data: serviceFees } = useQuery<{ deposit: number; withdrawal: number; transfer: number }>({ queryKey: ["/api/service-fees"] });

  const feeRate = (serviceFees?.deposit ?? 7) / 100;
  const feesAmount = Math.round(parsedAmount * feeRate);
  const netAmount = parsedAmount - feesAmount;
  const balance = parseFloat(String(wallet?.balanceXOF || 0));

  function getOperatorStatus(op: string) {
    if (!paymentMethods || paymentMethods.length === 0) return { available: true, maintenance: false };
    const pm = paymentMethods.find((m: any) => m.code === op);
    if (!pm) return { available: true, maintenance: false };
    return { available: pm.isActive !== false, maintenance: pm.inMaintenance === true || (pm.maintenanceCountries || []).includes(country) };
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
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transactions/deposit", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setPendingReference(data.sendavaReference || data.reference);
      if (data.paymentUrl) { window.location.href = data.paymentUrl; return; }
      setPaymentStatus("processing");
      toast({ title: "Paiement initié", description: "Un prompt USSD a été envoyé sur votre téléphone." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le dépôt.", variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const res = await apiRequest("POST", "/api/transactions/verify", { reference });
      return res.json();
    },
    onSuccess: (data: any) => {
      setVerifyCount(c => c + 1);
      if (data.status === "SUCCESS") {
        setVerifyStatus("SUCCESS"); setPaymentStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "Paiement confirmé !" });
      } else if (data.status === "FAILED" || data.status === "CANCELLED") {
        setVerifyStatus(data.status); setPaymentStatus("error");
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
    const fullPhone = phone.startsWith("+") ? phone : `${selectedCountry.prefix}${phone}`;
    depositMutation.mutate({ amount: parsedAmount, currency, phoneNumber: fullPhone, operator, country, customerName: customerName || undefined, description: description || undefined });
  };

  const resetForm = () => {
    setPaymentStatus("idle"); setAmount(""); setPhone(""); setCustomerName(""); setDescription("");
    setPendingReference(null); setVerifyCount(0); setElapsed(0); setVerifyStatus("PENDING");
    window.history.replaceState({}, "", "/deposit");
  };

  const elapsedStr = elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;

  if (paymentStatus !== "idle") {
    const isSuccess = paymentStatus === "success";
    const isFailed = paymentStatus === "error";
    const isPending = paymentStatus === "processing";

    return (
      <DashboardLayout title="" breadcrumbs={[{ label: "Dépôt" }]}>
        <style>{`
          @keyframes dp-pulse { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.18); opacity: 0; } }
          @keyframes dp-spin { to { transform: rotate(360deg); } }
          @keyframes dp-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          @keyframes dp-fadein { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
          @keyframes dp-check { 0% { stroke-dashoffset: 60; } 100% { stroke-dashoffset: 0; } }
        `}</style>
        <div className="max-w-md mx-auto space-y-4" style={{ animation: "dp-fadein 0.5s ease" }}>

          {/* Status hero */}
          <div className="relative rounded-3xl overflow-hidden p-8 text-white text-center" style={{
            background: isSuccess
              ? "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)"
              : isFailed
              ? "linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)"
              : "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)",
          }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 50%)" }} />
            <div className="absolute top-3 left-3 w-16 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="absolute bottom-3 right-3 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

            <div className="relative">
              <div className="relative w-24 h-24 mx-auto mb-5">
                {isPending && (
                  <>
                    <div className="absolute inset-0 rounded-full border-2 border-white/30" style={{ animation: "dp-pulse 2s ease-in-out infinite" }} />
                    <div className="absolute inset-0 rounded-full border-2 border-white/20" style={{ animation: "dp-pulse 2s 0.6s ease-in-out infinite" }} />
                  </>
                )}
                <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                  {isPending && <Loader2 className="h-10 w-10 text-white" style={{ animation: "dp-spin 1.2s linear infinite" }} />}
                  {isSuccess && <CheckCircle2 className="h-10 w-10 text-white" />}
                  {isFailed && <XCircle className="h-10 w-10 text-white" />}
                </div>
              </div>

              <h2 className="text-2xl font-black mb-1" data-testid="text-deposit-status">
                {isSuccess ? "Dépôt confirmé !" : isFailed ? "Paiement échoué" : "En attente..."}
              </h2>
              <p className="text-white/75 text-sm">
                {isSuccess ? "Votre solde a été crédité avec succès."
                  : isFailed ? "Le paiement n'a pas abouti. Réessayez."
                  : "Confirmez le prompt USSD sur votre téléphone."}
              </p>

              {parsedAmount > 0 && (
                <div className="mt-5 inline-flex items-baseline gap-1.5 px-5 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <span className="text-2xl font-black">{fmt(parsedAmount)}</span>
                  <span className="text-white/70 text-sm font-bold">{currency}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid rgba(var(--border), 0.6)" }}>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl overflow-hidden"><OperatorLogo operator={operator} size={36} /></div>
                  <div>
                    <p className="text-sm font-bold">{OP_LABEL[operator] || operator}</p>
                    <p className="text-xs text-muted-foreground">{selectedCountry.flag} {selectedCountry.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Frais ({Math.round(feeRate * 100)}%)</p>
                  <p className="text-sm font-bold text-destructive">-{fmt(feesAmount)} {currency}</p>
                </div>
              </div>

              <div className="h-px bg-border/50" />

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-medium">Net crédité</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400" data-testid="text-deposit-amount">{fmt(netAmount)} {currency}</span>
              </div>
            </div>

            {/* Steps progress */}
            <div className="px-5 pb-5">
              <div className="flex items-center gap-1">
                {[
                  { label: "Initié", done: true },
                  { label: "Confirmation", done: isSuccess || isFailed },
                  { label: "Crédité", done: isSuccess },
                ].map((step, i, arr) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center" style={{ minWidth: "fit-content" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all" style={{
                        background: step.done
                          ? isSuccess ? "#059669" : isFailed && i >= 1 ? "#dc2626" : "#7c3aed"
                          : "rgba(var(--muted), 0.5)",
                        color: step.done ? "white" : "var(--muted-foreground)",
                      }}>
                        {step.done ? (isFailed && i >= 2 ? "✗" : "✓") : i + 1}
                      </div>
                      <p className="text-[9px] font-semibold mt-1 text-muted-foreground text-center">{step.label}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full" style={{
                        background: step.done ? (isSuccess ? "#059669" : "#7c3aed") : "rgba(var(--border), 0.5)",
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Timer if pending */}
            {isPending && (
              <div className="border-t border-border/40 px-5 py-4 flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
                    <Clock className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Temps écoulé</p>
                    <p className="text-sm font-black">{elapsedStr}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "rgba(52,211,153,0.1)" }}>
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Vérifications</p>
                    <p className="text-sm font-black">{verifyCount}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Phone action card */}
          {isPending && (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                <Smartphone className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-0.5">Action requise sur votre téléphone</p>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 leading-relaxed">
                  Un <strong>prompt USSD</strong> a été envoyé. Entrez votre PIN Mobile Money pour valider. Vérification toutes les <strong>5 secondes</strong>.
                </p>
              </div>
            </div>
          )}

          {pendingReference && (
            <p className="text-center text-[10px] text-muted-foreground font-mono" data-testid="text-deposit-ref">Réf : {pendingReference}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1">
              <button className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                data-testid="button-back-dashboard">
                <ArrowLeft className="h-4 w-4" />
                {isSuccess ? "Tableau de bord" : "Retour"}
              </button>
            </Link>
            {(isSuccess || isFailed) && (
              <button
                className="flex-1 h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ background: isFailed ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "linear-gradient(135deg, #059669, #047857)" }}
                onClick={resetForm}
                data-testid="button-new-deposit"
              >
                {isFailed ? <><RefreshCw className="h-4 w-4" />Réessayer</> : "Nouveau dépôt"}
              </button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="" breadcrumbs={[{ label: "Dépôt" }]}>
      <style>{`
        @keyframes dp-fadein { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        @keyframes dp-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.3); } 50% { box-shadow: 0 0 20px 4px rgba(52,211,153,0.15); } }
        .dp-op-btn { transition: all 0.2s ease; }
        .dp-op-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .dp-country-opt { transition: background 0.15s ease; }
        .dp-quick { transition: all 0.15s ease; }
        .dp-quick:hover { transform: scale(1.04); }
      `}</style>

      <div className="max-w-md mx-auto space-y-4" style={{ animation: "dp-fadein 0.45s ease" }}>

        {/* Hero header */}
        <div className="relative rounded-3xl overflow-hidden p-6 text-white" style={{
          background: "linear-gradient(135deg, #059669 0%, #10b981 40%, #7c3aed 100%)",
        }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.15) 0%, transparent 50%)" }} />
          <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                <ArrowDownLeft className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-black text-lg leading-tight" data-testid="text-deposit-title">Recharger mon compte</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <p className="text-white/70 text-xs font-medium">Dépôt Mobile Money sécurisé</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[11px] font-medium">Solde actuel</p>
              <p className="font-black text-2xl leading-tight" data-testid="text-current-balance">{fmt(balance)}</p>
              <p className="text-white/60 text-xs">XOF</p>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {[
              { icon: Shield, label: "Sécurisé" },
              { icon: Zap, label: "Instantané" },
              { icon: Smartphone, label: "Mobile Money" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.1)" }}>
                <b.icon className="h-3 w-3 text-white/80 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-white/80">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Country + Operator card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
            <div className="px-5 pt-5 pb-4 space-y-4">

              {/* Country selector */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Pays</p>
                <div className="relative" ref={pickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{ background: "var(--muted)", border: "1.5px solid color-mix(in srgb, var(--border) 50%, transparent)" }}
                    data-testid="button-select-country"
                  >
                    <span className="text-2xl">{selectedCountry.flag}</span>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm">{selectedCountry.name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedCountry.prefix} · {selectedCountry.currency}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showCountryPicker ? "rotate-180" : ""}`} />
                  </button>
                  {showCountryPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl shadow-2xl z-50 overflow-hidden" style={{ background: "var(--popover)", border: "1px solid var(--border)" }}>
                      {COUNTRIES.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setCountry(c.code); setShowCountryPicker(false); }}
                          className="dp-country-opt w-full flex items-center gap-3 px-4 py-2.5"
                          style={{ background: country === c.code ? "rgba(124,58,237,0.08)" : "transparent" }}
                          data-testid={`option-country-${c.code}`}
                        >
                          <span className="text-xl">{c.flag}</span>
                          <span className="flex-1 text-left text-sm font-medium">{c.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{c.currency}</span>
                          {country === c.code && <CheckCircle2 className="h-4 w-4 text-violet-500 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Operators */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Opérateur Mobile Money</p>
                <div className={`grid gap-2.5 ${selectedCountry.operators.length <= 2 ? "grid-cols-2" : selectedCountry.operators.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {selectedCountry.operators.map((op) => {
                    const opStatus = getOperatorStatus(op);
                    const isDisabled = !opStatus.available || opStatus.maintenance;
                    const isSelected = operator === op;
                    return (
                      <button
                        key={op}
                        type="button"
                        onClick={() => { if (!isDisabled) setOperator(op); }}
                        disabled={isDisabled}
                        className="dp-op-btn relative flex flex-col items-center gap-2 p-4 rounded-2xl"
                        style={{
                          border: isSelected ? "2px solid #059669" : "2px solid color-mix(in srgb, var(--border) 60%, transparent)",
                          background: isSelected ? "rgba(5,150,105,0.08)" : "var(--muted)",
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? "not-allowed" : "pointer",
                          boxShadow: isSelected ? "0 0 20px rgba(5,150,105,0.2)" : "none",
                        }}
                        data-testid={`option-operator-${op}`}
                      >
                        {opStatus.maintenance && (
                          <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">Maint.</span>
                        )}
                        {!opStatus.available && !opStatus.maintenance && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10">Indispo</span>
                        )}
                        <div className={`rounded-2xl overflow-hidden transition-transform duration-200 ${isSelected ? "scale-110" : ""}`}>
                          <OperatorLogo operator={op} size={48} />
                        </div>
                        <span className="text-[10px] font-bold text-center leading-tight" style={{ color: isSelected ? "#059669" : "var(--muted-foreground)" }}>
                          {OP_LABEL[op] || op}
                        </span>
                        {isSelected && (
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full" style={{ background: "#059669" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Numéro {operator ? OP_LABEL[operator] || operator : "Mobile Money"}
                </p>
                <div className="flex rounded-xl overflow-hidden" style={{ border: "1.5px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
                  <div className="flex items-center gap-2 px-3 flex-shrink-0" style={{ background: "var(--muted)", borderRight: "1px solid var(--border)" }}>
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm font-bold text-muted-foreground">{selectedCountry.prefix}</span>
                  </div>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9\s]/g, ""))}
                    type="tel"
                    placeholder={selectedCountry.phonePlaceholder}
                    required
                    className="flex-1 h-12 border-0 rounded-none focus-visible:ring-0 bg-transparent font-semibold"
                    data-testid="input-deposit-phone"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Amount card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
            <div className="px-5 pt-5 pb-4 space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Montant ({currency})</p>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(String(qa))}
                    className="dp-quick py-2 rounded-xl text-xs font-bold text-center"
                    style={{
                      background: amount === String(qa) ? "rgba(5,150,105,0.12)" : "var(--muted)",
                      border: amount === String(qa) ? "1.5px solid #059669" : "1.5px solid transparent",
                      color: amount === String(qa) ? "#059669" : "var(--muted-foreground)",
                    }}
                  >
                    {fmt(qa)}
                  </button>
                ))}
              </div>

              {/* Amount input */}
              <div className="relative">
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Autre montant..."
                  min="100"
                  required
                  className="h-14 text-xl font-black text-center border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                  style={{ background: "var(--muted)" }}
                  data-testid="input-deposit-amount"
                />
                {amount && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">{currency}</span>}
              </div>

              {/* Fee breakdown */}
              {parsedAmount > 0 && (
                <div className="rounded-xl p-3.5 space-y-2" style={{ background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.15)" }}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Montant brut</span>
                    <span className="font-semibold">{fmt(parsedAmount)} {currency}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Frais ({Math.round(feeRate * 100)}%)</span>
                    <span className="text-red-500 font-semibold">-{fmt(feesAmount)} {currency}</span>
                  </div>
                  <div className="h-px" style={{ background: "rgba(5,150,105,0.2)" }} />
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Net crédité</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmt(netAmount)} {currency}</span>
                  </div>
                </div>
              )}

              {/* Nom + description optionnels */}
              <div className="space-y-3">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nom du payeur (optionnel)"
                  className="h-11 rounded-xl border-border/60 bg-muted/40"
                  data-testid="input-deposit-name"
                />
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optionnel)"
                  className="h-11 rounded-xl border-border/60 bg-muted/40"
                  data-testid="input-deposit-description"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="px-5 pb-5">
              <button
                type="submit"
                disabled={depositMutation.isPending || !parsedAmount || !phone || !operator || !country}
                className="w-full h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #7c3aed 100%)", boxShadow: "0 4px 24px rgba(5,150,105,0.3)" }}
                data-testid="button-confirm-deposit"
              >
                {depositMutation.isPending ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Initialisation...</>
                ) : (
                  <><ArrowDownLeft className="h-5 w-5" /> Déposer {parsedAmount > 0 ? `${fmt(parsedAmount)} ${currency}` : ""}</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

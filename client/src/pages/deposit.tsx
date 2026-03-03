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
  ArrowDownLeft, Wallet, Info, CheckCircle2, Loader2, XCircle, ChevronDown, ArrowLeft, Zap,
} from "lucide-react";
import { Link } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF", operators: ["MTN", "Moov"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF", operators: ["TMoney", "Moov"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF", operators: ["MTN", "Orange"] },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", prefix: "+242", currency: "XAF", operators: ["Airtel", "MTN"] },
];


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

  const selectedCountry = COUNTRIES.find(c => c.code === country)!;
  const currency = selectedCountry.currency;
  const parsedAmount = parseFloat(amount) || 0;
  const feeRate = ["BF", "COG"].includes(country) ? 0.06 : 0.05;
  const feesAmount = Math.round(parsedAmount * feeRate);
  const netAmount = parsedAmount - feesAmount;

  useEffect(() => { setOperator(""); }, [country]);

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const balance = parseFloat(String(wallet?.balanceXOF || 0));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "callback") {
      setPaymentStatus("processing");
      toast({ title: "Vérification en cours", description: "Nous vérifions votre paiement..." });
    }
  }, []);

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; phoneNumber: string; operator: string; country: string; customerName?: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/transactions/deposit", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setPendingReference(data.sendavaReference || data.reference);
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
      if (data.status === "SUCCESS") {
        setPaymentStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "Paiement confirmé !" });
      } else if (data.status === "FAILED" || data.status === "CANCELLED") {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || !phone || !operator || !country) return;
    const fullPhone = phone.startsWith("+") ? phone : `${selectedCountry.prefix}${phone}`;
    depositMutation.mutate({ amount: parsedAmount, currency, phoneNumber: fullPhone, operator, country, customerName: customerName || undefined, description: description || undefined });
  };

  const resetForm = () => {
    setPaymentStatus("idle"); setAmount(""); setPhone(""); setCustomerName(""); setDescription(""); setPendingReference(null);
    window.history.replaceState({}, "", "/deposit");
  };

  if (paymentStatus !== "idle") {
    const configs = {
      processing: { gradient: "from-amber-500 to-orange-500", icon: Loader2, label: "Paiement en cours...", sublabel: "Un prompt USSD a été envoyé. Confirmez sur votre téléphone.", spin: true },
      success: { gradient: "from-emerald-500 to-teal-500", icon: CheckCircle2, label: "Dépôt confirmé !", sublabel: "Votre solde a été crédité avec succès.", spin: false },
      error: { gradient: "from-red-500 to-rose-600", icon: XCircle, label: "Paiement échoué", sublabel: "Le paiement n'a pas abouti. Veuillez réessayer.", spin: false },
    };
    const cfg = configs[paymentStatus];
    const Icon = cfg.icon;
    return (
      <DashboardLayout title="" breadcrumbs={[{ label: "Dépôt" }]}>
        <div className="max-w-md mx-auto mt-6">
          <Card className="border-border/60 overflow-hidden">
            <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />
            <CardContent className="pt-10 pb-10 text-center space-y-5">
              <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center mx-auto shadow-xl`}>
                <Icon className={`h-10 w-10 text-white ${cfg.spin ? "animate-spin" : ""}`} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" data-testid="text-deposit-status">{cfg.label}</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{cfg.sublabel}</p>
              </div>
              {parsedAmount > 0 && (
                <div className="bg-muted/40 rounded-2xl px-6 py-4 inline-block">
                  <p className="text-3xl font-black">{formatCurrency(parsedAmount)} <span className="text-muted-foreground text-base font-semibold">{currency}</span></p>
                </div>
              )}
              {pendingReference && (
                <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-4 py-2 rounded-lg inline-block" data-testid="text-deposit-ref">Réf: {pendingReference}</p>
              )}
              {paymentStatus === "processing" && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Vérification en cours...
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full h-11 font-semibold" data-testid="button-back-dashboard">
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Tableau de bord
                  </Button>
                </Link>
                {(paymentStatus === "success" || paymentStatus === "error") && (
                  <Button className="flex-1 h-11 font-bold shadow-lg shadow-primary/20" onClick={resetForm} data-testid="button-new-deposit">
                    {paymentStatus === "error" ? "Réessayer" : "Nouveau dépôt"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
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
              <p className="font-black text-xl" data-testid="text-current-balance">{formatCurrency(balance)} XOF</p>
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
                  {selectedCountry.operators.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperator(op)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                        operator === op
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border/50 hover:border-border bg-card hover:bg-muted/20"
                      }`}
                      data-testid={`option-operator-${op}`}
                    >
                      <div className={`rounded-2xl overflow-hidden transition-transform ${operator === op ? "scale-110" : ""}`}>
                        <OperatorLogo operator={op} size={52} />
                      </div>
                      <span className={`text-xs font-bold text-center leading-tight ${operator === op ? "text-primary" : "text-muted-foreground"}`}>
                        {op === "MTN" ? "MTN Money" : op === "Orange" ? "Orange Money" : op === "Moov" ? "Moov Money" : op === "Wave" ? "Wave" : op === "TMoney" ? "T-Money" : op === "Vodacom" ? "Vodacom M-Pesa" : op === "Airtel" ? "Airtel Money" : op}
                      </span>
                    </button>
                  ))}
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
                    placeholder="90 12 34 56"
                    required
                    className="flex-1 h-12 border-0 rounded-none focus-visible:ring-0 bg-transparent"
                    data-testid="input-deposit-phone"
                  />
                </div>
              </div>

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
                  <span className="text-muted-foreground">Frais ({feeRate * 100}%{["BF","COG"].includes(country) ? " — taux spécial" : ""})</span>
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
              Un prompt <strong>USSD</strong> sera envoyé sur votre téléphone. Les frais de service (<strong>{feeRate * 100}%</strong>) sont déduits du montant déposé.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-13 text-base font-bold gap-2 shadow-xl"
            style={{ background: "linear-gradient(135deg, hsl(160 84% 34%) 0%, hsl(160 84% 44%) 100%)" }}
            disabled={depositMutation.isPending || !parsedAmount || !phone || !operator || !country}
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

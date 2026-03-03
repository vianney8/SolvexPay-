import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowDownLeft, Wallet, Info, CheckCircle2, Loader2, XCircle, Phone, Globe2, Zap, ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number, currency = "XOF") {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", currency: "XOF", operators: ["MTN", "Moov"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", currency: "XOF", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", currency: "XOF", operators: ["TMoney", "Moov"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", currency: "XAF", operators: ["MTN", "Orange"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬", currency: "XAF", operators: ["Airtel", "MTN"] },
];

const OPERATOR_COLORS: Record<string, string> = {
  MTN: "from-yellow-400 to-yellow-600",
  Orange: "from-orange-400 to-orange-600",
  Wave: "from-blue-400 to-blue-600",
  Moov: "from-purple-400 to-purple-600",
  TMoney: "from-cyan-400 to-cyan-600",
  Vodacom: "from-red-400 to-red-600",
  Airtel: "from-red-500 to-red-700",
};

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export default function DepositPage() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const currency = selectedCountry?.currency || "XOF";
  const availableOperators = selectedCountry?.operators || [];
  const parsedAmount = parseFloat(amount) || 0;

  useEffect(() => { setOperator(""); }, [country]);

  const { data: wallet } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });

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
      toast({ title: "Paiement initié", description: "Un prompt USSD a été envoyé sur votre téléphone. Confirmez le paiement." });
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
        toast({ title: "Paiement confirmé", description: "Votre dépôt a été crédité avec succès." });
      } else if (data.status === "FAILED" || data.status === "CANCELLED") {
        setPaymentStatus("error");
        toast({ title: "Paiement échoué", description: "Le paiement n'a pas abouti.", variant: "destructive" });
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
    if (!amount || !phoneNumber || !operator || !country) return;
    depositMutation.mutate({ amount: parsedAmount, currency, phoneNumber, operator, country, customerName: customerName || undefined, description: description || undefined });
  };

  const resetForm = () => {
    setPaymentStatus("idle");
    setAmount("");
    setPhoneNumber("");
    setCustomerName("");
    setDescription("");
    setPendingReference(null);
    window.history.replaceState({}, "", "/deposit");
  };

  if (paymentStatus !== "idle") {
    const configs = {
      processing: { icon: Loader2, color: "text-amber-500", bg: "from-amber-500 to-orange-500", label: "Paiement en cours...", sublabel: "Un prompt USSD a été envoyé sur votre téléphone. Confirmez le paiement pour finaliser.", spin: true },
      success: { icon: CheckCircle2, color: "text-emerald-500", bg: "from-emerald-500 to-teal-500", label: "Paiement confirmé !", sublabel: "Votre dépôt a été crédité sur votre portefeuille avec succès.", spin: false },
      error: { icon: XCircle, color: "text-red-500", bg: "from-red-500 to-rose-600", label: "Paiement échoué", sublabel: "Le paiement n'a pas abouti. Veuillez réessayer.", spin: false },
    };
    const config = configs[paymentStatus];
    const StatusIcon = config.icon;

    return (
      <DashboardLayout title="" breadcrumbs={[{ label: "Dépôt" }]}>
        <div className="max-w-md mx-auto space-y-5 mt-4">
          <Card className="border-border/60 overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${config.bg}`} />
            <CardContent className="pt-10 pb-10 text-center space-y-5">
              <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${config.bg} flex items-center justify-center mx-auto shadow-xl`}>
                <StatusIcon className={`h-10 w-10 text-white ${config.spin ? "animate-spin" : ""}`} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold" data-testid="text-deposit-status">{config.label}</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">{config.sublabel}</p>
              </div>
              {parsedAmount > 0 && (
                <div className="bg-muted/40 rounded-2xl p-4 inline-block">
                  <p className="text-xs text-muted-foreground mb-1">Montant</p>
                  <p className="text-2xl font-black">{formatCurrency(parsedAmount)} <span className="text-muted-foreground text-base font-semibold">{currency}</span></p>
                </div>
              )}
              {pendingReference && (
                <p className="text-xs text-muted-foreground font-mono bg-muted/40 px-3 py-1.5 rounded-lg inline-block" data-testid="text-deposit-ref">
                  Réf: {pendingReference}
                </p>
              )}
              {paymentStatus === "processing" && (
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Vérification automatique en cours...
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full h-11 font-semibold border-border/70" data-testid="button-back-dashboard">
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Tableau de bord
                  </Button>
                </Link>
                {(paymentStatus === "success" || paymentStatus === "error") && (
                  <Button className="flex-1 h-11 font-semibold shadow-lg shadow-primary/20" onClick={resetForm} data-testid="button-new-deposit">
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
      <div className="max-w-lg mx-auto space-y-5">
        <div
          className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(160 84% 30%) 0%, hsl(160 84% 42%) 50%, hsl(180 70% 35%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <ArrowDownLeft className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg" data-testid="text-deposit-title">Recharger le compte</h3>
                <p className="text-white/70 text-sm">Dépôt via Mobile Money</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs font-medium">Solde actuel</p>
              <p className="font-black text-2xl" data-testid="text-current-balance">
                {formatCurrency(parseFloat(String(wallet?.balanceXOF || 0)))} XOF
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Montant du dépôt</CardTitle>
                  <CardDescription className="text-xs">Montant rapide ou personnalisé</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {QUICK_AMOUNTS.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(String(qa))}
                    className={`py-2.5 px-1 rounded-xl text-xs font-bold border-2 transition-all ${
                      amount === String(qa)
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                    }`}
                    data-testid={`button-quick-amount-${qa}`}
                  >
                    {formatCurrency(qa)}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant personnalisé ({currency})</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Saisissez le montant"
                  min="100"
                  required
                  className="text-lg font-bold h-12 border-border/70"
                  data-testid="input-deposit-amount"
                />
              </div>
              {parsedAmount > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-semibold">{formatCurrency(parsedAmount)} {currency}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Frais</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">Gratuit</Badge>
                  </div>
                  <Separator className="bg-emerald-500/10" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Total à payer</span>
                    <span className="font-black text-xl text-emerald-600 dark:text-emerald-400" data-testid="text-deposit-total">{formatCurrency(parsedAmount)} {currency}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Globe2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Pays de dépôt</CardTitle>
                  <CardDescription className="text-xs">Sélectionnez votre pays</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountry(c.code)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      country === c.code
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                    }`}
                    data-testid={`option-country-${c.code}`}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>

              {availableOperators.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur Mobile Money</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableOperators.map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setOperator(op)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-sm font-bold transition-all ${
                          operator === op
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                        }`}
                        data-testid={`option-operator-${op}`}
                      >
                        <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${OPERATOR_COLORS[op] || "from-gray-400 to-gray-600"} flex-shrink-0`} />
                        <span>{op}</span>
                        {operator === op && <CheckCircle2 className="h-4 w-4 ml-auto text-primary flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Informations du paiement</CardTitle>
                  <CardDescription className="text-xs">Numéro Mobile Money à débiter</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+229 97 00 00 00"
                  required
                  className="h-11 border-border/70"
                  data-testid="input-deposit-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom du payeur (optionnel)</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="h-11 border-border/70"
                  data-testid="input-deposit-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (optionnel)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Recharge compte"
                  className="h-11 border-border/70"
                  data-testid="input-deposit-description"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Un prompt <strong>USSD</strong> sera envoyé directement sur votre téléphone. Confirmez le paiement pour finaliser la transaction. Délai habituel : instantané à 2 minutes.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold gap-2 shadow-lg shadow-emerald-500/20"
            style={{ background: "linear-gradient(135deg, hsl(160 84% 38%) 0%, hsl(160 84% 45%) 100%)" }}
            disabled={depositMutation.isPending || !amount || !phoneNumber || !operator || !country}
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Création du paiement...</>
            ) : (
              <><Zap className="h-4 w-4" /> Recharger {parsedAmount > 0 ? `${formatCurrency(parsedAmount)} ${currency}` : ""}</>
            )}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

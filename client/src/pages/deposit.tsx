import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowDownLeft, Wallet, CheckCircle2, Loader2, XCircle, Phone } from "lucide-react";
import { useLocation } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const COUNTRIES = [
  { code: "BJ", name: "Benin", currency: "XOF", operators: ["MTN", "Moov"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", currency: "XOF", operators: ["TMoney", "Moov"] },
  { code: "CM", name: "Cameroun", currency: "XAF", operators: ["MTN", "Orange"] },
  { code: "CI", name: "Cote d'Ivoire", currency: "XOF", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "COD", name: "RDC", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo Brazzaville", currency: "XAF", operators: ["Airtel", "MTN"] },
];

export default function DepositPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const currency = selectedCountry?.currency || "XOF";
  const availableOperators = selectedCountry?.operators || [];

  useEffect(() => {
    setOperator("");
  }, [country]);

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "callback") {
      setPaymentStatus("processing");
    }
  }, []);

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; phoneNumber: string; operator: string; country: string }) => {
      const res = await apiRequest("POST", "/api/transactions/deposit", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      setPendingReference(data.sendavaReference || data.reference);
      setPaymentStatus("processing");
      toast({ title: "Paiement initie", description: "Confirmez le paiement sur votre telephone." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le depot.", variant: "destructive" });
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
        toast({ title: "Paiement confirme", description: "Votre depot a ete credite." });
      } else if (data.status === "FAILED" || data.status === "CANCELLED") {
        setPaymentStatus("error");
        toast({ title: "Paiement echoue", description: "Le paiement n'a pas abouti.", variant: "destructive" });
      }
    },
  });

  useEffect(() => {
    if (!pendingReference || paymentStatus !== "processing") return;
    const interval = setInterval(() => verifyMutation.mutate(pendingReference), 5000);
    return () => clearInterval(interval);
  }, [pendingReference, paymentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phoneNumber || !operator || !country) return;
    depositMutation.mutate({ amount: parseFloat(amount), currency, phoneNumber, operator, country });
  };

  const resetForm = () => {
    setPaymentStatus("idle");
    setAmount("");
    setPhoneNumber("");
    setPendingReference(null);
    setOperator("");
    window.history.replaceState({}, "", "/deposit");
  };

  if (paymentStatus !== "idle") {
    const configs = {
      processing: { icon: Loader2, color: "text-amber-500", bg: "bg-amber-500/10", label: "Paiement en cours...", desc: "Confirmez le paiement sur votre telephone pour finaliser.", spin: true },
      success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Paiement confirme !", desc: "Votre depot a ete credite sur votre portefeuille.", spin: false },
      error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Paiement echoue", desc: "Le paiement n'a pas abouti. Veuillez reessayer.", spin: false },
    };
    const c = configs[paymentStatus];
    const Icon = c.icon;

    return (
      <DashboardLayout title="Recharge" breadcrumbs={[{ label: "Recharge" }]}>
        <div className="max-w-md mx-auto mt-12">
          <Card className="border-0 shadow-none">
            <CardContent className="pt-10 pb-10 text-center space-y-5">
              <div className={`h-20 w-20 rounded-full ${c.bg} flex items-center justify-center mx-auto`}>
                <Icon className={`h-10 w-10 ${c.color} ${c.spin ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold" data-testid="text-deposit-status">{c.label}</h2>
                <p className="text-sm text-muted-foreground mt-2">{c.desc}</p>
              </div>
              {amount && (
                <p className="text-2xl font-bold">{formatCurrency(parseFloat(amount))} {currency}</p>
              )}
              {pendingReference && (
                <p className="text-xs text-muted-foreground font-mono">{pendingReference}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")} data-testid="button-back-dashboard">
                  Tableau de bord
                </Button>
                {(paymentStatus === "success" || paymentStatus === "error") && (
                  <Button className="flex-1" onClick={resetForm} data-testid="button-new-deposit">
                    {paymentStatus === "error" ? "Reessayer" : "Nouveau depot"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const quickAmounts = [1000, 5000, 10000, 25000, 50000];

  return (
    <DashboardLayout title="Recharge" breadcrumbs={[{ label: "Recharge" }]}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
            <ArrowDownLeft className="h-7 w-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="text-deposit-title">Recharger</h1>
          <p className="text-sm text-muted-foreground">
            Solde : <span className="font-semibold">{formatCurrency(parseFloat(String(wallet?.balanceXOF || 0)))} XOF</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Montant ({currency})</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="0"
                  min="100"
                  required
                  className="text-3xl h-16 text-center font-bold border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/30"
                  data-testid="input-deposit-amount"
                />
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {quickAmounts.map((qa) => (
                  <button
                    key={qa}
                    type="button"
                    onClick={() => setAmount(String(qa))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      amount === String(qa)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent text-muted-foreground"
                    }`}
                    data-testid={`button-quick-amount-${qa}`}
                  >
                    {formatCurrency(qa)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none bg-muted/30">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Pays</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-11" data-testid="select-deposit-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code} data-testid={`option-country-${c.code}`}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Operateur</Label>
                  <Select value={operator} onValueChange={setOperator}>
                    <SelectTrigger className="h-11" data-testid="select-deposit-operator">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOperators.map((op) => (
                        <SelectItem key={op} value={op} data-testid={`option-operator-${op}`}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Numero de telephone
                </Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+22890123456"
                  required
                  className="h-11"
                  data-testid="input-deposit-phone"
                />
              </div>
            </CardContent>
          </Card>

          {amount && parseFloat(amount) >= 100 && (
            <div className="px-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span className="font-medium">{formatCurrency(parseFloat(amount))} {currency}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Frais</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Gratuit</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold" data-testid="text-deposit-total">{formatCurrency(parseFloat(amount))} {currency}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold rounded-xl"
            disabled={depositMutation.isPending || !amount || parseFloat(amount) < 100 || !phoneNumber || !operator}
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              `Recharger${amount && parseFloat(amount) >= 100 ? " " + formatCurrency(parseFloat(amount)) + " " + currency : ""}`
            )}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            Un prompt USSD sera envoye sur votre telephone pour confirmer le paiement.
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}

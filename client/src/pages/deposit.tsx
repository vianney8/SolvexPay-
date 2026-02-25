import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowDownLeft, Wallet, Info, CheckCircle2, Loader2, XCircle, Phone, Globe } from "lucide-react";
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
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
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
    const status = params.get("status");
    if (status === "callback") {
      setPaymentStatus("processing");
      toast({ title: "Verification en cours", description: "Nous verifions votre paiement..." });
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
      toast({ title: "Paiement initie", description: "Un prompt USSD a ete envoye sur votre telephone. Veuillez confirmer le paiement." });
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
      const status = data.status;
      if (status === "SUCCESS") {
        setPaymentStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "Paiement confirme", description: "Votre depot a ete credite avec succes." });
      } else if (status === "FAILED" || status === "CANCELLED") {
        setPaymentStatus("error");
        toast({ title: "Paiement echoue", description: "Le paiement n'a pas abouti.", variant: "destructive" });
      }
    },
  });

  useEffect(() => {
    if (!pendingReference || paymentStatus === "success" || paymentStatus === "error") return;
    if (paymentStatus !== "processing") return;

    const interval = setInterval(() => {
      verifyMutation.mutate(pendingReference);
    }, 5000);

    return () => clearInterval(interval);
  }, [pendingReference, paymentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phoneNumber || !operator || !country) return;
    depositMutation.mutate({
      amount: parseFloat(amount),
      currency,
      phoneNumber,
      operator,
      country,
      customerName: customerName || undefined,
      description: description || undefined,
    });
  };

  const quickAmounts = [5000, 10000, 25000, 50000, 100000];

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
    const statusConfig = {
      processing: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Paiement en cours...", sublabel: "Un prompt USSD a ete envoye sur votre telephone. Veuillez confirmer le paiement pour finaliser la transaction.", spin: true },
      success: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Paiement confirme !", sublabel: "Votre depot a ete credite sur votre portefeuille.", spin: false },
      error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Paiement echoue", sublabel: "Le paiement a echoue. Veuillez reessayer.", spin: false },
    };

    const config = statusConfig[paymentStatus];
    const StatusIcon = config.icon;

    return (
      <DashboardLayout title="Recharge" breadcrumbs={[{ label: "Recharge" }]}>
        <div className="max-w-lg mx-auto mt-8 space-y-4">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className={`h-16 w-16 rounded-full ${config.bg} flex items-center justify-center mx-auto`}>
                <StatusIcon className={`h-8 w-8 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
              </div>
              <h2 className="text-xl font-bold" data-testid="text-deposit-status">{config.label}</h2>
              <p className="text-sm text-muted-foreground">{config.sublabel}</p>
              {amount && (
                <p className="text-muted-foreground text-sm">
                  Montant: <span className="font-semibold text-foreground">{formatCurrency(parseFloat(amount))} {currency}</span>
                </p>
              )}
              {pendingReference && (
                <p className="text-xs text-muted-foreground">
                  Reference: <span className="font-mono">{pendingReference}</span>
                </p>
              )}
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")} data-testid="button-back-dashboard">
                  Retour au tableau de bord
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

  return (
    <DashboardLayout title="Recharge" breadcrumbs={[{ label: "Recharge" }]}>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-deposit-title">
            <ArrowDownLeft className="h-6 w-6 text-primary" />
            Recharger votre compte
          </h1>
          <p className="text-muted-foreground mt-1">Effectuez un depot via Mobile Money</p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Solde actuel</p>
                <p className="text-lg font-bold" data-testid="text-current-balance">
                  {formatCurrency(parseFloat(String(wallet?.balanceXOF || 0)))} XOF
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Montant du depot</CardTitle>
              <CardDescription>Choisissez un montant rapide ou saisissez le votre</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((qa) => (
                  <Button
                    key={qa}
                    type="button"
                    variant={amount === String(qa) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(String(qa))}
                    data-testid={`button-quick-amount-${qa}`}
                  >
                    {formatCurrency(qa)}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Montant personnalise ({currency})</Label>
                <Input
                  id="deposit-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Saisissez le montant"
                  min="100"
                  required
                  className="text-lg h-12"
                  data-testid="input-deposit-amount"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Pays et operateur
              </CardTitle>
              <CardDescription>Selectionnez votre pays et operateur Mobile Money</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger data-testid="select-deposit-country">
                      <SelectValue placeholder="Pays" />
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
                <div className="space-y-2">
                  <Label>Operateur</Label>
                  <Select value={operator} onValueChange={setOperator}>
                    <SelectTrigger data-testid="select-deposit-operator">
                      <SelectValue placeholder="Operateur" />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Informations du payeur
              </CardTitle>
              <CardDescription>Votre numero sera utilise pour le paiement Mobile Money (USSD)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-phone">Numero de telephone</Label>
                <Input
                  id="deposit-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+22890123456"
                  required
                  data-testid="input-deposit-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-name">Nom (optionnel)</Label>
                <Input
                  id="deposit-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Jean Dupont"
                  data-testid="input-deposit-name"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Recharge compte"
                data-testid="input-deposit-description"
              />
            </CardContent>
          </Card>

          {amount && parseFloat(amount) > 0 && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Montant du depot</span>
                  <span className="font-semibold">{formatCurrency(parseFloat(amount))} {currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frais</span>
                  <span className="text-sm text-green-600 font-medium">Gratuit</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total a payer</span>
                  <span className="text-lg font-bold text-primary" data-testid="text-deposit-total">{formatCurrency(parseFloat(amount))} {currency}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Un prompt USSD sera envoye directement sur votre telephone. Confirmez le paiement sur votre telephone pour finaliser la transaction. Operateurs supportes : MTN, Moov, Orange, TMoney, Wave, Vodacom, Airtel.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={depositMutation.isPending || !amount || !phoneNumber || !operator || !country}
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? "Creation du paiement..." : `Recharger ${amount ? formatCurrency(parseFloat(amount)) + " " + currency : ""}`}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

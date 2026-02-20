import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowDownLeft, Wallet, Info, CheckCircle2, Loader2, Phone } from "lucide-react";
import { useLocation } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

const COUNTRIES = [
  { code: "BJ", name: "Benin", currency: "XOF", dialCode: "+229", operators: ["MTN", "Moov"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", dialCode: "+226", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", currency: "XOF", dialCode: "+228", operators: ["TMoney", "Moov"] },
  { code: "CI", name: "Cote d'Ivoire", currency: "XOF", dialCode: "+225", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "CM", name: "Cameroun", currency: "XAF", dialCode: "+237", operators: ["MTN", "Orange"] },
  { code: "COD", name: "RDC", currency: "CDF", dialCode: "+243", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo Brazzaville", currency: "XAF", dialCode: "+242", operators: ["Airtel", "MTN"] },
];

const OPERATOR_COLORS: Record<string, string> = {
  MTN: "bg-yellow-500",
  Moov: "bg-blue-700",
  Orange: "bg-orange-500",
  TMoney: "bg-green-600",
  Wave: "bg-blue-500",
  Vodacom: "bg-red-500",
  Airtel: "bg-red-600",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DepositPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("BJ");
  const [operator, setOperator] = useState("");
  const [phone, setPhone] = useState("");
  const [success, setSuccess] = useState(false);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");

  const selectedCountry = COUNTRIES.find(c => c.code === country);
  const availableOperators = selectedCountry?.operators || [];

  useEffect(() => {
    if (availableOperators.length > 0 && !availableOperators.includes(operator)) {
      setOperator(availableOperators[0]);
    }
  }, [country]);

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; phoneNumber: string; operator: string; country: string }) => {
      const res = await apiRequest("POST", "/api/transactions/deposit", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setPendingReference(data.reference);
      setPaymentStatus(data.sendavaStatus || "PROCESSING");
      setSuccess(true);
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
      setPaymentStatus(data.status);
      if (data.status === "SUCCESS") {
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "Paiement confirmé", description: "Votre dépôt a été crédité avec succès." });
      }
    },
  });

  useEffect(() => {
    if (!pendingReference || paymentStatus === "SUCCESS" || paymentStatus === "FAILED" || paymentStatus === "CANCELLED") return;

    const interval = setInterval(() => {
      verifyMutation.mutate(pendingReference);
    }, 5000);

    return () => clearInterval(interval);
  }, [pendingReference, paymentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone || !operator || !country) return;
    depositMutation.mutate({
      amount: parseFloat(amount),
      phoneNumber: phone,
      operator,
      country,
    });
  };

  const quickAmounts = [5000, 10000, 25000, 50000, 100000];

  if (success) {
    const statusConfig = {
      PENDING: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "En attente de confirmation", spin: true },
      PROCESSING: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Traitement en cours - Vérifiez votre téléphone", spin: true },
      SUCCESS: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Paiement confirmé !", spin: false },
      FAILED: { icon: Info, color: "text-red-500", bg: "bg-red-500/10", label: "Paiement échoué", spin: false },
      CANCELLED: { icon: Info, color: "text-gray-500", bg: "bg-gray-500/10", label: "Paiement annulé", spin: false },
    };

    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.PENDING;
    const StatusIcon = config.icon;

    return (
      <DashboardLayout title="Recharge" breadcrumbs={[{ label: "Recharge" }]}>
        <div className="max-w-lg mx-auto mt-8">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className={`h-16 w-16 rounded-full ${config.bg} flex items-center justify-center mx-auto`}>
                <StatusIcon className={`h-8 w-8 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
              </div>
              <h2 className="text-xl font-bold" data-testid="text-deposit-status">{config.label}</h2>
              <p className="text-muted-foreground text-sm">
                Dépôt de <span className="font-semibold text-foreground">{formatCurrency(parseFloat(amount))} {selectedCountry?.currency}</span> via{" "}
                <span className="font-semibold text-foreground">{operator}</span>
              </p>
              {(paymentStatus === "PENDING" || paymentStatus === "PROCESSING") && (
                <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
                  <Phone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground text-left">
                    Un message USSD a été envoyé sur votre téléphone <span className="font-semibold">{phone}</span>. Composez votre code PIN pour confirmer le paiement.
                  </p>
                </div>
              )}
              {pendingReference && (
                <p className="text-xs text-muted-foreground">
                  Référence: <span className="font-mono">{pendingReference}</span>
                </p>
              )}
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")} data-testid="button-back-dashboard">
                  Retour au tableau de bord
                </Button>
                {(paymentStatus === "SUCCESS" || paymentStatus === "FAILED" || paymentStatus === "CANCELLED") && (
                  <Button className="flex-1" onClick={() => { setSuccess(false); setAmount(""); setPhone(""); setPendingReference(null); setPaymentStatus("PENDING"); }} data-testid="button-new-deposit">
                    Nouveau dépôt
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
          <p className="text-muted-foreground mt-1">Effectuez un dépôt via Mobile Money (USSD direct)</p>
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
              <CardTitle className="text-base">Montant du dépôt</CardTitle>
              <CardDescription>Choisissez un montant rapide ou saisissez le vôtre</CardDescription>
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
                <Label htmlFor="deposit-amount">Montant personnalisé ({selectedCountry?.currency || "XOF"})</Label>
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
              <CardTitle className="text-base">Pays et opérateur</CardTitle>
              <CardDescription>Sélectionnez votre pays et votre opérateur Mobile Money</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pays</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger data-testid="select-country">
                    <SelectValue placeholder="Sélectionnez un pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name} ({c.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Opérateur</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableOperators.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setOperator(op)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                        operator === op
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border"
                      }`}
                      data-testid={`button-operator-${op}`}
                    >
                      <div className={`h-3 w-3 rounded-full ${OPERATOR_COLORS[op] || "bg-gray-500"} flex-shrink-0`} />
                      <span className="text-sm font-medium truncate">{op}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-phone">Numéro de téléphone</Label>
                <Input
                  id="deposit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder={`${selectedCountry?.dialCode || "+229"} XX XX XX XX`}
                  required
                  className="h-12"
                  data-testid="input-deposit-phone"
                />
              </div>
            </CardContent>
          </Card>

          {amount && parseFloat(amount) > 0 && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Montant du dépôt</span>
                  <span className="font-semibold">{formatCurrency(parseFloat(amount))} {selectedCountry?.currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frais</span>
                  <span className="text-sm text-green-600 font-medium">Gratuit</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total à payer</span>
                  <span className="text-lg font-bold text-primary" data-testid="text-deposit-total">{formatCurrency(parseFloat(amount))} {selectedCountry?.currency}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Un message USSD sera envoyé directement sur votre téléphone. Composez votre code PIN Mobile Money pour confirmer le paiement. Aucune redirection vers un site externe.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={depositMutation.isPending || !amount || !phone || !operator}
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? "Envoi en cours..." : `Recharger ${amount ? formatCurrency(parseFloat(amount)) + " " + (selectedCountry?.currency || "XOF") : ""}`}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

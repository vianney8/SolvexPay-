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
import { ArrowUpRight, Wallet, Info, CheckCircle2, AlertTriangle, Loader2, Phone } from "lucide-react";
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

export default function WithdrawPage() {
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

  const balance = parseFloat(String(wallet?.balanceXOF || 0));
  const withdrawAmount = amount ? parseFloat(amount) : 0;
  const fees = withdrawAmount * 0.01;
  const totalDeducted = withdrawAmount + fees;
  const insufficientFunds = totalDeducted > balance;

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; phoneNumber: string; operator: string; country: string }) => {
      const res = await apiRequest("POST", "/api/transactions/withdraw", data);
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
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le retrait.", variant: "destructive" });
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
        toast({ title: "Retrait confirmé", description: "Les fonds ont été envoyés sur votre Mobile Money." });
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
    if (!amount || !phone || !operator || !country || insufficientFunds) return;
    withdrawMutation.mutate({
      amount: parseFloat(amount),
      phoneNumber: phone,
      operator,
      country,
    });
  };

  if (success) {
    const statusConfig = {
      PENDING: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Retrait en attente", spin: true },
      PROCESSING: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Retrait en cours de traitement", spin: true },
      SUCCESS: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Retrait confirmé !", spin: false },
      FAILED: { icon: Info, color: "text-red-500", bg: "bg-red-500/10", label: "Retrait échoué", spin: false },
      CANCELLED: { icon: Info, color: "text-gray-500", bg: "bg-gray-500/10", label: "Retrait annulé", spin: false },
    };

    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.PENDING;
    const StatusIcon = config.icon;

    return (
      <DashboardLayout title="Retrait" breadcrumbs={[{ label: "Retrait" }]}>
        <div className="max-w-lg mx-auto mt-8">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className={`h-16 w-16 rounded-full ${config.bg} flex items-center justify-center mx-auto`}>
                <StatusIcon className={`h-8 w-8 ${config.color} ${config.spin ? "animate-spin" : ""}`} />
              </div>
              <h2 className="text-xl font-bold" data-testid="text-withdraw-status">{config.label}</h2>
              <p className="text-muted-foreground text-sm">
                Retrait de <span className="font-semibold text-foreground">{formatCurrency(parseFloat(amount))} {selectedCountry?.currency}</span> vers{" "}
                <span className="font-semibold text-foreground">{operator}</span>
              </p>
              {(paymentStatus === "PENDING" || paymentStatus === "PROCESSING") && (
                <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
                  <Phone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground text-left">
                    Les fonds seront envoyés sur le numéro <span className="font-semibold">{phone}</span> dans les prochaines minutes.
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
                  <Button className="flex-1" onClick={() => { setSuccess(false); setAmount(""); setPhone(""); setPendingReference(null); setPaymentStatus("PENDING"); }} data-testid="button-new-withdraw">
                    Nouveau retrait
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
    <DashboardLayout title="Retrait" breadcrumbs={[{ label: "Retrait" }]}>
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-withdraw-title">
            <ArrowUpRight className="h-6 w-6 text-orange-500" />
            Effectuer un retrait
          </h1>
          <p className="text-muted-foreground mt-1">Retirez vos fonds vers Mobile Money</p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Solde disponible</p>
                <p className="text-lg font-bold" data-testid="text-current-balance">
                  {formatCurrency(balance)} XOF
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Montant du retrait</CardTitle>
              <CardDescription>Saisissez le montant que vous souhaitez retirer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Montant ({selectedCountry?.currency || "XOF"})</Label>
                <Input
                  id="withdraw-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="Saisissez le montant"
                  min="100"
                  max={balance}
                  required
                  className="text-lg h-12"
                  data-testid="input-withdraw-amount"
                />
                {balance > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary"
                    onClick={() => setAmount(String(Math.floor(balance / 1.01)))}
                    data-testid="button-max-amount"
                  >
                    Retirer le maximum
                  </Button>
                )}
              </div>

              {insufficientFunds && withdrawAmount > 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive">
                    Fonds insuffisants. Votre solde est de {formatCurrency(balance)} XOF.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Destination du retrait</CardTitle>
              <CardDescription>Sélectionnez le pays, l'opérateur et le numéro de réception</CardDescription>
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
                <Label htmlFor="withdraw-phone">Numéro de téléphone</Label>
                <Input
                  id="withdraw-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder={`${selectedCountry?.dialCode || "+229"} XX XX XX XX`}
                  required
                  className="h-12"
                  data-testid="input-withdraw-phone"
                />
              </div>
            </CardContent>
          </Card>

          {withdrawAmount > 0 && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Montant du retrait</span>
                  <span className="font-semibold">{formatCurrency(withdrawAmount)} {selectedCountry?.currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frais (1%)</span>
                  <span className="text-sm text-destructive font-medium">- {formatCurrency(fees)} {selectedCountry?.currency}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total débité</span>
                  <span className="text-lg font-bold" data-testid="text-withdraw-total">{formatCurrency(totalDeducted)} {selectedCountry?.currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vous recevrez</span>
                  <span className="font-semibold text-primary" data-testid="text-withdraw-receive">{formatCurrency(withdrawAmount)} {selectedCountry?.currency}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Les fonds seront envoyés directement sur votre compte Mobile Money. Le traitement prend généralement quelques minutes.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={withdrawMutation.isPending || !amount || !phone || !operator || insufficientFunds}
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? "Envoi en cours..." : `Retirer ${withdrawAmount > 0 ? formatCurrency(withdrawAmount) + " " + (selectedCountry?.currency || "XOF") : ""}`}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

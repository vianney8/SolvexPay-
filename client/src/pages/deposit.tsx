import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowDownLeft, Wallet, Info, CheckCircle2, Loader2, ExternalLink, Copy } from "lucide-react";
import { useLocation } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

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
  const [currency, setCurrency] = useState("XOF");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/transactions/deposit", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setPendingReference(data.reference || data.sendavaReference);
      setPaymentUrl(data.paymentUrl || "");
      setSuccess(true);
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
      const status = data.status || "pending";
      setPaymentStatus(status);
      if (status === "completed") {
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        toast({ title: "Paiement confirme", description: "Votre depot a ete credite avec succes." });
      }
    },
  });

  useEffect(() => {
    if (!pendingReference || paymentStatus === "completed" || paymentStatus === "failed" || paymentStatus === "cancelled") return;

    const interval = setInterval(() => {
      verifyMutation.mutate(pendingReference);
    }, 5000);

    return () => clearInterval(interval);
  }, [pendingReference, paymentStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    depositMutation.mutate({
      amount: parseFloat(amount),
      currency,
      description: description || undefined,
    });
  };

  const quickAmounts = [5000, 10000, 25000, 50000, 100000];

  const copyPaymentUrl = () => {
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      toast({ title: "Lien copie", description: "Le lien de paiement a ete copie." });
    }
  };

  if (success) {
    const statusConfig = {
      pending: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "En attente de paiement", spin: true },
      completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Paiement confirme !", spin: false },
      failed: { icon: Info, color: "text-red-500", bg: "bg-red-500/10", label: "Paiement echoue", spin: false },
      cancelled: { icon: Info, color: "text-gray-500", bg: "bg-gray-500/10", label: "Paiement annule", spin: false },
    };

    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.pending;
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
              <p className="text-muted-foreground text-sm">
                Depot de <span className="font-semibold text-foreground">{formatCurrency(parseFloat(amount))} {currency}</span>
              </p>

              {paymentUrl && paymentStatus === "pending" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
                    <p className="text-sm font-medium">Cliquez sur le bouton ci-dessous pour effectuer le paiement via Mobile Money :</p>
                    <Button
                      className="w-full h-12 text-base font-semibold gap-2"
                      onClick={() => window.open(paymentUrl, "_blank")}
                      data-testid="button-open-payment"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Payer maintenant
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={copyPaymentUrl}
                      data-testid="button-copy-payment-url"
                    >
                      <Copy className="h-4 w-4" />
                      Copier le lien
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le statut sera mis a jour automatiquement une fois le paiement effectue.
                  </p>
                </div>
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
                {(paymentStatus === "completed" || paymentStatus === "failed" || paymentStatus === "cancelled") && (
                  <Button className="flex-1" onClick={() => { setSuccess(false); setAmount(""); setPaymentUrl(""); setPendingReference(null); setPaymentStatus("pending"); setDescription(""); }} data-testid="button-new-deposit">
                    Nouveau depot
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
              Un lien de paiement securise sera genere. Vous serez redirige vers la page de paiement Mobile Money (MTN, Moov, Orange, TMoney, Wave).
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={depositMutation.isPending || !amount}
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? "Creation en cours..." : `Recharger ${amount ? formatCurrency(parseFloat(amount)) + " " + currency : ""}`}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

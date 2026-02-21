import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowUpRight, Wallet, Info, CheckCircle2, AlertTriangle, Phone } from "lucide-react";
import { useLocation } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

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
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);
  const [withdrawRef, setWithdrawRef] = useState("");

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const balance = parseFloat(String(wallet?.balanceXOF || 0));
  const withdrawAmount = amount ? parseFloat(amount) : 0;
  const insufficientFunds = withdrawAmount > balance;

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; phone: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/transactions/withdraw", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setWithdrawRef(data.reference || data.sendavaReference || "");
      setSuccess(true);
      toast({ title: "Retrait initie", description: "Les fonds seront envoyes sur votre compte SendavaPay." });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'initier le retrait.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone || insufficientFunds) return;
    withdrawMutation.mutate({
      amount: parseFloat(amount),
      phone,
      description: description || undefined,
    });
  };

  if (success) {
    return (
      <DashboardLayout title="Retrait" breadcrumbs={[{ label: "Retrait" }]}>
        <div className="max-w-lg mx-auto mt-8">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold" data-testid="text-withdraw-status">Retrait initie avec succes</h2>
              <p className="text-muted-foreground text-sm">
                Retrait de <span className="font-semibold text-foreground">{formatCurrency(parseFloat(amount))} XOF</span> vers{" "}
                <span className="font-semibold text-foreground">{phone}</span>
              </p>
              <div className="rounded-lg bg-muted/50 border p-4">
                <p className="text-xs text-muted-foreground">
                  Les fonds seront credites sur le compte SendavaPay associe a ce numero. Le delai de traitement est generalement de 1h a 24h.
                </p>
              </div>
              {withdrawRef && (
                <p className="text-xs text-muted-foreground">
                  Reference: <span className="font-mono">{withdrawRef}</span>
                </p>
              )}
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")} data-testid="button-back-dashboard">
                  Retour au tableau de bord
                </Button>
                <Button className="flex-1" onClick={() => { setSuccess(false); setAmount(""); setPhone(""); setDescription(""); setWithdrawRef(""); }} data-testid="button-new-withdraw">
                  Nouveau retrait
                </Button>
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
          <p className="text-muted-foreground mt-1">Creditez un compte SendavaPay avec vos fonds</p>
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
                <Label htmlFor="withdraw-amount">Montant (XOF)</Label>
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
                    onClick={() => setAmount(String(Math.floor(balance)))}
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
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Compte destinataire
              </CardTitle>
              <CardDescription>Numero de telephone du compte SendavaPay a crediter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-phone">Numero de telephone</Label>
                <Input
                  id="withdraw-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+22890123456"
                  required
                  className="h-12"
                  data-testid="input-withdraw-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-description">Description (optionnel)</Label>
                <Input
                  id="withdraw-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Retrait vers mon compte"
                  data-testid="input-withdraw-description"
                />
              </div>
            </CardContent>
          </Card>

          {withdrawAmount > 0 && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Montant du retrait</span>
                  <span className="font-semibold">{formatCurrency(withdrawAmount)} XOF</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total debite</span>
                  <span className="text-lg font-bold" data-testid="text-withdraw-total">{formatCurrency(withdrawAmount)} XOF</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Les fonds seront credites sur le compte SendavaPay associe au numero indique. Le delai de traitement est de 1h a 24h.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={withdrawMutation.isPending || !amount || !phone || insufficientFunds}
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? "Envoi en cours..." : `Retirer ${withdrawAmount > 0 ? formatCurrency(withdrawAmount) + " XOF" : ""}`}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

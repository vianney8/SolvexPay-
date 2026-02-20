import { useState } from "react";
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
import { ArrowDownLeft, Wallet, Info, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import type { Wallet as WalletType } from "@shared/schema";

const providers = [
  { id: "mtn", name: "MTN Mobile Money", icon: "bg-yellow-500" },
  { id: "orange", name: "Orange Money", icon: "bg-orange-500" },
  { id: "wave", name: "Wave", icon: "bg-blue-500" },
  { id: "moov", name: "Moov Money", icon: "bg-blue-700" },
  { id: "airtel", name: "Airtel Money", icon: "bg-red-500" },
  { id: "free", name: "Free Money", icon: "bg-green-600" },
];

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
  const [provider, setProvider] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; provider: string; phone: string; currency: string }) => {
      return apiRequest("POST", "/api/transactions/deposit", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSuccess(true);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'initier le depot.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone) return;
    depositMutation.mutate({
      amount: parseFloat(amount),
      provider,
      phone,
      currency: "XOF",
    });
  };

  const quickAmounts = [5000, 10000, 25000, 50000, 100000];

  if (success) {
    return (
      <DashboardLayout title="Recharge" breadcrumbs={[{ label: "Recharge" }]}>
        <div className="max-w-lg mx-auto mt-8">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold">Depot initie avec succes</h2>
              <p className="text-muted-foreground text-sm">
                Votre depot de <span className="font-semibold text-foreground">{formatCurrency(parseFloat(amount))} XOF</span> via{" "}
                <span className="font-semibold text-foreground">{providers.find(p => p.id === provider)?.name}</span> est en cours de traitement.
              </p>
              <p className="text-xs text-muted-foreground">
                Vous recevrez une notification sur votre telephone pour confirmer le paiement.
              </p>
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")} data-testid="button-back-dashboard">
                  Retour au tableau de bord
                </Button>
                <Button className="flex-1" onClick={() => { setSuccess(false); setAmount(""); setPhone(""); }} data-testid="button-new-deposit">
                  Nouveau depot
                </Button>
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
                <Label htmlFor="deposit-amount">Montant personnalise (XOF)</Label>
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
              <CardTitle className="text-base">Mode de paiement</CardTitle>
              <CardDescription>Selectionnez votre operateur Mobile Money</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                      provider === p.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border"
                    }`}
                    data-testid={`button-provider-${p.id}`}
                  >
                    <div className={`h-3 w-3 rounded-full ${p.icon} flex-shrink-0`} />
                    <span className="text-sm font-medium truncate">{p.name}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-phone">Numero de telephone</Label>
                <Input
                  id="deposit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+229 97 00 00 00"
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
                  <span className="text-sm text-muted-foreground">Montant du depot</span>
                  <span className="font-semibold">{formatCurrency(parseFloat(amount))} XOF</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frais</span>
                  <span className="text-sm text-green-600 font-medium">Gratuit</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total a payer</span>
                  <span className="text-lg font-bold text-primary" data-testid="text-deposit-total">{formatCurrency(parseFloat(amount))} XOF</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Vous recevrez une notification de paiement sur votre telephone. Confirmez le paiement pour crediter votre compte SolvexPay.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={depositMutation.isPending || !amount || !phone}
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? "Traitement en cours..." : `Recharger ${amount ? formatCurrency(parseFloat(amount)) + " XOF" : ""}`}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

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
import { ArrowUpRight, Wallet, Info, CheckCircle2, AlertTriangle } from "lucide-react";
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

export default function WithdrawPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: wallet } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const balance = parseFloat(String(wallet?.balanceXOF || 0));
  const withdrawAmount = amount ? parseFloat(amount) : 0;
  const fees = withdrawAmount * 0.01;
  const totalDeducted = withdrawAmount + fees;
  const insufficientFunds = totalDeducted > balance;

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; provider: string; phone: string; currency: string }) => {
      return apiRequest("POST", "/api/transactions/withdraw", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSuccess(true);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'initier le retrait.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone || insufficientFunds) return;
    withdrawMutation.mutate({
      amount: parseFloat(amount),
      provider,
      phone,
      currency: "XOF",
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
              <h2 className="text-xl font-bold">Retrait initie avec succes</h2>
              <p className="text-muted-foreground text-sm">
                Votre retrait de <span className="font-semibold text-foreground">{formatCurrency(parseFloat(amount))} XOF</span> vers{" "}
                <span className="font-semibold text-foreground">{providers.find(p => p.id === provider)?.name}</span> est en cours de traitement.
              </p>
              <p className="text-xs text-muted-foreground">
                Les fonds seront envoyes sur le numero {phone} dans les prochaines minutes.
              </p>
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")} data-testid="button-back-dashboard">
                  Retour au tableau de bord
                </Button>
                <Button className="flex-1" onClick={() => { setSuccess(false); setAmount(""); setPhone(""); }} data-testid="button-new-withdraw">
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
              <CardDescription>Selectionnez l'operateur et le numero de reception</CardDescription>
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
                <Label htmlFor="withdraw-phone">Numero de telephone</Label>
                <Input
                  id="withdraw-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+229 97 00 00 00"
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
                  <span className="font-semibold">{formatCurrency(withdrawAmount)} XOF</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Frais (1%)</span>
                  <span className="text-sm text-destructive font-medium">- {formatCurrency(fees)} XOF</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total debite</span>
                  <span className="text-lg font-bold" data-testid="text-withdraw-total">{formatCurrency(totalDeducted)} XOF</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vous recevrez</span>
                  <span className="font-semibold text-primary" data-testid="text-withdraw-receive">{formatCurrency(withdrawAmount)} XOF</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Les fonds seront envoyes directement sur votre compte Mobile Money. Le traitement prend generalement quelques minutes.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={withdrawMutation.isPending || !amount || !phone || insufficientFunds}
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? "Traitement en cours..." : `Retirer ${withdrawAmount > 0 ? formatCurrency(withdrawAmount) + " XOF" : ""}`}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

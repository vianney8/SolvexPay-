import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowDownLeft, ArrowUpRight, Wallet, Smartphone } from "lucide-react";
import type { Wallet as WalletType } from "@shared/schema";

const providers = [
  { id: "mtn", name: "MTN Mobile Money", color: "bg-yellow-500" },
  { id: "orange", name: "Orange Money", color: "bg-orange-500" },
  { id: "wave", name: "Wave", color: "bg-blue-500" },
  { id: "moov", name: "Moov Money", color: "bg-purple-500" },
  { id: "free", name: "Free Money", color: "bg-green-500" },
];

const currencies = [
  { code: "XOF", name: "Franc CFA (BCEAO)", symbol: "FCFA" },
  { code: "NGN", name: "Naira nigérian", symbol: "₦" },
  { code: "GHS", name: "Cedi ghanéen", symbol: "GH₵" },
  { code: "KES", name: "Shilling kényan", symbol: "KSh" },
];

function formatCurrency(amount: string | number, currency = "XOF") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default function WalletPage() {
  const { toast } = useToast();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const { data: wallet, isLoading } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; provider: string; phoneNumber: string }) => {
      return apiRequest("POST", "/api/transactions/deposit", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDepositOpen(false);
      toast({
        title: "Dépôt initié",
        description: "Votre dépôt a été initié avec succès. Vous recevrez une notification.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'initier le dépôt. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; provider: string; phoneNumber: string }) => {
      return apiRequest("POST", "/api/transactions/withdraw", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setWithdrawOpen(false);
      toast({
        title: "Retrait initié",
        description: "Votre retrait a été initié avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'initier le retrait. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const handleDeposit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    depositMutation.mutate({
      amount: parseFloat(formData.get("amount") as string),
      currency: formData.get("currency") as string,
      provider: formData.get("provider") as string,
      phoneNumber: formData.get("phoneNumber") as string,
    });
  };

  const handleWithdraw = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    withdrawMutation.mutate({
      amount: parseFloat(formData.get("amount") as string),
      currency: formData.get("currency") as string,
      provider: formData.get("provider") as string,
      phoneNumber: formData.get("phoneNumber") as string,
    });
  };

  return (
    <DashboardLayout title="Portefeuille" breadcrumbs={[{ label: "Portefeuille" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-deposit">
                <ArrowDownLeft className="h-4 w-4" />
                Faire un dépôt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Faire un dépôt</DialogTitle>
                <DialogDescription>
                  Déposez de l'argent sur votre compte via Mobile Money
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit-amount">Montant</Label>
                  <Input
                    id="deposit-amount"
                    name="amount"
                    type="number"
                    placeholder="10000"
                    min="100"
                    required
                    data-testid="input-deposit-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit-currency">Devise</Label>
                  <Select name="currency" defaultValue="XOF">
                    <SelectTrigger id="deposit-currency" data-testid="select-deposit-currency">
                      <SelectValue placeholder="Sélectionner une devise" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit-provider">Fournisseur</Label>
                  <Select name="provider" defaultValue="mtn">
                    <SelectTrigger id="deposit-provider" data-testid="select-deposit-provider">
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit-phone">Numéro de téléphone</Label>
                  <Input
                    id="deposit-phone"
                    name="phoneNumber"
                    type="tel"
                    placeholder="+221 77 123 45 67"
                    required
                    data-testid="input-deposit-phone"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={depositMutation.isPending} data-testid="button-confirm-deposit">
                  {depositMutation.isPending ? "Traitement..." : "Confirmer le dépôt"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-withdraw">
                <ArrowUpRight className="h-4 w-4" />
                Faire un retrait
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Faire un retrait</DialogTitle>
                <DialogDescription>
                  Retirez de l'argent vers votre compte Mobile Money
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw-amount">Montant</Label>
                  <Input
                    id="withdraw-amount"
                    name="amount"
                    type="number"
                    placeholder="10000"
                    min="100"
                    required
                    data-testid="input-withdraw-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-currency">Devise</Label>
                  <Select name="currency" defaultValue="XOF">
                    <SelectTrigger id="withdraw-currency" data-testid="select-withdraw-currency">
                      <SelectValue placeholder="Sélectionner une devise" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name} ({c.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-provider">Fournisseur</Label>
                  <Select name="provider" defaultValue="mtn">
                    <SelectTrigger id="withdraw-provider" data-testid="select-withdraw-provider">
                      <SelectValue placeholder="Sélectionner un fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="withdraw-phone">Numéro de téléphone</Label>
                  <Input
                    id="withdraw-phone"
                    name="phoneNumber"
                    type="tel"
                    placeholder="+221 77 123 45 67"
                    required
                    data-testid="input-withdraw-phone"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={withdrawMutation.isPending} data-testid="button-confirm-withdraw">
                  {withdrawMutation.isPending ? "Traitement..." : "Confirmer le retrait"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {currencies.map((currency) => {
            const balanceKey = `balance${currency.code}` as keyof WalletType;
            const balance = String(wallet?.[balanceKey] || "0");
            
            return (
              <Card key={currency.code}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Solde {currency.code}
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    <div className="text-2xl font-bold" data-testid={`text-balance-${currency.code.toLowerCase()}`}>
                      {formatCurrency(balance, currency.code)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fournisseurs supportés</CardTitle>
            <CardDescription>
              Effectuez des dépôts et retraits avec ces opérateurs Mobile Money
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  data-testid={`provider-${provider.id}`}
                >
                  <div className={`h-12 w-12 rounded-full ${provider.color} flex items-center justify-center`}>
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">Disponible</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

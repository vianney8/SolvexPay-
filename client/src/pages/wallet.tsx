import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { ArrowDownLeft, ArrowUpRight, Wallet, Smartphone, CheckCircle2, Plus } from "lucide-react";
import type { Wallet as WalletType } from "@shared/schema";

const providers = [
  { id: "mtn", name: "MTN Mobile Money", color: "from-yellow-400 to-yellow-600", bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400" },
  { id: "orange", name: "Orange Money", color: "from-orange-400 to-orange-600", bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  { id: "wave", name: "Wave", color: "from-blue-400 to-blue-600", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  { id: "moov", name: "Moov Money", color: "from-purple-400 to-purple-600", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  { id: "free", name: "Free Money", color: "from-emerald-400 to-emerald-600", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
];

const currencies = [
  { code: "XOF", name: "Franc CFA (BCEAO)", symbol: "FCFA", gradientFrom: "from-violet-500", gradientTo: "to-violet-700" },
  { code: "NGN", name: "Naira nigérian", symbol: "₦", gradientFrom: "from-emerald-500", gradientTo: "to-emerald-700" },
  { code: "GHS", name: "Cedi ghanéen", symbol: "GH₵", gradientFrom: "from-amber-500", gradientTo: "to-amber-700" },
  { code: "KES", name: "Shilling kényan", symbol: "KSh", gradientFrom: "from-pink-500", gradientTo: "to-pink-700" },
];

function formatCurrency(amount: string | number, currency = "XOF") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function TransactionForm({ type, onSuccess }: { type: "deposit" | "withdraw"; onSuccess: () => void }) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { amount: number; currency: string; provider: string; phoneNumber: string }) => {
      return apiRequest("POST", type === "deposit" ? "/api/transactions/deposit" : "/api/transactions/withdraw", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: type === "deposit" ? "Dépôt initié" : "Retrait initié",
        description: type === "deposit" ? "Votre dépôt a été initié. Vous recevrez une notification." : "Votre retrait a été initié avec succès.",
      });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'initier la transaction.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    mutation.mutate({
      amount: parseFloat(formData.get("amount") as string),
      currency: formData.get("currency") as string,
      provider: formData.get("provider") as string,
      phoneNumber: formData.get("phoneNumber") as string,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant</Label>
        <Input name="amount" type="number" placeholder="10 000" min="100" required className="h-11 border-border/70" data-testid={`input-${type}-amount`} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Devise</Label>
        <Select name="currency" defaultValue="XOF">
          <SelectTrigger className="h-11 border-border/70" data-testid={`select-${type}-currency`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.name} ({c.symbol})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur</Label>
        <Select name="provider" defaultValue="mtn">
          <SelectTrigger className="h-11 border-border/70" data-testid={`select-${type}-provider`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</Label>
        <Input name="phoneNumber" type="tel" placeholder="+229 97 00 00 00" required className="h-11 border-border/70" data-testid={`input-${type}-phone`} />
      </div>
      <Button
        type="submit"
        className={`w-full h-11 font-semibold ${type === "deposit" ? "shadow-lg shadow-primary/20" : ""}`}
        variant={type === "withdraw" ? "outline" : "default"}
        disabled={mutation.isPending}
        data-testid={`button-confirm-${type}`}
      >
        {mutation.isPending ? "Traitement..." : type === "deposit" ? "Confirmer le dépôt" : "Confirmer le retrait"}
      </Button>
    </form>
  );
}

export default function WalletPage() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const { data: wallet, isLoading } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });

  return (
    <DashboardLayout title="Portefeuille" breadcrumbs={[{ label: "Portefeuille" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2.5 h-11 px-6 font-semibold shadow-lg shadow-primary/20" data-testid="button-deposit">
                <ArrowDownLeft className="h-4 w-4" />
                Faire un dépôt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">Faire un dépôt</DialogTitle>
                    <DialogDescription className="text-xs">Déposez via Mobile Money</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <TransactionForm type="deposit" onSuccess={() => setDepositOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2.5 h-11 px-6 font-semibold border-border/70" data-testid="button-withdraw">
                <ArrowUpRight className="h-4 w-4" />
                Faire un retrait
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">Faire un retrait</DialogTitle>
                    <DialogDescription className="text-xs">Retrait vers Mobile Money</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <TransactionForm type="withdraw" onSuccess={() => setWithdrawOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {currencies.map((currency, i) => {
            const balanceKey = `balance${currency.code}` as keyof WalletType;
            const balance = String(wallet?.[balanceKey] || "0");

            return (
              <div
                key={currency.code}
                className={`relative rounded-3xl p-6 text-white overflow-hidden bg-gradient-to-br ${currency.gradientFrom} ${currency.gradientTo} shadow-xl`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/8 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/8 translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Solde {currency.code}</p>
                    <div className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-32 bg-white/20 rounded-lg" />
                  ) : (
                    <div>
                      <p className="text-3xl font-black tracking-tight" data-testid={`text-balance-${currency.code.toLowerCase()}`}>
                        {formatCurrency(balance, currency.code)}
                      </p>
                      <p className="text-white/60 text-sm mt-1">{currency.symbol}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Opérateurs supportés</CardTitle>
                <CardDescription className="text-xs">Tous les opérateurs Mobile Money disponibles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border/60 bg-card hover:shadow-md hover:shadow-primary/5 transition-all duration-300 group"
                  data-testid={`provider-${provider.id}`}
                >
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Smartphone className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">{provider.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Disponible</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Link2,
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Plus,
  Wallet,
  Send,
  Smartphone,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Transaction, Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: string | number, currency = "XOF") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const providers = [
  { id: "mtn", name: "MTN Mobile Money", color: "bg-yellow-500" },
  { id: "orange", name: "Orange Money", color: "bg-orange-500" },
  { id: "wave", name: "Wave", color: "bg-blue-500" },
  { id: "moov", name: "Moov Money", color: "bg-blue-700" },
  { id: "airtel", name: "Airtel Money", color: "bg-red-500" },
  { id: "free", name: "Free Money", color: "bg-green-600" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
    paymentLinksCount: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: number; provider: string; phone: string; currency: string }) => {
      return apiRequest("POST", "/api/transactions/deposit", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDepositOpen(false);
      toast({ title: "Depot initie", description: "Votre depot est en cours de traitement." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'initier le depot.", variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; provider: string; phone: string; currency: string }) => {
      return apiRequest("POST", "/api/transactions/withdraw", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setWithdrawOpen(false);
      toast({ title: "Retrait initie", description: "Votre retrait est en cours de traitement." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'initier le retrait.", variant: "destructive" });
    },
  });

  const handleDeposit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    depositMutation.mutate({
      amount: parseFloat(fd.get("amount") as string),
      provider: fd.get("provider") as string,
      phone: fd.get("phone") as string,
      currency: "XOF",
    });
  };

  const handleWithdraw = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    withdrawMutation.mutate({
      amount: parseFloat(fd.get("amount") as string),
      provider: fd.get("provider") as string,
      phone: fd.get("phone") as string,
      currency: "XOF",
    });
  };

  const recentTransactions = transactions?.slice(0, 5) || [];
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";

  return (
    <DashboardLayout title="" breadcrumbs={[]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-greeting">
            Bonjour, {displayName}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Bienvenue sur votre tableau de bord</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 p-6 text-white" data-testid="card-balance">
          <p className="text-sm font-medium text-white/80">Votre solde</p>
          <div className="flex items-center gap-3 mt-2">
            {walletLoading ? (
              <Skeleton className="h-10 w-48 bg-white/20" />
            ) : (
              <span className="text-4xl font-bold tracking-tight" data-testid="text-balance-xof">
                {balanceVisible ? formatCurrency(wallet?.balanceXOF || 0) : "****"} XOF
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="text-white/70"
              data-testid="button-toggle-balance"
            >
              {balanceVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex gap-3 mt-5 flex-wrap">
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex-1 bg-white/90 text-cyan-700 font-semibold" data-testid="button-deposit">
                  Recharger
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Recharger votre compte</DialogTitle>
                  <DialogDescription>Effectuez un depot via Mobile Money</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Montant (XOF)</Label>
                    <Input name="amount" type="number" placeholder="10000" min="100" required data-testid="input-deposit-amount" />
                  </div>
                  <div className="space-y-2">
                    <Label>Operateur</Label>
                    <Select name="provider" defaultValue="mtn">
                      <SelectTrigger data-testid="select-deposit-provider"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Numero de telephone</Label>
                    <Input name="phone" type="tel" placeholder="+229 97 00 00 00" required data-testid="input-deposit-phone" />
                  </div>
                  <Button type="submit" className="w-full" disabled={depositMutation.isPending} data-testid="button-confirm-deposit">
                    {depositMutation.isPending ? "Traitement..." : "Recharger"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 bg-white/20 text-white border-white/30 font-semibold" data-testid="button-withdraw">
                  Effectuer un retrait
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Effectuer un retrait</DialogTitle>
                  <DialogDescription>Retirez des fonds vers Mobile Money</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Montant (XOF)</Label>
                    <Input name="amount" type="number" placeholder="5000" min="100" required data-testid="input-withdraw-amount" />
                  </div>
                  <div className="space-y-2">
                    <Label>Operateur</Label>
                    <Select name="provider" defaultValue="mtn">
                      <SelectTrigger data-testid="select-withdraw-provider"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Numero de telephone</Label>
                    <Input name="phone" type="tel" placeholder="+229 97 00 00 00" required data-testid="input-withdraw-phone" />
                  </div>
                  <Button type="submit" className="w-full" disabled={withdrawMutation.isPending} data-testid="button-confirm-withdraw">
                    {withdrawMutation.isPending ? "Traitement..." : "Retirer"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="overflow-visible">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">Transferez de l'argent</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Un envoi simple, rapide et securise vers vos proches.
                </p>
                <Link href="/transfer">
                  <Button variant="outline" className="mt-3" data-testid="button-transfer">
                    Transferez maintenant
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">Liens de paiement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Creez et partagez des liens de paiement pour recevoir des fonds facilement.
                </p>
                <Link href="/payment-links">
                  <Button variant="outline" className="mt-3" data-testid="button-goto-payment-links">
                    Creer un lien
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">Integration API</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Integrez SolvexPay dans votre application pour accepter les paiements Mobile Money.
                </p>
                <Link href="/api-keys">
                  <Button variant="outline" className="mt-3" data-testid="button-goto-api-keys">
                    Gerer les cles API
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-base">Transactions recentes</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-transactions">
                Voir tout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Aucune transaction recente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4" data-testid={`transaction-item-${tx.id}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      tx.type === "deposit" ? "bg-primary/10" : "bg-orange-500/10"
                    }`}>
                      {tx.type === "deposit" ? (
                        <ArrowDownLeft className="h-5 w-5 text-primary" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {tx.type === "deposit" ? "Depot" : "Retrait"} - {tx.provider}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.createdAt && formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${
                        tx.type === "deposit" ? "text-primary" : ""
                      }`}>
                        {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)} {tx.currency}
                      </p>
                      <Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                        {tx.status === "completed" ? "Termine" : tx.status === "pending" ? "En cours" : "Echoue"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

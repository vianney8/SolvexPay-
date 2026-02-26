import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Link2,
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Sparkles,
  CreditCard,
  Code2,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon apres-midi";
  return "Bonsoir";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);

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

  const recentTransactions = transactions?.slice(0, 5) || [];
  const displayName = user ? (user.firstName || "").trim() : "";

  const completedTx = transactions?.filter(t => t.status === "completed") || [];
  const pendingTx = transactions?.filter(t => t.status === "pending") || [];

  const successRate = transactions && transactions.length > 0
    ? Math.round((completedTx.length / transactions.length) * 100)
    : 0;

  const balance = parseFloat(String(wallet?.balanceXOF || 0));

  return (
    <DashboardLayout title="" breadcrumbs={[]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" data-testid="text-greeting">
              {getGreeting()}, {displayName}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Voici un apercu de votre activite
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/deposit">
              <Button size="sm" className="gap-1.5" data-testid="button-header-deposit">
                <ArrowDownLeft className="h-4 w-4" />
                Recharger
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 sm:p-8" data-testid="card-balance">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-white/70" />
              <p className="text-sm font-medium text-white/70">Solde disponible</p>
            </div>
            <div className="flex items-center gap-3">
              {walletLoading ? (
                <Skeleton className="h-12 w-56 bg-white/20" />
              ) : (
                <span className="text-4xl sm:text-5xl font-bold text-white tracking-tight" data-testid="text-balance-xof">
                  {balanceVisible ? formatCurrency(balance) : "\u2022\u2022\u2022\u2022\u2022\u2022"} <span className="text-2xl font-semibold text-white/80">XOF</span>
                </span>
              )}
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                data-testid="button-toggle-balance"
              >
                {balanceVisible ? <Eye className="h-4 w-4 text-white/80" /> : <EyeOff className="h-4 w-4 text-white/80" />}
              </button>
            </div>

            <div className="flex gap-3 mt-6 flex-wrap">
              <Link href="/deposit" className="flex-1 min-w-[140px]">
                <Button className="w-full bg-white text-emerald-700 hover:bg-white/90 font-semibold shadow-lg shadow-emerald-900/20 gap-2" data-testid="button-deposit">
                  <ArrowDownLeft className="h-4 w-4" />
                  Recharger
                </Button>
              </Link>
              <Link href="/withdraw" className="flex-1 min-w-[140px]">
                <Button variant="outline" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold gap-2" data-testid="button-withdraw">
                  <ArrowUpRight className="h-4 w-4" />
                  Retirer
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-0 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Depots</div>
              <div className="text-lg font-bold mt-0.5" data-testid="text-stat-deposits">
                {statsLoading ? <Skeleton className="h-6 w-16" /> : formatCurrency(stats?.totalDeposits || 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Retraits</div>
              <div className="text-lg font-bold mt-0.5" data-testid="text-stat-withdrawals">
                {statsLoading ? <Skeleton className="h-6 w-16" /> : formatCurrency(stats?.totalWithdrawals || 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Taux de reussite</div>
              <div className="text-lg font-bold mt-0.5" data-testid="text-stat-success-rate">
                {successRate}%
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">En attente</div>
              <div className="text-lg font-bold mt-0.5">{pendingTx.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/transfer">
            <Card className="group cursor-pointer h-full" data-testid="card-transfer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Transferer</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Envoyez de l'argent</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/payment-links">
            <Card className="group cursor-pointer h-full" data-testid="card-payment-links">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Link2 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Liens de paiement</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Creez et partagez</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/api-keys">
            <Card className="group cursor-pointer h-full" data-testid="card-api-keys">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Code2 className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">API</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Integrez vos paiements</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-4">
            <CardTitle className="text-base font-semibold">Transactions recentes</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid="link-view-all-transactions">
                Tout voir
                <ArrowRight className="h-3.5 w-3.5" />
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
              <div className="text-center py-12">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">Aucune transaction</p>
                <p className="text-xs text-muted-foreground mt-1">Vos transactions apparaitront ici</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map((tx) => {
                  const isDeposit = tx.type === "deposit";
                  const statusIcon = tx.status === "completed" ? CheckCircle2 : tx.status === "pending" ? Clock : XCircle;
                  const StatusIcon = statusIcon;
                  const statusColor = tx.status === "completed" ? "text-emerald-500" : tx.status === "pending" ? "text-amber-500" : "text-red-500";

                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-accent/30 transition-colors" data-testid={`transaction-item-${tx.id}`}>
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDeposit ? "bg-emerald-500/10" : "bg-orange-500/10"
                      }`}>
                        {isDeposit ? (
                          <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {isDeposit ? "Depot" : "Retrait"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.createdAt && formatDate(tx.createdAt)}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className={`font-semibold text-sm tabular-nums ${isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                            {isDeposit ? "+" : "-"}{formatCurrency(tx.amount)} 
                          </p>
                          <p className="text-[10px] text-muted-foreground">{tx.currency}</p>
                        </div>
                        <StatusIcon className={`h-4 w-4 ${statusColor} flex-shrink-0`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

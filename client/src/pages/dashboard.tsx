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
  BarChart3,
  CreditCard,
  Clock,
  CheckCircle2,
  Wallet,
  TrendingUp,
  Send,
  Plus,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import type { Transaction, Wallet as WalletType } from "@shared/schema";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

const quickActions = [
  { label: "Recharger", icon: Plus, href: "/deposit", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400", ring: "ring-violet-500/20" },
  { label: "Retirer", icon: ArrowUpRight, href: "/withdraw", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/20" },
  { label: "Transférer", icon: Send, href: "/transfer", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", ring: "ring-amber-500/20" },
  { label: "Liens", icon: Link2, href: "/payment-links", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400", ring: "ring-pink-500/20" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalDeposits: number; totalWithdrawals: number; transactionCount: number; paymentLinksCount: number;
  }>({ queryKey: ["/api/stats"] });

  const recentTransactions = transactions?.slice(0, 5) || [];
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";
  const firstName = user?.firstName || displayName.split(" ")[0] || "là";

  const completedTx = transactions?.filter(t => t.status === "completed") || [];
  const pendingTx = transactions?.filter(t => t.status === "pending") || [];
  const depositTx = transactions?.filter(t => t.type === "deposit") || [];
  const withdrawalTx = transactions?.filter(t => t.type === "withdrawal") || [];
  const successRate = transactions && transactions.length > 0 ? Math.round((completedTx.length / transactions.length) * 100) : 0;

  const statCards = [
    { label: "Total dépôts", value: formatCurrency(stats?.totalDeposits || 0), suffix: " XOF", icon: ArrowDownLeft, color: "from-violet-500 to-violet-700", bg: "bg-violet-500/10 dark:bg-violet-500/15", text: "text-violet-600 dark:text-violet-400", testid: "text-stat-deposits" },
    { label: "Total retraits", value: formatCurrency(stats?.totalWithdrawals || 0), suffix: " XOF", icon: ArrowUpRight, color: "from-emerald-500 to-emerald-700", bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", testid: "text-stat-withdrawals" },
    { label: "Transactions", value: String(stats?.transactionCount || 0), suffix: "", icon: CreditCard, color: "from-amber-500 to-amber-700", bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", testid: "text-stat-tx-count" },
    { label: "Taux de succès", value: String(successRate), suffix: "%", icon: TrendingUp, color: "from-pink-500 to-pink-700", bg: "bg-pink-500/10 dark:bg-pink-500/15", text: "text-pink-600 dark:text-pink-400", testid: "text-stat-success-rate" },
  ];

  return (
    <DashboardLayout title="" breadcrumbs={[]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-0.5">Bonjour,</p>
            <h2 className="text-2xl font-bold text-foreground" data-testid="text-greeting">
              {firstName} 👋
            </h2>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Compte actif
          </Badge>
        </div>

        <div
          className="relative rounded-3xl p-7 text-white overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 52%) 0%, hsl(280 70% 60%) 50%, hsl(262 60% 45%) 100%)" }}
          data-testid="card-balance"
        >
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-white/70 text-sm font-medium mb-1">Solde disponible</p>
                <div className="flex items-end gap-3">
                  {walletLoading ? (
                    <Skeleton className="h-12 w-56 bg-white/20 rounded-xl" />
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tight" data-testid="text-balance-xof">
                        {balanceVisible ? formatCurrency(wallet?.balanceXOF || 0) : "••••••"}
                      </span>
                      <span className="text-white/70 text-lg font-semibold">XOF</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  data-testid="button-toggle-balance"
                >
                  {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href} className="flex-1">
                  <button
                    className="w-full flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95 group"
                    data-testid={`button-${action.label.toLowerCase()}`}
                  >
                    <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/90">{action.label}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`h-4 w-4 ${stat.text}`} />
                  </div>
                </div>
                {statsLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className="text-xl font-bold text-foreground" data-testid={stat.testid}>
                    {stat.value}<span className="text-sm font-medium text-muted-foreground">{stat.suffix}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-border/60 h-full">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base font-bold">Transactions récentes</CardTitle>
                </div>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary/80 font-semibold text-xs" data-testid="link-view-all-transactions">
                    Voir tout
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1"><Skeleton className="h-4 w-28 mb-1.5" /><Skeleton className="h-3 w-20" /></div>
                        <Skeleton className="h-5 w-24" />
                      </div>
                    ))}
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                      <Activity className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-sm text-muted-foreground">Aucune transaction</p>
                    <p className="text-xs text-muted-foreground mt-1">Vos transactions apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group" data-testid={`transaction-item-${tx.id}`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tx.type === "deposit" ? "bg-emerald-500/10" : tx.type === "transfer" ? "bg-violet-500/10" : "bg-orange-500/10"
                        }`}>
                          {tx.type === "deposit" ? (
                            <ArrowDownLeft className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                          ) : tx.type === "transfer" ? (
                            <ArrowLeftRight className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                          ) : (
                            <ArrowUpRight className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground capitalize">
                            {tx.type === "deposit" ? "Dépôt" : tx.type === "transfer" ? "Transfert" : "Retrait"}
                            {tx.provider && <span className="font-normal text-muted-foreground"> · {tx.provider}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{tx.createdAt && formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold text-sm ${tx.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                            {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)} XOF
                          </p>
                          <Badge
                            variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}
                            className={`text-xs mt-0.5 ${tx.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : ""}`}
                          >
                            {tx.status === "completed" ? "Terminé" : tx.status === "pending" ? "En cours" : "Échoué"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <ArrowLeftRight className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Transfert d'argent</h3>
                    <p className="text-xs text-muted-foreground">Envoi rapide et sécurisé</p>
                  </div>
                </div>
                <Link href="/transfer">
                  <Button variant="outline" className="w-full text-sm font-semibold border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500/5" data-testid="button-transfer">
                    Transférer maintenant
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                    <Link2 className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Liens de paiement</h3>
                    <p className="text-xs text-muted-foreground">{stats?.paymentLinksCount || 0} liens actifs</p>
                  </div>
                </div>
                <Link href="/payment-links">
                  <Button variant="outline" className="w-full text-sm font-semibold border-pink-500/20 text-pink-600 dark:text-pink-400 hover:bg-pink-500/5" data-testid="button-goto-payment-links">
                    Créer un lien
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-bold text-foreground">Volume des flux</p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><ArrowDownLeft className="h-3 w-3 text-emerald-500" />Dépôts</span>
                      <span className="font-bold">{depositTx.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700" style={{ width: `${transactions && transactions.length > 0 ? (depositTx.length / transactions.length) * 100 : 0}%` }} data-testid="bar-deposits" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-orange-500" />Retraits</span>
                      <span className="font-bold">{withdrawalTx.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700" style={{ width: `${transactions && transactions.length > 0 ? (withdrawalTx.length / transactions.length) * 100 : 0}%` }} data-testid="bar-withdrawals" />
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" />En attente</span>
                    <Badge variant="secondary" className="text-xs px-2 py-0">{pendingTx.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

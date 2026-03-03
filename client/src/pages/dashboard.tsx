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
  Clock,
  Wallet,
  Send,
  Plus,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Zap,
  QrCode,
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
  { label: "Dépôt", icon: ArrowDownToLine, href: "/deposit", gradient: "from-emerald-400/30 to-emerald-300/20" },
  { label: "Retrait", icon: ArrowUpFromLine, href: "/withdraw", gradient: "from-orange-400/30 to-orange-300/20" },
  { label: "Envoi", icon: Zap, href: "/transfer", gradient: "from-cyan-400/30 to-cyan-300/20" },
  { label: "Liens", icon: QrCode, href: "/payment-links", gradient: "from-pink-400/30 to-pink-300/20" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: stats } = useQuery<{
    totalDeposits: number; totalWithdrawals: number; transactionCount: number; paymentLinksCount: number;
  }>({ queryKey: ["/api/stats"] });

  const recentTransactions = transactions?.slice(0, 5) || [];
  const firstName = user?.firstName || user?.email?.split("@")[0] || "là";

  const depositTx = transactions?.filter(t => t.type === "deposit") || [];
  const withdrawalTx = transactions?.filter(t => t.type === "withdrawal") || [];
  const pendingTx = transactions?.filter(t => t.status === "pending") || [];

  return (
    <DashboardLayout title="" breadcrumbs={[]}>
      <div className="space-y-6">

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium">Bonjour,</p>
            <h2 className="text-xl font-black tracking-tight text-foreground leading-none mt-1 uppercase" data-testid="text-greeting">
              {firstName}
            </h2>
          </div>
          {(user as any)?.kycStatus === "verified" ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/30 mb-1" data-testid="badge-kyc-status">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              Vérifié
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-400 text-white text-xs font-bold shadow-md shadow-slate-400/30 mb-1" data-testid="badge-kyc-status">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
              Non vérifié
            </div>
          )}
        </div>

        <div
          className="relative rounded-3xl p-6 text-white overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 52%) 0%, hsl(280 70% 60%) 50%, hsl(262 60% 45%) 100%)" }}
          data-testid="card-balance"
        >
          <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-white/5 translate-y-1/2" />

          <div className="relative">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-white/70 text-xs font-medium mb-2 uppercase tracking-wider">Solde disponible</p>
                {walletLoading ? (
                  <Skeleton className="h-10 w-44 bg-white/20 rounded-xl" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight" data-testid="text-balance-xof">
                      {balanceVisible ? formatCurrency(wallet?.balanceXOF || 0) : "••••"}
                    </span>
                    <span className="text-white/70 text-base font-semibold">XOF</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
                  data-testid="button-toggle-balance"
                >
                  {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <button
                    className="w-full flex flex-col items-center gap-2 py-3.5 px-1 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95 border border-white/15"
                    data-testid={`button-${action.label.toLowerCase()}`}
                  >
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center border border-white/20`}>
                      <action.icon className="h-5 w-5 text-white drop-shadow-sm" />
                    </div>
                    <span className="text-[11px] font-bold text-white text-center leading-none tracking-wide">{action.label}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between gap-1 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base font-bold">Transactions récentes</CardTitle>
                </div>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary/80 font-semibold text-xs" data-testid="link-view-all-transactions">
                    Voir tout <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-0">
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
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
                    <Link href="/deposit">
                      <Button size="sm" className="mt-4 gap-1.5 font-semibold">
                        <Plus className="h-3.5 w-3.5" /> Faire un dépôt
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {recentTransactions.map((tx) => {
                      const isPayLink = tx.description?.startsWith("Paiement via lien:");
                      const label = isPayLink ? "Paiement" : tx.type === "deposit" ? "Dépôt" : tx.type === "transfer" ? "Transfert" : "Retrait";
                      const provider = tx.provider && tx.provider.toLowerCase() !== "omnipay" ? tx.provider : null;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-3 hover:bg-muted/30 rounded-xl px-2 transition-colors group" data-testid={`transaction-item-${tx.id}`}>
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === "deposit" ? "bg-emerald-500/10" : tx.type === "transfer" ? "bg-violet-500/10" : "bg-orange-500/10"}`}>
                            {tx.type === "deposit" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : tx.type === "transfer" ? <ArrowLeftRight className="h-4 w-4 text-violet-600 dark:text-violet-400" /> : <ArrowUpRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">
                              {label}{provider && <span className="font-normal text-muted-foreground text-xs"> · {provider}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">{tx.createdAt && formatDate(tx.createdAt)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`font-bold text-sm ${tx.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                              {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)} XOF
                            </p>
                            <span className={`text-xs font-semibold ${tx.status === "completed" ? "text-emerald-600 dark:text-emerald-400" : tx.status === "pending" ? "text-amber-600" : "text-red-500"}`}>
                              {tx.status === "completed" ? "Terminé" : tx.status === "pending" ? "En cours" : "Échoué"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Dépôts", count: depositTx.length, amount: depositTx.reduce((s, t) => s + parseFloat(t.amount), 0), color: "from-emerald-500/20 to-teal-500/10", icon: ArrowDownLeft, iconColor: "text-emerald-600 dark:text-emerald-400", barColor: "bg-gradient-to-r from-emerald-500 to-teal-500" },
                { label: "Retraits", count: withdrawalTx.length, amount: withdrawalTx.reduce((s, t) => s + parseFloat(t.amount), 0), color: "from-orange-500/20 to-red-500/10", icon: ArrowUpRight, iconColor: "text-orange-600 dark:text-orange-400", barColor: "bg-gradient-to-r from-orange-500 to-red-500" },
                { label: "En attente", count: pendingTx.length, amount: pendingTx.reduce((s, t) => s + parseFloat(t.amount), 0), color: "from-amber-500/20 to-yellow-500/10", icon: Clock, iconColor: "text-amber-600", barColor: "bg-gradient-to-r from-amber-500 to-yellow-500" },
              ].map((item) => {
                const Icon = item.icon;
                const pct = transactions && transactions.length > 0 ? (item.count / transactions.length) * 100 : 0;
                return (
                  <Card key={item.label} className="border-border/60 overflow-hidden">
                    <div className={`h-1 bg-gradient-to-r ${item.color}`} />
                    <CardContent className="p-4">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3`}>
                        <Icon className={`h-4 w-4 ${item.iconColor}`} />
                      </div>
                      <p className="text-2xl font-black text-foreground" data-testid={`stat-count-${item.label.toLowerCase()}`}>{item.count}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{item.label}</p>
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <Link href="/transfer" className="block">
              <div
                className="relative rounded-2xl p-5 text-white overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 52%) 0%, hsl(280 70% 60%) 100%)" }}
                data-testid="button-transfer"
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Send className="h-5 w-5" />
                  </div>
                  <p className="font-black text-base leading-tight">Transfert rapide</p>
                  <p className="text-white/70 text-xs mt-1">Envoi instantané sécurisé</p>
                  <div className="flex items-center gap-1 mt-3 text-white/80 text-xs font-semibold">
                    Transférer maintenant <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/payment-links" className="block">
              <div
                className="relative rounded-2xl p-5 text-white overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, hsl(330 80% 52%) 0%, hsl(300 70% 56%) 100%)" }}
                data-testid="button-goto-payment-links"
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Link2 className="h-5 w-5" />
                  </div>
                  <p className="font-black text-base leading-tight">Liens de paiement</p>
                  <p className="text-white/70 text-xs mt-1">{stats?.paymentLinksCount || 0} lien(s) créé(s)</p>
                  <div className="flex items-center gap-1 mt-3 text-white/80 text-xs font-semibold">
                    Créer un lien <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Link>

            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-violet-600" />
                  </div>
                  <p className="text-sm font-bold">Performance</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Taux de succès", value: transactions && transactions.length > 0 ? Math.round((transactions.filter(t => t.status === "completed").length / transactions.length) * 100) : 0, suffix: "%" },
                    { label: "Total transactions", value: transactions?.length || 0, suffix: "" },
                    { label: "Liens actifs", value: stats?.paymentLinksCount || 0, suffix: "" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-black text-foreground">{item.value}{item.suffix}</span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Volume total entrant</span>
                    </div>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(stats?.totalDeposits || 0)} <span className="text-sm font-semibold text-muted-foreground">XOF</span>
                    </p>
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

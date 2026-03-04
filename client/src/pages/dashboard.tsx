import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Link2,
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  BarChart3,
  Clock,
  Wallet,
  Plus,
  ShieldCheck,
  QrCode,
  Banknote,
  Key,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  X,
  Bell,
  Globe,
  ExternalLink,
  Repeat2,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import type { Transaction, Wallet as WalletType, PaymentLink } from "@shared/schema";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  BJ: { name: "Bénin", flag: "🇧🇯" },
  CI: { name: "Côte d'Ivoire", flag: "🇨🇮" },
  SN: { name: "Sénégal", flag: "🇸🇳" },
  CM: { name: "Cameroun", flag: "🇨🇲" },
  TG: { name: "Togo", flag: "🇹🇬" },
  BF: { name: "Burkina Faso", flag: "🇧🇫" },
  ML: { name: "Mali", flag: "🇲🇱" },
  COD: { name: "RD Congo", flag: "🇨🇩" },
  COG: { name: "Congo", flag: "🇨🇬" },
};

const quickActions = [
  { label: "Dépôt", icon: Wallet, href: "/deposit", gradient: "from-emerald-400/40 to-teal-400/30", ring: "border-emerald-300/30" },
  { label: "Retrait", icon: Banknote, href: "/withdraw", gradient: "from-orange-400/40 to-amber-400/30", ring: "border-orange-300/30" },
  { label: "Liens", icon: QrCode, href: "/payment-links", gradient: "from-fuchsia-400/40 to-pink-400/30", ring: "border-fuchsia-300/30" },
  { label: "API", icon: Key, href: "/api-keys", gradient: "from-indigo-400/40 to-blue-400/30", ring: "border-indigo-300/30" },
];

function isExpiredPending(tx: Transaction): boolean {
  if (tx.status !== "pending") return false;
  if (!tx.createdAt) return false;
  const age = Date.now() - new Date(tx.createdAt).getTime();
  return age > 12 * 60 * 1000;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletType>({ queryKey: ["/api/wallet"] });
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });
  const { data: activeNotifications } = useQuery<any[]>({ queryKey: ["/api/notifications"] });
  const { data: stats } = useQuery<{
    totalDeposits: number; totalWithdrawals: number; transactionCount: number; paymentLinksCount: number;
  }>({ queryKey: ["/api/stats"] });
  const { data: paymentLinks } = useQuery<PaymentLink[]>({ queryKey: ["/api/payment-links"] });

  const recentTransactions = transactions?.slice(0, 5) || [];
  const firstName = user?.firstName || user?.email?.split("@")[0] || "là";

  const visibleNotifications = (activeNotifications || []).filter((n: any) => !dismissedNotifs.includes(n.id));

  function dismissNotif(id: string) {
    setDismissedNotifs(prev => [...prev, id]);
  }

  const depositTx = transactions?.filter(t => t.type === "deposit") || [];
  const withdrawalTx = transactions?.filter(t => t.type === "withdrawal") || [];
  const pendingTx = transactions?.filter(t => t.status === "pending") || [];

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
  const prevMonthYear = curMonth === 0 ? curYear - 1 : curYear;

  const completedDeposits = transactions?.filter(t => t.type === "deposit" && t.status === "completed") || [];
  const thisMonthReceived = completedDeposits
    .filter(t => { const d = new Date(t.createdAt!); return d.getMonth() === curMonth && d.getFullYear() === curYear; })
    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const lastMonthReceived = completedDeposits
    .filter(t => { const d = new Date(t.createdAt!); return d.getMonth() === prevMonth && d.getFullYear() === prevMonthYear; })
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const thisMonthTx = transactions?.filter(t => { const d = new Date(t.createdAt!); return d.getMonth() === curMonth && d.getFullYear() === curYear; }) || [];
  const thisMonthWithdrawals = thisMonthTx.filter(t => t.type === "withdrawal" || t.type === "transfer").reduce((s, t) => s + parseFloat(t.amount), 0);
  const avgTicket = completedDeposits.length > 0 ? Math.round(completedDeposits.reduce((s, t) => s + parseFloat(t.amount), 0) / completedDeposits.length) : 0;
  const growthPct = lastMonthReceived > 0 ? Math.round(((thisMonthReceived - lastMonthReceived) / lastMonthReceived) * 100) : null;

  const countryStats = completedDeposits.reduce((acc, t) => {
    const country = (t as any).payerCountry as string | null;
    if (!country) return acc;
    if (!acc[country]) acc[country] = { amount: 0, count: 0 };
    acc[country].amount += parseFloat(t.amount);
    acc[country].count += 1;
    return acc;
  }, {} as Record<string, { amount: number; count: number }>);
  const topCountries = Object.entries(countryStats)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 3);
  const maxCountryAmount = topCountries[0]?.[1]?.amount || 1;

  const topLinks = [...(paymentLinks || [])]
    .filter(l => parseFloat(String(l.timesUsed)) > 0)
    .sort((a, b) => parseFloat(String(b.timesUsed)) - parseFloat(String(a.timesUsed)))
    .slice(0, 3);

  return (
    <DashboardLayout title="" breadcrumbs={[]}>
      <div className="space-y-6">

        {visibleNotifications.length > 0 && (
          <div className="space-y-2">
            {visibleNotifications.map((n: any) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border ${n.color === "red" ? "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200" : "bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200"}`}
                data-testid={`banner-notif-${n.id}`}
              >
                <Bell className={`h-4 w-4 mt-0.5 flex-shrink-0 ${n.color === "red" ? "text-red-600" : "text-blue-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{n.title}</p>
                  <p className="text-xs mt-0.5 opacity-80">{n.message}</p>
                </div>
                <button
                  onClick={() => dismissNotif(n.id)}
                  className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${n.color === "red" ? "hover:bg-red-500/20" : "hover:bg-blue-500/20"}`}
                  data-testid={`btn-dismiss-notif-${n.id}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

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
                    className="w-full flex flex-col items-center gap-2.5 py-4 px-1 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200 active:scale-95 border border-white/15"
                    data-testid={`button-${action.label.toLowerCase()}`}
                  >
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center border ${action.ring} shadow-lg`}>
                      <action.icon className="h-5 w-5 text-white drop-shadow" strokeWidth={1.8} />
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
                      const isApiPay = !!(tx as any).apiKeyId || tx.description?.startsWith("Paiement via API") || tx.description?.startsWith("Dépôt via API");
                      const label = isPayLink ? "Paiement" : isApiPay ? "Paiement API" : tx.type === "deposit" ? "Dépôt" : tx.type === "transfer" ? "Transfert" : "Retrait";
                      const provider = tx.provider && tx.provider.toLowerCase() !== "omnipay" ? tx.provider : null;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 py-3 hover:bg-muted/30 rounded-xl px-2 transition-colors group" data-testid={`transaction-item-${tx.id}`}>
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === "deposit" ? "bg-emerald-500/10" : "bg-orange-500/10"}`}>
                            {tx.type === "deposit" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <ArrowUpRight className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
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
                            {(() => {
                              const expired = isExpiredPending(tx);
                              const effectiveStatus = expired ? "failed" : tx.status;
                              return (
                                <span className={`text-xs font-semibold ${effectiveStatus === "completed" ? "text-emerald-600 dark:text-emerald-400" : effectiveStatus === "pending" ? "text-amber-600" : "text-red-500"}`}>
                                  {effectiveStatus === "completed" ? "Terminé" : effectiveStatus === "pending" ? "En cours" : "Échoué"}
                                </span>
                              );
                            })()}
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
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-violet-600" />
                  </div>
                  <p className="text-sm font-bold">Performance</p>
                </div>

                <div className="space-y-2.5">
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
                </div>

                <div className="border-t border-border/40 pt-3 space-y-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Montants reçus</span>
                  </div>
                  <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-muted-foreground">Ce mois-ci</p>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400" data-testid="text-this-month-received">
                      {formatCurrency(thisMonthReceived)} <span className="text-xs font-semibold text-muted-foreground">XOF</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 border border-border/40 p-3">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-muted-foreground">Mois dernier</p>
                      {growthPct !== null && (
                        <span className={`text-xs font-bold ${growthPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {growthPct >= 0 ? "+" : ""}{growthPct}%
                        </span>
                      )}
                    </div>
                    <p className="text-base font-black text-foreground" data-testid="text-last-month-received">
                      {formatCurrency(lastMonthReceived)} <span className="text-xs font-semibold text-muted-foreground">XOF</span>
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Métriques avancées</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Volume sortant (mois)</span>
                    <span className="text-sm font-black text-orange-600 dark:text-orange-400">{formatCurrency(thisMonthWithdrawals)} XOF</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ticket moyen (dépôts)</span>
                    <span className="text-sm font-black text-foreground">{avgTicket > 0 ? `${formatCurrency(avgTicket)} XOF` : "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Top pays & Liens performants ── */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Top 3 pays */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">Pays d'encaissement</p>
                  <p className="text-xs text-muted-foreground">Top 3 par volume reçu</p>
                </div>
              </div>

              {topCountries.length === 0 ? (
                <div className="py-6 text-center">
                  <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun encaissement avec pays enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topCountries.map(([code, data], idx) => {
                    const info = COUNTRY_INFO[code];
                    const pct = Math.round((data.amount / maxCountryAmount) * 100);
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div key={code} className="space-y-1.5" data-testid={`country-stat-${code}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{medals[idx]}</span>
                            <span className="text-base">{info?.flag || "🌍"}</span>
                            <span className="text-sm font-semibold">{info?.name || code}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(data.amount)} XOF</p>
                            <p className="text-xs text-muted-foreground">{data.count} paiement{data.count > 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${idx === 0 ? "bg-gradient-to-r from-amber-400 to-yellow-500" : idx === 1 ? "bg-gradient-to-r from-slate-400 to-slate-500" : "bg-gradient-to-r from-orange-400 to-amber-600"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top liens de paiement */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                  <Repeat2 className="h-4 w-4 text-fuchsia-600" />
                </div>
                <div>
                  <p className="text-sm font-bold">Liens les plus utilisés</p>
                  <p className="text-xs text-muted-foreground">Top 3 par nombre de paiements</p>
                </div>
              </div>

              {topLinks.length === 0 ? (
                <div className="py-6 text-center">
                  <Link2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun lien utilisé pour l'instant</p>
                  <Link href="/payment-links">
                    <Button size="sm" variant="outline" className="mt-3 text-xs gap-1.5">
                      <Plus className="h-3 w-3" /> Créer un lien
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {topLinks.map((link, idx) => {
                    const uses = parseFloat(String(link.timesUsed));
                    const estimated = uses * parseFloat(String(link.amount));
                    const medals = ["🥇", "🥈", "🥉"];
                    const maxUses = parseFloat(String(topLinks[0].timesUsed)) || 1;
                    const pct = Math.round((uses / maxUses) * 100);
                    return (
                      <div key={link.id} className="space-y-1.5" data-testid={`link-stat-${link.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base flex-shrink-0">{medals[idx]}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{link.name}</p>
                              <p className="text-xs text-muted-foreground">{uses} utilisation{uses > 1 ? "s" : ""} · {formatCurrency(link.amount)} XOF</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-fuchsia-600 dark:text-fuchsia-400">{formatCurrency(estimated)} XOF</p>
                            <Link href="/payment-links">
                              <span className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 justify-end cursor-pointer">
                                <ExternalLink className="h-2.5 w-2.5" /> voir
                              </span>
                            </Link>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardLayout>
  );
}

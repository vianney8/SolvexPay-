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
                    Voir tout <ArrowRight className="h-3.5 w-3.5" />
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
                  <div className="space-y-2">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors" data-testid={`transaction-item-${tx.id}`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tx.type === "deposit" ? "bg-emerald-500/10" : tx.type === "transfer" ? "bg-violet-500/10" : "bg-orange-500/10"
                        }`}>
                          {tx.type === "deposit" ? (
                            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                          ) : tx.type === "transfer" ? (
                            <ArrowLeftRight className="h-4 w-4 text-violet-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-orange-600" />
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
                          <p className={`font-bold text-sm ${tx.type === "deposit" ? "text-emerald-600" : "text-foreground"}`}>
                            {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount)} XOF
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-xs mt-0.5 ${tx.status === "completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : tx.status === "pending" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}
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
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <ArrowLeftRight className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Transfert d'argent</h3>
                    <p className="text-xs text-muted-foreground">Envoi rapide et sécurisé</p>
                  </div>
                </div>
                <Link href="/transfer">
                  <Button variant="outline" className="w-full text-sm font-semibold border-violet-500/20 text-violet-600 hover:bg-violet-500/5" data-testid="button-transfer">
                    Transférer maintenant <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                    <Link2 className="h-4 w-4 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Liens de paiement</h3>
                    <p className="text-xs text-muted-foreground">{stats?.paymentLinksCount || 0} lien(s) actif(s)</p>
                  </div>
                </div>
                <Link href="/payment-links">
                  <Button variant="outline" className="w-full text-sm font-semibold border-pink-500/20 text-pink-600 hover:bg-pink-500/5" data-testid="button-goto-payment-links">
                    Créer un lien <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-bold">Volume des flux</p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><ArrowDownLeft className="h-3 w-3 text-emerald-500" />Dépôts</span>
                      <span className="font-bold">{depositTx.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700" style={{ width: `${transactions && transactions.length > 0 ? (depositTx.length / transactions.length) * 100 : 0}%` }} data-testid="bar-deposits" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><ArrowUpRight className="h-3 w-3 text-orange-500" />Retraits</span>
                      <span className="font-bold">{withdrawalTx.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700" style={{ width: `${transactions && transactions.length > 0 ? (withdrawalTx.length / transactions.length) * 100 : 0}%` }} data-testid="bar-withdrawals" />
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3 text-amber-500" />En attente</span>
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

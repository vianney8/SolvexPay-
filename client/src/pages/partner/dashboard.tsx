import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Activity, 
  TrendingUp, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Zap,
  LayoutDashboard,
  Key,
  Globe
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

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletType>({ queryKey: ["/api/partner/wallet"] });
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({ queryKey: ["/api/partner/transactions"] });
  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/partner/stats"] });

  const recentTransactions = transactions?.slice(0, 5) || [];
  const companyName = (user as any)?.profile?.companyName || user?.email;

  const completed = transactions?.filter(t => t.status === "completed") || [];
  const pending = transactions?.filter(t => t.status === "pending") || [];
  
  const totalVolume = completed.reduce((s, t) => s + parseFloat(t.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Tableau de bord</p>
          <h2 className="text-2xl font-black text-foreground leading-none mt-1 uppercase" data-testid="text-greeting">
            {companyName}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black shadow-sm border border-primary/20">
          <Zap className="h-3.5 w-3.5" />
          Partenaire Direct
        </div>
      </div>

      <div
        className="relative rounded-3xl p-8 text-white overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, hsl(262 83% 52%) 0%, hsl(280 70% 60%) 50%, hsl(262 60% 45%) 100%)" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Solde du portefeuille</p>
              {walletLoading ? (
                <Skeleton className="h-12 w-56 bg-white/20 rounded-xl" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black tracking-tighter" data-testid="text-balance-xof">
                    {formatCurrency(wallet?.balanceXOF || 0)}
                  </span>
                  <span className="text-white/70 text-lg font-bold">XOF</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Link href="/partner/transactions">
                <Button className="bg-white text-primary hover:bg-white/90 font-black h-11 px-6 rounded-xl shadow-lg shadow-black/10">
                  Transactions
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-sm">
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Volume Total</p>
              <p className="text-xl font-black">{formatCurrency(totalVolume)}</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-sm">
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Succès</p>
              <p className="text-xl font-black">
                {transactions && transactions.length > 0 ? Math.round((completed.length / transactions.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base font-black uppercase tracking-tight">Transactions Récentes</CardTitle>
              </div>
              <Link href="/partner/transactions">
                <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary font-bold text-xs">
                  Voir tout <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              {transactionsLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                    </div>
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="font-bold text-muted-foreground">Aucune transaction</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.status === "completed" ? "bg-emerald-500/10" : tx.status === "pending" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                        {tx.status === "completed" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : tx.status === "pending" ? <Clock className="h-4 w-4 text-amber-600" /> : <ArrowUpRight className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {tx.description || "Paiement API"}
                          <span className="ml-2 font-normal text-muted-foreground text-xs">{tx.provider}</span>
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{tx.createdAt && formatDate(tx.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-sm text-foreground">{formatCurrency(tx.amount)} XOF</p>
                        <Badge variant="outline" className={`text-[9px] font-black uppercase px-1.5 py-0 h-4 border-transparent ${tx.status === "completed" ? "bg-emerald-500/10 text-emerald-600" : tx.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}>
                          {tx.status === "completed" ? "Succès" : tx.status === "pending" ? "En cours" : "Échoué"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 gap-2">
              <Link href="/partner/api-keys">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-bold text-sm">Gérer les clés API</span>
                </Button>
              </Link>
              <Link href="/partner/countries">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-bold text-sm">Pays de paiement</span>
                </Button>
              </Link>
              <Link href="/partner/docs">
                <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-bold text-sm">Doc API Directe</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-black text-lg">Prêt à intégrer ?</p>
                <p className="text-xs text-muted-foreground mt-1">Utilisez l'API directe pour encaisser sans redirection.</p>
              </div>
              <Link href="/partner/docs">
                <Button className="w-full font-bold rounded-xl shadow-md">
                   Commencer l'intégration
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

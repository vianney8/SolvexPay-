import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users, ArrowDownUp, TrendingUp, Wallet, Shield, KeyRound, PenLine,
  AlertTriangle, CheckCircle2, Clock, XCircle, Search, RefreshCw,
  BarChart3, Banknote, Lock, Unlock, ChevronDown, ChevronUp,
  Globe, Settings, Percent, Eye, ArrowRight, CreditCard, Send,
  Activity, Star, ZapOff, Zap, TrendingDown, CalendarDays,
  BadgeCheck, UserX, Building2, Coins, FileText, ArrowUpDown,
} from "lucide-react";
import { Link } from "wouter";

function fmt(amount: number, currency = "XOF") {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + " " + currency;
}

function fmtDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function KycBadge({ status }: { status: string }) {
  if (status === "verified") return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs"><BadgeCheck className="h-3 w-3 mr-1" />Vérifié</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejeté</Badge>;
  return <Badge variant="outline" className="text-xs">Non démarré</Badge>;
}

function TxStatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">Complété</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">En attente</Badge>;
  if (status === "failed") return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs">Échoué</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  if (type === "deposit") return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">Dépôt</Badge>;
  if (type === "withdrawal") return <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 text-xs">Retrait</Badge>;
  if (type === "transfer") return <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 text-xs">Transfert</Badge>;
  return <Badge variant="outline" className="text-xs">{type}</Badge>;
}

const PERIOD_OPTIONS = [
  { value: "day", label: "24h" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "Ce mois" },
];

export default function AdminPage() {
  const { toast } = useToast();

  const [userSearch, setUserSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const [kycDialog, setKycDialog] = useState<{ open: boolean; userId: string; userName: string; current: string } | null>(null);
  const [kycAction, setKycAction] = useState<"verified" | "rejected">("verified");
  const [kycRejectionReason, setKycRejectionReason] = useState("");

  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; userName: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [balanceDialog, setBalanceDialog] = useState<{ open: boolean; userId: string; userName: string; currentBalance: number } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceMotif, setBalanceMotif] = useState("");

  const [feeDialog, setFeeDialog] = useState<{ open: boolean; userId: string; userName: string; current: string | null } | null>(null);
  const [customFee, setCustomFee] = useState("");

  const [txStatusDialog, setTxStatusDialog] = useState<{ open: boolean; txId: string; current: string } | null>(null);
  const [newTxStatus, setNewTxStatus] = useState("completed");

  const [pmFeeDialog, setPmFeeDialog] = useState<{ open: boolean; code: string; current: string } | null>(null);
  const [pmFeeValue, setPmFeeValue] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  const { data: periodStats, isLoading: periodStatsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats/period", statsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats/period?period=${statsPeriod}`, { credentials: "include" });
      return res.json();
    },
  });
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: allTx, isLoading: txLoading } = useQuery<any[]>({ queryKey: ["/api/admin/transactions"] });
  const { data: bigUsers, isLoading: bigUsersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/big-users"] });
  const { data: commissions, isLoading: commissionsLoading } = useQuery<any>({ queryKey: ["/api/admin/commissions"] });
  const { data: paymentMethods, isLoading: pmLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payment-methods"] });
  const { data: userTxData } = useQuery<any[]>({
    queryKey: ["/api/admin/users", expandedUserId, "transactions"],
    enabled: !!expandedUserId,
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${expandedUserId}/transactions`, { credentials: "include" });
      return res.json();
    },
  });

  const blockMutation = useMutation({
    mutationFn: (data: { userId: string; isBlocked: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/block`, { isBlocked: data.isBlocked }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Statut mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const kycMutation = useMutation({
    mutationFn: (data: { userId: string; kycStatus: string; rejectionReason?: string }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/kyc`, { kycStatus: data.kycStatus, rejectionReason: data.rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Statut KYC mis à jour" });
      setKycDialog(null);
      setKycRejectionReason("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const feeMutation = useMutation({
    mutationFn: (data: { userId: string; customFeeRate: string | null }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/fee`, { customFeeRate: data.customFeeRate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Commission mise à jour" });
      setFeeDialog(null);
      setCustomFee("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/password`, { password: data.password }),
    onSuccess: () => {
      toast({ title: "Mot de passe modifié" });
      setPasswordDialog(null);
      setNewPassword("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: (data: { userId: string; amount: number; motif: string }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/balance`, { amount: data.amount, motif: data.motif }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Solde ajusté" });
      setBalanceDialog(null);
      setBalanceAmount("");
      setBalanceMotif("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (data: { userId: string; isAdmin: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/toggle-admin`, { isAdmin: data.isAdmin }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Rôle mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const updateTxStatusMutation = useMutation({
    mutationFn: (data: { txId: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/transactions/${data.txId}/status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Statut mis à jour" });
      setTxStatusDialog(null);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const pmMutation = useMutation({
    mutationFn: (data: { code: string; isActive?: boolean; inMaintenance?: boolean; feeValue?: string }) =>
      apiRequest("PATCH", `/api/admin/payment-methods/${data.code}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      toast({ title: "Moyen de paiement mis à jour" });
      setPmFeeDialog(null);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const filteredUsers = (users || []).filter(u =>
    userSearch === "" ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTx = (allTx || []).filter(tx => {
    const matchSearch = txSearch === "" ||
      tx.reference?.toLowerCase().includes(txSearch.toLowerCase()) ||
      tx.phoneNumber?.includes(txSearch) ||
      tx.description?.toLowerCase().includes(txSearch.toLowerCase()) ||
      tx.userId?.includes(txSearch);
    const matchStatus = txStatusFilter === "all" || tx.status === txStatusFilter;
    const matchType = txTypeFilter === "all" || tx.type === txTypeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const pendingKyc = (users || []).filter(u => u.kycStatus === "pending");
  const blockedUsers = (users || []).filter(u => u.isBlocked);

  return (
    <DashboardLayout title="Administration" breadcrumbs={[{ label: "Administration" }]}>
      <div className="space-y-5">

        <div
          className="relative rounded-3xl p-5 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(0 80% 38%) 0%, hsl(14 90% 46%) 60%, hsl(30 85% 52%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="font-black text-lg leading-tight">Tableau de bord Admin</p>
                <p className="text-white/70 text-xs mt-0.5">SolvexPay — Gestion globale de la plateforme</p>
              </div>
            </div>
            <div className="hidden sm:grid grid-cols-3 gap-3 text-center flex-shrink-0">
              <div className="bg-white/10 rounded-xl px-3 py-2">
                <p className="text-white/60 text-xs">Marchands</p>
                <p className="font-black text-xl" data-testid="stat-users">{statsLoading ? "—" : stats?.userCount}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2">
                <p className="text-white/60 text-xs">KYC en attente</p>
                <p className="font-black text-xl text-amber-300">{usersLoading ? "—" : pendingKyc.length}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2">
                <p className="text-white/60 text-xs">Bloqués</p>
                <p className="font-black text-xl text-red-300">{usersLoading ? "—" : blockedUsers.length}</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs py-2" data-testid="tab-overview"><BarChart3 className="h-3.5 w-3.5" />Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="merchants" className="gap-1.5 text-xs py-2" data-testid="tab-merchants"><Users className="h-3.5 w-3.5" />Marchands</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1.5 text-xs py-2" data-testid="tab-transactions"><ArrowDownUp className="h-3.5 w-3.5" />Transactions</TabsTrigger>
            <TabsTrigger value="payment-methods" className="gap-1.5 text-xs py-2" data-testid="tab-payment-methods"><CreditCard className="h-3.5 w-3.5" />Moyens</TabsTrigger>
            <TabsTrigger value="commissions" className="gap-1.5 text-xs py-2" data-testid="tab-commissions"><Coins className="h-3.5 w-3.5" />Commissions</TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-1.5 text-xs py-2" data-testid="tab-withdrawals"><Send className="h-3.5 w-3.5" />Retraits</TabsTrigger>
            <TabsTrigger value="vip" className="gap-1.5 text-xs py-2" data-testid="tab-vip"><Star className="h-3.5 w-3.5" />VIP</TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════
              TAB 1: VUE D'ENSEMBLE
          ═══════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-5 mt-5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">Période :</p>
              <div className="flex gap-1.5">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatsPeriod(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statsPeriod === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    data-testid={`button-period-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Transactions", value: periodStats?.total, icon: ArrowDownUp, color: "text-violet-600", bg: "bg-violet-500/10" },
                { label: "Volume", value: periodStats ? fmt(periodStats.volume) : "—", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: "Taux de succès", value: periodStats ? `${periodStats.successRate}%` : "—", icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-500/10" },
                { label: "Frais collectés", value: periodStats ? fmt(periodStats.fees) : "—", icon: Coins, color: "text-amber-600", bg: "bg-amber-500/10" },
              ].map((item, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-4">
                    <div className={`h-9 w-9 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                      <item.icon className={`h-4.5 w-4.5 ${item.color}`} />
                    </div>
                    <p className="text-xl font-black text-foreground" data-testid={`stat-period-${item.label.toLowerCase().replace(/ /g, "-")}`}>
                      {periodStatsLoading ? <Skeleton className="h-7 w-16" /> : item.value ?? "0"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="border-border/60 lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ArrowDownUp className="h-4 w-4 text-primary" />Répartition des transactions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {periodStatsLoading ? <Skeleton className="h-24 w-full" /> : (
                    <>
                      {[
                        { label: "Dépôts", count: periodStats?.deposits?.count || 0, volume: periodStats?.deposits?.volume || 0, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Retraits", count: periodStats?.withdrawals?.count || 0, volume: periodStats?.withdrawals?.volume || 0, color: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
                        { label: "Transferts", count: periodStats?.transfers?.count || 0, volume: periodStats?.transfers?.volume || 0, color: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
                      ].map((item) => {
                        const total = (periodStats?.total || 0);
                        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-muted-foreground">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${item.text}`}>{item.count} tx</span>
                                <span className="text-xs text-muted-foreground">{fmt(item.volume)}</span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />Statuts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Complétées", value: periodStats?.completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                    { label: "En attente", value: periodStats?.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
                    { label: "Échouées", value: periodStats?.failed, icon: XCircle, color: "text-red-600", bg: "bg-red-500/10" },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl ${item.bg}`}>
                      <item.icon className={`h-4 w-4 ${item.color} flex-shrink-0`} />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className={`font-black text-lg leading-none ${item.color}`}>
                          {periodStatsLoading ? "—" : item.value ?? 0}
                        </p>
                      </div>
                    </div>
                  ))}

                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total marchands</span>
                      <span className="font-bold">{stats?.userCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Soldes totaux</span>
                      <span className="font-bold text-emerald-600">{fmt(stats?.totalWalletBalance || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {pendingKyc.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{pendingKyc.length} demande(s) KYC en attente</p>
                  </div>
                  <div className="space-y-2">
                    {pendingKyc.slice(0, 3).map(u => (
                      <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-500/10">
                        <p className="text-xs font-semibold">{u.firstName} {u.lastName} — {u.email}</p>
                        <button
                          onClick={() => { setKycDialog({ open: true, userId: u.id, userName: `${u.firstName} ${u.lastName}`, current: u.kycStatus }); setKycAction("verified"); }}
                          className="text-xs text-amber-700 dark:text-amber-400 font-bold hover:underline flex-shrink-0"
                        >
                          Traiter →
                        </button>
                      </div>
                    ))}
                    {pendingKyc.length > 3 && <p className="text-xs text-muted-foreground text-center">+ {pendingKyc.length - 3} autres dans l'onglet Marchands</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 2: MARCHANDS
          ═══════════════════════════════════════════ */}
          <TabsContent value="merchants" className="space-y-4 mt-5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email, prénom, nom..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-10 h-10 border-border/70"
                data-testid="input-search-users"
              />
            </div>

            {usersLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => {
                  const isExpanded = expandedUserId === user.id;
                  const balance = parseFloat(user.wallet?.balanceXOF || "0");
                  return (
                    <Card key={user.id} className={`border-border/60 overflow-hidden ${user.isBlocked ? "border-red-500/30 bg-red-500/3" : ""}`} data-testid={`card-user-${user.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${user.isBlocked ? "bg-red-500/15 text-red-600" : "bg-primary/10 text-primary"}`}>
                            {(user.firstName?.[0] || user.email?.[0] || "?").toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="font-bold text-sm" data-testid={`text-username-${user.id}`}>{user.firstName} {user.lastName}</p>
                              {user.isAdmin && <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>}
                              {user.isBlocked && <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-xs"><Lock className="h-3 w-3 mr-1" />Bloqué</Badge>}
                              <KycBadge status={user.kycStatus || "not_started"} />
                            </div>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">{user.phone || "Pas de téléphone"} · Inscrit {fmtDate(user.createdAt)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">Solde</p>
                            <p className="font-black text-base text-foreground" data-testid={`text-balance-${user.id}`}>{fmt(balance)}</p>
                            {user.customFeeRate && <p className="text-xs text-violet-600 font-semibold">Frais: {user.customFeeRate}%</p>}
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="flex gap-1.5 flex-wrap">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2"
                            onClick={() => { setKycDialog({ open: true, userId: user.id, userName: `${user.firstName} ${user.lastName}`, current: user.kycStatus }); setKycAction("verified"); }}
                            data-testid={`button-kyc-${user.id}`}
                          >
                            <BadgeCheck className="h-3 w-3" />KYC
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2"
                            onClick={() => { setFeeDialog({ open: true, userId: user.id, userName: `${user.firstName} ${user.lastName}`, current: user.customFeeRate || null }); setCustomFee(user.customFeeRate || ""); }}
                            data-testid={`button-fee-${user.id}`}
                          >
                            <Percent className="h-3 w-3" />Frais
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2"
                            onClick={() => { setPasswordDialog({ open: true, userId: user.id, userName: `${user.firstName} ${user.lastName}` }); setNewPassword(""); }}
                            data-testid={`button-change-password-${user.id}`}
                          >
                            <KeyRound className="h-3 w-3" />MDP
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2"
                            onClick={() => { setBalanceDialog({ open: true, userId: user.id, userName: `${user.firstName} ${user.lastName}`, currentBalance: balance }); setBalanceAmount(""); setBalanceMotif(""); }}
                            data-testid={`button-adjust-balance-${user.id}`}
                          >
                            <PenLine className="h-3 w-3" />Solde
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isBlocked ? "default" : "outline"}
                            className={`h-7 text-xs gap-1 px-2 ${user.isBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "border-red-500/40 text-red-600 hover:bg-red-500/5"}`}
                            onClick={() => blockMutation.mutate({ userId: user.id, isBlocked: !user.isBlocked })}
                            disabled={blockMutation.isPending}
                            data-testid={`button-block-${user.id}`}
                          >
                            {user.isBlocked ? <><Unlock className="h-3 w-3" />Débloquer</> : <><Lock className="h-3 w-3" />Bloquer</>}
                          </Button>
                          <Button
                            size="sm"
                            variant={user.isAdmin ? "destructive" : "outline"}
                            className="h-7 text-xs gap-1 px-2"
                            onClick={() => toggleAdminMutation.mutate({ userId: user.id, isAdmin: !user.isAdmin })}
                            disabled={toggleAdminMutation.isPending}
                            data-testid={`button-toggle-admin-${user.id}`}
                          >
                            <Shield className="h-3 w-3" />{user.isAdmin ? "Retirer admin" : "Admin"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 px-2 text-muted-foreground"
                            onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                            data-testid={`button-history-${user.id}`}
                          >
                            <FileText className="h-3 w-3" />Historique
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 rounded-xl border border-border/60 overflow-hidden">
                            <div className="bg-muted/40 px-3 py-2 flex items-center gap-2">
                              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-xs font-bold">Historique des transactions</p>
                            </div>
                            {!userTxData ? (
                              <div className="p-3 text-center text-xs text-muted-foreground">Chargement...</div>
                            ) : userTxData.length === 0 ? (
                              <div className="p-3 text-center text-xs text-muted-foreground">Aucune transaction</div>
                            ) : (
                              <div className="divide-y divide-border/40 max-h-48 overflow-y-auto">
                                {userTxData.slice(0, 10).map((tx: any) => (
                                  <div key={tx.id} className="flex items-center gap-2 px-3 py-2">
                                    <TypeBadge type={tx.type} />
                                    <TxStatusBadge status={tx.status} />
                                    <span className="text-xs font-semibold flex-1">{fmt(parseFloat(tx.amount))}</span>
                                    <span className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {user.kycStatus === "rejected" && user.kycRejectionReason && (
                          <div className="mt-3 p-2 rounded-lg bg-red-500/8 border border-red-500/20">
                            <p className="text-xs text-red-600 dark:text-red-400"><strong>Motif de rejet :</strong> {user.kycRejectionReason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">Aucun marchand trouvé</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 3: TRANSACTIONS
          ═══════════════════════════════════════════ */}
          <TabsContent value="transactions" className="space-y-4 mt-5">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Référence, téléphone, user ID..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="pl-10 h-10 border-border/70" data-testid="input-search-transactions" />
              </div>
              <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
                <SelectTrigger className="w-36 h-10" data-testid="select-tx-status-filter"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>
              <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                <SelectTrigger className="w-36 h-10" data-testid="select-tx-type-filter"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="deposit">Dépôt</SelectItem>
                  <SelectItem value="withdrawal">Retrait</SelectItem>
                  <SelectItem value="transfer">Transfert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground font-medium">{filteredTx.length} transaction(s)</div>

            {txLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : (
              <Card className="border-border/60 overflow-hidden">
                <CardContent className="p-0">
                  {filteredTx.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">Aucune transaction trouvée</div>
                  ) : filteredTx.map((tx, i) => (
                    <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${i > 0 ? "border-t border-border/40" : ""}`} data-testid={`row-tx-${tx.id}`}>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TypeBadge type={tx.type} />
                          <TxStatusBadge status={tx.status} />
                          <span className="text-xs font-mono text-muted-foreground truncate">{tx.reference}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-muted-foreground">{tx.phoneNumber || "—"}</span>
                          {tx.provider && <span className="text-xs text-muted-foreground">{tx.provider}</span>}
                          {tx.payerName && <span className="text-xs text-muted-foreground">Client: {tx.payerName}</span>}
                          <span className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</span>
                        </div>
                        {tx.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{tx.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-black text-sm">{fmt(parseFloat(tx.amount))}</p>
                          {tx.fees && parseFloat(tx.fees) > 0 && <p className="text-xs text-muted-foreground">Frais: {fmt(parseFloat(tx.fees))}</p>}
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground p-0"
                          onClick={() => { setTxStatusDialog({ open: true, txId: tx.id, current: tx.status }); setNewTxStatus(tx.status); }}
                          data-testid={`button-edit-tx-${tx.id}`}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 4: MOYENS DE PAIEMENT
          ═══════════════════════════════════════════ */}
          <TabsContent value="payment-methods" className="space-y-4 mt-5">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Désactiver un moyen de paiement l'empêche d'être utilisé sur la plateforme. 
                Le mode <strong>Maintenance</strong> affiche un message aux marchands.
              </p>
            </div>

            {pmLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {(paymentMethods || []).map((pm: any) => (
                  <Card key={pm.code} className={`border-border/60 ${!pm.isActive ? "opacity-60" : ""} ${pm.inMaintenance ? "border-amber-500/30 bg-amber-500/5" : ""}`} data-testid={`card-pm-${pm.code}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-bold text-sm">{pm.name}</p>
                          <p className="text-xs text-muted-foreground">{(pm.countries || []).join(", ")}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {pm.inMaintenance && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs"><ZapOff className="h-3 w-3 mr-1" />Maintenance</Badge>}
                          {!pm.isActive && !pm.inMaintenance && <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-xs">Désactivé</Badge>}
                          {pm.isActive && !pm.inMaintenance && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">Actif</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pm.isActive}
                            onCheckedChange={(v) => pmMutation.mutate({ code: pm.code, isActive: v })}
                            disabled={pmMutation.isPending}
                            data-testid={`switch-pm-active-${pm.code}`}
                          />
                          <span className="text-xs text-muted-foreground">{pm.isActive ? "Actif" : "Inactif"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={pm.inMaintenance}
                            onCheckedChange={(v) => pmMutation.mutate({ code: pm.code, inMaintenance: v })}
                            disabled={pmMutation.isPending}
                            data-testid={`switch-pm-maintenance-${pm.code}`}
                          />
                          <span className="text-xs text-muted-foreground">Maintenance</span>
                        </div>
                        <button
                          className="text-xs text-primary hover:underline font-semibold ml-auto flex items-center gap-1"
                          onClick={() => { setPmFeeDialog({ open: true, code: pm.code, current: pm.feeValue }); setPmFeeValue(pm.feeValue); }}
                          data-testid={`button-pm-fee-${pm.code}`}
                        >
                          <Percent className="h-3 w-3" />{pm.feeValue}%
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 5: COMMISSIONS & REVENUS
          ═══════════════════════════════════════════ */}
          <TabsContent value="commissions" className="space-y-4 mt-5">
            <div
              className="relative rounded-2xl p-5 text-white overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(142 71% 30%) 0%, hsl(162 60% 38%) 100%)" }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Revenus plateforme totaux</p>
                <p className="text-3xl font-black" data-testid="text-total-fees">
                  {commissionsLoading ? "—" : fmt(commissions?.totalFees || 0)}
                </p>
                <p className="text-white/60 text-xs mt-1">Frais encaissés depuis le début</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />Ce mois-ci</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Volume traité</span>
                    <span className="font-bold text-sm" data-testid="text-month-volume">{commissionsLoading ? "—" : fmt(commissions?.monthVolume || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Frais collectés</span>
                    <span className="font-bold text-sm text-emerald-600" data-testid="text-month-fees">{commissionsLoading ? "—" : fmt(commissions?.monthFees || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Mois dernier (frais)</span>
                    <span className="font-bold text-sm">{commissionsLoading ? "—" : fmt(commissions?.lastMonthFees || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4 text-amber-600" />Répartition estimée</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Frais totaux collectés</span>
                    <span className="font-bold text-sm">{commissionsLoading ? "—" : fmt(commissions?.totalFees || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Coût OmniPay estimé (2%)</span>
                    <span className="font-bold text-sm text-red-500">- {commissionsLoading ? "—" : fmt(commissions?.estimatedOmniPayCut || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-xs font-bold">Revenu net SolvexPay</span>
                    <span className="font-black text-base text-emerald-600" data-testid="text-net-revenue">{commissionsLoading ? "—" : fmt(Math.max(0, commissions?.estimatedNetRevenue || 0))}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Statistiques globales</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Volume total traité", value: fmt(commissions?.totalVolume || 0), icon: ArrowDownUp, color: "text-violet-600", bg: "bg-violet-500/10" },
                  { label: "Transactions réussies", value: commissions?.completedTxCount ?? "—", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                  { label: "Taux de frais moyen", value: commissions?.totalVolume > 0 ? `${((commissions.totalFees / commissions.totalVolume) * 100).toFixed(2)}%` : "—", icon: Percent, color: "text-amber-600", bg: "bg-amber-500/10" },
                ].map((item, i) => (
                  <div key={i} className={`rounded-xl ${item.bg} p-4`}>
                    <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
                    <p className={`text-xl font-black ${item.color}`}>{commissionsLoading ? "—" : item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 6: RETRAITS & RÈGLEMENTS
          ═══════════════════════════════════════════ */}
          <TabsContent value="withdrawals" className="space-y-4 mt-5">
            {(() => {
              const pendingWithdrawals = (allTx || []).filter(tx => tx.type === "withdrawal" && tx.status === "pending");
              const completedWithdrawals = (allTx || []).filter(tx => tx.type === "withdrawal" && tx.status === "completed");
              const failedWithdrawals = (allTx || []).filter(tx => tx.type === "withdrawal" && tx.status === "failed");
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "En attente", value: pendingWithdrawals.length, color: "text-amber-600", bg: "bg-amber-500/10", icon: Clock },
                      { label: "Validés", value: completedWithdrawals.length, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 },
                      { label: "Rejetés", value: failedWithdrawals.length, color: "text-red-600", bg: "bg-red-500/10", icon: XCircle },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-2xl ${item.bg} p-4`}>
                        <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
                        <p className={`text-2xl font-black ${item.color}`}>{txLoading ? "—" : item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {pendingWithdrawals.length > 0 && (
                    <div>
                      <p className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        Retraits en attente ({pendingWithdrawals.length})
                      </p>
                      <Card className="border-amber-500/30 overflow-hidden">
                        <CardContent className="p-0">
                          {pendingWithdrawals.map((tx: any, i: number) => (
                            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 ${i > 0 ? "border-t border-border/40" : ""}`} data-testid={`row-withdrawal-${tx.id}`}>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm">{fmt(parseFloat(tx.amount))}</p>
                                <p className="text-xs text-muted-foreground">{tx.phoneNumber} · {tx.provider || "—"} · {fmtDate(tx.createdAt)}</p>
                                {tx.description && <p className="text-xs text-muted-foreground truncate">{tx.description}</p>}
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => updateTxStatusMutation.mutate({ txId: tx.id, status: "completed" })}
                                  disabled={updateTxStatusMutation.isPending}
                                  data-testid={`button-approve-withdrawal-${tx.id}`}
                                >
                                  <CheckCircle2 className="h-3 w-3" />Valider
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-500/40 text-red-600 hover:bg-red-500/5"
                                  onClick={() => updateTxStatusMutation.mutate({ txId: tx.id, status: "failed" })}
                                  disabled={updateTxStatusMutation.isPending}
                                  data-testid={`button-reject-withdrawal-${tx.id}`}
                                >
                                  <XCircle className="h-3 w-3" />Rejeter
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {pendingWithdrawals.length === 0 && (
                    <Card className="border-border/60 border-dashed">
                      <CardContent className="py-12 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                        <p className="font-semibold text-sm">Aucun retrait en attente</p>
                        <p className="text-xs text-muted-foreground mt-1">Tous les retraits ont été traités</p>
                      </CardContent>
                    </Card>
                  )}

                  {completedWithdrawals.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Derniers retraits validés</p>
                      <Card className="border-border/60 overflow-hidden">
                        <CardContent className="p-0">
                          {completedWithdrawals.slice(0, 5).map((tx: any, i: number) => (
                            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border/40" : ""}`}>
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">{fmt(parseFloat(tx.amount))}</p>
                                <p className="text-xs text-muted-foreground">{tx.phoneNumber} · {fmtDate(tx.createdAt)}</p>
                              </div>
                              <TxStatusBadge status={tx.status} />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>

          {/* ═══════════════════════════════════════════
              TAB 7: UTILISATEURS VIP
          ═══════════════════════════════════════════ */}
          <TabsContent value="vip" className="space-y-4 mt-5">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <Star className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Marchands triés par <strong>solde décroissant</strong>. Inclut aussi les marchands avec un fort volume de transactions en 24h.
              </p>
            </div>

            {bigUsersLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {(bigUsers || []).slice(0, 20).map((u: any, i: number) => {
                  const balance = parseFloat(u.wallet?.balanceXOF || "0");
                  const isHighActivity = u.last24hCount >= 5 || u.last24hVolume >= 100000;
                  return (
                    <Card key={u.id} className={`border-border/60 overflow-hidden ${isHighActivity ? "border-amber-500/40" : ""}`} data-testid={`card-vip-${u.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${i < 3 ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                            #{i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm">{u.firstName} {u.lastName}</p>
                              <KycBadge status={u.kycStatus || "not_started"} />
                              {isHighActivity && <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs"><Zap className="h-3 w-3 mr-1" />Activité élevée</Badge>}
                              {u.isBlocked && <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-xs"><Lock className="h-3 w-3 mr-1" />Bloqué</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">{u.txCount} transactions</span>
                              <span className="text-xs text-muted-foreground">Volume total: {fmt(u.totalVolume)}</span>
                              {u.last24hCount > 0 && <span className="text-xs text-amber-600 font-semibold">{u.last24hCount} tx en 24h ({fmt(u.last24hVolume)})</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">Solde</p>
                            <p className={`font-black text-base ${balance >= 100000 ? "text-emerald-600" : "text-foreground"}`}>{fmt(balance)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {(bigUsers || []).length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">Aucun utilisateur</div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ KYC DIALOG ═══ */}
      <Dialog open={!!kycDialog} onOpenChange={(open) => { if (!open) setKycDialog(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-primary" />Mise à jour KYC</DialogTitle>
            <DialogDescription>Marchand : <strong>{kycDialog?.userName}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setKycAction("verified")}
                className={`p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${kycAction === "verified" ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-border/60 text-muted-foreground"}`}
                data-testid="button-kyc-approve"
              >
                <CheckCircle2 className="h-4 w-4 mx-auto mb-1" />Valider
              </button>
              <button
                onClick={() => setKycAction("rejected")}
                className={`p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${kycAction === "rejected" ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" : "border-border/60 text-muted-foreground"}`}
                data-testid="button-kyc-reject"
              >
                <XCircle className="h-4 w-4 mx-auto mb-1" />Rejeter
              </button>
            </div>
            {kycAction === "rejected" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif de rejet <span className="text-red-500">*</span></Label>
                <Textarea
                  value={kycRejectionReason}
                  onChange={e => setKycRejectionReason(e.target.value)}
                  placeholder="Expliquez la raison du rejet (document flou, document expiré, identité non concordante...)"
                  rows={3}
                  className="text-sm"
                  data-testid="textarea-kyc-rejection-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKycDialog(null)} className="h-10">Annuler</Button>
            <Button
              onClick={() => kycDialog && kycMutation.mutate({ userId: kycDialog.userId, kycStatus: kycAction, rejectionReason: kycAction === "rejected" ? kycRejectionReason : undefined })}
              disabled={kycMutation.isPending || (kycAction === "rejected" && !kycRejectionReason.trim())}
              className={`h-10 ${kycAction === "verified" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              data-testid="button-kyc-confirm"
            >
              {kycMutation.isPending ? "Enregistrement..." : kycAction === "verified" ? "Valider le KYC" : "Rejeter le KYC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ FEE DIALOG ═══ */}
      <Dialog open={!!feeDialog} onOpenChange={(open) => { if (!open) setFeeDialog(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Commission personnalisée</DialogTitle>
            <DialogDescription>Marchand : <strong>{feeDialog?.userName}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">Laissez vide pour utiliser les frais standards (5%/6%). Entrez une valeur pour définir un taux personnalisé.</p>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux de commission (%)</Label>
              <div className="relative">
                <Input type="number" min="0" max="20" step="0.1" value={customFee} onChange={e => setCustomFee(e.target.value)} placeholder="Ex: 3.5 (laisser vide = standard)" className="pr-8 h-11 border-border/70" data-testid="input-custom-fee" />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeeDialog(null)} className="h-10">Annuler</Button>
            {customFee && <Button variant="outline" onClick={() => feeDialog && feeMutation.mutate({ userId: feeDialog.userId, customFeeRate: null })} disabled={feeMutation.isPending} className="h-10 border-red-500/30 text-red-600">Réinitialiser</Button>}
            <Button onClick={() => feeDialog && feeMutation.mutate({ userId: feeDialog.userId, customFeeRate: customFee || null })} disabled={feeMutation.isPending} className="h-10" data-testid="button-confirm-fee">
              {feeMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PASSWORD DIALOG ═══ */}
      <Dialog open={!!passwordDialog} onOpenChange={(open) => { if (!open) setPasswordDialog(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />Modifier le mot de passe</DialogTitle>
            <DialogDescription>Marchand : <strong>{passwordDialog?.userName}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</Label>
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 caractères" className="h-11 border-border/70" data-testid="input-new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog(null)} className="h-10">Annuler</Button>
            <Button onClick={() => passwordDialog && changePasswordMutation.mutate({ userId: passwordDialog.userId, password: newPassword })} disabled={changePasswordMutation.isPending || newPassword.length < 6} className="h-10" data-testid="button-confirm-password">
              {changePasswordMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ BALANCE DIALOG ═══ */}
      <Dialog open={!!balanceDialog} onOpenChange={(open) => { if (!open) setBalanceDialog(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-primary" />Ajuster le solde</DialogTitle>
            <DialogDescription>
              {balanceDialog?.userName} — Solde actuel : <strong>{fmt(balanceDialog?.currentBalance || 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (+ crédit / − débit)</Label>
              <Input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="Ex: 5000 ou -2000" className="h-11 border-border/70" data-testid="input-balance-amount" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif <span className="text-red-500">*</span></Label>
              <Textarea value={balanceMotif} onChange={e => setBalanceMotif(e.target.value)} placeholder="Raison de l'ajustement..." rows={2} data-testid="input-balance-motif" />
            </div>
            {balanceAmount && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs">
                Nouveau solde estimé : <strong>{fmt((balanceDialog?.currentBalance || 0) + (parseFloat(balanceAmount) || 0))}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialog(null)} className="h-10">Annuler</Button>
            <Button onClick={() => balanceDialog && adjustBalanceMutation.mutate({ userId: balanceDialog.userId, amount: parseFloat(balanceAmount), motif: balanceMotif })} disabled={adjustBalanceMutation.isPending || !balanceAmount || !balanceMotif} className="h-10" data-testid="button-confirm-balance">
              {adjustBalanceMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ TX STATUS DIALOG ═══ */}
      <Dialog open={!!txStatusDialog} onOpenChange={(open) => { if (!open) setTxStatusDialog(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5 text-primary" />Modifier le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={newTxStatus} onValueChange={setNewTxStatus}>
              <SelectTrigger className="h-11" data-testid="select-new-tx-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="completed">Complété</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxStatusDialog(null)} className="h-10">Annuler</Button>
            <Button onClick={() => txStatusDialog && updateTxStatusMutation.mutate({ txId: txStatusDialog.txId, status: newTxStatus })} disabled={updateTxStatusMutation.isPending} className="h-10" data-testid="button-confirm-tx-status">
              {updateTxStatusMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PM FEE DIALOG ═══ */}
      <Dialog open={!!pmFeeDialog} onOpenChange={(open) => { if (!open) setPmFeeDialog(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Modifier les frais — {pmFeeDialog?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux (%)</Label>
              <div className="relative">
                <Input type="number" min="0" max="20" step="0.1" value={pmFeeValue} onChange={e => setPmFeeValue(e.target.value)} placeholder="5" className="pr-8 h-11 border-border/70" data-testid="input-pm-fee" />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPmFeeDialog(null)} className="h-10">Annuler</Button>
            <Button onClick={() => pmFeeDialog && pmMutation.mutate({ code: pmFeeDialog.code, feeValue: pmFeeValue })} disabled={pmMutation.isPending || !pmFeeValue} className="h-10" data-testid="button-confirm-pm-fee">
              {pmMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

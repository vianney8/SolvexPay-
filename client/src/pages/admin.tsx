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
  Globe, Percent, Eye, CreditCard, Send, Activity, Star, ZapOff,
  Zap, CalendarDays, BadgeCheck, UserX, Coins, FileText, ArrowUpDown,
  TrendingDown, Building2, Network, ArrowRightLeft, Plus, DollarSign,
  Layers, Settings2, MapPin, RotateCcw, Link2, Key, ExternalLink,
  Trash2, Smartphone,
} from "lucide-react";

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲" },
  { code: "COD", name: "RD Congo", flag: "🇨🇩" },
  { code: "COG", name: "Congo", flag: "🇨🇬" },
];

const TX_TYPES = ["deposit", "withdrawal", "transfer"];
const TX_TYPE_LABELS: Record<string, string> = { deposit: "Dépôt", withdrawal: "Retrait", transfer: "Transfert" };

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function KycChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    verified: { label: "Vérifié", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", Icon: BadgeCheck },
    pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", Icon: Clock },
    rejected: { label: "Rejeté", cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", Icon: XCircle },
    not_started: { label: "Non soumis", cls: "bg-slate-500/15 text-slate-500 border-slate-500/30", Icon: UserX },
  };
  const { label, cls, Icon } = map[status] || map.not_started;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

function TxChip({ status }: { status: string }) {
  if (status === "completed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Complété</span>;
  if (status === "pending") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">En attente</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">Échoué</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-slate-500/15 text-slate-500 border-slate-500/30">{status}</span>;
}

function TypeChip({ type }: { type: string }) {
  const map: Record<string, string> = {
    deposit: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    withdrawal: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    transfer: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${map[type] || "bg-slate-500/15 text-slate-500 border-slate-500/30"}`}>{TX_TYPE_LABELS[type] || type}</span>;
}

const PERIOD_OPTS = [{ v: "day", l: "24h" }, { v: "week", l: "7j" }, { v: "month", l: "Ce mois" }];

function WithdrawalModeCard() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<{ withdrawalMode: string }>({ queryKey: ["/api/admin/system-settings"] });
  const mutation = useMutation({
    mutationFn: (mode: string) => apiRequest("PATCH", "/api/admin/system-settings", { withdrawalMode: mode }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/system-settings"] }); toast({ title: "Mode de retrait mis à jour" }); },
    onError: () => toast({ title: "Erreur", variant: "destructive" }),
  });

  const isAuto = data?.withdrawalMode !== "manual";

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-orange-500" />
          Mode de traitement des retraits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border/60 p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-bold text-sm">{isLoading ? "Chargement..." : isAuto ? "Automatique (OmniPay)" : "Manuel (admin)"}</p>
              <p className="text-xs text-muted-foreground">{isAuto ? "Les retraits sont envoyés directement via OmniPay." : "Les retraits restent en attente, l'admin les traite manuellement."}</p>
            </div>
            <div className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isAuto ? "bg-emerald-500" : "bg-muted-foreground/30"} ${mutation.isPending ? "opacity-50 pointer-events-none" : ""}`}
              role="switch" aria-checked={isAuto} onClick={() => mutation.mutate(isAuto ? "manual" : "auto")} data-testid="toggle-withdrawal-mode">
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${isAuto ? "translate-x-5" : "translate-x-0"}`} />
            </div>
          </div>
          <div className={`rounded-lg px-3 py-2 text-xs font-semibold border ${isAuto ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"}`}>
            {isAuto ? "✓ Les retraits sont traités automatiquement en temps réel" : "⚠ Les retraits nécessitent une validation manuelle par l'admin"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { toast } = useToast();

  const [userSearch, setUserSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState("");
  const [txStatus, setTxStatus] = useState("all");
  const [txType, setTxType] = useState("all");
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [feeTypeTab, setFeeTypeTab] = useState("deposit");

  // Dialogs
  const [kycDialog, setKycDialog] = useState<{ userId: string; name: string; status: string } | null>(null);
  const [kycAction, setKycAction] = useState<"verified" | "rejected">("verified");
  const [kycReason, setKycReason] = useState("");
  const [pwdDialog, setPwdDialog] = useState<{ userId: string; name: string } | null>(null);
  const [pwd, setPwd] = useState("");
  const [balDialog, setBalDialog] = useState<{ userId: string; name: string; bal: number } | null>(null);
  const [balAmount, setBalAmount] = useState("");
  const [balMotif, setBalMotif] = useState("");
  const [depositDialog, setDepositDialog] = useState<{ userId: string; name: string } | null>(null);
  const [depositData, setDepositData] = useState({ amount: "", phone: "", operator: "", motif: "" });
  const [migrateDialog, setMigrateDialog] = useState(false);
  const [migrateData, setMigrateData] = useState({ fromUserId: "", toUserId: "", amount: "", motif: "" });
  const [feeEditDialog, setFeeEditDialog] = useState<{ id: string; feeRate: string; type: string; country: string } | null>(null);
  const [feeRate, setFeeRate] = useState("");
  const [resetStatsDialog, setResetStatsDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [linksSearch, setLinksSearch] = useState("");
  const [apiKeysSearch, setApiKeysSearch] = useState("");

  // Queries
  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  const { data: periodStats, isLoading: pLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats/period", statsPeriod],
    queryFn: () => fetch(`/api/admin/stats/period?period=${statsPeriod}`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: kycList, isLoading: kycLoading } = useQuery<any[]>({ queryKey: ["/api/admin/kyc"] });
  const { data: allTx, isLoading: txLoading } = useQuery<any[]>({ queryKey: ["/api/admin/transactions"] });
  const { data: wallets, isLoading: walletsLoading } = useQuery<any[]>({ queryKey: ["/api/admin/wallets"] });
  const { data: omnipayBalance, isLoading: omniLoading, refetch: refetchOmni } = useQuery<any>({
    queryKey: ["/api/admin/omnipay/balance"],
    retry: 1,
    staleTime: 30000,
  });
  const { data: paymentMethods, isLoading: pmLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payment-methods"] });
  const { data: feeConfigs, isLoading: feeLoading } = useQuery<any[]>({ queryKey: ["/api/admin/fee-configs"] });
  const { data: commissions, isLoading: comLoading } = useQuery<any>({ queryKey: ["/api/admin/commissions"] });
  const { data: userTxList } = useQuery<any[]>({
    queryKey: ["/api/admin/users", expandedUserId, "transactions"],
    enabled: !!expandedUserId,
    queryFn: () => fetch(`/api/admin/users/${expandedUserId}/transactions`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: allPaymentLinks, isLoading: plLoading } = useQuery<any[]>({ queryKey: ["/api/admin/payment-links"] });
  const { data: allApiKeys, isLoading: akLoading } = useQuery<any[]>({ queryKey: ["/api/admin/api-keys"] });

  // Mutations
  const blockM = useMutation({
    mutationFn: (d: { userId: string; isBlocked: boolean }) => apiRequest("PATCH", `/api/admin/users/${d.userId}/block`, { isBlocked: d.isBlocked }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Statut mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const kycM = useMutation({
    mutationFn: (d: { userId: string; kycStatus: string; rejectionReason?: string }) => apiRequest("PATCH", `/api/admin/users/${d.userId}/kyc`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      toast({ title: "KYC mis à jour" });
      setKycDialog(null); setKycReason("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const pwdM = useMutation({
    mutationFn: (d: { userId: string; password: string }) => apiRequest("PATCH", `/api/admin/users/${d.userId}/password`, { password: d.password }),
    onSuccess: () => { toast({ title: "Mot de passe modifié" }); setPwdDialog(null); setPwd(""); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const balM = useMutation({
    mutationFn: (d: { userId: string; amount: number; motif: string }) => apiRequest("PATCH", `/api/admin/users/${d.userId}/balance`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      toast({ title: "Solde ajusté" }); setBalDialog(null); setBalAmount(""); setBalMotif("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const depositM = useMutation({
    mutationFn: (d: { userId: string; amount: string; phoneNumber: string; operator: string; motif: string }) =>
      apiRequest("POST", `/api/admin/wallets/${d.userId}/deposit`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Dépôt effectué via OmniPay" }); setDepositDialog(null); setDepositData({ amount: "", phone: "", operator: "", motif: "" });
    },
    onError: (e: any) => toast({ title: "Erreur OmniPay", description: e?.message, variant: "destructive" }),
  });

  const migrateM = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/admin/wallets/migrate", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Migration effectuée" }); setMigrateDialog(false); setMigrateData({ fromUserId: "", toUserId: "", amount: "", motif: "" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const txStatusM = useMutation({
    mutationFn: (d: { txId: string; status: string }) => apiRequest("PATCH", `/api/admin/transactions/${d.txId}/status`, { status: d.status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] }); toast({ title: "Statut mis à jour" }); setTxEditDialog(null); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const pmM = useMutation({
    mutationFn: (d: { code: string; isActive?: boolean; inMaintenance?: boolean }) => apiRequest("PATCH", `/api/admin/payment-methods/${d.code}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); toast({ title: "Mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const feeM = useMutation({
    mutationFn: (d: { id: string; feeRate: string }) => apiRequest("PATCH", `/api/admin/fee-configs/${d.id}`, { feeRate: d.feeRate }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/fee-configs"] }); toast({ title: "Frais mis à jour" }); setFeeEditDialog(null); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleLinkM = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/payment-links/${d.id}/toggle`, { isActive: d.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-links"] }); toast({ title: "Lien de paiement mis à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleApiKeyM = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/api-keys/${d.id}/toggle`, { isActive: d.isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] }); toast({ title: "Clé API mise à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const resetStatsM = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/stats/reset", { confirm: "CONFIRMER_RESET" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      toast({ title: "Statistiques réinitialisées", description: "Toutes les transactions ont été supprimées" });
      setResetStatsDialog(false); setResetConfirmText("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const filteredUsers = (users || []).filter(u =>
    !userSearch || [u.email, u.firstName, u.lastName].join(" ").toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTx = (allTx || []).filter(tx => {
    const m = !txSearch || [tx.reference, tx.phoneNumber, tx.description].join(" ").toLowerCase().includes(txSearch.toLowerCase());
    return m && (txStatus === "all" || tx.status === txStatus) && (txType === "all" || tx.type === txType);
  });

  const pendingKyc = (kycList || []).filter((u: any) => u.kycStatus === "pending");
  const pendingWithdrawals = (allTx || []).filter(t => t.type === "withdrawal" && t.status === "pending");

  const feeByTypeCountry = (feeConfigs || []).filter((f: any) => f.type === feeTypeTab);
  const totalWalletBalance = (wallets || []).reduce((s: number, u: any) => s + parseFloat(u.wallet?.balanceXOF || "0"), 0);
  const filteredPaymentLinks = (allPaymentLinks || []).filter(l =>
    !linksSearch || [l.name, l.slug, l.user?.email, l.user?.firstName, l.user?.lastName].join(" ").toLowerCase().includes(linksSearch.toLowerCase())
  );
  const filteredApiKeys = (allApiKeys || []).filter(k =>
    !apiKeysSearch || [k.name, k.keyPrefix, k.websiteUrl, k.user?.email, k.user?.firstName, k.user?.lastName].join(" ").toLowerCase().includes(apiKeysSearch.toLowerCase())
  );
  const totalUsersCount = (users || []).length;

  return (
    <DashboardLayout title="Administration" breadcrumbs={[{ label: "Administration" }]}>
      <div className="space-y-5">

        {/* ═══ HEADER HERO ═══ */}
        <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0e7490 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #818cf8 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 40%)" }} />
          <div className="relative p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Shield className="h-7 w-7 text-cyan-300" />
                </div>
                <div>
                  <p className="font-black text-xl text-white leading-tight">Administration SolvexPay</p>
                  <p className="text-white/60 text-xs mt-0.5">Panneau de contrôle global de la plateforme</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                {[
                  { label: "Total utilisateurs", value: totalUsersCount || stats?.userCount, color: "text-cyan-300" },
                  { label: "KYC en attente", value: pendingKyc.length, color: "text-amber-300" },
                  { label: "Retraits pendants", value: pendingWithdrawals.length, color: "text-rose-300" },
                  { label: "Liens de paiement", value: (allPaymentLinks || []).length, color: "text-violet-300" },
                  { label: "Clés API", value: (allApiKeys || []).length, color: "text-emerald-300" },
                ].map((s, i) => (
                  <div key={i} className="text-center bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-2.5 border border-white/10">
                    <p className={`font-black text-2xl ${s.color}`} data-testid={`header-stat-${i}`}>{s.value ?? "—"}</p>
                    <p className="text-white/50 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full gap-1 p-1.5 bg-muted/60 rounded-2xl h-auto">
              {[
                { v: "overview", label: "Vue d'ensemble", Icon: BarChart3, badge: 0 },
                { v: "users", label: "Utilisateurs", Icon: Users, badge: 0 },
                { v: "kyc", label: "KYC", Icon: BadgeCheck, badge: pendingKyc.length },
                { v: "wallets", label: "Wallets & Solde", Icon: Wallet, badge: 0 },
                { v: "links-keys", label: "Liens & API", Icon: Link2, badge: 0 },
                { v: "fees", label: "Frais", Icon: Percent, badge: 0 },
                { v: "payments", label: "Moyens de paiement", Icon: CreditCard, badge: 0 },
                { v: "transactions", label: "Transactions", Icon: ArrowDownUp, badge: pendingWithdrawals.length },
                { v: "settings", label: "Paramètres", Icon: Settings2, badge: 0 },
              ].map(({ v, label, Icon, badge }) => (
                <TabsTrigger key={v} value={v} className="gap-1.5 text-xs py-2 px-3 rounded-xl whitespace-nowrap relative" data-testid={`tab-${v}`}>
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />{label}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ══════════════════════════════════════
              TAB 1 — VUE D'ENSEMBLE
          ══════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-5 mt-5">
            {/* Total users banner */}
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600/10 to-cyan-600/10 border border-indigo-500/20 p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground" data-testid="total-users-count">{totalUsersCount}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs inscrits sur la plateforme</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-muted-foreground">Période :</p>
              <div className="flex gap-1">
                {PERIOD_OPTS.map(o => (
                  <button key={o.v} onClick={() => setStatsPeriod(o.v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statsPeriod === o.v ? "bg-indigo-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    data-testid={`btn-period-${o.v}`}>{o.l}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Transactions", val: periodStats?.total, icon: ArrowDownUp, grad: "from-indigo-500 to-violet-600" },
                { label: "Volume", val: periodStats ? fmt(periodStats.volume) : "—", icon: TrendingUp, grad: "from-emerald-500 to-teal-600" },
                { label: "Succès", val: periodStats ? `${periodStats.successRate}%` : "—", icon: CheckCircle2, grad: "from-cyan-500 to-blue-600" },
                { label: "Frais", val: periodStats ? fmt(periodStats.fees) : "—", icon: Coins, grad: "from-amber-500 to-orange-600" },
              ].map((item, i) => (
                <Card key={i} className="border-0 overflow-hidden shadow-sm" data-testid={`overview-card-${i}`}>
                  <CardContent className="p-0">
                    <div className={`h-1.5 bg-gradient-to-r ${item.grad}`} />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                        <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${item.grad} flex items-center justify-center`}>
                          <item.icon className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="text-xl font-black text-foreground">{pLoading ? <Skeleton className="h-7 w-20" /> : (item.val ?? 0)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-4">
              <Card className="lg:col-span-3 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Layers className="h-4 w-4 text-indigo-500" />Répartition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Dépôts", count: periodStats?.deposits?.count || 0, vol: periodStats?.deposits?.volume || 0, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Retraits", count: periodStats?.withdrawals?.count || 0, vol: periodStats?.withdrawals?.volume || 0, color: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
                    { label: "Transferts", count: periodStats?.transfers?.count || 0, vol: periodStats?.transfers?.volume || 0, color: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
                  ].map(item => {
                    const total = periodStats?.total || 0;
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold">{item.label}</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold ${item.text}`}>{item.count} tx</span>
                            <span className="text-xs text-muted-foreground">{fmt(item.vol)}</span>
                            <span className="text-xs font-bold w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" />Revenus plateforme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Frais ce mois", val: fmt(commissions?.monthFees || 0), color: "text-emerald-600" },
                    { label: "Frais mois dernier", val: fmt(commissions?.lastMonthFees || 0), color: "text-muted-foreground" },
                    { label: "Frais totaux", val: fmt(commissions?.totalFees || 0), color: "text-indigo-600" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-black ${item.color}`}>{comLoading ? "—" : item.val}</span>
                    </div>
                  ))}
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-muted-foreground">Revenu net estimé</p>
                    <p className="text-lg font-black text-amber-600">{comLoading ? "—" : fmt(Math.max(0, commissions?.estimatedNetRevenue || 0))}</p>
                    <p className="text-xs text-muted-foreground">après coût OmniPay ~2%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {pendingKyc.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{pendingKyc.length} demande(s) KYC en attente</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingKyc.slice(0, 4).map((u: any) => (
                      <div key={u.id} className="flex items-center gap-2 bg-amber-500/10 rounded-xl px-3 py-1.5">
                        <span className="text-xs font-semibold">{u.firstName} {u.lastName}</span>
                        <button onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus }); setKycAction("verified"); }}
                          className="text-xs text-amber-700 dark:text-amber-400 font-bold hover:underline">
                          Traiter →
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 2 — UTILISATEURS
          ══════════════════════════════════════ */}
          <TabsContent value="users" className="space-y-4 mt-5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Rechercher utilisateur..." className="pl-10 h-10" data-testid="input-search-users" />
            </div>

            {usersLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u: any) => {
                  const bal = parseFloat(u.wallet?.balanceXOF || "0");
                  const isExp = expandedUserId === u.id;
                  const initials = ((u.firstName?.[0] || "") + (u.lastName?.[0] || u.email?.[0] || "?")).toUpperCase();
                  return (
                    <Card key={u.id} className={`border-border/50 overflow-hidden ${u.isBlocked ? "border-red-500/30" : ""}`} data-testid={`card-user-${u.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${u.isBlocked ? "bg-red-500/20 text-red-600" : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"}`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-sm" data-testid={`text-user-name-${u.id}`}>{u.firstName} {u.lastName}</p>
                              <KycChip status={u.kycStatus || "not_started"} />
                              {u.isAdmin && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-rose-500/15 text-rose-600 border-rose-500/30"><Shield className="h-3 w-3" />Admin</span>}
                              {u.isBlocked && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-red-500/15 text-red-600 border-red-500/30"><Lock className="h-3 w-3" />Bloqué</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-muted-foreground">Solde</p>
                            <p className="font-black text-base" data-testid={`text-balance-${u.id}`}>{fmt(bal)}</p>
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-wrap mt-3">
                          <button onClick={() => { setPwdDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}` }); setPwd(""); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-xs font-semibold text-muted-foreground transition-colors"
                            data-testid={`btn-pwd-${u.id}`}><KeyRound className="h-3.5 w-3.5" />MDP</button>
                          <button onClick={() => { setBalDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, bal }); setBalAmount(""); setBalMotif(""); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors"
                            data-testid={`btn-bal-${u.id}`}><PenLine className="h-3.5 w-3.5" />Solde</button>
                          <button
                            onClick={() => blockM.mutate({ userId: u.id, isBlocked: !u.isBlocked })}
                            disabled={blockM.isPending}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${u.isBlocked ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15" : "bg-red-500/10 text-red-600 hover:bg-red-500/15"}`}
                            data-testid={`btn-block-${u.id}`}>
                            {u.isBlocked ? <><Unlock className="h-3.5 w-3.5" />Débloquer</> : <><Lock className="h-3.5 w-3.5" />Bloquer</>}
                          </button>
                          <button onClick={() => setExpandedUserId(isExp ? null : u.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 text-xs font-semibold text-indigo-700 dark:text-indigo-400 transition-colors"
                            data-testid={`btn-expand-${u.id}`}>
                            <FileText className="h-3.5 w-3.5" />Historique {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </div>

                        {isExp && (
                          <div className="mt-4 space-y-3">
                            {/* Réseau maintenance per user view */}
                            {(paymentMethods || []).length > 0 && (
                              <div className="rounded-2xl border border-border/50 overflow-hidden">
                                <div className="bg-muted/40 px-3 py-2 flex items-center gap-2">
                                  <Network className="h-3.5 w-3.5 text-cyan-600" />
                                  <p className="text-xs font-bold">Maintenance des réseaux</p>
                                </div>
                                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {(paymentMethods || []).map((pm: any) => (
                                    <div key={pm.code} className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border ${pm.inMaintenance ? "border-amber-500/30 bg-amber-500/8" : "border-border/40 bg-muted/30"}`}>
                                      <div>
                                        <p className="text-xs font-bold">{pm.name}</p>
                                        <p className="text-xs text-muted-foreground">{pm.inMaintenance ? "Maintenance" : "Actif"}</p>
                                      </div>
                                      <Switch
                                        checked={pm.inMaintenance}
                                        onCheckedChange={(v) => pmM.mutate({ code: pm.code, inMaintenance: v })}
                                        data-testid={`switch-network-maint-${pm.code}-${u.id}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Transaction history */}
                            <div className="rounded-2xl border border-border/50 overflow-hidden">
                              <div className="bg-muted/40 px-3 py-2 flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5 text-indigo-500" />
                                <p className="text-xs font-bold">Transactions récentes</p>
                              </div>
                              {!userTxList ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">Chargement...</div>
                              ) : userTxList.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">Aucune transaction</div>
                              ) : (
                                <div className="divide-y divide-border/30 max-h-52 overflow-y-auto">
                                  {userTxList.slice(0, 10).map((tx: any) => (
                                    <div key={tx.id} className="flex items-center gap-2 px-3 py-2">
                                      <TypeChip type={tx.type} />
                                      <TxChip status={tx.status} />
                                      <span className="text-xs font-bold flex-1">{fmt(parseFloat(tx.amount))}</span>
                                      <span className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {u.kycStatus === "rejected" && u.kycRejectionReason && (
                              <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                                <p className="text-xs text-red-600 dark:text-red-400"><strong>Motif de rejet KYC :</strong> {u.kycRejectionReason}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredUsers.length === 0 && <div className="text-center py-12 text-sm text-muted-foreground">Aucun utilisateur trouvé</div>}
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 3 — KYC
          ══════════════════════════════════════ */}
          <TabsContent value="kyc" className="space-y-4 mt-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "En attente", val: (kycList || []).filter((u: any) => u.kycStatus === "pending").length, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                { label: "Vérifiés", val: (kycList || []).filter((u: any) => u.kycStatus === "verified").length, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                { label: "Rejetés", val: (kycList || []).filter((u: any) => u.kycStatus === "rejected").length, color: "text-red-600", bg: "bg-red-500/10", border: "border-red-500/20" },
              ].map((s, i) => (
                <div key={i} className={`rounded-2xl ${s.bg} border ${s.border} p-4`}>
                  <p className={`text-2xl font-black ${s.color}`}>{kycLoading ? "—" : s.val}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {kycLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {(kycList || []).sort((a: any, b: any) => a.kycStatus === "pending" ? -1 : 1).map((u: any) => (
                  <Card key={u.id} className={`border-border/50 overflow-hidden ${u.kycStatus === "pending" ? "border-amber-500/40" : ""}`} data-testid={`card-kyc-${u.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${u.kycStatus === "pending" ? "bg-amber-500/15 text-amber-600" : u.kycStatus === "verified" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"}`}>
                          {(u.firstName?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-bold text-sm">{u.firstName} {u.lastName}</p>
                            <KycChip status={u.kycStatus} />
                          </div>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                          <p className="text-xs text-muted-foreground">Soumis : {fmtDate(u.updatedAt)}</p>
                          {u.kycFirstName && <p className="text-xs text-muted-foreground">Nom KYC : <strong>{u.kycFirstName} {u.kycLastName}</strong></p>}
                          {u.kycStatus === "rejected" && u.kycRejectionReason && (
                            <p className="text-xs text-red-500 mt-1"><strong>Motif :</strong> {u.kycRejectionReason}</p>
                          )}
                        </div>
                        {u.kycStatus === "pending" && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus }); setKycAction("verified"); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-colors" data-testid={`btn-kyc-approve-${u.id}`}>
                              <CheckCircle2 className="h-3.5 w-3.5" />Approuver
                            </button>
                            <button onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus }); setKycAction("rejected"); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/15 text-red-600 text-xs font-bold hover:bg-red-500/25 transition-colors" data-testid={`btn-kyc-reject-${u.id}`}>
                              <XCircle className="h-3.5 w-3.5" />Rejeter
                            </button>
                          </div>
                        )}
                      </div>

                      {/* KYC Photos */}
                      {(u.kycDocumentFront || u.kycDocumentBack || u.kycSelfie) && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {u.kycDocumentFront && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground font-medium text-center">Recto</p>
                              <a href={u.kycDocumentFront} target="_blank" rel="noreferrer">
                                <img src={u.kycDocumentFront} alt="Recto" className="w-full h-20 object-cover rounded-lg border border-border/60 hover:opacity-80 transition-opacity cursor-zoom-in" data-testid={`img-kyc-front-${u.id}`} />
                              </a>
                            </div>
                          )}
                          {u.kycDocumentBack && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground font-medium text-center">Verso</p>
                              <a href={u.kycDocumentBack} target="_blank" rel="noreferrer">
                                <img src={u.kycDocumentBack} alt="Verso" className="w-full h-20 object-cover rounded-lg border border-border/60 hover:opacity-80 transition-opacity cursor-zoom-in" data-testid={`img-kyc-back-${u.id}`} />
                              </a>
                            </div>
                          )}
                          {u.kycSelfie && (
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground font-medium text-center">Selfie</p>
                              <a href={u.kycSelfie} target="_blank" rel="noreferrer">
                                <img src={u.kycSelfie} alt="Selfie" className="w-full h-20 object-cover rounded-lg border border-border/60 hover:opacity-80 transition-opacity cursor-zoom-in" data-testid={`img-kyc-selfie-${u.id}`} />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(kycList || []).length === 0 && !kycLoading && (
                  <Card className="border-border/50 border-dashed">
                    <CardContent className="py-12 text-center">
                      <BadgeCheck className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                      <p className="font-semibold text-sm">Aucune demande KYC</p>
                      <p className="text-xs text-muted-foreground mt-1">Toutes les demandes ont été traitées</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 4 — WALLETS & SOLDE
          ══════════════════════════════════════ */}
          <TabsContent value="wallets" className="space-y-4 mt-5">
            {/* OmniPay Balance */}
            <Card className="border-0 overflow-hidden shadow-md">
              <CardContent className="p-0">
                <div className="p-5" style={{ background: "linear-gradient(135deg, #0c4a6e 0%, #0e7490 60%, #06b6d4 100%)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Solde OmniPay</p>
                        <p className="text-white font-black text-sm">Compte marchand global</p>
                      </div>
                    </div>
                    <button onClick={() => refetchOmni()} className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" data-testid="btn-refresh-omnipay">
                      <RefreshCw className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  {omniLoading ? (
                    <Skeleton className="h-8 w-48 bg-white/20" />
                  ) : omnipayBalance?.success !== 1 ? (
                    <p className="text-white/60 text-sm">Solde non disponible</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(omnipayBalance?.data || []).map((b: any, i: number) => (
                        <div key={i} className="bg-white/10 rounded-2xl px-3 py-2.5" data-testid={`omnipay-balance-${b.countryCode}`}>
                          <p className="text-white/60 text-xs">{b.countryName} ({b.currency})</p>
                          <p className="text-white font-black text-lg">{new Intl.NumberFormat("fr-FR").format(parseFloat(b.amount || "0"))}</p>
                          {b.pending && parseFloat(b.pending) > 0 && <p className="text-white/50 text-xs">En attente: {b.pending}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Summary + Actions */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/15 flex items-center justify-center"><Wallet className="h-4.5 w-4.5 text-indigo-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total wallets utilisateurs</p>
                      <p className="font-black text-lg text-indigo-600">{walletsLoading ? "—" : fmt(totalWalletBalance)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{(wallets || []).length} wallets actifs</p>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDepositDialog({ userId: "", name: "" })}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
                  data-testid="btn-admin-deposit">
                  <Plus className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Dépôt OmniPay</span>
                </button>
                <button onClick={() => setMigrateDialog(true)}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-colors"
                  data-testid="btn-admin-migrate">
                  <ArrowRightLeft className="h-5 w-5 text-violet-600" />
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-400">Migration</span>
                </button>
              </div>
            </div>

            {/* All Wallets */}
            {walletsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm font-bold">Tous les wallets utilisateurs</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/30 max-h-96 overflow-y-auto">
                    {[...(wallets || [])].sort((a: any, b: any) => parseFloat(b.wallet?.balanceXOF || "0") - parseFloat(a.wallet?.balanceXOF || "0")).map((u: any) => {
                      const bal = parseFloat(u.wallet?.balanceXOF || "0");
                      return (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors" data-testid={`row-wallet-${u.id}`}>
                          <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                            {((u.firstName?.[0] || "") + (u.lastName?.[0] || u.email?.[0] || "?")).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <p className={`font-black text-sm ${bal > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{fmt(bal)}</p>
                            <button
                              onClick={() => { setDepositDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}` }); setDepositData({ amount: "", phone: u.phone || "", operator: "", motif: "" }); }}
                              className="h-7 w-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                              data-testid={`btn-deposit-wallet-${u.id}`}
                            >
                              <Plus className="h-3.5 w-3.5 text-emerald-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 5 — LIENS & API
          ══════════════════════════════════════ */}
          <TabsContent value="links-keys" className="space-y-5 mt-5">

            {/* ── Payment Links ── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-violet-500" />
                    Liens de paiement
                    <Badge variant="secondary" className="text-xs">{(allPaymentLinks || []).length}</Badge>
                  </CardTitle>
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Rechercher…" value={linksSearch} onChange={e => setLinksSearch(e.target.value)} className="pl-8 h-8 text-xs rounded-xl" data-testid="input-links-search" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {plLoading ? (
                  <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
                ) : filteredPaymentLinks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Aucun lien de paiement</div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredPaymentLinks.map((link: any) => (
                      <div key={link.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors" data-testid={`payment-link-${link.id}`}>
                        <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${link.isActive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}>
                          <Link2 className={`h-4 w-4 ${link.isActive ? "text-emerald-600" : "text-rose-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{link.name || "Sans nom"}</p>
                            <Badge variant={link.isActive ? "default" : "destructive"} className="text-xs flex-shrink-0">
                              {link.isActive ? "Actif" : "Bloqué"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-xs text-muted-foreground font-mono">/pay/{link.slug}</p>
                            <a href={`/pay/${link.slug}`} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-600" data-testid={`link-open-${link.id}`}>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {link.user && <p className="text-xs text-muted-foreground">👤 {link.user.firstName} {link.user.lastName} — {link.user.email}</p>}
                            {link.amount && <p className="text-xs text-muted-foreground">💰 {parseInt(link.amount).toLocaleString()} FCFA</p>}
                            <p className="text-xs text-muted-foreground">🔁 {link.timesUsed || 0} utilisation(s)</p>
                            {link.description && <p className="text-xs text-muted-foreground italic truncate max-w-xs">"{link.description}"</p>}
                          </div>
                        </div>
                        <Switch
                          checked={!!link.isActive}
                          onCheckedChange={v => toggleLinkM.mutate({ id: link.id, isActive: v })}
                          data-testid={`toggle-link-${link.id}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── API Keys ── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-500" />
                    Clés API
                    <Badge variant="secondary" className="text-xs">{(allApiKeys || []).length}</Badge>
                  </CardTitle>
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Rechercher…" value={apiKeysSearch} onChange={e => setApiKeysSearch(e.target.value)} className="pl-8 h-8 text-xs rounded-xl" data-testid="input-apikeys-search" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {akLoading ? (
                  <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
                ) : filteredApiKeys.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Aucune clé API</div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredApiKeys.map((key: any) => (
                      <div key={key.id} className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors" data-testid={`api-key-${key.id}`}>
                        <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${key.isActive ? "bg-amber-100 dark:bg-amber-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}>
                          <Key className={`h-4 w-4 ${key.isActive ? "text-amber-600" : "text-rose-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{key.name || "Clé sans nom"}</p>
                            <Badge variant={key.isActive ? "default" : "destructive"} className="text-xs flex-shrink-0">
                              {key.isActive ? "Active" : "Bloquée"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{key.keyPrefix}••••••••</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {key.user && <p className="text-xs text-muted-foreground">👤 {key.user.firstName} {key.user.lastName} — {key.user.email}</p>}
                            {key.websiteUrl && (
                              <p className="text-xs text-indigo-500 flex items-center gap-1">
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                <a href={key.websiteUrl} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-xs" data-testid={`key-website-${key.id}`}>{key.websiteUrl}</a>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">🌍 Env: <span className="font-semibold">{key.environment || "live"}</span></p>
                            <p className="text-xs text-muted-foreground">📅 {key.createdAt ? new Date(key.createdAt).toLocaleDateString("fr-FR") : "—"}</p>
                            {key.lastUsedAt && <p className="text-xs text-muted-foreground">🕐 Dernier usage: {new Date(key.lastUsedAt).toLocaleDateString("fr-FR")}</p>}
                          </div>
                        </div>
                        <Switch
                          checked={!!key.isActive}
                          onCheckedChange={v => toggleApiKeyM.mutate({ id: key.id, isActive: v })}
                          data-testid={`toggle-apikey-${key.id}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 6 — FRAIS
          ══════════════════════════════════════ */}
          <TabsContent value="fees" className="space-y-4 mt-5">
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
              <Percent className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Configuration des frais par type et par pays</p>
                <p className="text-xs text-muted-foreground mt-0.5">Les frais s'appliquent selon le type d'opération et le pays. BF et COG ont un taux de base plus élevé (6%).</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              {TX_TYPES.map(t => (
                <button key={t} onClick={() => setFeeTypeTab(t)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${feeTypeTab === t ? "bg-indigo-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  data-testid={`btn-fee-type-${t}`}>
                  {t === "deposit" && <Banknote className="h-4 w-4" />}
                  {t === "withdrawal" && <Send className="h-4 w-4" />}
                  {t === "transfer" && <ArrowRightLeft className="h-4 w-4" />}
                  {TX_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {feeLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-2">
                {feeByTypeCountry.map((fc: any) => {
                  const countryInfo = COUNTRIES.find(c => c.code === fc.country);
                  return (
                    <div key={fc.id} className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/50 hover:border-border/80 transition-colors bg-card" data-testid={`row-fee-${fc.id}`}>
                      <div className="text-xl flex-shrink-0">
                        {fc.country === "default" ? "🌍" : (countryInfo?.flag || "🏳️")}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">
                          {fc.country === "default" ? "Taux par défaut (tous pays)" : (countryInfo?.name || fc.country)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fc.country === "default" ? "Appliqué si aucun taux spécifique au pays" : `Code: ${fc.country}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-lg font-black ${parseFloat(fc.feeRate) > 5 ? "text-orange-600" : "text-indigo-600"}`}>{fc.feeRate}%</p>
                          {fc.minAmount && parseFloat(fc.minAmount) > 0 && <p className="text-xs text-muted-foreground">min {fmt(parseFloat(fc.minAmount))}</p>}
                        </div>
                        <button
                          onClick={() => { setFeeEditDialog({ id: fc.id, feeRate: fc.feeRate, type: fc.type, country: fc.country }); setFeeRate(fc.feeRate); }}
                          className="h-8 w-8 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center transition-colors"
                          data-testid={`btn-edit-fee-${fc.id}`}
                        >
                          <PenLine className="h-3.5 w-3.5 text-indigo-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {feeByTypeCountry.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">Chargement des configurations...</div>}
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 6 — MOYENS DE PAIEMENT
          ══════════════════════════════════════ */}
          <TabsContent value="payments" className="space-y-4 mt-5">
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">Désactiver un réseau l'empêche complètement d'être utilisé. Le mode <strong>Maintenance</strong> affiche un message aux utilisateurs.</p>
            </div>

            {pmLoading ? (
              <div className="grid sm:grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {(paymentMethods || []).map((pm: any) => (
                  <Card key={pm.code} className={`border-border/50 overflow-hidden ${pm.inMaintenance ? "border-amber-500/30" : !pm.isActive ? "border-red-500/20 opacity-70" : ""}`} data-testid={`card-pm-${pm.code}`}>
                    <CardContent className="p-0">
                      <div className={`h-1 ${pm.inMaintenance ? "bg-amber-500" : pm.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div>
                            <p className="font-bold text-sm">{pm.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{(pm.countries || []).join(" · ")}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {pm.inMaintenance && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-xs font-semibold"><ZapOff className="h-2.5 w-2.5" />Maintenance</span>}
                            {!pm.isActive && !pm.inMaintenance && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 border border-red-500/30 text-xs font-semibold">Désactivé</span>}
                            {pm.isActive && !pm.inMaintenance && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-semibold"><Zap className="h-2.5 w-2.5" />Actif</span>}
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch checked={pm.isActive} onCheckedChange={(v) => pmM.mutate({ code: pm.code, isActive: v })} disabled={pmM.isPending} data-testid={`switch-active-${pm.code}`} />
                              <span className="text-xs text-muted-foreground">{pm.isActive ? "Activé" : "Désactivé"}</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-semibold">{pm.feeValue}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={pm.inMaintenance} onCheckedChange={(v) => pmM.mutate({ code: pm.code, inMaintenance: v })} disabled={pmM.isPending} data-testid={`switch-maintenance-${pm.code}`} />
                            <span className="text-xs text-muted-foreground">Mode maintenance</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 7 — TRANSACTIONS
          ══════════════════════════════════════ */}
          <TabsContent value="transactions" className="space-y-4 mt-5">
            {pendingWithdrawals.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5 overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-amber-500/10 px-4 py-2.5 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{pendingWithdrawals.length} retrait(s) en attente de validation</p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {pendingWithdrawals.map((tx: any) => (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3" data-testid={`row-pending-withdrawal-${tx.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{fmt(parseFloat(tx.amount))}</p>
                          <p className="text-xs text-muted-foreground">{tx.phoneNumber} · {tx.provider || "—"} · {fmtDate(tx.createdAt)}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => txStatusM.mutate({ txId: tx.id, status: "completed" })} disabled={txStatusM.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-colors"
                            data-testid={`btn-validate-withdrawal-${tx.id}`}>
                            <CheckCircle2 className="h-3.5 w-3.5" />Valider
                          </button>
                          <button onClick={() => txStatusM.mutate({ txId: tx.id, status: "failed" })} disabled={txStatusM.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/15 text-red-600 text-xs font-bold hover:bg-red-500/25 transition-colors"
                            data-testid={`btn-reject-withdrawal-${tx.id}`}>
                            <XCircle className="h-3.5 w-3.5" />Rejeter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Référence, téléphone..." className="pl-10 h-10" data-testid="input-search-tx" />
              </div>
              <Select value={txStatus} onValueChange={setTxStatus}>
                <SelectTrigger className="w-36 h-10" data-testid="select-tx-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>
              <Select value={txType} onValueChange={setTxType}>
                <SelectTrigger className="w-36 h-10" data-testid="select-tx-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="deposit">Dépôts</SelectItem>
                  <SelectItem value="withdrawal">Retraits</SelectItem>
                  <SelectItem value="transfer">Transferts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground font-medium">{filteredTx.length} transaction(s)</p>

            {txLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  {filteredTx.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">Aucune transaction</div>
                  ) : filteredTx.map((tx: any, i: number) => (
                    <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${i > 0 ? "border-t border-border/30" : ""}`} data-testid={`row-tx-${tx.id}`}>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TypeChip type={tx.type} />
                          <TxChip status={tx.status} />
                          <span className="text-xs font-mono text-muted-foreground">{tx.reference}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          {tx.phoneNumber && <span className="text-xs text-muted-foreground">{tx.phoneNumber}</span>}
                          {tx.provider && <span className="text-xs text-muted-foreground">{tx.provider}</span>}
                          <span className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black">{fmt(parseFloat(tx.amount))}</p>
                          {tx.fees && parseFloat(tx.fees) > 0 && <p className="text-xs text-muted-foreground">Frais: {fmt(parseFloat(tx.fees))}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 9 — PARAMÈTRES ADMIN
          ══════════════════════════════════════ */}
          <TabsContent value="settings" className="space-y-5 mt-5">
            <WithdrawalModeCard />
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-rose-500" />
                  Zone dangereuse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-rose-700 dark:text-rose-300">Réinitialiser toutes les statistiques</p>
                      <p className="text-xs text-rose-600/80 dark:text-rose-400/80">
                        Supprime toutes les transactions de la plateforme. Les soldes des utilisateurs ne sont pas affectés. Cette action est irréversible.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" className="gap-2 rounded-xl flex-shrink-0" onClick={() => setResetStatsDialog(true)} data-testid="btn-reset-stats">
                      <RotateCcw className="h-3.5 w-3.5" />Réinitialiser
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ════ KYC DIALOG ════ */}
      <Dialog open={!!kycDialog} onOpenChange={(o) => { if (!o) setKycDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-indigo-500" />Décision KYC</DialogTitle>
            <DialogDescription>Utilisateur : <strong>{kycDialog?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {(["verified", "rejected"] as const).map(action => (
                <button key={action} onClick={() => setKycAction(action)}
                  className={`p-3 rounded-2xl border-2 text-sm font-bold transition-all ${kycAction === action
                    ? action === "verified" ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                    : "border-border/60 text-muted-foreground hover:border-border"}`}
                  data-testid={`btn-kyc-action-${action}`}>
                  {action === "verified" ? <><CheckCircle2 className="h-4 w-4 mx-auto mb-1" />Approuver</> : <><XCircle className="h-4 w-4 mx-auto mb-1" />Rejeter</>}
                </button>
              ))}
            </div>
            {kycAction === "rejected" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif de rejet <span className="text-muted-foreground text-xs font-normal">(optionnel)</span></Label>
                <Textarea value={kycReason} onChange={e => setKycReason(e.target.value)} placeholder="Ex: Document flou, identité non concordante..." rows={3} data-testid="textarea-kyc-reason" />
                <p className="text-xs text-muted-foreground">Si vous renseignez un motif, l'utilisateur le verra dans ses paramètres.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKycDialog(null)} className="h-10">Annuler</Button>
            <Button
              onClick={() => kycDialog && kycM.mutate({ userId: kycDialog.userId, kycStatus: kycAction, rejectionReason: kycAction === "rejected" ? kycReason : undefined })}
              disabled={kycM.isPending}
              className={`h-10 ${kycAction === "verified" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              data-testid="btn-kyc-confirm">
              {kycM.isPending ? "Enregistrement..." : kycAction === "verified" ? "Approuver" : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ PASSWORD DIALOG ════ */}
      <Dialog open={!!pwdDialog} onOpenChange={(o) => { if (!o) setPwdDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-indigo-500" />Modifier le mot de passe</DialogTitle>
            <DialogDescription>{pwdDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</Label>
            <Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Min. 6 caractères" className="mt-2 h-11" data-testid="input-password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialog(null)} className="h-10">Annuler</Button>
            <Button onClick={() => pwdDialog && pwdM.mutate({ userId: pwdDialog.userId, password: pwd })} disabled={pwdM.isPending || pwd.length < 6} className="h-10" data-testid="btn-confirm-password">
              {pwdM.isPending ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ BALANCE DIALOG ════ */}
      <Dialog open={!!balDialog} onOpenChange={(o) => { if (!o) setBalDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-indigo-500" />Ajuster le solde</DialogTitle>
            <DialogDescription>{balDialog?.name} — Solde actuel : <strong>{fmt(balDialog?.bal || 0)}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (+crédit / −débit)</Label>
              <Input type="number" value={balAmount} onChange={e => setBalAmount(e.target.value)} placeholder="Ex: 5000 ou -2000" className="mt-2 h-11" data-testid="input-bal-amount" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif <span className="text-red-500">*</span></Label>
              <Textarea value={balMotif} onChange={e => setBalMotif(e.target.value)} placeholder="Raison de l'ajustement..." rows={2} className="mt-2" data-testid="input-bal-motif" />
            </div>
            {balAmount && <div className="rounded-xl bg-muted/50 p-3 text-xs">Nouveau solde : <strong>{fmt((balDialog?.bal || 0) + (parseFloat(balAmount) || 0))}</strong></div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalDialog(null)} className="h-10">Annuler</Button>
            <Button onClick={() => balDialog && balM.mutate({ userId: balDialog.userId, amount: parseFloat(balAmount), motif: balMotif })} disabled={balM.isPending || !balAmount || !balMotif} className="h-10" data-testid="btn-confirm-balance">
              {balM.isPending ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DEPOSIT DIALOG ════ */}
      <Dialog open={!!depositDialog} onOpenChange={(o) => { if (!o) setDepositDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" />Dépôt via OmniPay</DialogTitle>
            <DialogDescription>
              {depositDialog?.name ? `Wallet de ${depositDialog.name}` : "Sélectionner un wallet"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!depositDialog?.userId && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Utilisateur</Label>
                <Select value={depositDialog?.userId || ""} onValueChange={(v) => setDepositDialog(prev => prev ? { ...prev, userId: v, name: (wallets || []).find((u: any) => u.id === v)?.firstName || v } : prev)}>
                  <SelectTrigger className="mt-2 h-11" data-testid="select-deposit-user"><SelectValue placeholder="Choisir un utilisateur" /></SelectTrigger>
                  <SelectContent>
                    {(wallets || []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (XOF)</Label>
              <Input type="number" value={depositData.amount} onChange={e => setDepositData(p => ({ ...p, amount: e.target.value }))} placeholder="5000" className="mt-2 h-11" data-testid="input-deposit-amount" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</Label>
              <Input value={depositData.phone} onChange={e => setDepositData(p => ({ ...p, phone: e.target.value }))} placeholder="Ex: 22901234567" className="mt-2 h-11" data-testid="input-deposit-phone" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur</Label>
              <Select value={depositData.operator} onValueChange={(v) => setDepositData(p => ({ ...p, operator: v }))}>
                <SelectTrigger className="mt-2 h-11" data-testid="select-deposit-operator"><SelectValue placeholder="Choisir opérateur" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                  <SelectItem value="Orange">Orange Money</SelectItem>
                  <SelectItem value="Moov">Moov Money</SelectItem>
                  <SelectItem value="Wave">Wave</SelectItem>
                  <SelectItem value="TMoney">T-Money</SelectItem>
                  <SelectItem value="Airtel">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif</Label>
              <Input value={depositData.motif} onChange={e => setDepositData(p => ({ ...p, motif: e.target.value }))} placeholder="Alimentation wallet..." className="mt-2 h-11" data-testid="input-deposit-motif" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositDialog(null)} className="h-10">Annuler</Button>
            <Button
              onClick={() => depositDialog && depositM.mutate({ userId: depositDialog.userId, amount: depositData.amount, phoneNumber: depositData.phone, operator: depositData.operator, motif: depositData.motif })}
              disabled={depositM.isPending || !depositData.amount || !depositData.phone || !depositDialog?.userId}
              className="h-10 bg-emerald-600 hover:bg-emerald-700" data-testid="btn-confirm-deposit">
              {depositM.isPending ? "Dépôt en cours..." : "Effectuer le dépôt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ MIGRATE DIALOG ════ */}
      <Dialog open={migrateDialog} onOpenChange={setMigrateDialog}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-violet-500" />Migration de fonds</DialogTitle>
            <DialogDescription>Transférer des fonds entre wallets utilisateurs</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wallet source</Label>
              <Select value={migrateData.fromUserId} onValueChange={(v) => setMigrateData(p => ({ ...p, fromUserId: v }))}>
                <SelectTrigger className="mt-2 h-11" data-testid="select-migrate-from"><SelectValue placeholder="Wallet source" /></SelectTrigger>
                <SelectContent>
                  {(wallets || []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} — {fmt(parseFloat(u.wallet?.balanceXOF || "0"))}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-center"><ArrowRightLeft className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Wallet destination</Label>
              <Select value={migrateData.toUserId} onValueChange={(v) => setMigrateData(p => ({ ...p, toUserId: v }))}>
                <SelectTrigger className="mt-2 h-11" data-testid="select-migrate-to"><SelectValue placeholder="Wallet destination" /></SelectTrigger>
                <SelectContent>
                  {(wallets || []).filter((u: any) => u.id !== migrateData.fromUserId).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} — {fmt(parseFloat(u.wallet?.balanceXOF || "0"))}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (XOF)</Label>
              <Input type="number" value={migrateData.amount} onChange={e => setMigrateData(p => ({ ...p, amount: e.target.value }))} placeholder="Ex: 10000" className="mt-2 h-11" data-testid="input-migrate-amount" />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif</Label>
              <Input value={migrateData.motif} onChange={e => setMigrateData(p => ({ ...p, motif: e.target.value }))} placeholder="Raison..." className="mt-2 h-11" data-testid="input-migrate-motif" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrateDialog(false)} className="h-10">Annuler</Button>
            <Button
              onClick={() => migrateM.mutate(migrateData)}
              disabled={migrateM.isPending || !migrateData.fromUserId || !migrateData.toUserId || !migrateData.amount}
              className="h-10 bg-violet-600 hover:bg-violet-700" data-testid="btn-confirm-migrate">
              {migrateM.isPending ? "Migration..." : "Migrer les fonds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* ════ FEE EDIT DIALOG ════ */}
      <Dialog open={!!feeEditDialog} onOpenChange={(o) => { if (!o) setFeeEditDialog(null); }}>
        <DialogContent className="max-w-xs rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-indigo-500" />Modifier le taux</DialogTitle>
            <DialogDescription>
              {feeEditDialog?.type ? TX_TYPE_LABELS[feeEditDialog.type] : ""} — {feeEditDialog?.country === "default" ? "Taux par défaut" : COUNTRIES.find(c => c.code === feeEditDialog?.country)?.name || feeEditDialog?.country}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Taux de commission (%)</Label>
            <div className="relative mt-2">
              <Input type="number" min="0" max="20" step="0.1" value={feeRate} onChange={e => setFeeRate(e.target.value)} placeholder="5" className="pr-8 h-11" data-testid="input-fee-rate" />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeEditDialog(null)} className="h-10">Annuler</Button>
            <Button onClick={() => feeEditDialog && feeM.mutate({ id: feeEditDialog.id, feeRate })} disabled={feeM.isPending || !feeRate} className="h-10" data-testid="btn-confirm-fee">
              {feeM.isPending ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Stats Confirmation Dialog ── */}
      <Dialog open={resetStatsDialog} onOpenChange={o => { if (!o) { setResetStatsDialog(false); setResetConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />Réinitialiser toutes les statistiques
            </DialogTitle>
            <DialogDescription>
              Cette action va <strong>supprimer définitivement toutes les transactions</strong> de la plateforme. Les soldes des utilisateurs ne seront pas affectés. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 text-sm text-rose-700 dark:text-rose-300">
              ⚠️ Pour confirmer, tapez <strong>CONFIRMER</strong> dans le champ ci-dessous.
            </div>
            <Input
              placeholder="Tapez CONFIRMER pour valider"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              className="rounded-xl"
              data-testid="input-reset-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetStatsDialog(false); setResetConfirmText(""); }}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={resetConfirmText !== "CONFIRMER" || resetStatsM.isPending}
              onClick={() => resetStatsM.mutate()}
              data-testid="btn-confirm-reset"
            >
              {resetStatsM.isPending ? "Suppression…" : "Réinitialiser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

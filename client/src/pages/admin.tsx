import { useState, useEffect, useMemo } from "react";
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
  TrendingDown, Building2, ArrowRightLeft, Plus, DollarSign,
  Layers, Settings2, MapPin, RotateCcw, Link2, Key, ExternalLink,
  Trash2, Smartphone, Bell, X, BellOff, BellRing, HeadphonesIcon, Code2, User,
  ShieldCheck, Pencil, Loader2,
} from "lucide-react";

function KycImage({ src, alt, testId }: { src: string; alt: string; testId?: string }) {
  const [broken, setBroken] = useState(false);
  const [open, setOpen] = useState(false);

  if (broken) {
    return (
      <div className="w-full h-20 rounded-lg border border-border/60 bg-muted/50 flex flex-col items-center justify-center gap-1 text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-[9px] font-medium">Image indisponible</span>
      </div>
    );
  }
  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        onError={() => setBroken(true)}
        className="w-full h-20 object-cover rounded-lg border border-border/60 hover:opacity-80 transition-opacity cursor-zoom-in"
        data-testid={testId}
      />
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1.5 text-sm font-medium transition-colors"
              data-testid="btn-close-kyc-lightbox"
            >
              <X className="h-5 w-5" /> Fermer
            </button>
            <img
              src={src}
              alt={alt}
              className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            <p className="text-center text-white/60 text-xs mt-3">{alt}</p>
          </div>
        </div>
      )}
    </>
  );
}

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

const TX_TYPE_LABELS: Record<string, string> = { deposit: "Dépôt", withdrawal: "Retrait", transfer: "Transfert" };

function getTxSourceInfo(tx: any): { label: string; extra: string | null; colorKey: string } {
  const desc: string = tx.description || "";
  const type: string = tx.type || "";

  if (type === "transfer") return { label: "Transfert", extra: null, colorKey: "violet" };

  if (type === "withdrawal") {
    if (tx.provider === "admin") return { label: "Ajust. Admin", extra: null, colorKey: "slate" };
    return { label: "Retrait", extra: null, colorKey: "orange" };
  }

  if (type === "deposit") {
    if (tx.provider === "admin") return { label: "Ajust. Admin", extra: null, colorKey: "emerald" };
    if (tx.apiKeyId) {
      const m = desc.match(/^Activation compte (.+?) —/) || desc.match(/^Dépôt via API — (.+)/) || desc.match(/via API — (.+)/);
      return { label: "Dépôt API", extra: m ? m[1].trim() : null, colorKey: "indigo" };
    }
    if (desc.startsWith("Paiement via lien:")) {
      const linkName = desc.replace("Paiement via lien:", "").trim();
      return { label: "Dépôt Lien", extra: linkName || null, colorKey: "blue" };
    }
    return { label: "Dépôt", extra: null, colorKey: "sky" };
  }

  return { label: TX_TYPE_LABELS[type] || type, extra: null, colorKey: "slate" };
}

const COLOR_CLASSES: Record<string, { chip: string; badge: string }> = {
  violet:  { chip: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30", badge: "bg-violet-500/20 text-violet-700 dark:text-violet-300" },
  orange:  { chip: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30", badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  indigo:  { chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30", badge: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300" },
  blue:    { chip: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", badge: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  sky:     { chip: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30", badge: "bg-sky-500/20 text-sky-700 dark:text-sky-300" },
  emerald: { chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
  slate:   { chip: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30", badge: "bg-slate-500/20 text-slate-600 dark:text-slate-300" },
};

function TypeChip({ type, tx }: { type: string; tx?: any }) {
  if (!tx) {
    const map: Record<string, string> = {
      deposit: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      withdrawal: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
      transfer: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${map[type] || "bg-slate-500/15 text-slate-500 border-slate-500/30"}`}>{TX_TYPE_LABELS[type] || type}</span>;
  }

  const { label, extra, colorKey } = getTxSourceInfo(tx);
  const colors = COLOR_CLASSES[colorKey] || COLOR_CLASSES.slate;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${colors.chip}`}>{label}</span>
      {extra && <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium max-w-[120px] truncate ${colors.badge}`}>{extra}</span>}
    </span>
  );
}

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
  const [userSort, setUserSort] = useState<"default" | "balance_desc" | "balance_asc">("default");
  const [srFilter, setSrFilter] = useState(false);
  const [blockedFilter, setBlockedFilter] = useState(false);
  const [blockDialog, setBlockDialog] = useState<{ userId: string; name: string; isBlocked: boolean } | null>(null);
  const [toggleConfirmDialog, setToggleConfirmDialog] = useState<{ type: "link" | "key"; id: string; name: string; isCurrentlyActive: boolean } | null>(null);
  const [srConfirmDialog, setSrConfirmDialog] = useState<{ userId: string; name: string; enable: boolean } | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [txSearch, setTxSearch] = useState("");
  const [debouncedTxSearch, setDebouncedTxSearch] = useState("");
  const [txStatus, setTxStatus] = useState("all");
  const [txType, setTxType] = useState("all");
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("overview");
  // Dialogs
  const [kycDialog, setKycDialog] = useState<{ userId: string; name: string; status: string } | null>(null);
  const [kycAction, setKycAction] = useState<"verified" | "rejected" | "not_started" | null>(null);
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
  const [serviceFeeEdit, setServiceFeeEdit] = useState<{ deposit: string; withdrawal: string; transfer: string; api: string } | null>(null);
  const [pmFeeEdit, setPmFeeEdit] = useState<Record<string, { deposit: string; withdrawal: string; plink: string; api: string }>>({});
  const [pmCountryFeeEdit, setPmCountryFeeEdit] = useState<Record<string, { deposit: string; withdrawal: string; plink: string; api: string }>>({});
  const [expandedCountryFees, setExpandedCountryFees] = useState<Set<string>>(new Set());
  const [otpCodeEdit, setOtpCodeEdit] = useState<Record<string, string>>({});
  const [omnipayRateEdit, setOmnipayRateEdit] = useState<{ deposit: string; withdrawal: string } | null>(null);
  const [resetStatsDialog, setResetStatsDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [srAllDialog, setSrAllDialog] = useState(false);
  const [linksSearch, setLinksSearch] = useState("");
  const [apiKeysSearch, setApiKeysSearch] = useState("");
  const [wdDialog, setWdDialog] = useState(false);
  const [wdForm, setWdForm] = useState({ amount: "", phone: "", operator: "", recipientName: "", note: "" });
  const [notifForm, setNotifForm] = useState({ title: "", message: "", color: "blue", linkUrl: "", linkLabel: "" });
  const [editNotifDialog, setEditNotifDialog] = useState<{ id: string; title: string; message: string; color: string; linkUrl: string; linkLabel: string } | null>(null);
  const [supportLinksForm, setSupportLinksForm] = useState<Record<string, string> | null>(null);
  // Queries
  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/stats"], staleTime: 60000 });
  const { data: periodStats, isLoading: pLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats/period", statsPeriod],
    queryFn: () => fetch(`/api/admin/stats/period?period=${statsPeriod}`, { credentials: "include" }).then(r => r.json()),
    enabled: activeTab === "overview",
    staleTime: 60000,
  });
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const kycList = useMemo(() =>
    (users || [])
      .filter((u: any) => ["pending", "verified", "rejected"].includes(u.kycStatus))
      .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()),
    [users]
  );
  const kycLoading = usersLoading;
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTxSearch(txSearch), 400);
    return () => clearTimeout(t);
  }, [txSearch]);

  const { data: allTx, isLoading: txLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/transactions", debouncedTxSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "700" });
      if (debouncedTxSearch) params.set("search", debouncedTxSearch);
      const res = await fetch(`/api/admin/transactions?${params}`);
      if (!res.ok) throw new Error("Erreur serveur");
      return res.json();
    },
    enabled: activeTab === "transactions",
    staleTime: 30000,
  });
  const { data: wallets, isLoading: walletsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/wallets"],
    enabled: ["wallets", "liquidity"].includes(activeTab),
    staleTime: 120000,
  });
  const { data: omnipayBalance, isLoading: omniLoading, refetch: refetchOmni } = useQuery<any>({
    queryKey: ["/api/admin/omnipay/balance"],
    retry: 1,
    staleTime: 10000,
    refetchInterval: activeTab === "overview" ? 10000 : false,
  });
  const { data: liquidityData } = useQuery<{ walletsByCountry: any[]; pendingByCountry: any[] }>({
    queryKey: ["/api/admin/liquidity-analysis"],
    enabled: ["overview", "liquidity"].includes(activeTab),
    refetchInterval: ["overview", "liquidity"].includes(activeTab) ? 10000 : false,
    staleTime: 8000,
  });
  const { data: paymentMethods, isLoading: pmLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/payment-methods"],
    enabled: ["fees", "payments"].includes(activeTab),
    staleTime: 120000,
  });
  const { data: commissions, isLoading: comLoading, refetch: refetchCommissions } = useQuery<any>({
    queryKey: ["/api/admin/commissions"],
    enabled: activeTab === "benefices",
    staleTime: 120000,
  });
  const { data: systemSettings } = useQuery<{ withdrawalMode: string }>({ queryKey: ["/api/admin/system-settings"], staleTime: 60000 });
  const isAutoWithdrawal = systemSettings?.withdrawalMode !== "manual";
  const { data: profitTx, isLoading: profitTxLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/profit-transactions"],
    enabled: activeTab === "benefices",
    staleTime: 120000,
  });
  const { data: financialSummary, isLoading: finLoading } = useQuery<any>({
    queryKey: ["/api/admin/financial-summary"],
    enabled: ["overview", "benefices"].includes(activeTab),
    staleTime: 120000,
  });
  const { data: adminWdHistory, isLoading: wdHistoryLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/omnipay/withdrawals"],
    enabled: activeTab === "benefices",
    staleTime: 120000,
  });
  const { data: userTxList } = useQuery<any[]>({
    queryKey: ["/api/admin/users", expandedUserId, "transactions"],
    enabled: !!expandedUserId,
    queryFn: () => fetch(`/api/admin/users/${expandedUserId}/transactions`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: allPaymentLinks, isLoading: plLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/payment-links"],
    staleTime: 120000,
  });
  const { data: allApiKeys, isLoading: akLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/api-keys"],
    staleTime: 120000,
  });
  const { data: merchants, isLoading: merchantsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/merchants"],
    enabled: activeTab === "marchands",
    staleTime: 60000,
  });
  const { data: adminNotifications, isLoading: notifsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/notifications"],
    staleTime: 30000,
  });
  const { data: supportLinks, isLoading: supportLinksLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/support-links"],
    staleTime: 120000,
  });
  const { data: countriesStats } = useQuery<{ txByCountry: any[]; usersByWithdrawal: any[] }>({
    queryKey: ["/api/admin/stats/countries"],
    enabled: activeTab === "overview",
    staleTime: 120000,
  });

  const { data: suspendedCountriesData, isLoading: suspLoading } = useQuery<{ codes: string[] }>({
    queryKey: ["/api/admin/suspended-countries"],
    enabled: activeTab === "payments",
    staleTime: 60000,
  });
  const suspendedCountryCodes = suspendedCountriesData?.codes || [];

  const { data: paymentErrorsData, isLoading: errorsLoading, refetch: refetchErrors } = useQuery<{ errors: any[]; total: number }>({
    queryKey: ["/api/admin/payment-errors"],
    enabled: activeTab === "errors",
    refetchInterval: activeTab === "errors" ? 15000 : false,
    staleTime: 10000,
  });
  const clearErrorsM = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/admin/payment-errors"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-errors"] });
      toast({ title: "Journal effacé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });
  const suspendCountryM = useMutation({
    mutationFn: (codes: string[]) => apiRequest("POST", "/api/admin/suspended-countries", { codes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/suspended-countries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/suspended-countries"] });
      toast({ title: "Pays suspendus mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  // Mutations
  const enableSrM = useMutation({
    mutationFn: (d: { userId: string; apiSrEnabled: boolean }) => apiRequest("PATCH", `/api/admin/users/${d.userId}/enable-sr`, { apiSrEnabled: d.apiSrEnabled }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Option API SR mise à jour" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });
  const enableSrAllM = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/admin/users/enable-sr-all", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSrAllDialog(false);
      toast({ title: `API SR activé pour ${data?.count ?? "tous les"} utilisateurs` });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const blockM = useMutation({
    mutationFn: (d: { userId: string; isBlocked: boolean }) => apiRequest("PATCH", `/api/admin/users/${d.userId}/block`, { isBlocked: d.isBlocked }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: vars.isBlocked ? "Compte débloqué" : "Compte bloqué" });
      setBlockDialog(null);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const kycM = useMutation({
    mutationFn: (d: { userId: string; kycStatus: string; rejectionReason?: string }) => apiRequest("PATCH", `/api/admin/users/${d.userId}/kyc`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
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
    mutationFn: async (d: { txId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/transactions/${d.txId}/status`, { status: d.status });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      if (data?.omnipayTriggered) {
        toast({ title: "Paiement envoyé via OmniPay", description: "Le transfert a été initié avec succès." });
      } else if (data?.refunded) {
        toast({ title: "Transaction rejetée", description: "Le solde a été remboursé à l'utilisateur." });
      } else {
        toast({ title: "Statut mis à jour" });
      }
    },
    onError: (e: any) => {
      let description = e?.message || "Erreur inconnue";
      try {
        const parsed = JSON.parse(description.replace(/^\d+:\s*/, ""));
        description = parsed.message || description;
      } catch {}
      toast({ title: "Erreur OmniPay", description, variant: "destructive" });
    },
  });

  const pmM = useMutation({
    mutationFn: (d: { code: string; isActive?: boolean; inMaintenance?: boolean; maintenanceCountries?: string[]; withdrawalMaintenance?: boolean; withdrawalMaintenanceCountries?: string[]; feeDeposit?: string | null; feeWithdrawal?: string | null; feePLink?: string | null; feeApi?: string | null; countryFees?: Record<string, any>; otpConfig?: Record<string, any> }) => apiRequest("PATCH", `/api/admin/payment-methods/${d.code}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods/public"] });
      toast({ title: "Mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const globalMaintM = useMutation({
    mutationFn: (inMaintenance: boolean) => apiRequest("POST", "/api/admin/payment-methods/global-maintenance", { inMaintenance }),
    onSuccess: (_, inMaintenance) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] });
      toast({ title: inMaintenance ? "Tous les opérateurs en maintenance" : "Tous les opérateurs remis en service" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const { data: serviceFees, isLoading: serviceFeesLoading } = useQuery<{ deposit: number; withdrawal: number; transfer: number; api: number }>({
    queryKey: ["/api/admin/service-fees"],
  });

  const serviceFeesM = useMutation({
    mutationFn: (d: { deposit?: number; withdrawal?: number; transfer?: number; api?: number }) => apiRequest("PATCH", "/api/admin/service-fees", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/service-fees"] }); toast({ title: "Frais de service mis à jour !" }); setServiceFeeEdit(null); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const { data: omnipayRates, isLoading: omnipayRatesLoading } = useQuery<{ deposit: number; withdrawal: number }>({
    queryKey: ["/api/admin/omnipay-rates"],
  });

  const omnipayRatesM = useMutation({
    mutationFn: (d: { deposit?: number; withdrawal?: number }) => apiRequest("PATCH", "/api/admin/omnipay-rates", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/omnipay-rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      toast({ title: "Taux OmniPay mis à jour !" });
      setOmnipayRateEdit(null);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleLinkM = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/payment-links/${d.id}/toggle`, { isActive: d.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      setToggleConfirmDialog(null);
      toast({ title: "Lien de paiement mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleApiKeyM = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/api-keys/${d.id}/toggle`, { isActive: d.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      setToggleConfirmDialog(null);
      toast({ title: "Clé API mise à jour" });
    },
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

  const wdM = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/omnipay/withdraw", data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/omnipay/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/omnipay/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      toast({ title: "Retrait initié", description: `Statut OmniPay : ${res.omnipayStatus}` });
      setWdDialog(false);
      setWdForm({ amount: "", phone: "", operator: "", recipientName: "", note: "" });
    },
    onError: (e: any) => toast({ title: "Erreur retrait", description: e?.message, variant: "destructive" }),
  });

  const wdCheckM = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/omnipay/withdrawals/${id}/check`, {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/omnipay/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commissions"] });
      toast({ title: "Statut mis à jour", description: `Statut : ${res.status}` });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const createNotifM = useMutation({
    mutationFn: (data: { title: string; message: string; color: string; linkUrl?: string; linkLabel?: string }) => apiRequest("POST", "/api/admin/notifications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "Notification envoyée" });
      setNotifForm({ title: "", message: "", color: "blue", linkUrl: "", linkLabel: "" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleNotifM = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/admin/notifications/${d.id}`, { isActive: d.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] }),
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const updateNotifM = useMutation({
    mutationFn: (d: { id: string; title: string; message: string; color: string; linkUrl?: string; linkLabel?: string }) =>
      apiRequest("PATCH", `/api/admin/notifications/${d.id}`, { title: d.title, message: d.message, color: d.color, linkUrl: d.linkUrl || null, linkLabel: d.linkLabel || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "Notification modifiée" });
      setEditNotifDialog(null);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const deleteNotifM = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/notifications/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "Notification supprimée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const saveSupportLinksM = useMutation({
    mutationFn: (data: Record<string, string>) => apiRequest("PUT", "/api/admin/support-links", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-links"] });
      setSupportLinksForm(null);
      toast({ title: "Liens de support mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const blockedUsersCount = (users || []).filter(u => u.isBlocked).length;
  const filteredUsers = (users || [])
    .filter(u => !userSearch || [u.email, u.firstName, u.lastName].join(" ").toLowerCase().includes(userSearch.toLowerCase()))
    .filter(u => !srFilter || (u as any).apiSrEnabled)
    .filter(u => !blockedFilter || u.isBlocked)
    .sort((a, b) => {
      if (userSort === "balance_desc") return parseFloat(b.wallet?.balanceXOF || "0") - parseFloat(a.wallet?.balanceXOF || "0");
      if (userSort === "balance_asc") return parseFloat(a.wallet?.balanceXOF || "0") - parseFloat(b.wallet?.balanceXOF || "0");
      return 0;
    });

  const filteredTx = (allTx || []).filter(tx => {
    const { label, extra } = getTxSourceInfo(tx);
    const searchFields = [tx.reference, tx.phoneNumber, tx.description, tx.userDisplayName, tx.userEmail, tx.payerName, tx.payerEmail, tx.provider, label, extra].filter(Boolean).join(" ");
    const m = !txSearch || searchFields.toLowerCase().includes(txSearch.toLowerCase());
    return m && (txStatus === "all" || tx.status === txStatus) && (txType === "all" || tx.type === txType);
  });

  const pendingKyc = (kycList || []).filter((u: any) => u.kycStatus === "pending");
  const pendingWithdrawals = (allTx || []).filter(t => t.type === "withdrawal" && t.status === "pending");

  const totalWalletBalance = (wallets || []).reduce((s: number, u: any) => s + parseFloat(u.wallet?.balanceXOF || "0"), 0);
  const filteredPaymentLinks = (allPaymentLinks || []).filter(l =>
    !linksSearch || [l.name, l.slug, l.user?.email, l.user?.firstName, l.user?.lastName].join(" ").toLowerCase().includes(linksSearch.toLowerCase())
  );
  const filteredApiKeys = (allApiKeys || []).filter(k =>
    !k.isSrKey && (!apiKeysSearch || [k.name, k.keyPrefix, k.websiteUrl, k.user?.email, k.user?.firstName, k.user?.lastName].join(" ").toLowerCase().includes(apiKeysSearch.toLowerCase()))
  );
  const filteredSrKeys = (allApiKeys || []).filter(k =>
    k.isSrKey && (!apiKeysSearch || [k.name, k.keyPrefix, k.webhookUrl, k.user?.email, k.user?.firstName, k.user?.lastName].join(" ").toLowerCase().includes(apiKeysSearch.toLowerCase()))
  );
  const totalUsersCount = (users || []).length;

  const liquidityCriticalCount = (() => {
    if (!liquidityData?.walletsByCountry) return 0;
    const OMNI_MAP: Record<string, string> = {
      BJ: "BEN", CI: "CIV", SN: "SEN", TG: "TGO", CM: "CMR",
      GN: "GIN", ML: "MLI", BF: "BFA", NE: "NER", COD: "COD", COG: "COG",
    };
    const omniBalances: Record<string, number> = {};
    ((omnipayBalance?.balance) ?? []).forEach((b: any) => { omniBalances[b.countryCode] = b.amount ?? 0; });
    const pendingMap: Record<string, number> = {};
    (liquidityData.pendingByCountry ?? []).forEach((p: any) => { pendingMap[p.country] = p.pendingAmount ?? 0; });
    return liquidityData.walletsByCountry.filter((w: any) => {
      const omniCode = OMNI_MAP[w.country] ?? w.country;
      const omniBalance = omniBalances[omniCode] ?? 0;
      const totalNeeded = (w.totalBalance ?? 0) + (pendingMap[w.country] ?? 0);
      const shortfall = Math.max(0, totalNeeded - omniBalance);
      return shortfall > 0 && shortfall > totalNeeded * 0.5;
    }).length;
  })();

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
                  { label: "Total utilisateurs", value: stats?.userCount ?? totalUsersCount, color: "text-cyan-300" },
                  { label: "KYC en attente", value: pendingKyc.length, color: "text-amber-300" },
                  { label: "Retraits pendants", value: isAutoWithdrawal ? 0 : pendingWithdrawals.length, color: "text-rose-300" },
                  { label: "Liens de paiement", value: (allPaymentLinks || []).length, color: "text-violet-300" },
                  { label: "Clés API", value: (allApiKeys || []).filter((k: any) => !k.isSrKey).length, color: "text-emerald-300" },
                  { label: "Clés SR", value: (allApiKeys || []).filter((k: any) => k.isSrKey).length, color: "text-green-300" },
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full gap-1 p-1.5 bg-muted/60 rounded-2xl h-auto">
              {[
                { v: "overview", label: "Vue d'ensemble", Icon: BarChart3, badge: 0 },
                { v: "liquidity", label: "Liquidité OmniPay", Icon: Activity, badge: liquidityCriticalCount },
                { v: "benefices", label: "Bénéfices", Icon: Coins, badge: 0 },
                { v: "users", label: "Utilisateurs", Icon: Users, badge: 0 },
                { v: "marchands", label: "Marchands", Icon: Link2, badge: 0 },
                { v: "kyc", label: "KYC", Icon: BadgeCheck, badge: pendingKyc.length },
                { v: "wallets", label: "Wallets & Solde", Icon: Wallet, badge: 0 },
                { v: "links-keys", label: "Liens & API", Icon: Link2, badge: 0 },
                { v: "fees", label: "Frais", Icon: Percent, badge: 0 },
                { v: "payments", label: "Moyens de paiement", Icon: CreditCard, badge: 0 },
                { v: "transactions", label: "Transactions", Icon: ArrowDownUp, badge: isAutoWithdrawal ? 0 : pendingWithdrawals.length },
                { v: "notifications", label: "Notifications", Icon: Bell, badge: (adminNotifications || []).filter((n: any) => n.isActive).length },
                { v: "support-links", label: "Liens Support", Icon: HeadphonesIcon, badge: 0 },
                { v: "settings", label: "Paramètres", Icon: Settings2, badge: 0 },
                { v: "errors", label: "Erreurs système", Icon: AlertTriangle, badge: 0 },
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
                <p className="text-2xl font-black text-foreground" data-testid="total-users-count">{(stats?.userCount ?? totalUsersCount) || "—"}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs inscrits sur la plateforme</p>
              </div>
            </div>

            {/* ── RÉSUMÉ RAPIDE LIQUIDITÉ ── */}
            {liquidityCriticalCount > 0 && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 flex items-center gap-3 cursor-pointer" onClick={() => { const el = document.querySelector('[data-testid="tab-liquidity"]') as HTMLButtonElement; el?.click(); }}>
                <div className="h-9 w-9 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-4.5 w-4.5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-400">{liquidityCriticalCount} situation{liquidityCriticalCount !== 1 ? "s" : ""} critique{liquidityCriticalCount !== 1 ? "s" : ""} de liquidité OmniPay</p>
                  <p className="text-xs text-muted-foreground">Cliquez pour voir l'analyse complète dans l'onglet Liquidité OmniPay</p>
                </div>
              </div>
            )}


            {/* ── RÉSUMÉ FINANCIER ── */}
            <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm">
              <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-white" />
                  <p className="text-white font-bold text-sm">Résumé Financier</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWdDialog(true)}
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                    data-testid="btn-admin-wd-open"
                  >
                    <TrendingDown className="h-3.5 w-3.5" />
                    Retrait OmniPay
                  </button>
                  <button
                    onClick={() => { queryClient.invalidateQueries({ queryKey: ["/api/admin/financial-summary"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/omnipay/balance"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/omnipay/withdrawals"] }); }}
                    className="text-white/70 hover:text-white transition-colors"
                    data-testid="btn-refresh-financial"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border/40 bg-card">
                {[
                  {
                    label: "Reçu via OmniPay",
                    value: finLoading ? null : fmt(financialSummary?.omnipayDeposits || 0),
                    sub: `Frais collectés : ${finLoading ? "…" : fmt(financialSummary?.omnipayDepositFees || 0)} XOF`,
                    icon: TrendingUp,
                    grad: "from-emerald-500 to-teal-500",
                    bg: "bg-emerald-500/8",
                    text: "text-emerald-600 dark:text-emerald-400",
                    testid: "fin-omnipay-received",
                  },
                  {
                    label: "Soldes en Wallets",
                    value: finLoading ? null : fmt(financialSummary?.totalWalletBalance || 0),
                    sub: `Ajustements admin : ${finLoading ? "…" : fmt(financialSummary?.adminDeposits || 0)} XOF`,
                    icon: Wallet,
                    grad: "from-violet-500 to-purple-500",
                    bg: "bg-violet-500/8",
                    text: "text-violet-600 dark:text-violet-400",
                    testid: "fin-wallet-balance",
                  },
                  {
                    label: "Total Retiré",
                    value: finLoading ? null : fmt(financialSummary?.withdrawals || 0),
                    sub: `Frais : ${finLoading ? "…" : fmt(financialSummary?.withdrawalFees || 0)} XOF`,
                    icon: TrendingDown,
                    grad: "from-rose-500 to-red-500",
                    bg: "bg-rose-500/8",
                    text: "text-rose-600 dark:text-rose-400",
                    testid: "fin-total-withdrawn",
                  },
                  {
                    label: "Total des Frais",
                    value: finLoading ? null : fmt(financialSummary?.totalFees || 0),
                    sub: `Transferts : ${finLoading ? "…" : fmt(financialSummary?.transfers || 0)} XOF`,
                    icon: Coins,
                    grad: "from-amber-500 to-orange-500",
                    bg: "bg-amber-500/8",
                    text: "text-amber-600 dark:text-amber-400",
                    testid: "fin-total-fees",
                  },
                ].map((item, i) => (
                  <div key={i} className={`p-4 ${item.bg} flex flex-col gap-2`} data-testid={item.testid}>
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${item.grad} flex items-center justify-center flex-shrink-0`}>
                        <item.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium leading-tight">{item.label}</p>
                    </div>
                    {finLoading ? (
                      <Skeleton className="h-7 w-24 rounded-lg" />
                    ) : (
                      <p className={`font-black text-xl ${item.text}`}>{item.value} <span className="text-xs font-semibold text-muted-foreground">XOF</span></p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  </div>
                ))}
              </div>
              {/* OmniPay live balance bar */}
              <div className="bg-slate-900 dark:bg-slate-950 px-5 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs text-slate-300 font-semibold">Solde OmniPay en temps réel :</p>
                </div>
                {omniLoading ? (
                  <Skeleton className="h-4 w-40 rounded bg-slate-700" />
                ) : omnipayBalance?.balance ? (
                  <div className="flex gap-3 flex-wrap">
                    {omnipayBalance.balance.map((b: any, i: number) => (
                      <span key={i} className="text-xs font-bold text-emerald-400">
                        {b.countryName}: <span className="text-white">{b.amount.toLocaleString()} {b.currency}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Indisponible</span>
                )}
              </div>
            </div>

            {/* ── HISTORIQUE RETRAITS ADMIN OMNIPAY ── */}
            <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm">
              <div className="bg-slate-800 dark:bg-slate-900 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-300" />
                  <p className="text-slate-200 font-bold text-sm">Historique des retraits OmniPay</p>
                  {(adminWdHistory || []).length > 0 && (
                    <span className="text-[10px] font-bold bg-slate-600 text-slate-200 rounded-full px-2 py-0.5">{(adminWdHistory || []).length}</span>
                  )}
                </div>
                <button
                  onClick={() => setWdDialog(true)}
                  className="flex items-center gap-1.5 bg-rose-600/80 hover:bg-rose-600 transition-colors rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                  data-testid="btn-admin-wd-open-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau retrait
                </button>
              </div>
              {wdHistoryLoading ? (
                <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
              ) : (adminWdHistory || []).length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground bg-card">
                  <Banknote className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Aucun retrait admin effectué</p>
                </div>
              ) : (
                <div className="bg-card divide-y divide-border/40">
                  {(adminWdHistory || []).map((wd: any) => (
                    <div key={wd.id} className="px-5 py-3 flex items-center gap-3 flex-wrap" data-testid={`row-admin-wd-${wd.id}`}>
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        wd.status === "completed" ? "bg-emerald-500/15" : wd.status === "failed" ? "bg-rose-500/15" : "bg-amber-500/15"
                      }`}>
                        {wd.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                         wd.status === "failed" ? <XCircle className="h-4 w-4 text-rose-500" /> :
                         <Clock className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold">{parseFloat(wd.amount).toLocaleString()} {wd.currency}</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                            wd.status === "completed" ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" :
                            wd.status === "failed" ? "border-rose-500/40 text-rose-600 dark:text-rose-400" :
                            "border-amber-500/40 text-amber-600 dark:text-amber-400"
                          }`}>{wd.status}</Badge>
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{wd.operator}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{wd.phoneNumber} {wd.recipientName ? `· ${wd.recipientName}` : ""}</p>
                        {wd.note && <p className="text-[10px] text-muted-foreground italic mt-0.5">{wd.note}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[10px] text-muted-foreground">{new Date(wd.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        {wd.status === "pending" && (
                          <button
                            onClick={() => wdCheckM.mutate(wd.id)}
                            disabled={wdCheckM.isPending}
                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-0.5"
                            data-testid={`btn-check-wd-${wd.id}`}
                          >
                            <RefreshCw className="h-2.5 w-2.5" />
                            Vérifier
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" />Bénéfices plateforme</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Frais collectés des utilisateurs</p>
                  {[
                    { label: `Dépôts (OmniPay)`, val: fmt(commissions?.totalDepositFees || 0), color: "text-emerald-600" },
                    { label: `Retraits`, val: fmt(commissions?.totalWithdrawalFees || 0), color: "text-cyan-600" },
                    { label: "Total frais perçus", val: fmt(commissions?.totalFees || 0), color: "text-indigo-600", bold: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-${(item as any).bold ? "black" : "semibold"} ${item.color}`}>{comLoading ? "—" : item.val}</span>
                    </div>
                  ))}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-3 mb-2">Coût OmniPay déduit</p>
                  {[
                    { label: `Dépôts (@${commissions?.omnipayDepositRate ?? omnipayRates?.deposit ?? 3}%)`, val: fmt(commissions?.omnipayCostDeposit || 0), color: "text-rose-500" },
                    { label: `Retraits (@${commissions?.omnipayWithdrawalRate ?? omnipayRates?.withdrawal ?? 3}%)`, val: fmt(commissions?.omnipayCostWithdrawal || 0), color: "text-rose-500" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-sm font-semibold ${item.color}`}>{comLoading ? "—" : `- ${item.val}`}</span>
                    </div>
                  ))}
                  <div className={`mt-3 p-3 rounded-xl border ${(commissions?.adminNetProfit ?? 0) >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
                    <p className="text-xs text-muted-foreground">Bénéfice net admin</p>
                    <p className={`text-xl font-black ${(commissions?.adminNetProfit ?? 0) >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {comLoading ? "—" : `${fmt(commissions?.adminNetProfit || 0)} XOF`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Ce mois : {comLoading ? "—" : `${fmt(commissions?.monthNetProfit || 0)} XOF`}</p>
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

            {/* ── ACTIVITÉ PAR PAYS ── */}
            {(() => {
              const COUNTRY_META: Record<string, { name: string; flag: string; gradient: string; border: string; text: string }> = {
                CM:  { name: "Cameroun",        flag: "🇨🇲", gradient: "from-green-500 to-emerald-600",  border: "border-green-400/40",   text: "text-green-400" },
                SN:  { name: "Sénégal",         flag: "🇸🇳", gradient: "from-yellow-500 to-orange-500", border: "border-yellow-400/40",  text: "text-yellow-400" },
                CI:  { name: "Côte d'Ivoire",   flag: "🇨🇮", gradient: "from-orange-500 to-red-500",    border: "border-orange-400/40",  text: "text-orange-400" },
                BF:  { name: "Burkina Faso",    flag: "🇧🇫", gradient: "from-red-500 to-rose-600",      border: "border-red-400/40",     text: "text-red-400" },
                ML:  { name: "Mali",            flag: "🇲🇱", gradient: "from-lime-500 to-green-600",    border: "border-lime-400/40",    text: "text-lime-400" },
                GN:  { name: "Guinée",          flag: "🇬🇳", gradient: "from-red-400 to-yellow-500",   border: "border-red-300/40",     text: "text-red-300" },
                BJ:  { name: "Bénin",           flag: "🇧🇯", gradient: "from-teal-500 to-cyan-600",    border: "border-teal-400/40",    text: "text-teal-400" },
                NE:  { name: "Niger",           flag: "🇳🇪", gradient: "from-amber-500 to-orange-600", border: "border-amber-400/40",   text: "text-amber-400" },
                TG:  { name: "Togo",            flag: "🇹🇬", gradient: "from-sky-500 to-blue-600",     border: "border-sky-400/40",     text: "text-sky-400" },
                COD: { name: "Congo (RDC)",     flag: "🇨🇩", gradient: "from-blue-500 to-indigo-600",  border: "border-blue-400/40",    text: "text-blue-400" },
                COG: { name: "Congo (Brazza)",  flag: "🇨🇬", gradient: "from-violet-500 to-purple-600",border: "border-violet-400/40",  text: "text-violet-400" },
                GH:  { name: "Ghana",           flag: "🇬🇭", gradient: "from-yellow-600 to-red-600",   border: "border-yellow-500/40",  text: "text-yellow-500" },
                NG:  { name: "Nigéria",         flag: "🇳🇬", gradient: "from-emerald-500 to-green-700",border: "border-emerald-400/40", text: "text-emerald-400" },
              };
              const DEFAULT_META = { name: "", flag: "🌍", gradient: "from-slate-500 to-slate-600", border: "border-slate-400/40", text: "text-slate-400" };
              const AUTRE_META = { name: "Autres / Inconnu", flag: "🌐", gradient: "from-slate-500 to-slate-600", border: "border-slate-400/40", text: "text-slate-400" };

              const userRows = (countriesStats?.usersByWithdrawal ?? []).map((c: any) => ({
                code: c.country ?? "??",
                count: c.count ?? 0,
                meta: c.country === "AUTRE" ? AUTRE_META : (COUNTRY_META[c.country ?? ""] ?? { ...DEFAULT_META, name: c.country ?? "Inconnu" }),
              }));

              const maxUsers = userRows.length > 0 ? userRows[0].count : 1;
              const totalUsers = userRows.reduce((sum: number, r: any) => sum + r.count, 0);

              return (
                <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm">
                  <div className="bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-5 py-3 flex items-center gap-2">
                    <span className="text-lg">🌍</span>
                    <p className="text-white font-bold text-sm">Inscrits par Pays</p>
                    <span className="ml-auto text-xs text-white/70">{totalUsers} utilisateur{totalUsers !== 1 ? "s" : ""} · {userRows.length} pays</span>
                  </div>

                  {userRows.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Aucun utilisateur avec pays enregistré pour le moment.
                    </div>
                  ) : (
                    <div className="p-4 space-y-2.5">
                      {userRows.map((row: any, idx: number) => {
                        const barPct = Math.round((row.count / maxUsers) * 100);
                        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                        const pct = totalUsers > 0 ? ((row.count / totalUsers) * 100).toFixed(1) : "0";
                        return (
                          <div key={row.code} className={`rounded-xl border ${row.meta.border} p-3`} data-testid={`country-row-${row.code}`}>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl leading-none">{row.meta.flag}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {medal && <span className="text-base leading-none">{medal}</span>}
                                  <p className="text-sm font-bold text-foreground truncate">{row.meta.name || row.code}</p>
                                  <span className="text-[10px] font-mono text-muted-foreground ml-auto shrink-0">{pct}%</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-xs font-semibold ${row.meta.text}`}>
                                    {row.count} utilisateur{row.count !== 1 ? "s" : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full bg-gradient-to-r ${row.meta.gradient} transition-all duration-700`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB — LIQUIDITÉ OMNIPAY
          ══════════════════════════════════════ */}
          <TabsContent value="liquidity" className="space-y-5 mt-5">
            {(() => {
              const COUNTRY_MAP: Record<string, { name: string; flag: string; omniCode: string; color: string; gradient: string; border: string }> = {
                BJ:  { name: "Bénin",           flag: "🇧🇯", omniCode: "BEN", color: "text-teal-400",   gradient: "from-teal-500 to-cyan-600",     border: "border-teal-500/30" },
                CI:  { name: "Côte d'Ivoire",   flag: "🇨🇮", omniCode: "CIV", color: "text-orange-400", gradient: "from-orange-500 to-red-500",    border: "border-orange-500/30" },
                SN:  { name: "Sénégal",         flag: "🇸🇳", omniCode: "SEN", color: "text-yellow-400", gradient: "from-yellow-500 to-orange-500", border: "border-yellow-500/30" },
                TG:  { name: "Togo",            flag: "🇹🇬", omniCode: "TGO", color: "text-sky-400",    gradient: "from-sky-500 to-blue-600",      border: "border-sky-500/30" },
                CM:  { name: "Cameroun",        flag: "🇨🇲", omniCode: "CMR", color: "text-green-400",  gradient: "from-green-500 to-emerald-600", border: "border-green-500/30" },
                GN:  { name: "Guinée",          flag: "🇬🇳", omniCode: "GIN", color: "text-red-400",    gradient: "from-red-500 to-rose-600",      border: "border-red-500/30" },
                ML:  { name: "Mali",            flag: "🇲🇱", omniCode: "MLI", color: "text-lime-400",   gradient: "from-lime-500 to-green-600",    border: "border-lime-500/30" },
                BF:  { name: "Burkina Faso",    flag: "🇧🇫", omniCode: "BFA", color: "text-red-300",    gradient: "from-red-400 to-rose-500",      border: "border-red-400/30" },
                NE:  { name: "Niger",           flag: "🇳🇪", omniCode: "NER", color: "text-amber-400",  gradient: "from-amber-500 to-orange-600", border: "border-amber-500/30" },
                COD: { name: "Congo (RDC)",     flag: "🇨🇩", omniCode: "COD", color: "text-blue-400",   gradient: "from-blue-500 to-indigo-600",  border: "border-blue-500/30" },
                COG: { name: "Congo (Brazza)",  flag: "🇨🇬", omniCode: "COG", color: "text-violet-400", gradient: "from-violet-500 to-purple-600",border: "border-violet-500/30" },
              };

              const omniBalances: Record<string, number> = {};
              ((omnipayBalance?.balance) ?? []).forEach((b: any) => {
                omniBalances[b.countryCode] = b.amount ?? 0;
              });

              const pendingMap: Record<string, { amount: number; count: number }> = {};
              (liquidityData?.pendingByCountry ?? []).forEach((p: any) => {
                pendingMap[p.country] = { amount: p.pendingAmount ?? 0, count: p.pendingCount ?? 0 };
              });

              const rows = (liquidityData?.walletsByCountry ?? []).map((w: any) => {
                const meta = COUNTRY_MAP[w.country] ?? { name: w.country, flag: "🌍", omniCode: "??", color: "text-slate-400", gradient: "from-slate-500 to-slate-600", border: "border-slate-500/30" };
                const omniBalance = omniBalances[meta.omniCode] ?? 0;
                const pending = pendingMap[w.country] ?? { amount: 0, count: 0 };
                const totalNeeded = (w.totalBalance ?? 0) + pending.amount;
                const shortfall = Math.max(0, totalNeeded - omniBalance);
                const surplus = Math.max(0, omniBalance - totalNeeded);
                const coverage = totalNeeded > 0 ? Math.min(100, Math.round((omniBalance / totalNeeded) * 100)) : 100;
                const status = shortfall > 0 ? (shortfall > totalNeeded * 0.5 ? "critical" : "warning") : "ok";
                return { code: w.country, meta, omniBalance, totalNeeded, userBalance: w.totalBalance ?? 0, userCount: w.userCount ?? 0, pending, shortfall, surplus, coverage, status };
              }).sort((a, b) => b.shortfall - a.shortfall || b.totalNeeded - a.totalNeeded);

              const totalShortfall = rows.reduce((s, r) => s + r.shortfall, 0);
              const criticalCount = rows.filter(r => r.status === "critical").length;
              const warningCount = rows.filter(r => r.status === "warning").length;

              const statusBg: Record<string, string> = {
                critical: "bg-red-500/10 border-red-500/40",
                warning: "bg-amber-500/10 border-amber-500/40",
                ok: "bg-emerald-500/5 border-emerald-500/20",
              };
              const statusText: Record<string, string> = {
                critical: "text-red-400",
                warning: "text-amber-400",
                ok: "text-emerald-400",
              };
              const statusLabel: Record<string, string> = {
                critical: "CRITIQUE",
                warning: "ATTENTION",
                ok: "OK",
              };

              return (
                <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm" data-testid="liquidity-section">
                  <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏦</span>
                      <p className="text-white font-bold text-sm">Analyse de Liquidité OmniPay</p>
                      <span className="text-xs text-white/60 hidden sm:block">— Mis à jour toutes les 10s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {criticalCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">{criticalCount} CRITIQUE</span>
                      )}
                      {warningCount > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">{warningCount} ATTENTION</span>
                      )}
                      {totalShortfall > 0 && (
                        <span className="bg-white/15 text-white text-[10px] font-bold rounded-lg px-2 py-0.5">
                          Total à ajouter : {fmt(Math.ceil(totalShortfall))} XOF
                        </span>
                      )}
                    </div>
                  </div>

                  {rows.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Aucun utilisateur avec pays de retrait configuré pour le moment.
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {rows.map((row) => (
                        <div key={row.code} className={`rounded-xl border p-3.5 ${statusBg[row.status]}`} data-testid={`liquidity-row-${row.code}`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{row.meta.flag}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-foreground">{row.meta.name}</p>
                                  <span className={`text-[10px] font-black rounded-full px-1.5 py-0.5 ${statusText[row.status]} bg-current/10`}
                                    style={{ backgroundColor: row.status === "critical" ? "rgb(239 68 68 / 0.15)" : row.status === "warning" ? "rgb(245 158 11 / 0.15)" : "rgb(16 185 129 / 0.15)" }}>
                                    {statusLabel[row.status]}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{row.userCount} utilisateur{row.userCount !== 1 ? "s" : ""} · code {row.meta.omniCode}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {row.shortfall > 0 ? (
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium">À ajouter dans OmniPay</p>
                                  <p className="text-base font-black text-red-400" data-testid={`shortfall-${row.code}`}>+{fmt(Math.ceil(row.shortfall))} XOF</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-[10px] text-muted-foreground font-medium">Excédent disponible</p>
                                  <p className="text-base font-black text-emerald-400" data-testid={`shortfall-${row.code}`}>0 XOF</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                            <div className="bg-background/40 rounded-lg p-2">
                              <p className="text-[10px] text-muted-foreground">Solde OmniPay</p>
                              <p className="text-xs font-bold text-foreground">{fmt(row.omniBalance)} XOF</p>
                            </div>
                            <div className="bg-background/40 rounded-lg p-2">
                              <p className="text-[10px] text-muted-foreground">Wallets utilisateurs</p>
                              <p className="text-xs font-bold text-foreground">{fmt(Math.round(row.userBalance))} XOF</p>
                            </div>
                            <div className="bg-background/40 rounded-lg p-2">
                              <p className="text-[10px] text-muted-foreground">Retraits en attente</p>
                              <p className={`text-xs font-bold ${row.pending.count > 0 ? "text-amber-400" : "text-foreground"}`}>
                                {fmt(Math.round(row.pending.amount))} XOF
                                {row.pending.count > 0 && <span className="text-[9px] ml-0.5">({row.pending.count})</span>}
                              </p>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Couverture OmniPay</span>
                              <span className={`font-bold ${row.coverage < 50 ? "text-red-400" : row.coverage < 100 ? "text-amber-400" : "text-emerald-400"}`}>
                                {row.coverage}%
                              </span>
                            </div>
                            <div className="w-full bg-white/10 dark:bg-black/20 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full bg-gradient-to-r ${row.coverage < 50 ? "from-red-500 to-rose-600" : row.coverage < 100 ? "from-amber-500 to-orange-500" : `${row.meta.gradient}`} transition-all duration-700`}
                                style={{ width: `${row.coverage}%` }}
                              />
                            </div>
                            {row.shortfall > 0 && (
                              <p className="text-[10px] text-red-400 mt-1.5 font-medium">
                                ⚠ Rechargez le wallet {row.meta.name} de <strong>+{fmt(Math.ceil(row.shortfall))} XOF</strong> dans OmniPay pour couvrir tous les retraits
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB — BÉNÉFICES
          ══════════════════════════════════════ */}
          <TabsContent value="benefices" className="space-y-5 mt-5">
            {/* Solde disponible hero */}
            <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)" }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #34d399 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6ee7b7 0%, transparent 40%)" }} />
              <div className="relative p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-emerald-300 text-xs font-semibold uppercase tracking-wider">Solde disponible en temps réel</p>
                    </div>
                    {comLoading ? (
                      <div className="h-12 w-48 bg-white/10 rounded-xl animate-pulse mt-2" />
                    ) : (
                      <p className="text-4xl font-black text-white mt-1" data-testid="text-available-balance">
                        {new Intl.NumberFormat("fr-FR").format(Math.round(commissions?.availableBalance || 0))} <span className="text-xl font-semibold text-emerald-300">XOF</span>
                      </p>
                    )}
                    <p className="text-emerald-200/70 text-xs mt-1">
                      Frais nets perçus − Retraits déjà effectués
                    </p>
                    {(commissions?.pendingWithdrawn || 0) > 0 && (
                      <p className="text-amber-300 text-xs mt-1 font-semibold">
                        {new Intl.NumberFormat("fr-FR").format(Math.round(commissions.pendingWithdrawn))} XOF en cours de retrait (en attente)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setWdDialog(true)}
                      className="flex items-center gap-2 bg-white text-emerald-700 font-black px-5 py-3 rounded-2xl text-sm hover:bg-emerald-50 transition-colors shadow-lg"
                      data-testid="btn-benefices-withdraw"
                    >
                      <Send className="h-4 w-4" />
                      Retirer mes bénéfices
                    </button>
                    <button
                      onClick={() => { refetchCommissions(); queryClient.invalidateQueries({ queryKey: ["/api/admin/profit-transactions"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/omnipay/withdrawals"] }); }}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors"
                      data-testid="btn-benefices-refresh"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Actualiser
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Frais collectés (total)", val: commissions?.totalFees || 0, icon: Coins, grad: "from-indigo-500 to-violet-600", desc: "Toutes transactions" },
                { label: "Coût OmniPay déduit", val: -(commissions?.totalOmniPayCost || 0), icon: TrendingDown, grad: "from-rose-500 to-orange-500", desc: "Frais prestataire" },
                { label: "Bénéfice net total", val: commissions?.adminNetProfit || 0, icon: TrendingUp, grad: "from-emerald-500 to-teal-600", desc: "Depuis le début" },
                { label: "Déjà retiré", val: -(commissions?.totalWithdrawn || 0), icon: Send, grad: "from-amber-500 to-yellow-600", desc: "Retraits confirmés" },
              ].map((item, i) => (
                <Card key={i} className="border-0 overflow-hidden shadow-sm" data-testid={`benefice-card-${i}`}>
                  <CardContent className="p-0">
                    <div className={`h-1.5 bg-gradient-to-r ${item.grad}`} />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground font-medium leading-tight">{item.label}</p>
                        <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${item.grad} flex items-center justify-center`}>
                          <item.icon className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>
                      {comLoading ? <div className="h-6 w-24 bg-muted rounded animate-pulse" /> : (
                        <p className={`text-lg font-black ${item.val >= 0 ? "text-foreground" : "text-rose-500"}`}>
                          {item.val < 0 ? "−" : ""}{new Intl.NumberFormat("fr-FR").format(Math.abs(Math.round(item.val)))} XOF
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fees breakdown */}
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><Percent className="h-4 w-4 text-indigo-500" />Détail des frais perçus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  {[
                    { label: "Dépôts (Mobile Money)", val: commissions?.totalDepositFees || 0, color: "text-emerald-600", icon: "📲" },
                    { label: "Retraits utilisateurs", val: commissions?.totalWithdrawalFees || 0, color: "text-orange-600", icon: "💸" },
                    { label: "Transferts", val: commissions?.totalTransferFees || 0, color: "text-violet-600", icon: "↔️" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${item.color}`}>
                        {comLoading ? "—" : `+${new Intl.NumberFormat("fr-FR").format(Math.round(item.val))} XOF`}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-2.5 mt-1">
                    <span className="text-sm font-black">Total frais bruts</span>
                    <span className="text-sm font-black text-indigo-600">
                      {comLoading ? "—" : `${new Intl.NumberFormat("fr-FR").format(Math.round(commissions?.totalFees || 0))} XOF`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-rose-500" />Historique des retraits</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {wdHistoryLoading ? (
                    <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
                  ) : (adminWdHistory || []).length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                      <Banknote className="h-7 w-7 opacity-30" />
                      <p className="text-xs">Aucun retrait effectué</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                      {(adminWdHistory || []).map((wd: any) => (
                        <div key={wd.id} className="px-4 py-2.5 flex items-center gap-3" data-testid={`benefice-wd-row-${wd.id}`}>
                          <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${wd.status === "completed" ? "bg-emerald-500/15" : wd.status === "failed" ? "bg-rose-500/15" : "bg-amber-500/15"}`}>
                            {wd.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : wd.status === "failed" ? <XCircle className="h-3.5 w-3.5 text-rose-500" /> : <Clock className="h-3.5 w-3.5 text-amber-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold">{parseFloat(wd.amount).toLocaleString("fr-FR")} XOF</p>
                            <p className="text-[10px] text-muted-foreground">{wd.operator} · {wd.phoneNumber}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] text-muted-foreground">{new Date(wd.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            {wd.status === "pending" && (
                              <button onClick={() => wdCheckM.mutate(wd.id)} disabled={wdCheckM.isPending} className="text-[10px] text-indigo-500 font-bold hover:underline flex items-center gap-0.5 ml-auto">
                                <RefreshCw className="h-2.5 w-2.5" />Vérifier
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Transactions with fees table */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2"><ArrowDownUp className="h-4 w-4 text-indigo-500" />Transactions avec frais perçus</CardTitle>
                  <span className="text-xs text-muted-foreground">{(profitTx || []).length} transactions</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {profitTxLoading ? (
                  <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div>
                ) : (profitTx || []).length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                    <ArrowDownUp className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Aucune transaction avec frais trouvée</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/50">
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Date</th>
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Utilisateur</th>
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Type</th>
                          <th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Montant</th>
                          <th className="text-right px-4 py-2.5 text-muted-foreground font-semibold text-emerald-600">Frais perçus</th>
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Opérateur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {(profitTx || []).map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-muted/30 transition-colors" data-testid={`profit-tx-row-${tx.id}`}>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-2.5 font-medium max-w-[120px] truncate">{tx.userDisplayName}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                                tx.type === "deposit" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" :
                                tx.type === "withdrawal" ? "bg-orange-500/10 text-orange-600 border-orange-500/30" :
                                "bg-violet-500/10 text-violet-600 border-violet-500/30"
                              }`}>{TX_TYPE_LABELS[tx.type] || tx.type}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                              {new Intl.NumberFormat("fr-FR").format(parseFloat(tx.amount))} {tx.currency}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-emerald-600 whitespace-nowrap">
                              +{new Intl.NumberFormat("fr-FR").format(parseFloat(tx.fees || "0"))} XOF
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{tx.provider || "—"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 2 — UTILISATEURS
          ══════════════════════════════════════ */}
          <TabsContent value="users" className="space-y-4 mt-5">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Rechercher utilisateur..." className="pl-10 h-10" data-testid="input-search-users" />
              </div>
              <button
                onClick={() => setSrFilter(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${srFilter ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20"}`}
                data-testid="btn-filter-sr"
              >
                <Zap className="h-3.5 w-3.5" />
                SR activé{srFilter ? ` (${filteredUsers.length})` : ""}
              </button>
              <button
                onClick={() => setBlockedFilter(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${blockedFilter ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20"}`}
                data-testid="btn-filter-blocked"
              >
                <Lock className="h-3.5 w-3.5" />
                Bloqués{blockedUsersCount > 0 ? ` (${blockedUsersCount})` : ""}
              </button>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Trier par solde :</span>
                {[
                  { v: "balance_desc" as const, label: "Plus grand" },
                  { v: "balance_asc" as const, label: "Plus petit" },
                  { v: "default" as const, label: "Par défaut" },
                ].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setUserSort(opt.v)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${userSort === opt.v ? "bg-indigo-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    data-testid={`btn-sort-users-${opt.v}`}
                  >
                    {opt.v === "balance_desc" && <ChevronDown className="h-3 w-3" />}
                    {opt.v === "balance_asc" && <ChevronUp className="h-3 w-3" />}
                    {opt.v === "default" && <ArrowUpDown className="h-3 w-3" />}
                    {opt.label}
                  </button>
                ))}
              </div>
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
                              {(u as any).apiSrEnabled && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400">API SR</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                            <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                            <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5" data-testid={`text-created-${u.id}`}>
                              <CalendarDays className="h-3 w-3" />
                              Inscrit le {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </p>
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
                            onClick={() => setBlockDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, isBlocked: u.isBlocked })}
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
                          <button
                            onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus || "not_started" }); setKycAction(null); setKycReason(""); }}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${u.kycStatus === "verified" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15" : "bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-500/15"}`}
                            data-testid={`btn-kyc-${u.id}`}>
                            <BadgeCheck className="h-3.5 w-3.5" />Vérification KYC
                          </button>
                          <button
                            onClick={() => setSrConfirmDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, enable: !(u as any).apiSrEnabled })}
                            disabled={enableSrM.isPending}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors border ${(u as any).apiSrEnabled ? "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 border-green-500/30" : "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border-orange-500/30"}`}
                            data-testid={`btn-sr-${u.id}`}>
                            <Zap className="h-3.5 w-3.5" />
                            {(u as any).apiSrEnabled ? "✓ API SR" : "Activer SR"}
                          </button>
                        </div>

                        {isExp && (
                          <div className="mt-4 space-y-3">
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
                                      <TypeChip type={tx.type} tx={tx} />
                                      <TxChip status={tx.status} />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold">{fmt(parseFloat(tx.amount))} {tx.currency || "XOF"}</span>
                                        {tx.fees && parseFloat(tx.fees) > 0 && (
                                          <span className="text-[10px] text-orange-500 ml-1">(-{fmt(parseFloat(tx.fees))})</span>
                                        )}
                                      </div>
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
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {blockedFilter ? "Aucun utilisateur bloqué" : "Aucun utilisateur trouvé"}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 3 — KYC
          ══════════════════════════════════════ */}

          {/* ══════════════════════════════════════
              TAB — MARCHANDS
          ══════════════════════════════════════ */}
          <TabsContent value="marchands" className="space-y-4 mt-5">
            <div className="rounded-2xl bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border border-violet-500/20 p-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-black text-base">Marchands actifs</p>
                <p className="text-xs text-muted-foreground">Utilisateurs ayant créé au moins 1 lien de paiement ou 1 clé API</p>
              </div>
              <div className="ml-auto text-right flex-shrink-0">
                <p className="text-2xl font-black text-violet-600">{merchantsLoading ? "—" : (merchants || []).length}</p>
                <p className="text-xs text-muted-foreground">marchands</p>
              </div>
            </div>

            {merchantsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />)}</div>
            ) : (merchants || []).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Aucun marchand pour l'instant</div>
            ) : (
              <div className="space-y-3">
                {(merchants || []).map((m: any) => (
                  <Card key={m.id} className={`border-border/50 overflow-hidden ${m.isBlocked ? "border-red-500/40 bg-red-500/5" : ""}`} data-testid={`card-merchant-${m.id}`}>
                    <CardContent className="p-4">
                      {/* User header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${m.isBlocked ? "bg-red-500/15 text-red-600" : "bg-violet-500/15 text-violet-600"}`}>
                          {(m.firstName?.[0] || m.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm truncate">{m.firstName} {m.lastName}</p>
                            {m.isBlocked && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 text-[10px] font-bold">Bloqué</span>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Solde</p>
                          <p className="font-black text-sm text-emerald-600">{fmt(parseFloat(m.balance || "0"))}</p>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex gap-2 mb-3">
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400 text-xs font-semibold">
                          <Link2 className="h-3 w-3" />{m.links.length} lien{m.links.length !== 1 ? "s" : ""}
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-semibold">
                          <Zap className="h-3 w-3" />{m.keys.length} clé{m.keys.length !== 1 ? "s" : ""}
                        </div>
                        <div className="ml-auto">
                          <button
                            onClick={() => setBlockDialog({ userId: m.id, name: `${m.firstName} ${m.lastName}`, isBlocked: m.isBlocked })}
                            disabled={blockM.isPending}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${m.isBlocked ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15" : "bg-red-500/10 text-red-600 hover:bg-red-500/15"}`}
                            data-testid={`btn-block-merchant-${m.id}`}
                          >
                            {m.isBlocked ? <><Unlock className="h-3.5 w-3.5" />Débloquer</> : <><Lock className="h-3.5 w-3.5" />Bloquer</>}
                          </button>
                        </div>
                      </div>

                      {/* Payment Links */}
                      {m.links.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Liens de paiement</p>
                          <div className="space-y-1.5">
                            {m.links.map((link: any) => (
                              <div key={link.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${link.adminLocked ? "border-red-500/30 bg-red-500/5" : "border-border/40 bg-muted/30"}`} data-testid={`row-link-${link.id}`}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{link.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{fmt(parseFloat(link.amount))} {link.currency} · utilisé {link.timesUsed}×</p>
                                </div>
                                {link.adminLocked && <span className="px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-600 text-[9px] font-bold flex-shrink-0">Bloqué</span>}
                                <button
                                  onClick={() => setToggleConfirmDialog({ type: "link", id: link.id, name: link.name || "ce lien", isCurrentlyActive: !link.adminLocked })}
                                  className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${link.adminLocked ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15" : "bg-red-500/10 text-red-600 hover:bg-red-500/15"}`}
                                  data-testid={`btn-toggle-link-${link.id}`}
                                >
                                  {link.adminLocked ? <><Unlock className="h-3 w-3" />Déverrouiller</> : <><Lock className="h-3 w-3" />Bloquer</>}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* API Keys */}
                      {m.keys.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Clés API</p>
                          <div className="space-y-1.5">
                            {m.keys.map((key: any) => (
                              <div key={key.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${key.adminLocked ? "border-red-500/30 bg-red-500/5" : "border-border/40 bg-muted/30"}`} data-testid={`row-key-${key.id}`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-semibold truncate">{key.name || key.appName}</p>
                                    {key.isSrKey && <span className="px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-600 text-[9px] font-bold">SR</span>}
                                    {key.adminLocked && <span className="px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-600 text-[9px] font-bold">Bloqué</span>}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono">{key.keyPrefix}••••</p>
                                </div>
                                <button
                                  onClick={() => setToggleConfirmDialog({ type: "key", id: key.id, name: key.name || key.appName || "cette clé", isCurrentlyActive: !key.adminLocked })}
                                  className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${key.adminLocked ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15" : "bg-red-500/10 text-red-600 hover:bg-red-500/15"}`}
                                  data-testid={`btn-toggle-key-${key.id}`}
                                >
                                  {key.adminLocked ? <><Unlock className="h-3 w-3" />Déverrouiller</> : <><Lock className="h-3 w-3" />Bloquer</>}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

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
                          {u.kycDocumentNumber && <p className="text-xs text-muted-foreground">N° pièce : <strong className="font-mono">{u.kycDocumentNumber}</strong></p>}
                          {u.kycStatus === "rejected" && u.kycRejectionReason && (
                            <p className="text-xs text-red-500 mt-1"><strong>Motif :</strong> {u.kycRejectionReason}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {u.kycStatus === "pending" && (
                            <>
                              <button onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus }); setKycAction(null); setKycReason(""); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-colors" data-testid={`btn-kyc-approve-${u.id}`}>
                                <CheckCircle2 className="h-3.5 w-3.5" />Approuver
                              </button>
                              <button onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus }); setKycAction(null); setKycReason(""); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/15 text-red-600 text-xs font-bold hover:bg-red-500/25 transition-colors" data-testid={`btn-kyc-reject-${u.id}`}>
                                <XCircle className="h-3.5 w-3.5" />Rejeter
                              </button>
                            </>
                          )}
                          <button onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus }); setKycAction(null); setKycReason(""); }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-500/10 text-muted-foreground text-xs font-bold hover:bg-slate-500/15 transition-colors" data-testid={`btn-kyc-modify-${u.id}`}>
                            <BadgeCheck className="h-3.5 w-3.5" />Modifier
                          </button>
                        </div>
                      </div>

                      {/* KYC Photos */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {[
                          { src: u.kycDocumentFront, label: "Recto", testId: `img-kyc-front-${u.id}` },
                          { src: u.kycDocumentBack, label: "Verso", testId: `img-kyc-back-${u.id}` },
                          { src: u.kycSelfie, label: "Selfie", testId: `img-kyc-selfie-${u.id}` },
                        ].map(({ src, label, testId }) => (
                          <div key={label} className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-medium text-center">{label}</p>
                            {src
                              ? <KycImage src={src} alt={label} testId={testId} />
                              : <div className="w-full aspect-[4/3] rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center" data-testid={testId}>
                                  <p className="text-[10px] text-muted-foreground font-medium">Non fourni</p>
                                </div>
                            }
                          </div>
                        ))}
                      </div>
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
                          onCheckedChange={() => setToggleConfirmDialog({ type: "link", id: link.id, name: link.name || "ce lien", isCurrentlyActive: !!link.isActive })}
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
                    <Badge variant="secondary" className="text-xs">{filteredApiKeys.length}</Badge>
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
                            {key.redirectUrl && (
                              <p className="text-xs text-blue-500 flex items-center gap-1">
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-xs">Redirect: {key.redirectUrl}</span>
                              </p>
                            )}
                            {key.webhookUrl && (
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-xs">Webhook: {key.webhookUrl}</span>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">🌍 Env: <span className="font-semibold">{key.environment || "live"}</span></p>
                            <p className="text-xs text-muted-foreground">📅 {key.createdAt ? new Date(key.createdAt).toLocaleDateString("fr-FR") : "—"}</p>
                            {key.lastUsedAt && <p className="text-xs text-muted-foreground">🕐 Dernier usage: {new Date(key.lastUsedAt).toLocaleDateString("fr-FR")}</p>}
                          </div>
                        </div>
                        <Switch
                          checked={!!key.isActive}
                          onCheckedChange={() => setToggleConfirmDialog({ type: "key", id: key.id, name: key.name || key.appName || "cette clé", isCurrentlyActive: !!key.isActive })}
                          data-testid={`toggle-apikey-${key.id}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Clés API SR ── */}
            <Card className="border-green-500/30 bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Key className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-400">Clés API SR</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400">Sans Redirection</span>
                    <Badge variant="secondary" className="text-xs">{filteredSrKeys.length}</Badge>
                  </CardTitle>
                  <button
                    onClick={() => setSrAllDialog(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 border border-green-500/30 transition-colors"
                    data-testid="btn-enable-sr-all"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Activer pour tous les utilisateurs
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {akLoading ? (
                  <div className="p-4 space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
                ) : filteredSrKeys.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Aucune clé SR créée</div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredSrKeys.map((key: any) => (
                      <div key={key.id} className="px-4 py-3 flex items-start gap-3 hover:bg-green-500/5 transition-colors" data-testid={`sr-key-${key.id}`}>
                        <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${key.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}>
                          <Key className={`h-4 w-4 ${key.isActive ? "text-green-600" : "text-rose-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{key.name || "Clé SR sans nom"}</p>
                            <Badge variant={key.isActive ? "default" : "destructive"} className="text-xs flex-shrink-0">
                              {key.isActive ? "Active" : "Bloquée"}
                            </Badge>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400">SR</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{key.keyPrefix}••••••••</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {key.user && <p className="text-xs text-muted-foreground">👤 {key.user.firstName} {key.user.lastName} — {key.user.email}</p>}
                            {key.webhookUrl && (
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-xs">Webhook: {key.webhookUrl}</span>
                              </p>
                            )}
                            {key.redirectUrl && (
                              <p className="text-xs text-blue-500 flex items-center gap-1">
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate max-w-xs">Redirect Wave: {key.redirectUrl}</span>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">📅 {key.createdAt ? new Date(key.createdAt).toLocaleDateString("fr-FR") : "—"}</p>
                            {key.lastUsedAt && <p className="text-xs text-muted-foreground">🕐 Dernier usage: {new Date(key.lastUsedAt).toLocaleDateString("fr-FR")}</p>}
                          </div>
                        </div>
                        <Switch
                          checked={!!key.isActive}
                          onCheckedChange={() => setToggleConfirmDialog({ type: "key", id: key.id, name: key.name || key.appName || "cette clé SR", isCurrentlyActive: !!key.isActive })}
                          data-testid={`toggle-sr-key-${key.id}`}
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

            {/* ── FRAIS DE SERVICE GLOBAUX ── */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Percent className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Frais de service globaux</p>
                    <p className="text-xs text-muted-foreground">Appliqués à toutes les transactions du site</p>
                  </div>
                </div>
                {!serviceFeeEdit && (
                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 rounded-xl"
                    onClick={() => setServiceFeeEdit({
                      deposit: String(serviceFees?.deposit ?? 7),
                      withdrawal: String(serviceFees?.withdrawal ?? 7),
                      transfer: String(serviceFees?.transfer ?? 7),
                      api: String(serviceFees?.api ?? 7),
                    })}
                    data-testid="btn-edit-service-fees"
                  >
                    <PenLine className="h-3 w-3" /> Modifier
                  </Button>
                )}
              </div>

              {serviceFeesLoading ? (
                <div className="p-5 space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : serviceFeeEdit ? (
                <div className="p-5 space-y-4">
                  {[
                    { key: "deposit" as const, label: "Dépôt & Liens de paiement", icon: <Banknote className="h-4 w-4 text-emerald-600" />, color: "emerald" },
                    { key: "withdrawal" as const, label: "Retrait", icon: <Send className="h-4 w-4 text-rose-600" />, color: "rose" },
                    { key: "transfer" as const, label: "Transfert", icon: <ArrowRightLeft className="h-4 w-4 text-blue-600" />, color: "blue" },
                    { key: "api" as const, label: "Paiement API", icon: <Code2 className="h-4 w-4 text-violet-600" />, color: "violet" },
                  ].map(({ key, label, icon }) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-52 flex-shrink-0">
                        {icon}
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                      <div className="relative flex-1 max-w-[140px]">
                        <Input
                          type="number" min="0" max="100" step="0.1"
                          value={serviceFeeEdit[key]}
                          onChange={e => setServiceFeeEdit(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                          className="pr-8 h-10 text-sm font-bold"
                          data-testid={`input-service-fee-${key}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-9 text-xs rounded-xl" onClick={() => setServiceFeeEdit(null)}>Annuler</Button>
                    <Button size="sm" className="h-9 text-xs rounded-xl font-bold"
                      disabled={serviceFeesM.isPending}
                      onClick={() => serviceFeesM.mutate({
                        deposit: parseFloat(serviceFeeEdit.deposit),
                        withdrawal: parseFloat(serviceFeeEdit.withdrawal),
                        transfer: parseFloat(serviceFeeEdit.transfer),
                        api: parseFloat(serviceFeeEdit.api),
                      })}
                      data-testid="btn-save-service-fees"
                    >
                      {serviceFeesM.isPending ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Dépôt & Liens", value: serviceFees?.deposit ?? 7, icon: <Banknote className="h-4 w-4 text-emerald-600" />, bg: "bg-emerald-500/8" },
                    { label: "Retrait", value: serviceFees?.withdrawal ?? 7, icon: <Send className="h-4 w-4 text-rose-600" />, bg: "bg-rose-500/8" },
                    { label: "Transfert", value: serviceFees?.transfer ?? 7, icon: <ArrowRightLeft className="h-4 w-4 text-blue-600" />, bg: "bg-blue-500/8" },
                    { label: "Paiement API", value: serviceFees?.api ?? 7, icon: <Code2 className="h-4 w-4 text-violet-600" />, bg: "bg-violet-500/8" },
                  ].map(({ label, value, icon, bg }) => (
                    <div key={label} className={`rounded-xl p-4 ${bg} border border-border/30 text-center`}>
                      <div className="flex justify-center mb-2">{icon}</div>
                      <p className="text-2xl font-black">{value}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── TAUX OMNIPAY (COÛT RÉEL) ── */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Taux de coût OmniPay</p>
                    <p className="text-xs text-muted-foreground">Utilisé pour calculer votre bénéfice net réel</p>
                  </div>
                </div>
                {!omnipayRateEdit && (
                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 rounded-xl"
                    onClick={() => setOmnipayRateEdit({
                      deposit: String(omnipayRates?.deposit ?? 3),
                      withdrawal: String(omnipayRates?.withdrawal ?? 3),
                    })}
                    data-testid="btn-edit-omnipay-rates"
                  >
                    <PenLine className="h-3 w-3" /> Modifier
                  </Button>
                )}
              </div>

              {omnipayRatesLoading ? (
                <div className="p-5 space-y-3">
                  {[1,2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : omnipayRateEdit ? (
                <div className="p-5 space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    Entrez les taux que OmniPay vous facture (voir votre contrat OmniPay). Par défaut : 3% collecte, 3% décaissement.
                  </div>
                  {[
                    { key: "deposit" as const, label: "Collecte (PAY-IN) — Dépôts", icon: <TrendingUp className="h-4 w-4 text-rose-600" /> },
                    { key: "withdrawal" as const, label: "Décaissement (PAY-OUT) — Retraits", icon: <TrendingDown className="h-4 w-4 text-rose-600" /> },
                  ].map(({ key, label, icon }) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-64 flex-shrink-0">
                        {icon}
                        <span className="text-sm font-semibold">{label}</span>
                      </div>
                      <div className="relative flex-1 max-w-[140px]">
                        <Input
                          type="number" min="0" max="100" step="0.5"
                          value={omnipayRateEdit[key]}
                          onChange={e => setOmnipayRateEdit(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                          className="pr-8 h-10 text-sm font-bold"
                          data-testid={`input-omnipay-rate-${key}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-9 text-xs rounded-xl" onClick={() => setOmnipayRateEdit(null)}>Annuler</Button>
                    <Button size="sm" className="h-9 text-xs rounded-xl font-bold"
                      disabled={omnipayRatesM.isPending}
                      onClick={() => omnipayRatesM.mutate({
                        deposit: parseFloat(omnipayRateEdit.deposit),
                        withdrawal: parseFloat(omnipayRateEdit.withdrawal),
                      })}
                      data-testid="btn-save-omnipay-rates"
                    >
                      {omnipayRatesM.isPending ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-5 grid grid-cols-2 gap-3">
                  {[
                    { label: "Collecte (PAY-IN)", value: omnipayRates?.deposit ?? 3, icon: <TrendingUp className="h-4 w-4 text-rose-600" />, bg: "bg-rose-500/8" },
                    { label: "Décaissement (PAY-OUT)", value: omnipayRates?.withdrawal ?? 3, icon: <TrendingDown className="h-4 w-4 text-rose-600" />, bg: "bg-rose-500/8" },
                  ].map(({ label, value, icon, bg }) => (
                    <div key={label} className={`rounded-xl p-4 ${bg} border border-border/30 text-center`}>
                      <div className="flex justify-center mb-2">{icon}</div>
                      <p className="text-2xl font-black">{value}%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 6 — MOYENS DE PAIEMENT
          ══════════════════════════════════════ */}
          <TabsContent value="payments" className="space-y-4 mt-5">
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Désactiver</strong> un réseau l'empêche complètement d'être utilisé dans tous les pays.
                La <strong>maintenance par pays</strong> permet de bloquer un opérateur uniquement dans les pays sélectionnés — ex: MTN Bénin en maintenance, MTN Côte d'Ivoire toujours actif.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => globalMaintM.mutate(true)}
                disabled={globalMaintM.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm font-bold hover:bg-amber-500/15 transition-colors disabled:opacity-60"
                data-testid="btn-global-maintenance-on"
              >
                <ZapOff className="h-4 w-4" />
                Tout mettre en maintenance
              </button>
              <button
                onClick={() => globalMaintM.mutate(false)}
                disabled={globalMaintM.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold hover:bg-emerald-500/15 transition-colors disabled:opacity-60"
                data-testid="btn-global-maintenance-off"
              >
                <Zap className="h-4 w-4" />
                Tout remettre en service
              </button>
            </div>

            {/* ── Pays suspendus ── */}
            <div className="border border-red-500/30 rounded-2xl overflow-hidden">
              <div className="bg-red-500/10 px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Pays suspendus
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Un pays suspendu n'apparaît plus dans dépôts, retraits, liens de paiement ni API (mais reste dans l'inscription).</p>
                </div>
                {suspendedCountryCodes.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/15 text-red-600 border border-red-500/30">{suspendedCountryCodes.length} suspendu(s)</span>
                )}
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {COUNTRIES.map((c) => {
                  const isSuspended = suspendedCountryCodes.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      onClick={() => {
                        const updated = isSuspended
                          ? suspendedCountryCodes.filter(code => code !== c.code)
                          : [...suspendedCountryCodes, c.code];
                        suspendCountryM.mutate(updated);
                      }}
                      disabled={suspendCountryM.isPending || suspLoading}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${isSuspended ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400" : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}
                      data-testid={`btn-suspend-country-${c.code}`}
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1 text-left">{c.name}</span>
                      {isSuspended && <XCircle className="h-3 w-3 ml-auto text-red-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {pmLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {(paymentMethods || []).map((pm: any) => {
                  const maintCountries: string[] = pm.maintenanceCountries || [];
                  const wmCountries: string[] = pm.withdrawalMaintenanceCountries || [];
                  const pmCountries: string[] = pm.countries || [];
                  const hasMaint = pm.inMaintenance || maintCountries.length > 0;
                  const hasWithdrawalMaint = pm.withdrawalMaintenance || wmCountries.length > 0;
                  const statusBand = pm.inMaintenance ? "bg-amber-500" : !pm.isActive ? "bg-red-500" : hasMaint ? "bg-amber-400" : "bg-emerald-500";

                  function toggleCountryMaint(countryCode: string) {
                    const current = maintCountries;
                    const updated = current.includes(countryCode)
                      ? current.filter((c: string) => c !== countryCode)
                      : [...current, countryCode];
                    pmM.mutate({ code: pm.code, maintenanceCountries: updated });
                  }

                  function toggleWithdrawalCountryMaint(countryCode: string) {
                    const updated = wmCountries.includes(countryCode)
                      ? wmCountries.filter((c: string) => c !== countryCode)
                      : [...wmCountries, countryCode];
                    pmM.mutate({ code: pm.code, withdrawalMaintenanceCountries: updated });
                  }

                  return (
                    <Card key={pm.code} className={`border-border/50 overflow-hidden ${pm.inMaintenance ? "border-amber-500/30" : !pm.isActive ? "border-red-500/20 opacity-70" : hasMaint ? "border-amber-500/20" : ""}`} data-testid={`card-pm-${pm.code}`}>
                      <CardContent className="p-0">
                        <div className={`h-1.5 ${statusBand}`} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">{pm.name}</p>
                                {pm.inMaintenance && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-xs font-semibold"><ZapOff className="h-2.5 w-2.5" />Tout en maint.</span>}
                                {!pm.isActive && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 border border-red-500/30 text-xs font-semibold">Désactivé</span>}
                                {pm.isActive && !pm.inMaintenance && !hasMaint && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-semibold"><Zap className="h-2.5 w-2.5" />Actif partout</span>}
                                {pm.isActive && !pm.inMaintenance && hasMaint && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30 text-xs font-semibold"><ZapOff className="h-2.5 w-2.5" />Maint. partielle</span>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{pmCountries.join(" · ")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-semibold">{pm.feeValue}%</span>
                              <Switch checked={pm.isActive} onCheckedChange={(v) => pmM.mutate({ code: pm.code, isActive: v })} disabled={pmM.isPending} data-testid={`switch-active-${pm.code}`} />
                            </div>
                          </div>

                          {pm.isActive && (
                            <div className="space-y-2">
                            <div className="border border-border/40 rounded-xl overflow-hidden">
                              <div className="bg-muted/30 px-3 py-1.5 flex items-center justify-between">
                                <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><ZapOff className="h-3 w-3" />Maintenance par pays</p>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={pm.inMaintenance}
                                    onCheckedChange={(v) => pmM.mutate({ code: pm.code, inMaintenance: v })}
                                    disabled={pmM.isPending}
                                    data-testid={`switch-maintenance-${pm.code}`}
                                  />
                                  <span className="text-xs text-muted-foreground">{pm.inMaintenance ? "Tous les pays" : "Sélectif"}</span>
                                </div>
                              </div>
                              {!pm.inMaintenance && (
                                <div className="p-2 grid grid-cols-3 gap-1.5">
                                  {pmCountries.map((cc: string) => {
                                    const cInfo = COUNTRIES.find(c => c.code === cc);
                                    const isMaint = maintCountries.includes(cc);
                                    return (
                                      <button
                                        key={cc}
                                        onClick={() => toggleCountryMaint(cc)}
                                        disabled={pmM.isPending}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all ${isMaint ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}
                                        data-testid={`btn-maint-country-${pm.code}-${cc}`}
                                      >
                                        <span>{cInfo?.flag || "🌍"}</span>
                                        <span>{cc}</span>
                                        {isMaint && <ZapOff className="h-2.5 w-2.5 ml-auto" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Withdrawal maintenance */}
                            <div className="border border-orange-500/30 rounded-xl overflow-hidden mt-2">
                              <div className="bg-orange-500/10 px-3 py-1.5 flex items-center justify-between">
                                <p className="text-xs font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                                  <ZapOff className="h-3 w-3" />Maintenance retraits
                                  {hasWithdrawalMaint && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 text-[10px]">Actif</span>}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={pm.withdrawalMaintenance}
                                    onCheckedChange={(v) => pmM.mutate({ code: pm.code, withdrawalMaintenance: v })}
                                    disabled={pmM.isPending}
                                    data-testid={`switch-withdrawal-maint-${pm.code}`}
                                  />
                                  <span className="text-xs text-muted-foreground">{pm.withdrawalMaintenance ? "Tous les pays" : "Sélectif"}</span>
                                </div>
                              </div>
                              {!pm.withdrawalMaintenance && (
                                <div className="p-2 grid grid-cols-3 gap-1.5">
                                  {pmCountries.map((cc: string) => {
                                    const cInfo = COUNTRIES.find(c => c.code === cc);
                                    const isWMaint = wmCountries.includes(cc);
                                    return (
                                      <button
                                        key={cc}
                                        onClick={() => toggleWithdrawalCountryMaint(cc)}
                                        disabled={pmM.isPending}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all ${isWMaint ? "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400" : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}
                                        data-testid={`btn-withdrawal-maint-${pm.code}-${cc}`}
                                      >
                                        <span>{cInfo?.flag || "🌍"}</span>
                                        <span>{cc}</span>
                                        {isWMaint && <ZapOff className="h-2.5 w-2.5 ml-auto" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Per-operator fees */}
                            {(() => {
                              const editing = pmFeeEdit[pm.code];
                              const hasCustFees = pm.feeDeposit != null || pm.feeWithdrawal != null || pm.feePLink != null || pm.feeApi != null;
                              return (
                                <div className="border border-blue-500/30 rounded-xl overflow-hidden mt-2">
                                  <div className="bg-blue-500/10 px-3 py-1.5 flex items-center justify-between">
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                      <span>%</span> Frais spécifiques
                                      {hasCustFees && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 text-[10px]">Personnalisés</span>}
                                    </p>
                                    {!editing ? (
                                      <button
                                        className="text-xs text-blue-600 hover:underline"
                                        onClick={() => setPmFeeEdit(prev => ({ ...prev, [pm.code]: { deposit: pm.feeDeposit ?? "", withdrawal: pm.feeWithdrawal ?? "", plink: pm.feePLink ?? "", api: pm.feeApi ?? "" } }))}
                                        data-testid={`btn-fee-edit-${pm.code}`}
                                      >Modifier</button>
                                    ) : (
                                      <div className="flex gap-2">
                                        <button
                                          className="text-xs text-emerald-600 hover:underline font-semibold"
                                          disabled={pmM.isPending}
                                          onClick={() => {
                                            const f = pmFeeEdit[pm.code];
                                            pmM.mutate({ code: pm.code, feeDeposit: f.deposit || null, feeWithdrawal: f.withdrawal || null, feePLink: f.plink || null, feeApi: f.api || null });
                                            setPmFeeEdit(prev => { const n = {...prev}; delete n[pm.code]; return n; });
                                          }}
                                          data-testid={`btn-fee-save-${pm.code}`}
                                        >Sauv.</button>
                                        <button
                                          className="text-xs text-muted-foreground hover:underline"
                                          onClick={() => setPmFeeEdit(prev => { const n = {...prev}; delete n[pm.code]; return n; })}
                                          data-testid={`btn-fee-cancel-${pm.code}`}
                                        >Annuler</button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-2.5">
                                    {editing ? (
                                      <div className="grid grid-cols-2 gap-2">
                                        {[
                                          { key: "deposit" as const, label: "Dépôt %" },
                                          { key: "withdrawal" as const, label: "Retrait %" },
                                          { key: "plink" as const, label: "Lien paiement %" },
                                          { key: "api" as const, label: "API %" },
                                        ].map(({ key, label }) => (
                                          <div key={key}>
                                            <p className="text-[10px] text-muted-foreground mb-1">{label} <span className="text-[9px]">(vide = global)</span></p>
                                            <input
                                              type="number"
                                              step="0.1"
                                              min="0"
                                              max="100"
                                              placeholder="Global"
                                              value={pmFeeEdit[pm.code][key]}
                                              onChange={e => setPmFeeEdit(prev => ({ ...prev, [pm.code]: { ...prev[pm.code], [key]: e.target.value } }))}
                                              className="w-full h-8 text-xs px-2 rounded-lg border border-border bg-background"
                                              data-testid={`input-fee-${pm.code}-${key}`}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                        {[
                                          { label: "Dépôt", val: pm.feeDeposit },
                                          { label: "Retrait", val: pm.feeWithdrawal },
                                          { label: "Lien pmt", val: pm.feePLink },
                                          { label: "API", val: pm.feeApi },
                                        ].map(({ label, val }) => (
                                          <div key={label} className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">{label}</span>
                                            <span className={val != null ? "font-semibold text-blue-600" : "text-muted-foreground/50"}>{val != null ? `${val}%` : "Global"}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Per-country fees */}
                            {pm.countries && pm.countries.length > 0 && (() => {
                              const isExpanded = expandedCountryFees.has(pm.code);
                              const countryFeesMap: Record<string, any> = (pm.countryFees as Record<string, any>) || {};
                              const hasCustomCountryFees = pm.countries.some((cc: string) => {
                                const cf = countryFeesMap[cc] || {};
                                return cf.feeDeposit != null || cf.feeWithdrawal != null || cf.feePLink != null || cf.feeApi != null;
                              });
                              return (
                                <div className="border border-violet-500/30 rounded-xl overflow-hidden mt-2">
                                  <button
                                    className="w-full bg-violet-500/10 px-3 py-1.5 flex items-center justify-between"
                                    onClick={() => setExpandedCountryFees(prev => {
                                      const n = new Set(prev);
                                      n.has(pm.code) ? n.delete(pm.code) : n.add(pm.code);
                                      return n;
                                    })}
                                    data-testid={`btn-country-fees-toggle-${pm.code}`}
                                  >
                                    <p className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                                      <Globe className="h-3 w-3" /> Frais par pays
                                      {hasCustomCountryFees && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-600 text-[10px]">Personnalisés</span>}
                                    </p>
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-violet-500" /> : <ChevronDown className="h-3.5 w-3.5 text-violet-500" />}
                                  </button>
                                  {isExpanded && (
                                    <div className="p-2 space-y-1.5">
                                      {pm.countries.map((cc: string) => {
                                        const editKey = `${pm.code}_${cc}`;
                                        const editing = pmCountryFeeEdit[editKey];
                                        const cInfo = COUNTRIES.find(c => c.code === cc);
                                        const existingFee: Record<string, any> = countryFeesMap[cc] || {};
                                        const hasCF = existingFee.feeDeposit != null || existingFee.feeWithdrawal != null || existingFee.feePLink != null || existingFee.feeApi != null;
                                        return (
                                          <div key={cc} className={`rounded-lg border p-2 ${hasCF ? "border-violet-500/40 bg-violet-500/5" : "border-border/40"}`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                              <span className="text-xs font-semibold flex items-center gap-1">
                                                <span>{cInfo?.flag || "🌍"}</span>
                                                <span>{cInfo?.name || cc}</span>
                                              </span>
                                              {!editing ? (
                                                <button
                                                  className="text-[10px] text-violet-600 hover:underline"
                                                  onClick={() => setPmCountryFeeEdit(prev => ({
                                                    ...prev,
                                                    [editKey]: {
                                                      deposit: existingFee.feeDeposit ?? "",
                                                      withdrawal: existingFee.feeWithdrawal ?? "",
                                                      plink: existingFee.feePLink ?? "",
                                                      api: existingFee.feeApi ?? "",
                                                    }
                                                  }))}
                                                  data-testid={`btn-country-fee-edit-${pm.code}-${cc}`}
                                                >Modifier</button>
                                              ) : (
                                                <div className="flex gap-1.5">
                                                  <button
                                                    className="text-[10px] text-emerald-600 hover:underline font-semibold"
                                                    disabled={pmM.isPending}
                                                    onClick={() => {
                                                      const f = pmCountryFeeEdit[editKey];
                                                      const updatedCF = {
                                                        ...countryFeesMap,
                                                        [cc]: {
                                                          feeDeposit: f.deposit === "" ? null : f.deposit,
                                                          feeWithdrawal: f.withdrawal === "" ? null : f.withdrawal,
                                                          feePLink: f.plink === "" ? null : f.plink,
                                                          feeApi: f.api === "" ? null : f.api,
                                                        }
                                                      };
                                                      pmM.mutate({ code: pm.code, countryFees: updatedCF });
                                                      setPmCountryFeeEdit(prev => { const n = {...prev}; delete n[editKey]; return n; });
                                                    }}
                                                    data-testid={`btn-country-fee-save-${pm.code}-${cc}`}
                                                  >Sauv.</button>
                                                  <button
                                                    className="text-[10px] text-muted-foreground hover:underline"
                                                    onClick={() => setPmCountryFeeEdit(prev => { const n = {...prev}; delete n[editKey]; return n; })}
                                                    data-testid={`btn-country-fee-cancel-${pm.code}-${cc}`}
                                                  >Annuler</button>
                                                </div>
                                              )}
                                            </div>
                                            {editing ? (
                                              <div className="grid grid-cols-2 gap-1.5">
                                                {([
                                                  { key: "deposit" as const, label: "Dépôt %" },
                                                  { key: "withdrawal" as const, label: "Retrait %" },
                                                  { key: "plink" as const, label: "Lien pmt %" },
                                                  { key: "api" as const, label: "API %" },
                                                ]).map(({ key, label }) => (
                                                  <div key={key}>
                                                    <p className="text-[9px] text-muted-foreground mb-0.5">{label} <span className="text-[8px]">(vide = opér.)</span></p>
                                                    <input
                                                      type="number"
                                                      step="0.1"
                                                      min="0"
                                                      max="100"
                                                      placeholder="Opér."
                                                      value={pmCountryFeeEdit[editKey][key]}
                                                      onChange={e => setPmCountryFeeEdit(prev => ({ ...prev, [editKey]: { ...prev[editKey], [key]: e.target.value } }))}
                                                      className="w-full h-7 text-xs px-1.5 rounded border border-border bg-background"
                                                      data-testid={`input-country-fee-${pm.code}-${cc}-${key}`}
                                                    />
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                                {[
                                                  { label: "Dépôt", val: existingFee.feeDeposit },
                                                  { label: "Retrait", val: existingFee.feeWithdrawal },
                                                  { label: "Lien pmt", val: existingFee.feePLink },
                                                  { label: "API", val: existingFee.feeApi },
                                                ].map(({ label, val }) => (
                                                  <div key={label} className="flex justify-between text-[10px]">
                                                    <span className="text-muted-foreground">{label}</span>
                                                    <span className={val != null && val !== "" ? "font-semibold text-violet-600" : "text-muted-foreground/40"}>{val != null && val !== "" ? `${val}%` : "Opér."}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 7 — TRANSACTIONS
          ══════════════════════════════════════ */}
          <TabsContent value="transactions" className="space-y-4 mt-5">
            {pendingWithdrawals.length > 0 && !isAutoWithdrawal && (
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold">{fmt(parseFloat(tx.amount))} {tx.currency || "XOF"}</p>
                            {tx.fees && parseFloat(tx.fees) > 0 && (() => {
                              const fees = parseFloat(tx.fees);
                              const amount = parseFloat(tx.amount);
                              const net = amount - fees;
                              const pct = amount > 0 ? ((fees / amount) * 100).toFixed(1) : "0";
                              return (
                                <>
                                  <span className="text-xs text-orange-500">Frais: {fmt(fees)} ({pct}%)</span>
                                  <span className="text-xs text-emerald-600 font-bold">→ Net: {fmt(net)}</span>
                                </>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground">{tx.userDisplayName || "—"} · {tx.phoneNumber} · {tx.provider || "—"} · {fmtDate(tx.createdAt)}</p>
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
                <Input value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Référence, téléphone, nom, API, lien..." className="pl-10 h-10" data-testid="input-search-tx" />
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
                          <TypeChip type={tx.type} tx={tx} />
                          <TxChip status={tx.status} />
                          <span className="text-xs font-mono text-muted-foreground">{tx.reference}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/80 bg-muted/60 border border-border/40 rounded-md px-1.5 py-0.5">
                            <User className="h-2.5 w-2.5 text-muted-foreground" />
                            {tx.userDisplayName || "—"}
                          </span>
                          {tx.phoneNumber && <span className="text-xs text-muted-foreground">{tx.phoneNumber}</span>}
                          {(tx.payerOperator || tx.provider)
                            ? <span className="text-xs font-semibold text-foreground/70 bg-muted/60 border border-border/40 rounded px-1 py-0.5">{tx.payerOperator || tx.provider}</span>
                            : tx.type === "deposit" && tx.apiKeyId
                              ? <span className="text-[10px] text-muted-foreground italic">opérateur non sélectionné</span>
                              : null
                          }
                          <span className="text-xs text-muted-foreground">{fmtDate(tx.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black">{fmt(parseFloat(tx.amount))} {tx.currency || "XOF"}</p>
                          {tx.fees && parseFloat(tx.fees) > 0 && (() => {
                            const fees = parseFloat(tx.fees);
                            const amount = parseFloat(tx.amount);
                            const pct = amount > 0 ? ((fees / amount) * 100).toFixed(1) : "0";
                            const net = amount - fees;
                            return (
                              <div className="space-y-0.5">
                                <p className="text-xs text-orange-500 dark:text-orange-400">Frais: {fmt(fees)} ({pct}%)</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">Net: {fmt(net)}</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB — NOTIFICATIONS
          ══════════════════════════════════════ */}
          <TabsContent value="notifications" className="space-y-4 mt-5">
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
              <BellRing className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Envoyer une notification</p>
                <p className="text-xs text-muted-foreground mt-0.5">La notification s'affichera dans le dashboard de tous les utilisateurs. Ils peuvent la fermer avec le bouton ✕.</p>
              </div>
            </div>

            <Card className="border-border/50">
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titre</Label>
                  <Input
                    value={notifForm.title}
                    onChange={e => setNotifForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Maintenance prévue"
                    className="h-10"
                    data-testid="input-notif-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Message</Label>
                  <Textarea
                    value={notifForm.message}
                    onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Rédigez votre message..."
                    className="min-h-[80px] resize-none"
                    data-testid="input-notif-message"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Couleur d'affichage</Label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setNotifForm(p => ({ ...p, color: "blue" }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${notifForm.color === "blue" ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400" : "border-border text-muted-foreground hover:border-blue-300"}`}
                      data-testid="btn-color-blue"
                    >
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      Bleu — Information
                    </button>
                    <button
                      onClick={() => setNotifForm(p => ({ ...p, color: "red" }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${notifForm.color === "red" ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" : "border-border text-muted-foreground hover:border-red-300"}`}
                      data-testid="btn-color-red"
                    >
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      Rouge — Urgence
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lien optionnel</p>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">URL du lien</Label>
                    <Input
                      value={notifForm.linkUrl}
                      onChange={e => setNotifForm(p => ({ ...p, linkUrl: e.target.value }))}
                      placeholder="https://..."
                      className="h-10 text-sm"
                      data-testid="input-notif-link-url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Nom du bouton (ex : Rejoindre, En savoir plus…)</Label>
                    <Input
                      value={notifForm.linkLabel}
                      onChange={e => setNotifForm(p => ({ ...p, linkLabel: e.target.value }))}
                      placeholder="Ex: Rejoindre"
                      className="h-10 text-sm"
                      data-testid="input-notif-link-label"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => createNotifM.mutate({ ...notifForm, linkUrl: notifForm.linkUrl || undefined, linkLabel: notifForm.linkLabel || undefined })}
                  disabled={createNotifM.isPending || !notifForm.title || !notifForm.message}
                  className="w-full h-10 font-bold"
                  data-testid="btn-send-notification"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {createNotifM.isPending ? "Envoi..." : "Envoyer la notification"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Notifications existantes</p>
              {notifsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : (adminNotifications || []).length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">Aucune notification envoyée</div>
              ) : (
                <div className="space-y-2">
                  {(adminNotifications || []).map((n: any) => (
                    <div key={n.id} className={`p-4 rounded-2xl border transition-all ${n.isActive ? (n.color === "red" ? "border-red-500/30 bg-red-500/5" : "border-blue-500/30 bg-blue-500/5") : "border-border/40 bg-muted/20 opacity-60"}`} data-testid={`row-notif-${n.id}`}>
                      <div className="flex items-start gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${n.color === "red" ? "bg-red-500" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          {n.linkUrl && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                              🔗 {n.linkLabel || n.linkUrl}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("fr-FR")}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setEditNotifDialog({ id: n.id, title: n.title, message: n.message, color: n.color || "blue", linkUrl: n.linkUrl || "", linkLabel: n.linkLabel || "" })}
                            className="h-8 w-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                            data-testid={`btn-edit-notif-${n.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => deleteNotifM.mutate(n.id)}
                            className="h-8 w-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                            data-testid={`btn-delete-notif-${n.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs font-bold ${n.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            {n.isActive ? "✅ Visible par les utilisateurs" : "🔕 Masquée — non visible"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Appuyez sur le bouton pour changer</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{n.isActive ? "Actif" : "Inactif"}</span>
                          <Switch
                            checked={!!n.isActive}
                            onCheckedChange={v => toggleNotifM.mutate({ id: n.id, isActive: v })}
                            data-testid={`switch-notif-${n.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 10 — LIENS SUPPORT
          ══════════════════════════════════════ */}
          <TabsContent value="support-links" className="space-y-4 mt-5">
            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 flex items-start gap-3">
              <HeadphonesIcon className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-violet-700 dark:text-violet-400">Liens de contact Support</p>
                <p className="text-xs text-muted-foreground mt-0.5">Modifiez les liens affichés sur la page Support pour tous les utilisateurs.</p>
              </div>
            </div>
            <Card className="border-border/50">
              <CardContent className="pt-5 space-y-4">
                {supportLinksLoading ? (
                  <div className="space-y-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
                ) : (() => {
                  const form = supportLinksForm || supportLinks || {};
                  const fields = [
                    { key: "support_link_whatsapp_direct", label: "WhatsApp Direct", placeholder: "https://wa.me/..." },
                    { key: "support_link_whatsapp_group", label: "Groupe WhatsApp", placeholder: "https://chat.whatsapp.com/..." },
                    { key: "support_link_email", label: "Email (lien mailto:)", placeholder: "mailto:support@..." },
                    { key: "support_link_whatsapp_channel", label: "Canal WhatsApp", placeholder: "https://whatsapp.com/channel/..." },
                    { key: "support_link_facebook", label: "Page Facebook", placeholder: "https://www.facebook.com/..." },
                  ];
                  return (
                    <>
                      {fields.map(f => (
                        <div key={f.key} className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{f.label}</Label>
                          <Input
                            value={form[f.key] || ""}
                            onChange={e => setSupportLinksForm(prev => ({ ...(prev || supportLinks || {}), [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className="h-10 text-sm font-mono"
                            data-testid={`input-support-${f.key}`}
                          />
                        </div>
                      ))}
                      <div className="flex gap-3 pt-2">
                        {supportLinksForm && (
                          <Button variant="outline" className="flex-1 h-10" onClick={() => setSupportLinksForm(null)} data-testid="btn-cancel-support-links">
                            Annuler
                          </Button>
                        )}
                        <Button
                          className="flex-1 h-10 font-bold"
                          onClick={() => saveSupportLinksM.mutate(form)}
                          disabled={saveSupportLinksM.isPending}
                          data-testid="btn-save-support-links"
                        >
                          {saveSupportLinksM.isPending ? "Enregistrement..." : "Enregistrer les liens"}
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════
              TAB 11 — PARAMÈTRES ADMIN
          ══════════════════════════════════════ */}
          <TabsContent value="settings" className="space-y-5 mt-5">
            <WithdrawalModeCard />
            {/* ── OTP CONFIG ── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  Configuration OTP
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Activez ou désactivez l'OTP par opérateur et par pays. Si un code est renseigné, il sera envoyé en arrière-plan sans interaction de l'utilisateur. Les pays suspendus sont exclus.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {(() => {
                  const OTP_DEFAULTS: Record<string, Record<string, { requiresOtp: boolean; defaultOtp?: string }>> = {
                    Orange: { CM: { requiresOtp: true, defaultOtp: "0000" }, BF: { requiresOtp: true }, CI: { requiresOtp: true }, SN: { requiresOtp: true } },
                    Moov: { CI: { requiresOtp: true } },
                  };
                  const rows: Array<{ pmCode: string; country: string; flag: string; countryName: string; requiresOtp: boolean; defaultOtp: string }> = [];
                  (paymentMethods ?? []).forEach((pm: any) => {
                    (pm.countries ?? []).forEach((ctry: string) => {
                      if (suspendedCountryCodes.includes(ctry)) return;
                      const info = COUNTRIES.find(c => c.code === ctry);
                      const saved = pm.otpConfig?.[ctry];
                      const fallback = OTP_DEFAULTS[pm.code]?.[ctry];
                      const requiresOtp = saved !== undefined ? saved.requiresOtp : (fallback?.requiresOtp ?? false);
                      const defaultOtp = saved !== undefined ? (saved.defaultOtp ?? "") : (fallback?.defaultOtp ?? "");
                      rows.push({ pmCode: pm.code, country: ctry, flag: info?.flag ?? "🌍", countryName: info?.name ?? ctry, requiresOtp, defaultOtp });
                    });
                  });
                  if (rows.length === 0) return <p className="text-xs text-muted-foreground">Aucun moyen de paiement configuré.</p>;

                  const saveOtp = (pmCode: string, country: string, requiresOtp: boolean, defaultOtp: string) => {
                    const pm = (paymentMethods ?? []).find((p: any) => p.code === pmCode);
                    if (!pm) return;
                    const newOtpConfig = { ...(pm.otpConfig ?? {}) };
                    newOtpConfig[country] = { requiresOtp, defaultOtp: defaultOtp.trim() || null };
                    pmM.mutate({ code: pm.code, otpConfig: newOtpConfig });
                  };

                  return (
                    <div className="rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden">
                      {rows.map(row => {
                        const key = `${row.pmCode}__${row.country}`;
                        const codeVal = otpCodeEdit[key] ?? row.defaultOtp;
                        const codeChanged = codeVal !== row.defaultOtp;
                        return (
                          <div key={key} className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/20">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-xs">{row.pmCode}</span>
                              <span className="text-xs text-muted-foreground ml-2">{row.flag} {row.countryName}</span>
                            </div>
                            <button
                              type="button"
                              disabled={pmM.isPending}
                              onClick={() => saveOtp(row.pmCode, row.country, !row.requiresOtp, row.defaultOtp)}
                              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${row.requiresOtp ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-600"}`}
                              data-testid={`otp-toggle-${key}`}
                            >
                              {row.requiresOtp ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {row.requiresOtp ? "OTP actif" : "Sans OTP"}
                            </button>
                            {row.requiresOtp && (
                              <input
                                type="text"
                                value={codeVal}
                                onChange={e => setOtpCodeEdit(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Code auto"
                                maxLength={8}
                                className="w-20 flex-shrink-0 px-2 py-1 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                data-testid={`otp-code-${key}`}
                              />
                            )}
                            <div className="w-7 flex-shrink-0 flex justify-end">
                              {row.requiresOtp && codeChanged && (
                                <button
                                  type="button"
                                  disabled={pmM.isPending}
                                  onClick={() => {
                                    saveOtp(row.pmCode, row.country, row.requiresOtp, codeVal);
                                    setOtpCodeEdit(prev => { const n = { ...prev }; delete n[key]; return n; });
                                  }}
                                  className="h-6 w-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center"
                                  data-testid={`otp-save-code-${key}`}
                                >
                                  {pmM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
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

          {/* ══════════════════════════════════════════════════════════
              ONGLET : ERREURS SYSTÈME
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="errors" className="space-y-4 mt-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Erreurs de paiement récentes
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actualisé toutes les 15 secondes — {paymentErrorsData?.total ?? 0} erreur(s) en mémoire (max 300)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchErrors()} className="gap-1.5 text-xs" data-testid="btn-refresh-errors">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Actualiser
                </Button>
                <Button variant="destructive" size="sm" onClick={() => clearErrorsM.mutate()} disabled={clearErrorsM.isPending || (paymentErrorsData?.errors?.length ?? 0) === 0} className="gap-1.5 text-xs" data-testid="btn-clear-errors">
                  <Trash2 className="h-3.5 w-3.5" />
                  Effacer le journal
                </Button>
              </div>
            </div>

            {errorsLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : !paymentErrorsData?.errors?.length ? (
              <Card className="rounded-2xl">
                <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="font-semibold text-base">Aucune erreur récente</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Les erreurs de paiement OmniPay apparaissent ici dès qu'elles surviennent.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {paymentErrorsData.errors.map((err: any, i: number) => (
                  <Card key={i} className="rounded-2xl border-orange-200 dark:border-orange-900/40" data-testid={`card-error-${i}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${err.type === "deposit" ? "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/40" : err.type === "withdrawal" ? "border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-950/40" : "border-gray-400 text-gray-600"}`} data-testid={`badge-type-${i}`}>
                              {err.type === "deposit" ? "Dépôt" : err.type === "withdrawal" ? "Retrait" : "Transfert"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border-slate-300 text-slate-600" data-testid={`badge-country-${i}`}>
                              <Globe className="h-3 w-3 mr-1 inline" />{err.country}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-500" data-testid={`badge-operator-${i}`}>
                              {err.operator}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-400" data-testid={`badge-source-${i}`}>
                              {err.source}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 truncate" title={err.message} data-testid={`text-error-msg-${i}`}>{err.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5" data-testid={`text-error-time-${i}`}>
                            Dernière occurrence : {new Date(err.lastSeen).toLocaleString("fr-FR")}
                          </p>
                        </div>
                        <div className="flex gap-4 sm:flex-col sm:items-end text-center sm:text-right shrink-0">
                          <div>
                            <p className="text-xl font-black text-orange-600 dark:text-orange-400 leading-none" data-testid={`text-error-count-${i}`}>{err.count}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">occurrences</p>
                          </div>
                          <div>
                            <p className="text-xl font-black text-rose-600 dark:text-rose-400 leading-none" data-testid={`text-error-users-${i}`}>{err.affectedUsers}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">utilisateur(s)</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* ════ KYC DIALOG ════ */}
      <Dialog open={!!kycDialog} onOpenChange={(o) => { if (!o) { setKycDialog(null); setKycReason(""); } }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-indigo-500" />Statut de vérification</DialogTitle>
            <DialogDescription>Compte : <strong>{kycDialog?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setKycAction("verified")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all text-center ${kycAction === "verified" ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-border/60 text-muted-foreground hover:border-border"}`}
                data-testid="btn-kyc-action-verified">
                <CheckCircle2 className="h-4 w-4 mx-auto mb-1" />Vérifié
              </button>
              <button onClick={() => setKycAction("rejected")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all text-center ${kycAction === "rejected" ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" : "border-border/60 text-muted-foreground hover:border-border"}`}
                data-testid="btn-kyc-action-rejected">
                <XCircle className="h-4 w-4 mx-auto mb-1" />Rejeté
              </button>
              <button onClick={() => setKycAction("not_started")}
                className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all text-center ${kycAction === "not_started" ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-border/60 text-muted-foreground hover:border-border"}`}
                data-testid="btn-kyc-action-not_started">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1" />Non vérifié
              </button>
            </div>
            {kycAction === null && (
              <p className="text-xs text-muted-foreground text-center">Sélectionnez un statut ci-dessus</p>
            )}
            {kycAction === "not_started" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Le statut KYC de cet utilisateur sera réinitialisé. Il devra soumettre à nouveau ses documents.</p>
              </div>
            )}
            {kycAction === "rejected" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif de rejet <span className="text-muted-foreground text-xs font-normal">(optionnel)</span></Label>
                <Textarea value={kycReason} onChange={e => setKycReason(e.target.value)} placeholder="Ex: Document flou, identité non concordante..." rows={3} data-testid="textarea-kyc-reason" />
                <p className="text-xs text-muted-foreground">Si vous renseignez un motif, l'utilisateur le verra dans ses paramètres.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setKycDialog(null); setKycReason(""); }} className="h-10">Annuler</Button>
            <Button
              onClick={() => kycAction && kycDialog && kycM.mutate({ userId: kycDialog.userId, kycStatus: kycAction, rejectionReason: kycAction === "rejected" ? kycReason : undefined })}
              disabled={kycM.isPending || kycAction === null}
              className={`h-10 ${kycAction === "verified" ? "bg-emerald-600 hover:bg-emerald-700" : kycAction === "not_started" ? "bg-amber-600 hover:bg-amber-700" : kycAction === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}`}
              data-testid="btn-kyc-confirm">
              {kycM.isPending ? "Enregistrement..." : kycAction === "verified" ? "Marquer comme vérifié" : kycAction === "not_started" ? "Réinitialiser" : kycAction === "rejected" ? "Rejeter" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ BLOCK / UNBLOCK DIALOG ════ */}
      <Dialog open={!!blockDialog} onOpenChange={(o) => { if (!o) setBlockDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${blockDialog?.isBlocked ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-red-600"}`}>
              {blockDialog?.isBlocked ? <Unlock className="h-7 w-7 text-white" /> : <Lock className="h-7 w-7 text-white" />}
            </div>
            <DialogTitle className="text-center">
              {blockDialog?.isBlocked ? "Débloquer ce compte ?" : "Bloquer ce compte ?"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {blockDialog?.isBlocked
                ? <>L'utilisateur <strong>{blockDialog?.name}</strong> pourra de nouveau se connecter et utiliser son compte.</>
                : <>L'utilisateur <strong>{blockDialog?.name}</strong> ne pourra plus se connecter ni effectuer d'opérations.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setBlockDialog(null)}>Annuler</Button>
            <Button
              className={`flex-1 h-10 font-bold text-white ${blockDialog?.isBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              onClick={() => blockDialog && blockM.mutate({ userId: blockDialog.userId, isBlocked: !blockDialog.isBlocked })}
              disabled={blockM.isPending}
              data-testid="btn-confirm-block"
            >
              {blockM.isPending ? "En cours..." : blockDialog?.isBlocked ? "Confirmer le déblocage" : "Confirmer le blocage"}
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

      {/* ── MODAL RETRAIT OMNIPAY ADMIN ── */}
      <Dialog open={wdDialog} onOpenChange={(o) => { if (!o) { setWdDialog(false); setWdForm({ amount: "", phone: "", operator: "", recipientName: "", note: "" }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              Retrait depuis OmniPay
            </DialogTitle>
            <DialogDescription>
              Transférez des fonds depuis le solde OmniPay vers un numéro Mobile Money.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {omnipayBalance?.balance && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Solde disponible :</p>
                <div className="flex flex-wrap gap-3">
                  {omnipayBalance.balance.map((b: any, i: number) => (
                    <span key={i} className="text-sm font-black text-emerald-600 dark:text-emerald-300">
                      {b.amount.toLocaleString()} {b.currency} <span className="text-xs font-normal text-muted-foreground">({b.countryName})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="wd-amount">Montant (XOF) *</Label>
              <Input
                id="wd-amount"
                type="number"
                placeholder="Ex: 50000"
                value={wdForm.amount}
                onChange={e => setWdForm(f => ({ ...f, amount: e.target.value }))}
                data-testid="input-wd-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-phone">Numéro de téléphone *</Label>
              <Input
                id="wd-phone"
                placeholder="Ex: 22901234567"
                value={wdForm.phone}
                onChange={e => setWdForm(f => ({ ...f, phone: e.target.value }))}
                data-testid="input-wd-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-operator">Opérateur *</Label>
              <Select value={wdForm.operator} onValueChange={v => setWdForm(f => ({ ...f, operator: v }))}>
                <SelectTrigger id="wd-operator" data-testid="select-wd-operator">
                  <SelectValue placeholder="Choisir l'opérateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                  <SelectItem value="MOOV">Moov Money</SelectItem>
                  <SelectItem value="ORANGE">Orange Money</SelectItem>
                  <SelectItem value="WAVE">Wave</SelectItem>
                  <SelectItem value="FREE">Free Money</SelectItem>
                  <SelectItem value="AIRTEL">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-recipient">Nom du bénéficiaire</Label>
              <Input
                id="wd-recipient"
                placeholder="Ex: Vianney Essou"
                value={wdForm.recipientName}
                onChange={e => setWdForm(f => ({ ...f, recipientName: e.target.value }))}
                data-testid="input-wd-recipient"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-note">Note (optionnel)</Label>
              <Textarea
                id="wd-note"
                placeholder="Ex: Paiement prestataire..."
                value={wdForm.note}
                onChange={e => setWdForm(f => ({ ...f, note: e.target.value }))}
                className="resize-none"
                rows={2}
                data-testid="input-wd-note"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWdDialog(false)} disabled={wdM.isPending}>Annuler</Button>
            <Button
              className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
              disabled={wdM.isPending || !wdForm.amount || !wdForm.phone || !wdForm.operator}
              onClick={() => wdM.mutate({
                amount: parseFloat(wdForm.amount),
                phoneNumber: wdForm.phone,
                operator: wdForm.operator,
                recipientName: wdForm.recipientName || undefined,
                note: wdForm.note || undefined,
              })}
              data-testid="btn-confirm-admin-wd"
            >
              {wdM.isPending ? "Envoi en cours…" : "Confirmer le retrait"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG CONFIRMATION SR PAR UTILISATEUR ── */}
      <Dialog open={!!srConfirmDialog} onOpenChange={o => { if (!o) setSrConfirmDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg ${srConfirmDialog?.enable ? "bg-gradient-to-br from-orange-500 to-orange-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
              <Zap className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-center">
              {srConfirmDialog?.enable ? "Activer API SR" : "Désactiver API SR"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {srConfirmDialog?.enable
                ? <>Voulez-vous activer l'option <strong>API SR (Sans Redirection)</strong> pour <strong>{srConfirmDialog?.name}</strong> ?<br /><br />L'utilisateur pourra créer sa clé SR uniquement si son KYC est vérifié.</>
                : <>Voulez-vous <strong>désactiver</strong> l'option API SR pour <strong>{srConfirmDialog?.name}</strong> ?</>
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className={`w-full font-bold gap-2 ${srConfirmDialog?.enable ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-slate-600 hover:bg-slate-700 text-white"}`}
              disabled={enableSrM.isPending}
              onClick={() => {
                if (!srConfirmDialog) return;
                enableSrM.mutate({ userId: srConfirmDialog.userId, apiSrEnabled: srConfirmDialog.enable });
                setSrConfirmDialog(null);
              }}
              data-testid="btn-confirm-sr-user"
            >
              <Zap className="h-4 w-4" />
              {enableSrM.isPending ? "En cours…" : (srConfirmDialog?.enable ? "Confirmer l'activation" : "Confirmer la désactivation")}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSrConfirmDialog(null)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG ACTIVER SR POUR TOUS ── */}
      <Dialog open={srAllDialog} onOpenChange={setSrAllDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-lg">
              <Key className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-center">Activer API SR pour tous</DialogTitle>
            <DialogDescription className="text-center">
              Cette action va activer l'option <strong>API SR (Sans Redirection)</strong> pour <strong>tous les utilisateurs</strong> de la plateforme.
              <br /><br />
              Les utilisateurs pourront créer leur clé SR uniquement si leur compte est également <strong>vérifié (KYC approuvé)</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
              disabled={enableSrAllM.isPending}
              onClick={() => enableSrAllM.mutate()}
              data-testid="btn-confirm-sr-all"
            >
              <Zap className="h-4 w-4" />
              {enableSrAllM.isPending ? "Activation en cours…" : "Confirmer l'activation"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSrAllDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ TOGGLE LINK / KEY CONFIRMATION DIALOG ════ */}
      <Dialog open={!!toggleConfirmDialog} onOpenChange={(o) => { if (!o) setToggleConfirmDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${toggleConfirmDialog?.isCurrentlyActive ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600"}`}>
              {toggleConfirmDialog?.isCurrentlyActive ? <Lock className="h-7 w-7 text-white" /> : <Unlock className="h-7 w-7 text-white" />}
            </div>
            <DialogTitle className="text-center">
              {toggleConfirmDialog?.isCurrentlyActive
                ? `Bloquer ${toggleConfirmDialog?.type === "link" ? "ce lien" : "cette clé"} ?`
                : `Activer ${toggleConfirmDialog?.type === "link" ? "ce lien" : "cette clé"} ?`}
            </DialogTitle>
            <DialogDescription className="text-center">
              <strong>{toggleConfirmDialog?.name}</strong>
              {toggleConfirmDialog?.isCurrentlyActive
                ? ` sera désactivé${toggleConfirmDialog?.type === "link" ? "" : "e"} et inaccessible aux utilisateurs.`
                : ` sera réactivé${toggleConfirmDialog?.type === "link" ? "" : "e"} et accessible aux utilisateurs.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1 h-10" onClick={() => setToggleConfirmDialog(null)}>Annuler</Button>
            <Button
              className={`flex-1 h-10 font-bold text-white ${toggleConfirmDialog?.isCurrentlyActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              disabled={toggleLinkM.isPending || toggleApiKeyM.isPending}
              onClick={() => {
                if (!toggleConfirmDialog) return;
                const newActive = !toggleConfirmDialog.isCurrentlyActive;
                if (toggleConfirmDialog.type === "link") {
                  toggleLinkM.mutate({ id: toggleConfirmDialog.id, isActive: newActive });
                } else {
                  toggleApiKeyM.mutate({ id: toggleConfirmDialog.id, isActive: newActive });
                }
              }}
              data-testid="btn-confirm-toggle"
            >
              {(toggleLinkM.isPending || toggleApiKeyM.isPending) ? "En cours..." : toggleConfirmDialog?.isCurrentlyActive ? "Confirmer le blocage" : "Confirmer l'activation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Notification Dialog ── */}
      <Dialog open={!!editNotifDialog} onOpenChange={(o) => { if (!o) setEditNotifDialog(null); }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Modifier la notification</DialogTitle>
          </DialogHeader>
          {editNotifDialog && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Titre</Label>
                <Input
                  value={editNotifDialog.title}
                  onChange={e => setEditNotifDialog(p => p ? { ...p, title: e.target.value } : null)}
                  placeholder="Ex: Maintenance prévue"
                  className="h-10"
                  data-testid="input-edit-notif-title"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Message</Label>
                <Textarea
                  value={editNotifDialog.message}
                  onChange={e => setEditNotifDialog(p => p ? { ...p, message: e.target.value } : null)}
                  placeholder="Rédigez votre message..."
                  className="min-h-[80px] resize-none"
                  data-testid="input-edit-notif-message"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Couleur</Label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditNotifDialog(p => p ? { ...p, color: "blue" } : null)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${editNotifDialog.color === "blue" ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400" : "border-border text-muted-foreground hover:border-blue-300"}`}
                    data-testid="btn-edit-color-blue"
                  >
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    Bleu
                  </button>
                  <button
                    onClick={() => setEditNotifDialog(p => p ? { ...p, color: "red" } : null)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${editNotifDialog.color === "red" ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" : "border-border text-muted-foreground hover:border-red-300"}`}
                    data-testid="btn-edit-color-red"
                  >
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    Rouge
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lien optionnel</p>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">URL du lien</Label>
                  <Input
                    value={editNotifDialog.linkUrl}
                    onChange={e => setEditNotifDialog(p => p ? { ...p, linkUrl: e.target.value } : null)}
                    placeholder="https://..."
                    className="h-10 text-sm"
                    data-testid="input-edit-notif-link-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nom du bouton</Label>
                  <Input
                    value={editNotifDialog.linkLabel}
                    onChange={e => setEditNotifDialog(p => p ? { ...p, linkLabel: e.target.value } : null)}
                    placeholder="Ex: Rejoindre"
                    className="h-10 text-sm"
                    data-testid="input-edit-notif-link-label"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditNotifDialog(null)} className="rounded-xl" data-testid="btn-cancel-edit-notif">
              Annuler
            </Button>
            <Button
              onClick={() => editNotifDialog && updateNotifM.mutate({ id: editNotifDialog.id, title: editNotifDialog.title, message: editNotifDialog.message, color: editNotifDialog.color, linkUrl: editNotifDialog.linkUrl || undefined, linkLabel: editNotifDialog.linkLabel || undefined })}
              disabled={updateNotifM.isPending || !editNotifDialog?.title || !editNotifDialog?.message}
              className="rounded-xl font-bold"
              data-testid="btn-confirm-edit-notif"
            >
              {updateNotifM.isPending ? "En cours..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}

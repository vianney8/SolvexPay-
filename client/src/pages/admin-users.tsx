import { useState, useMemo } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users, Shield, KeyRound, PenLine, CheckCircle2, Clock, XCircle,
  Search, Lock, Unlock, ChevronDown, ChevronUp, Zap, CalendarDays,
  BadgeCheck, UserX, FileText, ArrowUpDown, Activity, X, AlertTriangle,
  Download, Filter, SlidersHorizontal,
} from "lucide-react";

/* ─── Helpers ─────────────────────────────────────────── */
function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function KycChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    verified:    { label: "Vérifié",     cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", Icon: BadgeCheck },
    pending:     { label: "En attente", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",   Icon: Clock      },
    rejected:    { label: "Rejeté",     cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",           Icon: XCircle    },
    not_started: { label: "Non soumis", cls: "bg-slate-500/15 text-slate-500 border-slate-500/30",                       Icon: UserX      },
  };
  const { label, cls, Icon } = map[status] || map.not_started;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

function TxChip({ status }: { status: string }) {
  if (status === "completed") return <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Complété</span>;
  if (status === "pending")   return <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">En attente</span>;
  if (status === "failed")    return <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30">Échoué</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold bg-slate-500/15 text-slate-500 border-slate-500/30">{status}</span>;
}

const TX_LABELS: Record<string, string> = { deposit: "Dépôt", withdrawal: "Retrait", transfer: "Transfert" };
function TypeChip({ type }: { type: string }) {
  const map: Record<string, string> = {
    deposit:    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    withdrawal: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    transfer:   "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${map[type] || "bg-slate-500/15 text-slate-500 border-slate-500/30"}`}>{TX_LABELS[type] || type}</span>;
}

/* ─── Main page ───────────────────────────────────────── */
export default function AdminUsersPage() {
  const { toast } = useToast();

  /* ── States ── */
  const [search, setSearch]               = useState("");
  const [kycFilter, setKycFilter]         = useState<"all" | "verified" | "pending" | "rejected" | "not_started">("all");
  const [srFilter, setSrFilter]           = useState(false);
  const [blockedFilter, setBlockedFilter] = useState(false);
  const [sort, setSort]                   = useState<"default" | "balance_desc" | "balance_asc" | "recent">("default");
  const [showFilters, setShowFilters]     = useState(false);

  const [expandedId, setExpandedId]       = useState<string | null>(null);

  /* Dialog states */
  const [pwdDialog,   setPwdDialog]   = useState<{ userId: string; name: string } | null>(null);
  const [pwd,         setPwd]         = useState("");
  const [balDialog,   setBalDialog]   = useState<{ userId: string; name: string; bal: number } | null>(null);
  const [balAmount,   setBalAmount]   = useState("");
  const [balMotif,    setBalMotif]    = useState("");
  const [blockDialog, setBlockDialog] = useState<{ userId: string; name: string; isBlocked: boolean } | null>(null);
  const [kycDialog,   setKycDialog]   = useState<{ userId: string; name: string; status: string } | null>(null);
  const [kycAction,   setKycAction]   = useState<"verified" | "rejected" | "not_started" | null>(null);
  const [kycReason,   setKycReason]   = useState("");
  const [srDialog,    setSrDialog]    = useState<{ userId: string; name: string; enable: boolean } | null>(null);

  /* ── Queries ── */
  const { data: users, isFetching } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    initialData: () => queryClient.getQueryData<any[]>(["/api/admin/users"]) ?? [],
  });

  const isLoading = false;

  const { data: userTxList } = useQuery<any[]>({
    queryKey: ["/api/admin/users", expandedId, "transactions"],
    enabled: !!expandedId,
    queryFn: () => fetch(`/api/admin/users/${expandedId}/transactions`, { credentials: "include" }).then(r => r.json()),
  });

  /* ── Mutations ── */
  const pwdM = useMutation({
    mutationFn: (d: { userId: string; password: string }) =>
      apiRequest("PATCH", `/api/admin/users/${d.userId}/password`, { password: d.password }),
    onSuccess: () => { toast({ title: "Mot de passe modifié" }); setPwdDialog(null); setPwd(""); },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const balM = useMutation({
    mutationFn: (d: { userId: string; amount: number; motif: string }) =>
      apiRequest("PATCH", `/api/admin/users/${d.userId}/balance`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallets"] });
      toast({ title: "Solde ajusté" });
      setBalDialog(null); setBalAmount(""); setBalMotif("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const blockM = useMutation({
    mutationFn: (d: { userId: string; isBlocked: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${d.userId}/block`, { isBlocked: d.isBlocked }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/users"] });
      const prev = queryClient.getQueryData<any[]>(["/api/admin/users"]);
      queryClient.setQueryData<any[]>(["/api/admin/users"], old =>
        (old || []).map(u => u.id === vars.userId ? { ...u, isBlocked: vars.isBlocked } : u)
      );
      return { prev };
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.isBlocked ? "Compte bloqué" : "Compte débloqué" });
      setBlockDialog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e: any, _, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/admin/users"], ctx.prev);
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    },
  });

  const kycM = useMutation({
    mutationFn: (d: { userId: string; kycStatus: string; rejectionReason?: string }) =>
      apiRequest("PATCH", `/api/admin/users/${d.userId}/kyc`, d),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/users"] });
      const prev = queryClient.getQueryData<any[]>(["/api/admin/users"]);
      queryClient.setQueryData<any[]>(["/api/admin/users"], old =>
        (old || []).map(u => u.id === vars.userId ? { ...u, kycStatus: vars.kycStatus, kycRejectionReason: vars.rejectionReason || u.kycRejectionReason } : u)
      );
      return { prev };
    },
    onSuccess: () => {
      toast({ title: "KYC mis à jour" });
      setKycDialog(null); setKycReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e: any, _, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/admin/users"], ctx.prev);
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    },
  });

  const srM = useMutation({
    mutationFn: (d: { userId: string; apiSrEnabled: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${d.userId}/enable-sr`, { apiSrEnabled: d.apiSrEnabled }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/users"] });
      const prev = queryClient.getQueryData<any[]>(["/api/admin/users"]);
      queryClient.setQueryData<any[]>(["/api/admin/users"], old =>
        (old || []).map(u => u.id === vars.userId ? { ...u, apiSrEnabled: vars.apiSrEnabled } : u)
      );
      return { prev };
    },
    onSuccess: () => {
      toast({ title: "Option API SR mise à jour" });
      setSrDialog(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e: any, _, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/admin/users"], ctx.prev);
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    },
  });

  /* ── Derived stats ── */
  const allUsers      = users || [];
  const totalCount    = allUsers.length;
  const blockedCount  = allUsers.filter(u => u.isBlocked).length;
  const pendingKyc    = allUsers.filter(u => u.kycStatus === "pending").length;
  const verifiedKyc   = allUsers.filter(u => u.kycStatus === "verified").length;
  const srCount       = allUsers.filter(u => u.apiSrEnabled).length;
  const totalBalance  = allUsers.reduce((s, u) => s + parseFloat(u.wallet?.balanceXOF || "0"), 0);

  /* ── Filtered + sorted list ── */
  const filtered = useMemo(() => {
    return allUsers
      .filter(u => {
        if (search) {
          const hay = [u.email, u.firstName, u.lastName, u.phone].join(" ").toLowerCase();
          if (!hay.includes(search.toLowerCase())) return false;
        }
        if (kycFilter !== "all" && u.kycStatus !== kycFilter) return false;
        if (srFilter && !u.apiSrEnabled) return false;
        if (blockedFilter && !u.isBlocked) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "balance_desc") return parseFloat(b.wallet?.balanceXOF || "0") - parseFloat(a.wallet?.balanceXOF || "0");
        if (sort === "balance_asc")  return parseFloat(a.wallet?.balanceXOF || "0") - parseFloat(b.wallet?.balanceXOF || "0");
        if (sort === "recent")       return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        return 0;
      });
  }, [allUsers, search, kycFilter, srFilter, blockedFilter, sort]);

  const activeFilters = (kycFilter !== "all" ? 1 : 0) + (srFilter ? 1 : 0) + (blockedFilter ? 1 : 0);

  return (
    <DashboardLayout
      title=""
      breadcrumbs={[
        { label: "Administration", href: "/admin" },
        { label: "Utilisateurs" },
      ]}
    >
      <div className="space-y-5">

        {/* ─── Hero ─── */}
        <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0e7490 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #818cf8 0%, transparent 50%), radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 40%)" }} />
          <div className="relative p-5 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
                <Users className="h-7 w-7 text-cyan-300" />
              </div>
              <div>
                <p className="font-black text-xl leading-tight">Gestion des Utilisateurs</p>
                <p className="text-white/60 text-xs mt-0.5">Administration complète des comptes — SolvexPay</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { label: "Total inscrits",     value: isLoading ? "—" : totalCount,    color: "text-cyan-300"   },
                { label: "Bloqués",            value: isLoading ? "—" : blockedCount,  color: "text-rose-300"   },
                { label: "KYC en attente",     value: isLoading ? "—" : pendingKyc,    color: "text-amber-300"  },
                { label: "KYC vérifiés",       value: isLoading ? "—" : verifiedKyc,   color: "text-emerald-300" },
                { label: "API SR activé",      value: isLoading ? "—" : srCount,       color: "text-green-300"  },
                { label: "Total wallets",      value: isLoading ? "—" : fmt(totalBalance), color: "text-violet-300", small: true },
              ].map((s, i) => (
                <div key={i} className="bg-white/8 backdrop-blur-sm rounded-2xl px-3 py-2.5 border border-white/10 text-center">
                  <p className={`font-black ${s.small ? "text-sm" : "text-2xl"} ${s.color}`} data-testid={`stat-${i}`}>{s.value}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Search + Filters ─── */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nom, email, téléphone..."
                className="pl-10 h-10 rounded-xl"
                data-testid="input-search"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${showFilters || activeFilters > 0 ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"}`}
              data-testid="btn-toggle-filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtres
              {activeFilters > 0 && (
                <span className="bg-white/25 text-white rounded-full px-1.5 py-0 text-[10px] font-black">{activeFilters}</span>
              )}
            </button>

            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap hidden sm:block">Trier :</span>
              {([
                { v: "default"      as const, label: "Défaut",    icon: <ArrowUpDown className="h-3 w-3" /> },
                { v: "balance_desc" as const, label: "Solde ↓",   icon: <ChevronDown className="h-3 w-3" /> },
                { v: "balance_asc"  as const, label: "Solde ↑",   icon: <ChevronUp className="h-3 w-3" /> },
                { v: "recent"       as const, label: "Récents",   icon: <CalendarDays className="h-3 w-3" /> },
              ]).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setSort(opt.v)}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${sort === opt.v ? "bg-indigo-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  data-testid={`btn-sort-${opt.v}`}
                >
                  {opt.icon}{opt.label}
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">KYC :</span>
                <div className="flex gap-1 flex-wrap">
                  {([
                    { v: "all"         as const, label: "Tous"        },
                    { v: "verified"    as const, label: "Vérifiés"    },
                    { v: "pending"     as const, label: "En attente"  },
                    { v: "rejected"    as const, label: "Rejetés"     },
                    { v: "not_started" as const, label: "Non soumis"  },
                  ]).map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setKycFilter(opt.v)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${kycFilter === opt.v ? "bg-indigo-600 text-white shadow-sm" : "bg-background border border-border/60 text-muted-foreground hover:bg-muted/60"}`}
                      data-testid={`btn-kyc-filter-${opt.v}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSrFilter(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${srFilter ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20"}`}
                  data-testid="btn-filter-sr"
                >
                  <Zap className="h-3.5 w-3.5" />
                  API SR activé{srFilter ? ` (${allUsers.filter(u => u.apiSrEnabled).length})` : ""}
                </button>
                <button
                  onClick={() => setBlockedFilter(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${blockedFilter ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20"}`}
                  data-testid="btn-filter-blocked"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Bloqués{blockedFilter ? ` (${blockedCount})` : ""}
                </button>
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setKycFilter("all"); setSrFilter(false); setBlockedFilter(false); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="btn-clear-filters"
                  >
                    <X className="h-3.5 w-3.5" />Effacer filtres
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Results count ─── */}
        {!isLoading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{filtered.length}</span> utilisateur{filtered.length !== 1 ? "s" : ""}
              {(search || activeFilters > 0) && <span className="text-xs ml-1">sur {totalCount} total</span>}
            </p>
            {filtered.length === 0 && (search || activeFilters > 0) && (
              <button onClick={() => { setSearch(""); setKycFilter("all"); setSrFilter(false); setBlockedFilter(false); }} className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold">
                Réinitialiser la recherche
              </button>
            )}
          </div>
        )}

        {/* ─── User list ─── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-3 w-12 ml-auto" />
                    <Skeleton className="h-5 w-24 ml-auto" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                  {[52, 80, 72, 48, 56, 64].map((w, j) => (
                    <Skeleton key={j} className={`h-7 w-${w < 60 ? "12" : w < 70 ? "20" : w < 80 ? "16" : "14"} rounded-xl`} style={{ width: `${w}px` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Users className="h-12 w-12 opacity-20" />
            <p className="font-semibold">{search || activeFilters > 0 ? "Aucun résultat" : "Aucun utilisateur"}</p>
            <p className="text-xs">{search || activeFilters > 0 ? "Essayez de modifier votre recherche ou vos filtres." : "Les inscriptions apparaîtront ici."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u: any) => {
              const bal      = parseFloat(u.wallet?.balanceXOF || "0");
              const isExp    = expandedId === u.id;
              const initials = ((u.firstName?.[0] || "") + (u.lastName?.[0] || u.email?.[0] || "?")).toUpperCase();

              return (
                <Card
                  key={u.id}
                  className={`border-border/50 overflow-hidden transition-all ${u.isBlocked ? "border-red-500/30 bg-red-500/3" : ""}`}
                  data-testid={`card-user-${u.id}`}
                >
                  <CardContent className="p-0">
                    {/* ── Top bar ── */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-black flex-shrink-0 ${u.isBlocked ? "bg-red-500/20 text-red-600" : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"}`}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-sm" data-testid={`text-name-${u.id}`}>{u.firstName} {u.lastName}</p>
                            <KycChip status={u.kycStatus || "not_started"} />
                            {u.isAdmin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-rose-500/15 text-rose-600 border-rose-500/30">
                                <Shield className="h-3 w-3" />Admin
                              </span>
                            )}
                            {u.isBlocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-red-500/15 text-red-600 border-red-500/30">
                                <Lock className="h-3 w-3" />Bloqué
                              </span>
                            )}
                            {u.apiSrEnabled && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400">
                                <Zap className="h-3 w-3" />API SR
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground" data-testid={`text-email-${u.id}`}>{u.email}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-phone-${u.id}`}>{u.phone || "—"}</p>
                          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                            <CalendarDays className="h-3 w-3 flex-shrink-0" />
                            Inscrit le {u.createdAt ? new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                        </div>

                        {/* Balance */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Solde wallet</p>
                          <p className={`font-black text-base ${bal > 0 ? "text-emerald-600" : "text-muted-foreground"}`} data-testid={`text-balance-${u.id}`}>
                            {fmt(bal)}
                          </p>
                          {u.wallet?.totalDeposited && parseFloat(u.wallet.totalDeposited) > 0 && (
                            <p className="text-[10px] text-muted-foreground">Total déposé : {fmt(parseFloat(u.wallet.totalDeposited))}</p>
                          )}
                        </div>
                      </div>

                      {/* ── Actions ── */}
                      <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-border/40">
                        <button
                          onClick={() => { setPwdDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}` }); setPwd(""); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-xs font-semibold text-muted-foreground transition-colors"
                          data-testid={`btn-pwd-${u.id}`}
                        >
                          <KeyRound className="h-3.5 w-3.5" />MDP
                        </button>

                        <button
                          onClick={() => { setBalDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, bal }); setBalAmount(""); setBalMotif(""); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition-colors"
                          data-testid={`btn-bal-${u.id}`}
                        >
                          <PenLine className="h-3.5 w-3.5" />Ajuster solde
                        </button>

                        <button
                          onClick={() => setBlockDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, isBlocked: u.isBlocked })}
                          disabled={blockM.isPending}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${u.isBlocked ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15" : "bg-red-500/10 text-red-600 hover:bg-red-500/15"}`}
                          data-testid={`btn-block-${u.id}`}
                        >
                          {u.isBlocked ? <><Unlock className="h-3.5 w-3.5" />Débloquer</> : <><Lock className="h-3.5 w-3.5" />Bloquer</>}
                        </button>

                        <button
                          onClick={() => { setKycDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, status: u.kycStatus || "not_started" }); setKycAction(null); setKycReason(""); }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${u.kycStatus === "verified" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15" : "bg-violet-500/10 text-violet-700 dark:text-violet-400 hover:bg-violet-500/15"}`}
                          data-testid={`btn-kyc-${u.id}`}
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />KYC
                        </button>

                        <button
                          onClick={() => setSrDialog({ userId: u.id, name: `${u.firstName} ${u.lastName}`, enable: !u.apiSrEnabled })}
                          disabled={srM.isPending}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors border ${u.apiSrEnabled ? "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 border-green-500/30" : "bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border-orange-500/30"}`}
                          data-testid={`btn-sr-${u.id}`}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {u.apiSrEnabled ? "✓ SR activé" : "Activer SR"}
                        </button>

                        <button
                          onClick={() => setExpandedId(isExp ? null : u.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 text-xs font-semibold text-indigo-700 dark:text-indigo-400 transition-colors ml-auto"
                          data-testid={`btn-expand-${u.id}`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Historique {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {/* ── Expanded transaction history ── */}
                    {isExp && (
                      <div className="border-t border-border/40 bg-muted/20">
                        <div className="bg-muted/40 px-4 py-2 flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-indigo-500" />
                          <p className="text-xs font-bold">Transactions récentes</p>
                          {u.kycStatus === "rejected" && u.kycRejectionReason && (
                            <span className="ml-auto text-[10px] text-red-500 font-semibold">Rejet KYC : {u.kycRejectionReason}</span>
                          )}
                        </div>
                        {!userTxList ? (
                          <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-indigo-500/60 animate-pulse" />
                            Chargement des transactions...
                          </div>
                        ) : userTxList.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground">Aucune transaction pour cet utilisateur</div>
                        ) : (
                          <div className="divide-y divide-border/30 max-h-64 overflow-y-auto">
                            {userTxList.slice(0, 15).map((tx: any) => (
                              <div key={tx.id} className="flex items-center gap-2 px-4 py-2.5">
                                <TypeChip type={tx.type} />
                                <TxChip status={tx.status} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold">{fmt(parseFloat(tx.amount))} {tx.currency !== "XOF" ? tx.currency : ""}</span>
                                  {tx.fees && parseFloat(tx.fees) > 0 && (
                                    <span className="text-[10px] text-orange-500 ml-1">(-{fmt(parseFloat(tx.fees))})</span>
                                  )}
                                  {tx.description && (
                                    <p className="text-[10px] text-muted-foreground truncate">{tx.description}</p>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtDate(tx.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ════ DIALOG — Mot de passe ════ */}
      <Dialog open={!!pwdDialog} onOpenChange={o => { if (!o) setPwdDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-500" />Modifier le mot de passe
            </DialogTitle>
            <DialogDescription>{pwdDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</Label>
            <Input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="Min. 6 caractères"
              className="mt-2 h-11"
              data-testid="input-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialog(null)} className="h-10">Annuler</Button>
            <Button
              onClick={() => pwdDialog && pwdM.mutate({ userId: pwdDialog.userId, password: pwd })}
              disabled={pwdM.isPending || pwd.length < 6}
              className="h-10"
              data-testid="btn-confirm-password"
            >
              {pwdM.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DIALOG — Ajuster solde ════ */}
      <Dialog open={!!balDialog} onOpenChange={o => { if (!o) setBalDialog(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-indigo-500" />Ajuster le solde
            </DialogTitle>
            <DialogDescription>
              {balDialog?.name} — Solde actuel : <strong>{fmt(balDialog?.bal || 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (+crédit / −débit)</Label>
              <Input
                type="number"
                value={balAmount}
                onChange={e => setBalAmount(e.target.value)}
                placeholder="Ex: 5000 ou -2000"
                className="mt-2 h-11"
                data-testid="input-bal-amount"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif <span className="text-red-500">*</span></Label>
              <Textarea
                value={balMotif}
                onChange={e => setBalMotif(e.target.value)}
                placeholder="Raison de l'ajustement..."
                rows={2}
                className="mt-2"
                data-testid="input-bal-motif"
              />
            </div>
            {balAmount && (
              <div className="rounded-xl bg-muted/50 p-3 text-xs">
                Nouveau solde estimé : <strong>{fmt((balDialog?.bal || 0) + (parseFloat(balAmount) || 0))}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalDialog(null)} className="h-10">Annuler</Button>
            <Button
              onClick={() => balDialog && balM.mutate({ userId: balDialog.userId, amount: parseFloat(balAmount), motif: balMotif })}
              disabled={balM.isPending || !balAmount || !balMotif}
              className="h-10"
              data-testid="btn-confirm-balance"
            >
              {balM.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DIALOG — Bloquer/Débloquer ════ */}
      <Dialog open={!!blockDialog} onOpenChange={o => { if (!o) setBlockDialog(null); }}>
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

      {/* ════ DIALOG — KYC ════ */}
      <Dialog open={!!kycDialog} onOpenChange={o => { if (!o) { setKycDialog(null); setKycReason(""); } }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-indigo-500" />Statut de vérification KYC
            </DialogTitle>
            <DialogDescription>Compte : <strong>{kycDialog?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "verified"    as const, label: "Vérifié",    Icon: CheckCircle2, active: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
                { v: "rejected"    as const, label: "Rejeté",     Icon: XCircle,      active: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" },
                { v: "not_started" as const, label: "Réinitialiser", Icon: AlertTriangle, active: "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
              ]).map(({ v, label, Icon, active }) => (
                <button
                  key={v}
                  onClick={() => setKycAction(v)}
                  className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all text-center ${kycAction === v ? active : "border-border/60 text-muted-foreground hover:border-border"}`}
                  data-testid={`btn-kyc-action-${v}`}
                >
                  <Icon className="h-4 w-4 mx-auto mb-1" />{label}
                </button>
              ))}
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
                <Textarea
                  value={kycReason}
                  onChange={e => setKycReason(e.target.value)}
                  placeholder="Ex: Document flou, identité non concordante..."
                  rows={3}
                  data-testid="textarea-kyc-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setKycDialog(null); setKycReason(""); }} className="h-10">Annuler</Button>
            <Button
              onClick={() => kycAction && kycDialog && kycM.mutate({ userId: kycDialog.userId, kycStatus: kycAction, rejectionReason: kycAction === "rejected" ? kycReason : undefined })}
              disabled={kycM.isPending || kycAction === null}
              className={`h-10 ${kycAction === "verified" ? "bg-emerald-600 hover:bg-emerald-700" : kycAction === "not_started" ? "bg-amber-600 hover:bg-amber-700" : kycAction === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}`}
              data-testid="btn-kyc-confirm"
            >
              {kycM.isPending ? "Enregistrement..." : kycAction === "verified" ? "Marquer comme vérifié" : kycAction === "not_started" ? "Réinitialiser" : kycAction === "rejected" ? "Rejeter" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════ DIALOG — API SR ════ */}
      <Dialog open={!!srDialog} onOpenChange={o => { if (!o) setSrDialog(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg ${srDialog?.enable ? "bg-gradient-to-br from-orange-500 to-orange-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
              <Zap className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-center">
              {srDialog?.enable ? "Activer API SR" : "Désactiver API SR"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {srDialog?.enable
                ? <>Voulez-vous activer l'option <strong>API SR (Sans Redirection)</strong> pour <strong>{srDialog?.name}</strong> ?<br /><br />L'utilisateur pourra créer sa clé SR uniquement si son KYC est vérifié.</>
                : <>Voulez-vous <strong>désactiver</strong> l'option API SR pour <strong>{srDialog?.name}</strong> ?</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className={`w-full font-bold gap-2 ${srDialog?.enable ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-slate-600 hover:bg-slate-700 text-white"}`}
              disabled={srM.isPending}
              onClick={() => srDialog && srM.mutate({ userId: srDialog.userId, apiSrEnabled: srDialog.enable })}
              data-testid="btn-confirm-sr"
            >
              <Zap className="h-4 w-4" />
              {srM.isPending ? "En cours…" : srDialog?.enable ? "Confirmer l'activation" : "Confirmer la désactivation"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setSrDialog(null)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

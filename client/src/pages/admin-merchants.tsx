import { useState, useMemo } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Link2, Lock, Unlock, Search, Zap, AlertTriangle, CheckCircle2, Percent,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}

export default function AdminMerchantsPage() {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [blockDialog, setBlockDialog] = useState<{ userId: string; name: string; isBlocked: boolean } | null>(null);
  const [toggleConfirmDialog, setToggleConfirmDialog] = useState<{ type: "link" | "key"; id: string; name: string; isCurrentlyActive: boolean } | null>(null);
  const [userFeeDialog, setUserFeeDialog] = useState<{ userId: string; name: string } | null>(null);
  const [userFeeDeposit, setUserFeeDeposit] = useState("");
  const [userFeeWithdrawal, setUserFeeWithdrawal] = useState("");
  const [userFeeConfirm, setUserFeeConfirm] = useState(false);

  /* ── Query — instant since cache is warm ── */
  const { data: merchants, isFetching } = useQuery<any[]>({
    queryKey: ["/api/admin/merchants"],
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    initialData: () => queryClient.getQueryData<any[]>(["/api/admin/merchants"]) ?? [],
  });

  const isLoading = false;

  /* ── Mutations ── */
  const blockM = useMutation({
    mutationFn: (d: { userId: string; isBlocked: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${d.userId}/block`, { isBlocked: d.isBlocked }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/merchants"] });
      const prev = queryClient.getQueryData<any[]>(["/api/admin/merchants"]);
      queryClient.setQueryData<any[]>(["/api/admin/merchants"], old =>
        (old || []).map(u => u.id === vars.userId ? { ...u, isBlocked: vars.isBlocked } : u)
      );
      return { prev };
    },
    onSuccess: (_, vars) => {
      setBlockDialog(null);
      toast({ title: vars.isBlocked ? "Compte bloqué" : "Compte débloqué" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e: any, _, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(["/api/admin/merchants"], ctx.prev);
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    },
  });

  const toggleLinkM = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/payment-links/${d.id}/toggle`, { isActive: d.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      setToggleConfirmDialog(null);
      toast({ title: "Lien de paiement mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleApiKeyM = useMutation({
    mutationFn: (d: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/api-keys/${d.id}/toggle`, { isActive: d.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      setToggleConfirmDialog(null);
      toast({ title: "Clé API mise à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const userFeeM = useMutation({
    mutationFn: (d: { userId: string; customFeeRate: string | null; customWithdrawalFeeRate: string | null }) =>
      apiRequest("PATCH", `/api/admin/users/${d.userId}/fee`, { customFeeRate: d.customFeeRate, customWithdrawalFeeRate: d.customWithdrawalFeeRate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Frais personnalisés mis à jour" });
      setUserFeeDialog(null);
      setUserFeeConfirm(false);
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    if (!merchants) return [];
    const q = search.toLowerCase().trim();
    if (!q) return merchants;
    return merchants.filter((m: any) =>
      (m.firstName + " " + m.lastName + " " + m.email + " " + m.phone).toLowerCase().includes(q)
    );
  }, [merchants, search]);

  return (
    <DashboardLayout title="Marchands" breadcrumbs={[{ label: "Administration", href: "/admin" }, { label: "Marchands" }]}>
      <div className="space-y-5">

        {/* ═══ HERO BANNER ═══ */}
        <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #3b0764 40%, #4c1d95 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #a78bfa 0%, transparent 50%), radial-gradient(circle at 80% 20%, #c026d3 0%, transparent 40%)" }} />
          <div className="relative p-5 text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
                  <Link2 className="h-7 w-7 text-violet-300" />
                </div>
                <div>
                  <p className="font-black text-xl text-white leading-tight">Marchands SolvexPay</p>
                  <p className="text-white/60 text-xs mt-0.5">Utilisateurs avec liens de paiement ou clés API</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-violet-300">{isLoading ? "—" : (merchants || []).length}</p>
                <p className="text-white/60 text-xs">marchands actifs</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SEARCH ═══ */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un marchand..."
            className="pl-10 h-10"
            data-testid="input-search-merchants"
          />
        </div>

        {/* ═══ LIST ═══ */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            {search ? "Aucun marchand trouvé pour cette recherche" : "Aucun marchand pour l'instant"}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m: any) => (
              <Card key={m.id} className={`border-border/50 overflow-hidden ${m.isBlocked ? "border-red-500/40 bg-red-500/5" : ""}`} data-testid={`card-merchant-${m.id}`}>
                <CardContent className="p-4">

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${m.isBlocked ? "bg-red-500/15 text-red-600" : "bg-violet-500/15 text-violet-600"}`}>
                      {(m.firstName?.[0] || m.email?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm truncate" data-testid={`text-merchant-name-${m.id}`}>{m.firstName} {m.lastName}</p>
                        {m.isBlocked && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 text-[10px] font-bold">Bloqué</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Solde</p>
                      <p className="font-black text-sm text-emerald-600" data-testid={`text-balance-${m.id}`}>{fmt(parseFloat(m.balance || "0"))}</p>
                    </div>
                  </div>

                  {/* Stats + block button */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-400 text-xs font-semibold">
                      <Link2 className="h-3 w-3" />{m.links.length} lien{m.links.length !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 text-xs font-semibold">
                      <Zap className="h-3 w-3" />{m.keys.length} clé{m.keys.length !== 1 ? "s" : ""}
                    </div>
                    {(m.customFeeRate != null || m.customWithdrawalFeeRate != null) && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                        <Percent className="h-3 w-3" />
                        {m.customFeeRate != null && `D:${m.customFeeRate}%`}
                        {m.customFeeRate != null && m.customWithdrawalFeeRate != null && " · "}
                        {m.customWithdrawalFeeRate != null && `R:${m.customWithdrawalFeeRate}%`}
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setUserFeeDeposit(m.customFeeRate ?? "");
                          setUserFeeWithdrawal(m.customWithdrawalFeeRate ?? "");
                          setUserFeeConfirm(false);
                          setUserFeeDialog({ userId: m.id, name: `${m.firstName} ${m.lastName}` });
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/15"
                        data-testid={`btn-fee-merchant-${m.id}`}
                      >
                        <Percent className="h-3.5 w-3.5" />Frais
                      </button>
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
      </div>

      {/* ── Fee dialog ── */}
      <Dialog open={!!userFeeDialog} onOpenChange={o => { if (!o) { setUserFeeDialog(null); setUserFeeConfirm(false); } }}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
              <Percent className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-center">Frais personnalisés</DialogTitle>
            <DialogDescription className="text-center">
              {userFeeDialog?.name} — laissez vide pour utiliser les frais globaux.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Frais dépôt (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={userFeeDeposit}
                onChange={e => setUserFeeDeposit(e.target.value)}
                placeholder="Global (par défaut)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="input-custom-fee-deposit"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Frais retrait (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={userFeeWithdrawal}
                onChange={e => setUserFeeWithdrawal(e.target.value)}
                placeholder="Global (par défaut)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                data-testid="input-custom-fee-withdrawal"
              />
            </div>
            {!userFeeConfirm ? (
              <button
                onClick={() => setUserFeeConfirm(true)}
                className="w-full mt-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
                data-testid="btn-fee-confirm-step1"
              >
                Continuer
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">Confirmez les frais pour <strong>{userFeeDialog?.name}</strong> :</p>
                <div className="flex gap-2 text-sm font-semibold justify-center">
                  <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                    Dépôt : {userFeeDeposit !== "" ? `${userFeeDeposit}%` : "global"}
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                    Retrait : {userFeeWithdrawal !== "" ? `${userFeeWithdrawal}%` : "global"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserFeeConfirm(false)}
                    className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => userFeeM.mutate({
                      userId: userFeeDialog!.userId,
                      customFeeRate: userFeeDeposit !== "" ? userFeeDeposit : null,
                      customWithdrawalFeeRate: userFeeWithdrawal !== "" ? userFeeWithdrawal : null,
                    })}
                    disabled={userFeeM.isPending}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
                    data-testid="btn-fee-confirm-final"
                  >
                    {userFeeM.isPending ? "..." : "Confirmer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Block dialog ── */}
      <Dialog open={!!blockDialog} onOpenChange={o => { if (!o) setBlockDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${blockDialog?.isBlocked ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-red-600"}`}>
              {blockDialog?.isBlocked ? <Unlock className="h-7 w-7 text-white" /> : <Lock className="h-7 w-7 text-white" />}
            </div>
            <DialogTitle className="text-center">{blockDialog?.isBlocked ? "Débloquer ce compte ?" : "Bloquer ce compte ?"}</DialogTitle>
            <DialogDescription className="text-center">
              {blockDialog?.isBlocked
                ? <>L'utilisateur <strong>{blockDialog?.name}</strong> pourra de nouveau utiliser son compte.</>
                : <>L'utilisateur <strong>{blockDialog?.name}</strong> ne pourra plus se connecter ni effectuer d'opérations.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setBlockDialog(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Annuler</button>
            <button
              onClick={() => blockM.mutate({ userId: blockDialog!.userId, isBlocked: !blockDialog!.isBlocked })}
              disabled={blockM.isPending}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${blockDialog?.isBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              data-testid="btn-confirm-block"
            >
              {blockM.isPending ? "..." : blockDialog?.isBlocked ? "Débloquer" : "Bloquer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Toggle link/key dialog ── */}
      <Dialog open={!!toggleConfirmDialog} onOpenChange={o => { if (!o) setToggleConfirmDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg ${toggleConfirmDialog?.isCurrentlyActive ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600"}`}>
              {toggleConfirmDialog?.isCurrentlyActive ? <AlertTriangle className="h-7 w-7 text-white" /> : <CheckCircle2 className="h-7 w-7 text-white" />}
            </div>
            <DialogTitle className="text-center">
              {toggleConfirmDialog?.isCurrentlyActive
                ? `Bloquer ${toggleConfirmDialog?.type === "link" ? "ce lien" : "cette clé"} ?`
                : `Réactiver ${toggleConfirmDialog?.type === "link" ? "ce lien" : "cette clé"} ?`}
            </DialogTitle>
            <DialogDescription className="text-center">
              <strong>{toggleConfirmDialog?.name}</strong>
              {toggleConfirmDialog?.isCurrentlyActive
                ? " sera désactivé et ne pourra plus être utilisé."
                : " sera réactivé et pourra être utilisé."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setToggleConfirmDialog(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors">Annuler</button>
            <button
              onClick={() => {
                if (!toggleConfirmDialog) return;
                const isActive = !toggleConfirmDialog.isCurrentlyActive;
                if (toggleConfirmDialog.type === "link") toggleLinkM.mutate({ id: toggleConfirmDialog.id, isActive });
                else toggleApiKeyM.mutate({ id: toggleConfirmDialog.id, isActive });
              }}
              disabled={toggleLinkM.isPending || toggleApiKeyM.isPending}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${toggleConfirmDialog?.isCurrentlyActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              data-testid="btn-confirm-toggle"
            >
              {toggleLinkM.isPending || toggleApiKeyM.isPending ? "..." : "Confirmer"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

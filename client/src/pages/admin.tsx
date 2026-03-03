import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users, ArrowDownUp, TrendingUp, Wallet, Shield,
  KeyRound, PenLine, AlertTriangle, CheckCircle, Clock,
  XCircle, Search, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(amount) + " XOF";
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Complété</Badge>;
  if (status === "pending") return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">En attente</Badge>;
  if (status === "failed") return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Échoué</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
  if (type === "deposit") return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Dépôt</Badge>;
  if (type === "withdrawal") return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Retrait</Badge>;
  if (type === "transfer") return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Transfert</Badge>;
  return <Badge variant="outline">{type}</Badge>;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: "", userName: "" });
  const [newPassword, setNewPassword] = useState("");

  const [balanceDialog, setBalanceDialog] = useState<{ open: boolean; userId: string; userName: string; currentBalance: number }>({ open: false, userId: "", userName: "", currentBalance: 0 });
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceMotif, setBalanceMotif] = useState("");

  const [txStatusDialog, setTxStatusDialog] = useState<{ open: boolean; txId: string; current: string }>({ open: false, txId: "", current: "" });
  const [newTxStatus, setNewTxStatus] = useState("completed");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/admin/stats"] });
  const { data: users, isLoading: usersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: allTx, isLoading: txLoading } = useQuery<any[]>({ queryKey: ["/api/admin/transactions"] });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/password`, { password: data.password }),
    onSuccess: () => {
      toast({ title: "Mot de passe modifié", description: "Le mot de passe a été changé avec succès." });
      setPasswordDialog({ open: false, userId: "", userName: "" });
      setNewPassword("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: (data: { userId: string; amount: number; motif: string }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/balance`, { amount: data.amount, motif: data.motif }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Solde ajusté", description: "Le solde a été mis à jour avec succès." });
      setBalanceDialog({ open: false, userId: "", userName: "", currentBalance: 0 });
      setBalanceAmount("");
      setBalanceMotif("");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const updateTxStatusMutation = useMutation({
    mutationFn: (data: { txId: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/transactions/${data.txId}/status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Statut mis à jour", description: "Le statut de la transaction a été modifié." });
      setTxStatusDialog({ open: false, txId: "", current: "" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e?.message, variant: "destructive" }),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: (data: { userId: string; isAdmin: boolean }) =>
      apiRequest("PATCH", `/api/admin/users/${data.userId}/toggle-admin`, { isAdmin: data.isAdmin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Rôle mis à jour" });
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
      tx.description?.toLowerCase().includes(txSearch.toLowerCase());
    const matchStatus = txStatusFilter === "all" || tx.status === txStatusFilter;
    const matchType = txTypeFilter === "all" || tx.type === txTypeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <DashboardLayout title="Administration" breadcrumbs={[{ label: "Administration" }]}>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Tableau de bord Administrateur</h1>
            <p className="text-sm text-muted-foreground">Gestion complète de la plateforme SolvexPay</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Utilisateurs</p>
                  <p className="text-2xl font-bold" data-testid="stat-users">{statsLoading ? "..." : stats?.userCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <ArrowDownUp className="h-8 w-8 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold" data-testid="stat-transactions">{statsLoading ? "..." : stats?.transactionCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Total dépôts</p>
                  <p className="text-lg font-bold" data-testid="stat-deposits">{statsLoading ? "..." : formatCurrency(stats?.totalDeposits || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Soldes totaux</p>
                  <p className="text-lg font-bold" data-testid="stat-wallets">{statsLoading ? "..." : formatCurrency(stats?.totalWalletBalance || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="font-bold">{statsLoading ? "..." : stats?.pendingTransactions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-900/50">
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Complétées</p>
                <p className="font-bold">{statsLoading ? "..." : stats?.completedTransactions}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Échouées</p>
                <p className="font-bold">{statsLoading ? "..." : stats?.failedTransactions}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="w-full">
            <TabsTrigger value="users" className="flex-1" data-testid="tab-users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-1" data-testid="tab-transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* ── USERS TAB ── */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Rechercher par email, nom..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                data-testid="input-search-users"
              />
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <Card key={user.id} data-testid={`card-user-${user.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate" data-testid={`text-username-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </p>
                            {user.isAdmin && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs">
                                <Shield className="h-3 w-3 mr-1" />Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.phone || "Pas de téléphone"}</p>
                          <p className="text-xs text-muted-foreground">Inscrit le {formatDate(user.createdAt)}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-xs text-muted-foreground">Solde</p>
                          <p className="font-bold text-lg" data-testid={`text-balance-${user.id}`}>
                            {formatCurrency(parseFloat(user.wallet?.balanceXOF || "0"))}
                          </p>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setPasswordDialog({ open: true, userId: user.id, userName: `${user.firstName} ${user.lastName}` })}
                          data-testid={`button-change-password-${user.id}`}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Mot de passe
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => setBalanceDialog({ open: true, userId: user.id, userName: `${user.firstName} ${user.lastName}`, currentBalance: parseFloat(user.wallet?.balanceXOF || "0") })}
                          data-testid={`button-adjust-balance-${user.id}`}
                        >
                          <PenLine className="h-3.5 w-3.5" />
                          Solde
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isAdmin ? "destructive" : "outline"}
                          className="gap-1"
                          onClick={() => toggleAdminMutation.mutate({ userId: user.id, isAdmin: !user.isAdmin })}
                          data-testid={`button-toggle-admin-${user.id}`}
                        >
                          <Shield className="h-3.5 w-3.5" />
                          {user.isAdmin ? "Retirer admin" : "Rendre admin"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── TRANSACTIONS TAB ── */}
          <TabsContent value="transactions" className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="Référence, téléphone, description..."
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  data-testid="input-search-transactions"
                />
              </div>
              <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-tx-status-filter">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>
              <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                <SelectTrigger className="w-36" data-testid="select-tx-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="deposit">Dépôt</SelectItem>
                  <SelectItem value="withdrawal">Retrait</SelectItem>
                  <SelectItem value="transfer">Transfert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {txLoading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : (
              <div className="space-y-2">
                {filteredTx.map(tx => (
                  <Card key={tx.id} data-testid={`card-tx-${tx.id}`}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TypeBadge type={tx.type} />
                            <StatusBadge status={tx.status} />
                            <span className="text-xs text-muted-foreground font-mono">{tx.reference}</span>
                          </div>
                          <p className="text-sm truncate text-muted-foreground">{tx.description || "—"}</p>
                          <p className="text-xs text-muted-foreground">{tx.phoneNumber || "—"} · {tx.provider || "—"} · {formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="font-bold">{formatCurrency(parseFloat(tx.amount))}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setTxStatusDialog({ open: true, txId: tx.id, current: tx.status }); setNewTxStatus(tx.status); }}
                            data-testid={`button-edit-tx-${tx.id}`}
                          >
                            <PenLine className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredTx.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">Aucune transaction trouvée</div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── PASSWORD DIALOG ── */}
      <Dialog open={passwordDialog.open} onOpenChange={open => setPasswordDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Modifier le mot de passe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Utilisateur : <strong>{passwordDialog.userName}</strong></p>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 caractères"
                data-testid="input-new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog({ open: false, userId: "", userName: "" })}>Annuler</Button>
            <Button
              onClick={() => changePasswordMutation.mutate({ userId: passwordDialog.userId, password: newPassword })}
              disabled={changePasswordMutation.isPending || newPassword.length < 6}
              data-testid="button-confirm-password"
            >
              {changePasswordMutation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BALANCE DIALOG ── */}
      <Dialog open={balanceDialog.open} onOpenChange={open => setBalanceDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Ajuster le solde
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Utilisateur : <strong>{balanceDialog.userName}</strong><br />
              Solde actuel : <strong>{formatCurrency(balanceDialog.currentBalance)}</strong>
            </p>
            <div className="space-y-2">
              <Label>Montant (positif = crédit, négatif = débit)</Label>
              <Input
                type="number"
                value={balanceAmount}
                onChange={e => setBalanceAmount(e.target.value)}
                placeholder="Ex: 5000 ou -2000"
                data-testid="input-balance-amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Motif de l'ajustement</Label>
              <Textarea
                value={balanceMotif}
                onChange={e => setBalanceMotif(e.target.value)}
                placeholder="Raison de l'ajustement du solde..."
                rows={2}
                data-testid="input-balance-motif"
              />
            </div>
            {balanceAmount && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>Nouveau solde estimé : <strong>{formatCurrency(balanceDialog.currentBalance + (parseFloat(balanceAmount) || 0))}</strong></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialog({ open: false, userId: "", userName: "", currentBalance: 0 })}>Annuler</Button>
            <Button
              onClick={() => adjustBalanceMutation.mutate({ userId: balanceDialog.userId, amount: parseFloat(balanceAmount), motif: balanceMotif })}
              disabled={adjustBalanceMutation.isPending || !balanceAmount || !balanceMotif}
              data-testid="button-confirm-balance"
            >
              {adjustBalanceMutation.isPending ? "Enregistrement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TX STATUS DIALOG ── */}
      <Dialog open={txStatusDialog.open} onOpenChange={open => setTxStatusDialog(d => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut de la transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Statut actuel : <StatusBadge status={txStatusDialog.current} /></p>
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select value={newTxStatus} onValueChange={setNewTxStatus}>
                <SelectTrigger data-testid="select-new-tx-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800 dark:text-yellow-400">
                Modifier le statut manuellement ne met pas à jour le solde du portefeuille automatiquement. Utilisez l'ajustement de solde si nécessaire.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTxStatusDialog({ open: false, txId: "", current: "" })}>Annuler</Button>
            <Button
              onClick={() => updateTxStatusMutation.mutate({ txId: txStatusDialog.txId, status: newTxStatus })}
              disabled={updateTxStatusMutation.isPending}
              data-testid="button-confirm-tx-status"
            >
              {updateTxStatusMutation.isPending ? "Enregistrement..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

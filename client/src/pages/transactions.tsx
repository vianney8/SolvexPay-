import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Search, Activity, TrendingUp, CheckCircle2, Clock, X, ExternalLink, User, Mail, Phone, Globe, Zap } from "lucide-react";
import { useState } from "react";
import type { Transaction } from "@shared/schema";

function formatCurrency(amount: string | number, currency = "XOF") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function isPaymentLink(tx: Transaction) {
  return tx.description?.startsWith("Paiement via lien:");
}

function getTypeIcon(tx: Transaction) {
  if (tx.type === "deposit") return { icon: ArrowDownLeft, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" };
  if (tx.type === "transfer") return { icon: ArrowLeftRight, bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" };
  return { icon: ArrowUpRight, bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" };
}

function getTypeLabel(tx: Transaction) {
  if (isPaymentLink(tx)) return "Paiement";
  if (tx.type === "deposit") return "Dépôt";
  if (tx.type === "transfer") return "Transfert";
  return "Retrait";
}

function getDisplayProvider(tx: Transaction) {
  if (!tx.provider) return null;
  if (tx.provider.toLowerCase() === "omnipay") return null;
  return tx.provider;
}

function getStatusStyle(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (status === "pending") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Terminé";
  if (status === "pending") return "En cours";
  return "Échoué";
}

function TransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const isLink = isPaymentLink(tx);
  const linkName = isLink ? tx.description?.replace("Paiement via lien: ", "") : undefined;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${getTypeIcon(tx).bg}`}>
              {(() => { const Icon = getTypeIcon(tx).icon; return <Icon className={`h-5 w-5 ${getTypeIcon(tx).text}`} />; })()}
            </div>
            <div>
              <p className="font-bold text-base">{getTypeLabel(tx)}</p>
              {isLink && linkName && <p className="text-xs text-muted-foreground">{linkName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors" data-testid="button-close-tx-modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center py-2">
            <p className={`text-3xl font-black ${tx.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
              {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)} {tx.currency}
            </p>
            <Badge className={`mt-2 ${getStatusStyle(tx.status)}`}>{getStatusLabel(tx.status)}</Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">Référence</span>
              <span className="font-mono text-xs font-semibold text-right max-w-[180px] break-all">{tx.reference}</span>
            </div>
            {tx.createdAt && (
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Date</span>
                <span className="font-semibold">{formatDate(tx.createdAt)}</span>
              </div>
            )}
            {getDisplayProvider(tx) && (
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Zap className="h-3.5 w-3.5" /> Opérateur</span>
                <span className="font-semibold">{getDisplayProvider(tx)}</span>
              </div>
            )}
            {tx.phoneNumber && (
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Téléphone</span>
                <span className="font-semibold">{tx.phoneNumber}</span>
              </div>
            )}
            {(tx as any).fees && parseFloat((tx as any).fees) > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Frais</span>
                <span className="font-semibold text-orange-600">{formatCurrency((tx as any).fees, tx.currency)} {tx.currency}</span>
              </div>
            )}
            {isLink && (
              <>
                {(tx as any).payerName && (
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><User className="h-3.5 w-3.5" /> Payeur</span>
                    <span className="font-semibold">{(tx as any).payerName}</span>
                  </div>
                )}
                {(tx as any).payerEmail && (
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</span>
                    <span className="font-semibold text-right max-w-[180px] break-all">{(tx as any).payerEmail}</span>
                  </div>
                )}
                {(tx as any).payerCountry && (
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Globe className="h-3.5 w-3.5" /> Pays</span>
                    <span className="font-semibold">{(tx as any).payerCountry}</span>
                  </div>
                )}
              </>
            )}
            {tx.description && (
              <div className="py-2">
                <p className="text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{tx.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({ queryKey: ["/api/transactions"] });

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesSearch =
      tx.reference.toLowerCase().includes(search.toLowerCase()) ||
      (tx.provider?.toLowerCase().includes(search.toLowerCase()) && tx.provider.toLowerCase() !== "omnipay") ||
      tx.phoneNumber?.toLowerCase().includes(search.toLowerCase()) ||
      tx.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  const completed = transactions?.filter(t => t.status === "completed").length || 0;
  const pending = transactions?.filter(t => t.status === "pending").length || 0;

  const summaryCards = [
    { label: "Total", value: transactions?.length || 0, icon: Activity, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
    { label: "Réussies", value: completed, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "En attente", value: pending, icon: Clock, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Taux succès", value: `${transactions && transactions.length > 0 ? Math.round((completed / transactions.length) * 100) : 0}%`, icon: TrendingUp, color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  ];

  return (
    <DashboardLayout title="Transactions" breadcrumbs={[{ label: "Transactions" }]}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{card.label}</p>
                  <div className={`h-8 w-8 rounded-lg ${card.color.split(" ").slice(0, 1).join(" ")} flex items-center justify-center`}>
                    <card.icon className={`h-4 w-4 ${card.color.split(" ").slice(1).join(" ")}`} />
                  </div>
                </div>
                {isLoading ? <Skeleton className="h-7 w-16" /> : (
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-bold">Historique des transactions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 border-border/70"
                  data-testid="input-search-transactions"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40 h-10 border-border/70" data-testid="select-filter-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="deposit">Dépôts</SelectItem>
                  <SelectItem value="withdrawal">Retraits</SelectItem>
                  <SelectItem value="transfer">Transferts</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-10 border-border/70" data-testid="select-filter-status">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En cours</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1"><Skeleton className="h-4 w-32 mb-1.5" /><Skeleton className="h-3 w-24" /></div>
                    <Skeleton className="h-5 w-28" />
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-bold text-foreground mb-1">Aucune transaction trouvée</p>
                <p className="text-sm text-muted-foreground">Vos transactions apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((tx) => {
                  const typeStyle = getTypeIcon(tx);
                  const TypeIcon = typeStyle.icon;
                  const displayProvider = getDisplayProvider(tx);
                  return (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted/40 transition-colors group border border-transparent hover:border-border/60 text-left"
                      data-testid={`transaction-row-${tx.id}`}
                    >
                      <div className={`h-10 w-10 rounded-xl ${typeStyle.bg} flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className={`h-4 w-4 ${typeStyle.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">{getTypeLabel(tx)}</p>
                          {displayProvider && <span className="text-xs text-muted-foreground">{displayProvider}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground font-mono">{tx.reference.slice(0, 16)}…</p>
                          {tx.phoneNumber && <span className="text-xs text-muted-foreground">{tx.phoneNumber}</span>}
                        </div>
                      </div>
                      <div className="hidden md:block text-xs text-muted-foreground flex-shrink-0 min-w-[120px] text-right">
                        {tx.createdAt && formatDate(tx.createdAt)}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold text-sm ${tx.type === "deposit" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                          {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)} {tx.currency}
                        </p>
                        <Badge className={`text-xs mt-1 ${getStatusStyle(tx.status)}`}>
                          {getStatusLabel(tx.status)}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTx && <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </DashboardLayout>
  );
}

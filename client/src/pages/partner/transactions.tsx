import { useQuery } from "@tanstack/react-query";
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
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  X, 
  Zap, 
  Phone, 
  Globe, 
  Mail, 
  User 
} from "lucide-react";
import { useState } from "react";
import type { Transaction } from "@shared/schema";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function getStatusStyle(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (status === "pending") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
}

function getStatusLabel(status: string) {
  if (status === "completed") return "Succès";
  if (status === "pending") return "En cours";
  return "Échoué";
}

function TransactionModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tx.status === "completed" ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
               <Zap className={`h-5 w-5 ${tx.status === "completed" ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <div>
              <p className="font-black text-base uppercase tracking-tight">Détails Transaction</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tx.reference}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors" data-testid="button-close-tx-modal">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center py-2">
            <p className={`text-4xl font-black ${tx.status === "completed" ? "text-emerald-600" : "text-foreground"}`}>
              {formatCurrency(tx.amount)} {tx.currency}
            </p>
            <Badge className={`mt-3 font-black uppercase tracking-widest px-3 py-0.5 ${getStatusStyle(tx.status)}`}>{getStatusLabel(tx.status)}</Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2.5 border-b border-border/40">
              <span className="text-muted-foreground font-semibold">Référence</span>
              <span className="font-mono text-xs font-black text-right max-w-[180px] break-all">{tx.reference}</span>
            </div>
            {tx.createdAt && (
              <div className="flex items-center justify-between py-2.5 border-b border-border/40">
                <span className="text-muted-foreground font-semibold">Date</span>
                <span className="font-black">{formatDate(tx.createdAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5 border-b border-border/40">
              <span className="flex items-center gap-1.5 text-muted-foreground font-semibold"><Zap className="h-3.5 w-3.5" /> Opérateur</span>
              <span className="font-black">{tx.provider}</span>
            </div>
            {tx.phoneNumber && (
              <div className="flex items-center justify-between py-2.5 border-b border-border/40">
                <span className="flex items-center gap-1.5 text-muted-foreground font-semibold"><Phone className="h-3.5 w-3.5" /> Téléphone</span>
                <span className="font-black">{tx.phoneNumber}</span>
              </div>
            )}
            {tx.fees && parseFloat(tx.fees) > 0 && (
              <>
                <div className="flex items-center justify-between py-2.5 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Frais API</span>
                  <span className="font-black text-orange-600">{formatCurrency(tx.fees)} {tx.currency}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Net reçu</span>
                  <span className="font-black text-emerald-600">
                    {formatCurrency(parseFloat(tx.amount) - parseFloat(tx.fees))} {tx.currency}
                  </span>
                </div>
              </>
            )}
            {tx.payerName && (
              <div className="flex items-center justify-between py-2.5 border-b border-border/40">
                <span className="flex items-center gap-1.5 text-muted-foreground font-semibold"><User className="h-3.5 w-3.5" /> Client</span>
                <span className="font-black truncate max-w-[200px]">{tx.payerName}</span>
              </div>
            )}
            {tx.payerEmail && (
              <div className="flex items-center justify-between py-2.5 border-b border-border/40">
                <span className="flex items-center gap-1.5 text-muted-foreground font-semibold"><Mail className="h-3.5 w-3.5" /> Email Client</span>
                <span className="font-black truncate max-w-[200px]">{tx.payerEmail}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerTransactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({ queryKey: ["/api/partner/transactions"] });

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesSearch = !search ||
      tx.reference.toLowerCase().includes(search.toLowerCase()) ||
      tx.provider?.toLowerCase().includes(search.toLowerCase()) ||
      tx.phoneNumber?.toLowerCase().includes(search.toLowerCase()) ||
      tx.description?.toLowerCase().includes(search.toLowerCase()) ||
      tx.payerName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const completed = transactions?.filter(t => t.status === "completed").length || 0;
  const pending = transactions?.filter(t => t.status === "pending").length || 0;

  const summaryCards = [
    { label: "Total", value: transactions?.length || 0, icon: Activity, color: "bg-primary/10 text-primary border-primary/20" },
    { label: "Réussies", value: completed, icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { label: "En attente", value: pending, icon: Clock, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    { label: "Volume", value: formatCurrency(transactions?.filter(t => t.status === "completed").reduce((s, t) => s + parseFloat(t.amount), 0) || 0) + " XOF", icon: TrendingUp, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className={`border ${card.color} shadow-sm overflow-hidden`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center">
                  <card.icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{card.label}</p>
              </div>
              <p className="text-xl font-black truncate">{isLoading ? "—" : card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence, téléphone, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 border-border/70 rounded-xl bg-background"
                data-testid="input-search-transactions"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 h-11 border-border/70 rounded-xl bg-background font-bold" data-testid="select-filter-status">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En cours</SelectItem>
                <SelectItem value="completed">Succès</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-3 w-1/3" /></div>
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-20 text-center">
              <div className="h-20 w-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Activity className="h-10 w-10 text-muted-foreground/20" />
              </div>
              <p className="text-lg font-black text-foreground mb-2">Aucune transaction trouvée</p>
              <p className="text-sm text-muted-foreground">Affinez vos filtres ou effectuez un paiement via l'API.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredTransactions.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="w-full flex items-center gap-4 p-5 hover:bg-muted/30 transition-all text-left group"
                  data-testid={`transaction-row-${tx.id}`}
                >
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${tx.status === "completed" ? "bg-emerald-500/10" : tx.status === "pending" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                    <Zap className={`h-5 w-5 ${tx.status === "completed" ? "text-emerald-600" : tx.status === "pending" ? "text-amber-600" : "text-red-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-black text-sm text-foreground truncate">{tx.description || "Paiement API Direct"}</p>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter px-1 py-0 h-4 border-primary/20 text-primary bg-primary/5">API</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>{tx.reference.slice(0, 12)}…</span>
                      <span>{tx.provider}</span>
                      {tx.phoneNumber && <span>• {tx.phoneNumber}</span>}
                    </div>
                  </div>
                  <div className="hidden md:block text-right pr-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{tx.createdAt && formatDate(tx.createdAt)}</p>
                    <p className="text-xs font-bold text-foreground truncate">{tx.payerName || "Client"}</p>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[100px]">
                    <p className="font-black text-base text-foreground leading-none">{formatCurrency(tx.amount)}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1.5">{tx.currency}</p>
                    <div className={`mt-2 h-1 w-full rounded-full ${tx.status === "completed" ? "bg-emerald-500" : tx.status === "pending" ? "bg-amber-500" : "bg-red-500"}`} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTx && <TransactionModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
    </div>
  );
}

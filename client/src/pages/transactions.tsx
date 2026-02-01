import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, Search, Activity } from "lucide-react";
import { useState } from "react";
import type { Transaction } from "@shared/schema";

function formatCurrency(amount: string | number, currency = "XOF") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesSearch = 
      tx.reference.toLowerCase().includes(search.toLowerCase()) ||
      tx.provider?.toLowerCase().includes(search.toLowerCase()) ||
      tx.phoneNumber?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  return (
    <DashboardLayout title="Transactions" breadcrumbs={[{ label: "Transactions" }]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Historique des transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par référence, fournisseur ou téléphone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-transactions"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="deposit">Dépôts</SelectItem>
                  <SelectItem value="withdrawal">Retraits</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-status">
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
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Aucune transaction trouvée</p>
                <p className="text-sm">Vos transactions apparaîtront ici</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} data-testid={`transaction-row-${tx.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                              tx.type === "deposit" ? "bg-primary/10" : "bg-orange-500/10"
                            }`}>
                              {tx.type === "deposit" ? (
                                <ArrowDownLeft className="h-4 w-4 text-primary" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                            <span className="font-medium">
                              {tx.type === "deposit" ? "Dépôt" : "Retrait"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{tx.reference}</TableCell>
                        <TableCell>{tx.provider || "-"}</TableCell>
                        <TableCell>{tx.phoneNumber || "-"}</TableCell>
                        <TableCell className={`font-semibold ${tx.type === "deposit" ? "text-primary" : ""}`}>
                          {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              tx.status === "completed" ? "default" : 
                              tx.status === "pending" ? "secondary" : 
                              "destructive"
                            }
                          >
                            {tx.status === "completed" ? "Terminé" : 
                             tx.status === "pending" ? "En cours" : 
                             "Échoué"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {tx.createdAt && formatDate(tx.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

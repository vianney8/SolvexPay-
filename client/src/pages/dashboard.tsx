import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Wallet, 
  Link2, 
  Activity,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { Transaction, Wallet as WalletType } from "@shared/schema";

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function DashboardPage() {
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletType>({
    queryKey: ["/api/wallet"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
    paymentLinksCount: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const recentTransactions = transactions?.slice(0, 5) || [];

  return (
    <DashboardLayout title="Tableau de bord" breadcrumbs={[{ label: "Tableau de bord" }]}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Solde XOF
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {walletLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-balance-xof">
                  {formatCurrency(wallet?.balanceXOF || 0, "XOF")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dépôts totaux
              </CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold text-primary" data-testid="text-total-deposits">
                  {formatCurrency(stats?.totalDeposits || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Retraits totaux
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-withdrawals">
                  {formatCurrency(stats?.totalWithdrawals || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Liens de paiement
              </CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-payment-links-count">
                  {stats?.paymentLinksCount || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1">
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Link href="/wallet">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4" data-testid="button-quick-deposit">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ArrowDownLeft className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Faire un dépôt</p>
                    <p className="text-xs text-muted-foreground">Mobile Money</p>
                  </div>
                </Button>
              </Link>
              
              <Link href="/wallet">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4" data-testid="button-quick-withdraw">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <ArrowUpRight className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Faire un retrait</p>
                    <p className="text-xs text-muted-foreground">Vers Mobile Money</p>
                  </div>
                </Button>
              </Link>
              
              <Link href="/payment-links">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4" data-testid="button-quick-payment-link">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Créer un lien</p>
                    <p className="text-xs text-muted-foreground">Lien de paiement</p>
                  </div>
                </Button>
              </Link>
              
              <Link href="/api-keys">
                <Button variant="outline" className="w-full justify-start gap-2 h-auto py-4" data-testid="button-quick-api">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Gérer l'API</p>
                    <p className="text-xs text-muted-foreground">Clés et intégration</p>
                  </div>
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1">
              <CardTitle>Transactions récentes</CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-transactions">
                  Voir tout
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune transaction récente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4" data-testid={`transaction-item-${tx.id}`}>
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        tx.type === "deposit" ? "bg-primary/10" : "bg-orange-500/10"
                      }`}>
                        {tx.type === "deposit" ? (
                          <ArrowDownLeft className="h-5 w-5 text-primary" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {tx.type === "deposit" ? "Dépôt" : "Retrait"} - {tx.provider}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.createdAt && formatDate(tx.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${
                          tx.type === "deposit" ? "text-primary" : ""
                        }`}>
                          {tx.type === "deposit" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                        </p>
                        <Badge variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                          {tx.status === "completed" ? "Terminé" : tx.status === "pending" ? "En cours" : "Échoué"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1">
            <div>
              <CardTitle>Commencer avec l'API</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Intégrez SolvaxPay dans votre application
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm overflow-x-auto">
              <pre className="text-muted-foreground">
{`curl -X POST https://api.solvaxpay.com/v1/payments \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "currency": "XOF",
    "provider": "mtn",
    "phone": "+221771234567"
  }'`}
              </pre>
            </div>
            <div className="mt-4 flex gap-3">
              <Link href="/api-keys">
                <Button data-testid="button-get-api-key">
                  Obtenir une clé API
                </Button>
              </Link>
              <Button variant="outline">
                Voir la documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

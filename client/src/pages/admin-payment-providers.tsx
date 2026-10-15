import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Activity, ArrowLeft, BookOpen, CheckCircle2, CircleAlert, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type AlphaPayConfig = {
  provider: "alphapay";
  configured: boolean;
  webhookConfigured: boolean;
  docsUrl: string;
  payoutRequirements: string[];
};

type ProviderLog = {
  id: string;
  providerCode?: string;
  action: string;
  reference: string | null;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
};

type AlphaPayBalance = {
  success: 1;
  balance: Array<{ countryName: string; countryCode: string; amount: number | string; pending: number | string; currency: string }>;
};

export default function AdminPaymentProvidersPage() {
  const config = useQuery<AlphaPayConfig>({ queryKey: ["/api/admin/alphapay/config"], staleTime: 30_000 });
  const logs = useQuery<ProviderLog[]>({
    queryKey: ["/api/admin/payment-provider-logs", "alphapay"],
    queryFn: async () => {
      const response = await fetch("/api/admin/payment-provider-logs?provider=alphapay", { credentials: "include" });
      if (!response.ok) throw new Error("Impossible de charger le journal.");
      const result = await response.json();
      return Array.isArray(result) ? result : result.logs || [];
    },
    refetchInterval: 10_000,
  });
  const balance = useQuery<AlphaPayBalance>({
    queryKey: ["/api/admin/alphapay/balance"],
    refetchInterval: 30_000,
  });

  const configured = config.data?.configured === true;
  const setupItems = [
    { label: "Connexion AlphaPay", ready: config.data?.configured },
    { label: "Notifications webhook", ready: config.data?.webhookConfigured },
  ];

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center gap-4">
          <Link href="/admin" className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" data-testid="link-back-admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Infrastructure paiements</p>
            <h1 className="text-2xl font-black tracking-tight">AlphaPay</h1>
          </div>
          <Badge className={`ml-auto gap-1.5 ${configured ? "bg-emerald-600" : "bg-amber-600"}`}>
            {configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
            {configured ? "Connecté" : "Configuration requise"}
          </Badge>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <Card className="overflow-hidden border-border/60">
            <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" /> État du service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {config.isLoading ? (
                <div className="space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-16 w-full" /></div>
              ) : config.isError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="font-semibold">État AlphaPay indisponible</p>
                  <p className="mt-1 text-sm text-muted-foreground">Réessayez dans quelques instants.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => config.refetch()}>Réessayer</Button>
                </div>
              ) : (
                <>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    AlphaPay traite les collectes, décaissements et le suivi des paiements. Les clients sont dirigés vers le checkout hébergé; aucun SDK navigateur ni clé publique n’est requis.
                  </p>
                <div className="grid gap-2 sm:grid-cols-2">
                    {setupItems.map(item => (
                      <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
                        {item.ready ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <CircleAlert className="h-4 w-4 shrink-0 text-amber-600" />}
                        <span className="text-xs font-semibold">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {config.data?.docsUrl && (
                      <a href={config.data.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                        <BookOpen className="h-4 w-4" /> Documentation AlphaPay <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button variant="outline" size="sm" onClick={() => config.refetch()} disabled={config.isFetching}>
                      <RefreshCw className={`mr-2 h-3.5 w-3.5 ${config.isFetching ? "animate-spin" : ""}`} /> Actualiser
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Conditions de décaissement</CardTitle></CardHeader>
            <CardContent>
              {config.isLoading ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div> : (
                <ul className="space-y-3">
                  {(config.data?.payoutRequirements || []).length ? config.data!.payoutRequirements.map((item, index) => (
                    <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700">{index + 1}</span>
                      <span>{item}</span>
                    </li>
                  )) : <li className="text-sm text-muted-foreground">Aucune condition particulière communiquée.</li>}
                </ul>
              )}
              <p className="mt-5 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                Les clés API et secrets webhook sont gérés dans Replit Secrets. N’ajoutez aucune clé dans l’interface.
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Soldes AlphaPay</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => balance.refetch()} disabled={balance.isFetching} aria-label="Actualiser les soldes">
              <RefreshCw className={`h-4 w-4 ${balance.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {balance.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> : balance.isError ? (
              <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Les soldes ne sont pas disponibles pour le moment.</div>
            ) : !balance.data?.balance?.length ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucun solde retourné par AlphaPay.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {balance.data.balance.map(row => (
                  <div key={row.countryCode} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs font-semibold text-muted-foreground">{row.countryName} <span className="font-mono">· {row.countryCode}</span></p>
                    <p className="mt-2 text-lg font-black">{new Intl.NumberFormat("fr-FR").format(Number(row.amount) || 0)} <span className="text-xs font-semibold text-muted-foreground">{row.currency}</span></p>
                    <p className="mt-1 text-xs text-muted-foreground">En attente : {new Intl.NumberFormat("fr-FR").format(Number(row.pending) || 0)} {row.currency}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Journal des opérations</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Événements AlphaPay uniquement · actualisation automatique</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => logs.refetch()} disabled={logs.isFetching} aria-label="Actualiser le journal">
              <RefreshCw className={`h-4 w-4 ${logs.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {logs.isLoading ? <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div> : logs.isError ? (
              <div className="rounded-xl border border-destructive/30 p-4 text-sm">Impossible de charger le journal. <Button variant="outline" size="sm" className="ml-2" onClick={() => logs.refetch()}>Réessayer</Button></div>
            ) : !logs.data?.length ? (
              <div className="rounded-xl border border-dashed border-border p-7 text-center">
                <Activity className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-semibold">Aucune opération enregistrée</p>
                <p className="mt-1 text-xs text-muted-foreground">Les appels AlphaPay apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.data.map(log => (
                  <div key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border/50 p-3 text-xs">
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status === "success" ? "OK" : log.status}</Badge>
                    <span className="font-semibold">{log.action}</span>
                    <span className="font-mono text-muted-foreground">{log.reference || "Sans référence"}</span>
                    <span className="ml-auto text-muted-foreground">{log.durationMs ?? "—"} ms</span>
                    <time className="text-muted-foreground">{new Date(log.createdAt).toLocaleString("fr-FR")}</time>
                    {log.errorMessage && <p className="w-full truncate text-destructive" title={log.errorMessage}>{log.errorMessage}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

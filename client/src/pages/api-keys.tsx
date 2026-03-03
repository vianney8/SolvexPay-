import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Key, Copy, Trash2, Eye, EyeOff, Code, Globe, Lock, Zap, BookOpen } from "lucide-react";
import type { ApiKey } from "@shared/schema";

function formatDate(date: string | Date | null) {
  if (!date) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setCreateOpen(false);
      toast({ title: "Cle creee", description: "Votre nouvelle cle API de production est prete." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de creer la cle API.", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/api-keys/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "Cle supprimee", description: "La cle API a ete supprimee." });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
    });
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Cle copiee", description: "La cle API a ete copiee dans le presse-papiers." });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <DashboardLayout title="Clés API" breadcrumbs={[{ label: "Clés API" }]}>
      <div className="max-w-3xl space-y-6">
        <div
          className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(220 83% 48%) 0%, hsl(240 70% 60%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Key className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-xl" data-testid="text-api-title">Clés API</p>
              <p className="text-white/70 text-sm mt-0.5" data-testid="text-api-subtitle">Intégrez SolvexPay dans vos applications</p>
            </div>
            <Button
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white border-0 font-bold gap-2 backdrop-blur-sm"
              onClick={() => setCreateOpen(true)}
              data-testid="button-create-key"
            >
              <Plus className="h-4 w-4" />
              Nouvelle clé
            </Button>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Creer une cle API de production</DialogTitle>
              <DialogDescription>
                Cette cle vous permettra d'integrer SolvexPay dans votre application
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Nom de la cle</Label>
                <Input id="key-name" name="name" placeholder="Ex: Mon application mobile" required data-testid="input-key-name" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-confirm-create-key">
                {createMutation.isPending ? "Creation..." : "Creer la cle de production"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <Card className="border-border/60 border-dashed">
            <CardContent className="py-14 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <Key className="h-8 w-8 text-primary/40" data-testid="icon-empty-keys" />
              </div>
              <p className="font-bold text-foreground mb-1" data-testid="text-empty-message">Aucune clé API</p>
              <p className="text-sm text-muted-foreground mb-5">Créez votre première clé pour intégrer SolvexPay</p>
              <Button className="gap-2 font-bold shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)} data-testid="button-create-first-key">
                <Plus className="h-4 w-4" />
                Créer votre première clé API
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <Card key={key.id} className="border-border/60 overflow-hidden" data-testid={`key-row-${key.id}`}>
                <div className={`h-1 ${key.isActive ? "bg-gradient-to-r from-blue-500 to-violet-500" : "bg-muted"}`} />
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm">{key.name}</h3>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Production</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${key.isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
                            {key.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Créée le {key.createdAt && formatDate(key.createdAt)}</span>
                          <span className="text-xs text-muted-foreground">Dernière utilisation : {formatDate(key.lastUsedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={key.isActive}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: key.id, isActive: checked })}
                          data-testid={`switch-key-${key.id}`}
                        />
                        <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(key.id)} className="text-destructive border-destructive/20 hover:bg-destructive/5" data-testid={`button-delete-key-${key.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-muted/60 rounded-xl px-4 py-2.5 border border-border/60">
                        <code className="text-xs font-mono truncate block" data-testid={`text-key-value-${key.id}`}>
                          {visibleKeys[key.id] ? (key.fullKey || `${key.keyPrefix}...`) : `${key.keyPrefix}${"•".repeat(24)}`}
                        </code>
                      </div>
                      <Button variant="outline" size="icon" className="flex-shrink-0 border-border/60" onClick={() => toggleKeyVisibility(key.id)} data-testid={`button-toggle-key-${key.id}`}>
                        {visibleKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="icon" className="flex-shrink-0 border-border/60" onClick={() => copyKey(key.fullKey || key.keyPrefix)} data-testid={`button-copy-key-${key.id}`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border/60" data-testid="section-documentation">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Documentation API</CardTitle>
                <p className="text-xs text-muted-foreground">Guide d'intégration de l'API SolvexPay</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" /> Endpoints disponibles
              </p>
              <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden">
                {[
                  { method: "POST", path: "/v1/payments", desc: "Créer un nouveau paiement Mobile Money", color: "bg-emerald-500 text-white" },
                  { method: "GET", path: "/v1/payments/:id", desc: "Vérifier le statut d'un paiement", color: "bg-blue-500 text-white" },
                  { method: "POST", path: "/v1/transfers", desc: "Effectuer un transfert Mobile Money", color: "bg-emerald-500 text-white" },
                  { method: "GET", path: "/v1/balance", desc: "Consulter le solde du compte", color: "bg-blue-500 text-white" },
                ].map((ep) => (
                  <div key={ep.path} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${ep.color}`}>{ep.method}</span>
                    <code className="text-sm font-mono font-semibold text-foreground flex-shrink-0">{ep.path}</code>
                    <p className="text-xs text-muted-foreground truncate">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" /> Démarrage rapide
              </p>
              <div className="bg-slate-950 dark:bg-black rounded-xl p-4 overflow-x-auto">
                <code className="text-xs font-mono block whitespace-pre text-emerald-400">
{`curl -X POST https://api.solvexpay.com/v1/payments \\
  -H "Authorization: Bearer sk_live_xxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "currency": "XOF",
    "provider": "mtn",
    "phone": "+22997000000"
  }'`}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" /> Bonnes pratiques de sécurité
              </p>
              <div className="space-y-2">
                {[
                  "Ne partagez jamais votre clé API publiquement",
                  "Stockez-la dans des variables d'environnement",
                  "Utilisez HTTPS pour toutes vos requêtes",
                  "Configurez les webhooks pour recevoir les notifications",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                    <p className="text-sm text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

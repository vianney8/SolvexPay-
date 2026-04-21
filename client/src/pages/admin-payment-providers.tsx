import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Settings, CheckCircle2, XCircle, Activity } from "lucide-react";

interface Provider {
  id: string;
  code: string;
  displayName: string;
  isActive: boolean;
  apiKey: string;
  secretKey: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  hasSecretKey: boolean;
}

interface ProviderLog {
  id: string;
  providerCode: string;
  action: string;
  reference: string | null;
  status: string;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export default function AdminPaymentProvidersPage() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Provider | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ["/api/admin/payment-providers"],
  });

  const { data: logs = [] } = useQuery<ProviderLog[]>({
    queryKey: ["/api/admin/payment-provider-logs"],
    refetchInterval: 10_000,
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/payment-providers/${id}/activate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-providers"] });
      toast({ title: "Fournisseur activé", description: "Toutes les opérations utiliseront ce fournisseur." });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/payment-providers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-providers"] });
      toast({ title: "Fournisseur supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" data-testid="link-back-admin">
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black">Fournisseurs de paiement</h1>
            <p className="text-sm text-muted-foreground">Un seul fournisseur peut être actif à la fois.</p>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setCreating(true)} data-testid="button-add-provider">
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </div>

        <Tabs defaultValue="providers">
          <TabsList>
            <TabsTrigger value="providers" data-testid="tab-providers">Fournisseurs</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Journal des appels</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            {isLoading ? (
              <div className="text-muted-foreground">Chargement...</div>
            ) : providers.length === 0 ? (
              <div className="text-muted-foreground">Aucun fournisseur.</div>
            ) : (
              providers.map((p) => (
                <Card key={p.id} data-testid={`card-provider-${p.code}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle data-testid={`text-provider-name-${p.code}`}>{p.displayName}</CardTitle>
                        <Badge variant="outline" className="font-mono text-xs">{p.code}</Badge>
                        {p.isActive ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600" data-testid={`badge-active-${p.code}`}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-inactive-${p.code}`}>
                            <XCircle className="h-3 w-3 mr-1" /> Inactif
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Activer</span>
                        <Switch
                          checked={p.isActive}
                          disabled={p.isActive || activateMutation.isPending}
                          onCheckedChange={() => activateMutation.mutate(p.id)}
                          data-testid={`switch-activate-${p.code}`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">URL de base</div>
                      <div className="font-mono text-xs break-all" data-testid={`text-base-url-${p.code}`}>{p.baseUrl || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Clé API</div>
                      <div className="font-mono text-xs">
                        {p.hasApiKey ? p.apiKey : <span className="text-amber-600">Non configurée</span>}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Secret webhook</div>
                      <div className="font-mono text-xs">
                        {p.hasSecretKey ? p.secretKey : <span className="text-amber-600">Non configuré</span>}
                      </div>
                    </div>
                    <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                      {!p.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { if (confirm(`Supprimer ${p.displayName} ?`)) deleteMutation.mutate(p.id); }}
                          data-testid={`button-delete-${p.code}`}
                        >
                          Supprimer
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)} data-testid={`button-edit-${p.code}`}>
                        <Settings className="h-4 w-4 mr-2" /> Configurer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Derniers appels API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground text-sm">Aucun appel enregistré.</div>
                  ) : (
                    logs.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-3 text-xs border rounded-lg p-2"
                        data-testid={`row-log-${l.id}`}
                      >
                        <Badge variant="outline" className="font-mono">{l.providerCode}</Badge>
                        <span className="font-semibold">{l.action}</span>
                        {l.status === "success" ? (
                          <Badge className="bg-emerald-500 text-white">OK</Badge>
                        ) : (
                          <Badge variant="destructive">ERR</Badge>
                        )}
                        <span className="font-mono text-muted-foreground">{l.reference || "—"}</span>
                        <span className="ml-auto text-muted-foreground">{l.durationMs ?? "?"}ms</span>
                        <span className="text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
                        {l.errorMessage && <span className="text-red-500 text-xs truncate max-w-xs" title={l.errorMessage}>{l.errorMessage}</span>}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ProviderEditor
          provider={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
        />
        <ProviderEditor
          provider={null}
          open={creating}
          onClose={() => setCreating(false)}
          createMode
        />
      </div>
    </div>
  );
}

function ProviderEditor({
  provider,
  open,
  onClose,
  createMode,
}: {
  provider: Provider | null;
  open: boolean;
  onClose: () => void;
  createMode?: boolean;
}) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  // Récupère les valeurs en clair quand on ouvre le dialogue d'édition
  const { data: fullProvider } = useQuery<any>({
    queryKey: ["/api/admin/payment-providers", provider?.id],
    enabled: !!provider && open && !createMode,
  });

  useEffect(() => {
    if (createMode) {
      setDisplayName("");
      setBaseUrl("");
      setCode("");
      setApiKey("");
      setSecretKey("");
      setWebhookSecret("");
      return;
    }
    if (provider) {
      setDisplayName(provider.displayName);
      setBaseUrl(provider.baseUrl || "");
      setCode(provider.code);
    }
    if (fullProvider) {
      setApiKey(fullProvider.apiKey || "");
      setSecretKey(fullProvider.secretKey || "");
      setWebhookSecret(fullProvider.config?.webhookSecret || "");
      setBaseUrl(fullProvider.baseUrl || "");
      setDisplayName(fullProvider.displayName || "");
    }
  }, [provider, createMode, open, fullProvider]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (createMode) {
        const res = await apiRequest("POST", "/api/admin/payment-providers", {
          code: code.trim().toLowerCase(),
          displayName: displayName.trim(),
          isActive: false,
          apiKey,
          secretKey,
          baseUrl: baseUrl.trim() || null,
        });
        return res.json();
      } else if (provider) {
        const body: any = {};
        if (displayName !== provider.displayName) body.displayName = displayName;
        if (apiKey) body.apiKey = apiKey;
        if (secretKey) body.secretKey = secretKey;
        if (baseUrl !== (provider.baseUrl || "")) body.baseUrl = baseUrl || null;
        if (webhookSecret) body.config = { webhookSecret };
        const res = await apiRequest("PATCH", `/api/admin/payment-providers/${provider.id}`, body);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-providers"] });
      toast({ title: createMode ? "Fournisseur créé" : "Configuration mise à jour" });
      setApiKey(""); setSecretKey(""); setWebhookSecret("");
      onClose();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{createMode ? "Nouveau fournisseur" : `Configurer ${provider?.displayName}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {createMode && (
            <>
              <div>
                <Label>Code (unique, sans espaces)</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex: stripe, paydunya..." data-testid="input-provider-code" />
              </div>
              <div>
                <Label>Nom affiché</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Stripe" data-testid="input-provider-name" />
              </div>
            </>
          )}
          {!createMode && (
            <div>
              <Label>Nom affiché</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="input-provider-name" />
            </div>
          )}
          <div>
            <Label>URL de base API</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." data-testid="input-base-url" />
          </div>
          <div>
            <Label>Clé publique / API {!createMode && <span className="text-xs text-muted-foreground">(vide = inchangée)</span>}</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="pk_live_... ou clé API" data-testid="input-api-key" />
            <p className="text-xs text-muted-foreground mt-1">GeniusPay : clé pk_live_… — OmniPay : clé API marchand.</p>
          </div>
          <div>
            <Label>Clé secrète {!createMode && <span className="text-xs text-muted-foreground">(vide = inchangée)</span>}</Label>
            <Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="sk_live_... ou secret callback" data-testid="input-secret-key" />
            <p className="text-xs text-muted-foreground mt-1">GeniusPay : clé sk_live_… — OmniPay : clé de callback (signature webhook).</p>
          </div>
          <div>
            <Label>Secret webhook (whsec_) {!createMode && <span className="text-xs text-muted-foreground">(vide = inchangé)</span>}</Label>
            <Input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="whsec_live_..." data-testid="input-webhook-secret" />
            <p className="text-xs text-muted-foreground mt-1">Spécifique GeniusPay. Fourni par GeniusPay lorsque vous enregistrez l'URL du webhook dans leur tableau de bord.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-provider">
            {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

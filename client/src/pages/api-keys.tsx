import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Key, Copy, Trash2, Eye, EyeOff, Lock, Zap, BookOpen,
  ShieldAlert, Globe, Webhook, ChevronDown, ChevronUp, Check, AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
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

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: label ? `${label} copié` : "Copié", description: "Valeur copiée dans le presse-papiers." });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="icon" className="flex-shrink-0 border-border/60 h-8 w-8" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function KeyConfigSection({ apiKey }: { apiKey: ApiKey & { webhookSecret?: string; redirectUrl?: string; webhookUrl?: string; appName?: string } }) {
  const { toast } = useToast();
  const [redirectUrl, setRedirectUrl] = useState((apiKey as any).redirectUrl || "");
  const [webhookUrl, setWebhookUrl] = useState((apiKey as any).webhookUrl || "");
  const [saved, setSaved] = useState(false);
  const [visibleSecret, setVisibleSecret] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: { redirectUrl?: string; webhookUrl?: string }) => {
      return apiRequest("PATCH", `/api/api-keys/${apiKey.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: "Configuration sauvegardée" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    },
  });

  const webhookSecret = (apiKey as any).webhookSecret || "";

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5" /> Configuration des URLs
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">URL de redirection</Label>
          <p className="text-[11px] text-muted-foreground">Après un paiement réussi, l'utilisateur est redirigé ici.</p>
          <Input
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            placeholder="https://monapp.com/merci"
            className="h-8 text-xs"
            data-testid={`input-redirect-url-${apiKey.id}`}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Webhook className="h-3 w-3" /> URL de webhook
          </Label>
          <p className="text-[11px] text-muted-foreground">Notifications automatiques envoyées à cette URL après chaque transaction.</p>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://monapp.com/webhook"
            className="h-8 text-xs"
            data-testid={`input-webhook-url-${apiKey.id}`}
          />
        </div>
      </div>
      <Button
        size="sm"
        className="h-8 text-xs font-bold gap-1.5"
        onClick={() => updateMutation.mutate({ redirectUrl, webhookUrl })}
        disabled={updateMutation.isPending}
        data-testid={`button-save-config-${apiKey.id}`}
      >
        {saved ? <><Check className="h-3.5 w-3.5" /> Sauvegardé</> : updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
      </Button>

      {webhookSecret && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Lock className="h-3 w-3" /> Webhook Secret
          </Label>
          <p className="text-[11px] text-muted-foreground">Utilisez ce secret pour vérifier l'authenticité des webhooks reçus.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-muted/60 rounded-xl px-3 py-2 border border-border/60">
              <code className="text-xs font-mono truncate block" data-testid={`text-webhook-secret-${apiKey.id}`}>
                {visibleSecret ? webhookSecret : `whs_live_${"•".repeat(20)}`}
              </code>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setVisibleSecret(v => !v)} data-testid={`button-toggle-secret-${apiKey.id}`}>
              {visibleSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <CopyButton value={webhookSecret} label="Webhook Secret" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [kycGateOpen, setKycGateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [expandedConfig, setExpandedConfig] = useState<Record<string, boolean>>({});

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; appName: string; websiteUrl?: string }) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setCreateOpen(false);
      setExpandedConfig(prev => ({ ...prev, [newKey.id]: true }));
      toast({ title: "Clé créée", description: "Votre nouvelle clé API de production est prête." });
    },
    onError: (error: Error) => {
      try {
        const parsed = JSON.parse(error.message?.replace(/^\d+:\s*/, "") || "{}");
        if (parsed.kycRequired) { setKycGateOpen(true); return; }
      } catch {}
      toast({ title: "Erreur", description: "Impossible de créer la clé API.", variant: "destructive" });
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
      setDeleteConfirmId(null);
      toast({ title: "Clé supprimée", description: "La clé API a été supprimée définitivement." });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      appName: formData.get("appName") as string,
      websiteUrl: (formData.get("websiteUrl") as string) || undefined,
    });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleConfig = (id: string) => {
    setExpandedConfig(prev => ({ ...prev, [id]: !prev[id] }));
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
              <DialogTitle>Créer une clé API de production</DialogTitle>
              <DialogDescription>
                Cette clé vous permettra d'intégrer SolvexPay dans votre application via notre API.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Nom de la clé <span className="text-destructive">*</span></Label>
                <Input id="key-name" name="name" placeholder="Ex: Clé principale" required data-testid="input-key-name" />
                <p className="text-xs text-muted-foreground">Référence interne pour identifier cette clé.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-appname">Nom de l'application <span className="text-destructive">*</span></Label>
                <Input id="key-appname" name="appName" placeholder="Ex: MonShop, PayApp, BoutiqueXYZ" required data-testid="input-key-appname" />
                <p className="text-xs text-muted-foreground">Ce nom sera affiché sur la page de paiement à la place de votre nom personnel.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-website">Site web lié (optionnel)</Label>
                <Input id="key-website" name="websiteUrl" type="url" placeholder="https://monsite.com" data-testid="input-key-website" />
              </div>
              <Button type="submit" className="w-full font-bold" disabled={createMutation.isPending} data-testid="button-confirm-create-key">
                {createMutation.isPending ? "Création..." : "Créer la clé de production"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="h-7 w-7 text-red-500" />
              </div>
              <DialogTitle className="text-center">Supprimer la clé API ?</DialogTitle>
              <DialogDescription className="text-center">
                La clé <strong>"{deleteConfirmName}"</strong> sera supprimée définitivement. Toutes les intégrations utilisant cette clé cesseront de fonctionner immédiatement.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-2">
              <Button
                variant="destructive"
                className="w-full font-bold gap-2"
                onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                <Trash2 className="h-4 w-4" />
                {deleteMutation.isPending ? "Suppression..." : "Oui, supprimer définitivement"}
              </Button>
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="w-full">Annuler</Button>
            </div>
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
                          {(key as any).appName && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">
                              {(key as any).appName}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Production</span>
                          {(key as any).adminLocked ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
                              <Lock className="h-2.5 w-2.5" />Verrouillée
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${key.isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
                              {key.isActive ? "Active" : "Inactive"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Créée le {key.createdAt && formatDate(key.createdAt)}</span>
                          <span className="text-xs text-muted-foreground">Dernière utilisation : {formatDate(key.lastUsedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(key as any).adminLocked ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/8 border border-red-500/20" title="Verrouillée par l'administrateur">
                            <Lock className="h-3.5 w-3.5 text-red-500" />
                          </div>
                        ) : (
                          <Switch
                            checked={key.isActive}
                            onCheckedChange={(checked) => toggleMutation.mutate({ id: key.id, isActive: checked })}
                            data-testid={`switch-key-${key.id}`}
                          />
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/5"
                          data-testid={`button-delete-key-${key.id}`}
                          disabled={!!(key as any).adminLocked}
                          onClick={() => { setDeleteConfirmId(key.id); setDeleteConfirmName(key.name); }}
                        >
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
                      <Button variant="outline" size="icon" className="flex-shrink-0 border-border/60 h-8 w-8" onClick={() => toggleKeyVisibility(key.id)} data-testid={`button-toggle-key-${key.id}`}>
                        {visibleKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <CopyButton value={key.fullKey || key.keyPrefix} label="Clé API" />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground gap-1.5 self-start -mt-2"
                      onClick={() => toggleConfig(key.id)}
                      data-testid={`button-toggle-config-${key.id}`}
                    >
                      {expandedConfig[key.id] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {expandedConfig[key.id] ? "Masquer la configuration" : "Configurer URLs & Webhook"}
                    </Button>

                    {expandedConfig[key.id] && <KeyConfigSection apiKey={key as any} />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border/60" data-testid="section-documentation-link">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Documentation API complète</p>
                <p className="text-xs text-muted-foreground mt-0.5">Endpoints, exemples de code, webhooks, codes d'erreur</p>
              </div>
              <Link href="/documentation">
                <Button size="sm" className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="button-open-docs">
                  <Zap className="h-3.5 w-3.5" /> Voir la doc
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={kycGateOpen} onOpenChange={setKycGateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-2 shadow-lg">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-center">Vérification d'identité requise</DialogTitle>
            <DialogDescription className="text-center">
              L'accès aux clés API nécessite une vérification d'identité. Accédez au menu <strong>Vérification KYC</strong> pour soumettre votre dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Link href="/kyc" onClick={() => setKycGateOpen(false)}>
              <Button className="w-full font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white" data-testid="button-kyc-dialog-api-keys">
                <ShieldAlert className="h-4 w-4" /> Vérifier mon identité
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setKycGateOpen(false)} className="w-full">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  ShieldAlert, Globe, Webhook, ChevronDown, ChevronUp, Check, AlertTriangle, Terminal, 
  Code 
} from "lucide-react";
import { Link } from "wouter";
import type { ApiKey } from "@shared/schema";

function formatDate(date: string | Date | null) {
  if (!date) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: label ? `${label} copié` : "Copié" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="icon" className="flex-shrink-0 border-border/60 h-8 w-8" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function PartnerApiKeys() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [expandedConfig, setExpandedConfig] = useState<Record<string, boolean>>({});

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/partner/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; appName: string }) => {
      const response = await apiRequest("POST", "/api/partner/api-keys", data);
      return response.json();
    },
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/api-keys"] });
      setCreateOpen(false);
      setExpandedConfig(prev => ({ ...prev, [newKey.id]: true }));
      toast({ title: "Clé API Directe créée", description: "Utilisez cette clé pour vos paiements directs sans redirection." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer la clé API.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/partner/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/api-keys"] });
      setDeleteConfirmId(null);
      toast({ title: "Clé révoquée", description: "La clé API a été supprimée définitivement." });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      appName: formData.get("appName") as string,
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div
        className="relative rounded-3xl p-8 text-white overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, hsl(220 83% 48%) 0%, hsl(240 70% 60%) 100%)" }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
            <Key className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-2xl" data-testid="text-api-title">Clés API Directes</p>
            <p className="text-white/70 text-sm font-bold mt-1 uppercase tracking-widest" data-testid="text-api-subtitle">Intégration Directe (Pas de Redirection)</p>
          </div>
          <Button
            className="flex-shrink-0 bg-white text-primary hover:bg-white/90 font-black h-12 px-6 rounded-xl shadow-lg"
            onClick={() => setCreateOpen(true)}
            data-testid="button-create-key"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle clé
          </Button>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-border/40">
          <DialogHeader>
            <DialogTitle className="font-black text-xl uppercase tracking-tight">Créer une clé API Directe</DialogTitle>
            <DialogDescription className="font-bold text-muted-foreground">
              Utilisez cette clé pour effectuer des paiements Mobile Money directement depuis votre plateforme.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="key-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom de la clé</Label>
              <Input id="key-name" name="name" placeholder="Ex: Boutique v3 - API Directe" required className="h-12 border-border/70 rounded-xl bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="key-appname" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom de l'application</Label>
              <Input id="key-appname" name="appName" placeholder="Ex: MonShop, PayApp" required className="h-12 border-border/70 rounded-xl bg-background" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">Sera utilisé comme identification lors des paiements.</p>
            </div>
            <Button type="submit" className="w-full h-12 font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Création..." : "Générer la clé live"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
        </div>
      ) : !apiKeys || apiKeys.length === 0 ? (
        <Card className="border-border/60 border-dashed border-2 rounded-3xl">
          <CardContent className="py-20 text-center">
            <div className="h-20 w-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <Key className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <p className="font-black text-xl text-foreground mb-2">Aucune clé API</p>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">Générez une clé pour commencer à encaisser</p>
            <Button className="gap-2 font-black h-12 px-8 rounded-xl shadow-lg" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Générer ma première clé
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id} className="border-border/60 rounded-3xl overflow-hidden shadow-sm" data-testid={`key-row-${key.id}`}>
              <div className="h-1.5 bg-gradient-to-r from-blue-500 to-violet-500" />
              <CardContent className="p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-black text-base uppercase tracking-tight">{key.name}</h3>
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0 h-4 border-violet-500/20 text-violet-600 bg-violet-500/5">API Directe</Badge>
                        <Badge className={`text-[9px] font-black uppercase tracking-widest px-2 py-0 h-4 ${key.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                          {key.isActive ? "Active" : "Révoquée"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
                        <span>Créée : {key.createdAt && formatDate(key.createdAt)}</span>
                        <span>Utilisée : {formatDate(key.lastUsedAt)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => setDeleteConfirmId(key.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 bg-muted/50 rounded-xl px-4 py-3 border border-border/40">
                      <code className="text-xs font-mono font-black truncate block text-foreground">
                        {visibleKeys[key.id] ? (key.fullKey || `${key.keyPrefix}...`) : `${key.keyPrefix}${"•".repeat(24)}`}
                      </code>
                    </div>
                    <Button variant="outline" size="icon" className="flex-shrink-0 border-border/60 h-10 w-10 rounded-xl" onClick={() => setVisibleKeys(p => ({ ...p, [key.id]: !p[key.id] }))}>
                      {visibleKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <CopyButton value={key.fullKey || key.keyPrefix} label="Clé API" />
                  </div>

                  <div className="pt-5 border-t border-border/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                      <Terminal className="h-3 w-3" /> Endpoint API Direct (POST)
                    </p>
                    <div className="bg-zinc-950 rounded-xl p-4 font-mono text-[11px] text-zinc-300 relative group">
                      <code className="break-all block leading-relaxed">
                        https://solvexpay.com/api/partner/v1/pay
                      </code>
                      <div className="absolute top-2 right-2">
                        <CopyButton value="https://solvexpay.com/api/partner/v1/pay" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border/60 rounded-3xl bg-primary/5 border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="font-black text-lg uppercase tracking-tight mb-1">Guide d'intégration API Directe</p>
              <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">
                Apprenez à effectuer des paiements directs en Mobile Money sans hosted page.
              </p>
            </div>
            <Link href="/partner/docs">
              <Button className="font-black h-12 px-8 rounded-xl shadow-lg">
                <Code className="h-4 w-4 mr-2" />
                Voir la documentation
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-center font-black text-xl uppercase tracking-tight">Révoquer la clé API ?</DialogTitle>
            <DialogDescription className="text-center font-bold text-muted-foreground">
              Cette action est irréversible. Toutes les intégrations utilisant cette clé cesseront de fonctionner immédiatement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              variant="destructive"
              className="w-full h-12 font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMutation.isPending ? "Révocation..." : "Confirmer la révocation"}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="w-full h-12 font-bold rounded-xl">Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

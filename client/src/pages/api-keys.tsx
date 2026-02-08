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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Key, Copy, Trash2, AlertTriangle, Eye, EyeOff, Shield, Code2, Zap } from "lucide-react";
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
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; environment: string }) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewKey(data.key);
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
      environment: formData.get("environment") as string,
    });
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Cle copiee", description: "La cle API a ete copiee dans le presse-papiers." });
  };

  const handleCloseCreateDialog = () => {
    setCreateOpen(false);
    setNewKey(null);
    setShowKey(false);
  };

  const testKeys = apiKeys?.filter(k => k.environment === "test") || [];
  const liveKeys = apiKeys?.filter(k => k.environment === "live") || [];

  return (
    <DashboardLayout title="Cles API" breadcrumbs={[{ label: "Cles API" }]}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total cles</p>
                  <p className="text-2xl font-bold" data-testid="text-total-keys">{apiKeys?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Code2 className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cles Test</p>
                  <p className="text-2xl font-bold" data-testid="text-test-keys">{testKeys.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cles Production</p>
                  <p className="text-2xl font-bold" data-testid="text-live-keys">{liveKeys.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Securite importante</AlertTitle>
          <AlertDescription>
            Ne partagez jamais vos cles API. Utilisez les cles de test pour le developpement
            et les cles live uniquement en production.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Dialog open={createOpen} onOpenChange={handleCloseCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-key">
                <Plus className="h-4 w-4" />
                Creer une cle API
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{newKey ? "Cle API creee" : "Creer une cle API"}</DialogTitle>
                <DialogDescription>
                  {newKey
                    ? "Copiez cette cle maintenant. Elle ne sera plus affichee."
                    : "Creez une nouvelle cle API pour integrer SolvexPay"}
                </DialogDescription>
              </DialogHeader>

              {newKey ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Cette cle ne sera affichee qu'une seule fois. Copiez-la maintenant.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label>Votre cle API</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={showKey ? newKey : newKey.replace(/./g, "\u2022")}
                          readOnly
                          className="pr-10 font-mono text-sm"
                          data-testid="input-new-key"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0" onClick={() => setShowKey(!showKey)}>
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" size="icon" onClick={() => copyKey(newKey)} data-testid="button-copy-new-key">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCloseCreateDialog} data-testid="button-done">
                    J'ai copie ma cle
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Nom de la cle</Label>
                    <Input id="key-name" name="name" placeholder="Ex: Mon application mobile" required data-testid="input-key-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key-environment">Environnement</Label>
                    <Select name="environment" defaultValue="test">
                      <SelectTrigger id="key-environment" data-testid="select-key-environment"><SelectValue placeholder="Environnement" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test (Sandbox)</SelectItem>
                        <SelectItem value="live">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-confirm-create-key">
                    {createMutation.isPending ? "Creation..." : "Creer la cle"}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">Aucune cle API</p>
              <p className="text-sm text-muted-foreground mt-1">Creez votre premiere cle pour commencer l'integration</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <Card key={key.id} className="overflow-visible" data-testid={`key-row-${key.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{key.name}</h3>
                        <Badge variant={key.environment === "live" ? "default" : "secondary"} className="text-xs">
                          {key.environment === "live" ? "Production" : "Test"}
                        </Badge>
                        <Badge variant={key.isActive ? "default" : "destructive"} className="text-xs">
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{key.keyPrefix}...</code>
                        <span className="text-xs text-muted-foreground">Creee le {key.createdAt && formatDate(key.createdAt)}</span>
                        <span className="text-xs text-muted-foreground">Derniere utilisation: {formatDate(key.lastUsedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={key.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: key.id, isActive: checked })}
                        data-testid={`switch-key-${key.id}`}
                      />
                      <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(key.id)} className="text-destructive" data-testid={`button-delete-key-${key.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guide d'integration rapide</CardTitle>
            <CardDescription>Integrez SolvexPay dans votre application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h4 className="font-semibold text-sm mb-2">1. Authentification</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Incluez votre cle API dans l'en-tete de chaque requete.
              </p>
              <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-muted-foreground">Authorization: Bearer sk_test_xxxxxxxxxxxxx</pre>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">2. Initier un paiement</h4>
              <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-muted-foreground">
{`POST /v1/payments
{
  "amount": 10000,
  "currency": "XOF",
  "provider": "mtn",
  "phone": "+229970000000"
}`}
                </pre>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">3. Reponse</h4>
              <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-muted-foreground">
{`{
  "id": "txn_1234567890",
  "status": "pending",
  "amount": 10000,
  "currency": "XOF",
  "reference": "REF-ABC123"
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Key, Copy, Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";
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
      toast({
        title: "Erreur",
        description: "Impossible de créer la clé API.",
        variant: "destructive",
      });
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
      toast({
        title: "Clé supprimée",
        description: "La clé API a été supprimée.",
      });
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
    toast({
      title: "Clé copiée",
      description: "La clé API a été copiée dans le presse-papiers.",
    });
  };

  const handleCloseCreateDialog = () => {
    setCreateOpen(false);
    setNewKey(null);
    setShowKey(false);
  };

  return (
    <DashboardLayout title="Clés API" breadcrumbs={[{ label: "Clés API" }]}>
      <div className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sécurité importante</AlertTitle>
          <AlertDescription>
            Ne partagez jamais vos clés API. Utilisez les clés de test pour le développement
            et les clés live uniquement en production.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Dialog open={createOpen} onOpenChange={handleCloseCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-key">
                <Plus className="h-4 w-4" />
                Créer une clé API
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {newKey ? "Clé API créée" : "Créer une clé API"}
                </DialogTitle>
                <DialogDescription>
                  {newKey 
                    ? "Copiez cette clé maintenant. Elle ne sera plus affichée."
                    : "Créez une nouvelle clé API pour intégrer SolvexPay"}
                </DialogDescription>
              </DialogHeader>
              
              {newKey ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Cette clé ne sera affichée qu'une seule fois. Copiez-la maintenant.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>Votre clé API</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={showKey ? newKey : "•".repeat(newKey.length)}
                          readOnly
                          className="pr-10 font-mono text-sm"
                          data-testid="input-new-key"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyKey(newKey)}
                        data-testid="button-copy-new-key"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={handleCloseCreateDialog}
                    data-testid="button-done"
                  >
                    J'ai copié ma clé
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Nom de la clé</Label>
                    <Input
                      id="key-name"
                      name="name"
                      placeholder="Ex: Mon application mobile"
                      required
                      data-testid="input-key-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="key-environment">Environnement</Label>
                    <Select name="environment" defaultValue="test">
                      <SelectTrigger id="key-environment" data-testid="select-key-environment">
                        <SelectValue placeholder="Environnement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test (Sandbox)</SelectItem>
                        <SelectItem value="live">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createMutation.isPending}
                    data-testid="button-confirm-create-key"
                  >
                    {createMutation.isPending ? "Création..." : "Créer la clé"}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vos clés API</CardTitle>
            <CardDescription>
              Gérez vos clés API pour intégrer SolvexPay
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Aucune clé API</p>
                <p className="text-sm">Créez votre première clé pour commencer l'intégration</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Clé</TableHead>
                      <TableHead>Environnement</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Dernière utilisation</TableHead>
                      <TableHead>Créée le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id} data-testid={`key-row-${key.id}`}>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {key.keyPrefix}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.environment === "live" ? "default" : "secondary"}>
                            {key.environment === "live" ? "Production" : "Test"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={key.isActive}
                              onCheckedChange={(checked) => toggleMutation.mutate({ id: key.id, isActive: checked })}
                              data-testid={`switch-key-${key.id}`}
                            />
                            <Badge variant={key.isActive ? "default" : "destructive"}>
                              {key.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(key.lastUsedAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {key.createdAt && formatDate(key.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(key.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-key-${key.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentation API</CardTitle>
            <CardDescription>
              Intégrez SolvexPay en quelques minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Authentification</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Incluez votre clé API dans l'en-tête Authorization de chaque requête.
              </p>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-muted-foreground">
{`Authorization: Bearer sk_test_xxxxxxxxxxxxx`}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Initier un paiement</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Créez une transaction de paiement Mobile Money.
              </p>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-muted-foreground">
{`curl -X POST https://api.solvaxpay.com/v1/payments \\
  -H "Authorization: Bearer sk_test_xxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10000,
    "currency": "XOF",
    "provider": "mtn",
    "phone": "+221771234567",
    "description": "Achat produit"
  }'`}
                </pre>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Réponse</h4>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-muted-foreground">
{`{
  "id": "txn_1234567890",
  "status": "pending",
  "amount": 10000,
  "currency": "XOF",
  "provider": "mtn",
  "reference": "REF-ABC123",
  "created_at": "2024-01-15T10:30:00Z"
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

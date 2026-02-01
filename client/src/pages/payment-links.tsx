import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Link2, Copy, ExternalLink, Trash2, Search } from "lucide-react";
import type { PaymentLink } from "@shared/schema";

const currencies = [
  { code: "XOF", name: "Franc CFA (BCEAO)" },
  { code: "NGN", name: "Naira nigérian" },
  { code: "GHS", name: "Cedi ghanéen" },
  { code: "KES", name: "Shilling kényan" },
];

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
  }).format(new Date(date));
}

export default function PaymentLinksPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: paymentLinks, isLoading } = useQuery<PaymentLink[]>({
    queryKey: ["/api/payment-links"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; amount: number; currency: string; description?: string }) => {
      return apiRequest("POST", "/api/payment-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setCreateOpen(false);
      toast({
        title: "Lien créé",
        description: "Votre lien de paiement a été créé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le lien de paiement.",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/payment-links/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/payment-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Lien supprimé",
        description: "Le lien de paiement a été supprimé.",
      });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      amount: parseFloat(formData.get("amount") as string),
      currency: formData.get("currency") as string,
      description: formData.get("description") as string || undefined,
    });
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié",
      description: "Le lien de paiement a été copié dans le presse-papiers.",
    });
  };

  const filteredLinks = paymentLinks?.filter((link) =>
    link.name.toLowerCase().includes(search.toLowerCase()) ||
    link.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <DashboardLayout title="Liens de paiement" breadcrumbs={[{ label: "Liens de paiement" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un lien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-links"
            />
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-link">
                <Plus className="h-4 w-4" />
                Créer un lien
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Créer un lien de paiement</DialogTitle>
                <DialogDescription>
                  Créez un lien de paiement personnalisé à partager avec vos clients
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-name">Nom du lien</Label>
                  <Input
                    id="link-name"
                    name="name"
                    placeholder="Ex: Achat produit X"
                    required
                    data-testid="input-link-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="link-amount">Montant</Label>
                    <Input
                      id="link-amount"
                      name="amount"
                      type="number"
                      placeholder="10000"
                      min="100"
                      required
                      data-testid="input-link-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link-currency">Devise</Label>
                    <Select name="currency" defaultValue="XOF">
                      <SelectTrigger id="link-currency" data-testid="select-link-currency">
                        <SelectValue placeholder="Devise" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-description">Description (optionnel)</Label>
                  <Textarea
                    id="link-description"
                    name="description"
                    placeholder="Description du paiement..."
                    rows={3}
                    data-testid="input-link-description"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-confirm-create-link">
                  {createMutation.isPending ? "Création..." : "Créer le lien"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vos liens de paiement</CardTitle>
            <CardDescription>
              Gérez et partagez vos liens de paiement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Aucun lien de paiement</p>
                <p className="text-sm">Créez votre premier lien pour commencer</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinks.map((link) => (
                      <TableRow key={link.id} data-testid={`link-row-${link.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{link.name}</p>
                            {link.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {link.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(link.amount, link.currency)}
                        </TableCell>
                        <TableCell>{link.timesUsed}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={link.isActive}
                              onCheckedChange={(checked) => toggleMutation.mutate({ id: link.id, isActive: checked })}
                              data-testid={`switch-link-${link.id}`}
                            />
                            <Badge variant={link.isActive ? "default" : "secondary"}>
                              {link.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {link.createdAt && formatDate(link.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyLink(link.slug)}
                              data-testid={`button-copy-link-${link.id}`}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/pay/${link.slug}`, "_blank")}
                              data-testid={`button-open-link-${link.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(link.id)}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-link-${link.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

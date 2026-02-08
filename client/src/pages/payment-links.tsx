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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Link2, Copy, ExternalLink, Trash2, Search, Globe, Activity } from "lucide-react";
import type { PaymentLink } from "@shared/schema";

const currencies = [
  { code: "XOF", name: "Franc CFA (BCEAO)" },
  { code: "NGN", name: "Naira nigerian" },
  { code: "GHS", name: "Cedi ghaneen" },
  { code: "KES", name: "Shilling kenyan" },
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
      toast({ title: "Lien cree", description: "Votre lien de paiement a ete cree avec succes." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de creer le lien de paiement.", variant: "destructive" });
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
      toast({ title: "Lien supprime", description: "Le lien de paiement a ete supprime." });
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
    toast({ title: "Lien copie", description: "Le lien a ete copie dans le presse-papiers." });
  };

  const filteredLinks = paymentLinks?.filter((link) =>
    link.name.toLowerCase().includes(search.toLowerCase()) ||
    link.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const activeCount = paymentLinks?.filter(l => l.isActive).length || 0;
  const totalUsage = paymentLinks?.reduce((sum, l) => sum + parseInt(String(l.timesUsed) || "0", 10), 0) || 0;

  return (
    <DashboardLayout title="Liens de paiement" breadcrumbs={[{ label: "Liens de paiement" }]}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Link2 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total liens</p>
                  <p className="text-2xl font-bold" data-testid="text-total-links">{paymentLinks?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Liens actifs</p>
                  <p className="text-2xl font-bold" data-testid="text-active-links">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilisations</p>
                  <p className="text-2xl font-bold" data-testid="text-total-usage">{totalUsage}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                Creer un lien
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Creer un lien de paiement</DialogTitle>
                <DialogDescription>
                  Creez un lien personnalise a partager avec vos clients
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="link-name">Nom du lien</Label>
                  <Input id="link-name" name="name" placeholder="Ex: Achat produit X" required data-testid="input-link-name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="link-amount">Montant</Label>
                    <Input id="link-amount" name="amount" type="number" placeholder="10000" min="100" required data-testid="input-link-amount" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link-currency">Devise</Label>
                    <Select name="currency" defaultValue="XOF">
                      <SelectTrigger id="link-currency" data-testid="select-link-currency"><SelectValue placeholder="Devise" /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-description">Description (optionnel)</Label>
                  <Textarea id="link-description" name="description" placeholder="Description du paiement..." rows={3} data-testid="input-link-description" />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-confirm-create-link">
                  {createMutation.isPending ? "Creation..." : "Creer le lien"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
              <p className="font-medium text-muted-foreground">Aucun lien de paiement</p>
              <p className="text-sm text-muted-foreground mt-1">Creez votre premier lien pour commencer</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLinks.map((link) => (
              <Card key={link.id} className="overflow-visible" data-testid={`link-row-${link.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{link.name}</h3>
                        <Badge variant={link.isActive ? "default" : "secondary"} className="text-xs">
                          {link.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      {link.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{link.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="font-bold text-base">{formatCurrency(link.amount, link.currency)}</span>
                        <span className="text-xs text-muted-foreground">{link.timesUsed} utilisation{parseInt(String(link.timesUsed)) !== 1 ? "s" : ""}</span>
                        <span className="text-xs text-muted-foreground">{link.createdAt && formatDate(link.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={link.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: link.id, isActive: checked })}
                        data-testid={`switch-link-${link.id}`}
                      />
                      <Button variant="outline" size="icon" onClick={() => copyLink(link.slug)} data-testid={`button-copy-link-${link.id}`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(`${window.location.origin}/pay/${link.slug}`, "_blank")} data-testid={`button-open-link-${link.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate(link.id)} className="text-destructive" data-testid={`button-delete-link-${link.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

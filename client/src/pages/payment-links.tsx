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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Link2, Copy, ExternalLink, Trash2, Search,
  Globe, Activity, ArrowLeft, ImagePlus, ExternalLink as RedirectIcon,
  Info, AlertCircle,
} from "lucide-react";
import type { PaymentLink } from "@shared/schema";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num) + " XOF";
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function CreatePaymentLinkForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; amount: number; currency: string; description?: string; redirectUrl?: string; imageUrl?: string }) => {
      return apiRequest("POST", "/api/payment-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Lien cree avec succes", description: "Votre lien de paiement est pret a etre partage." });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de creer le lien de paiement.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    createMutation.mutate({
      name: name.trim(),
      amount: parseFloat(amount),
      currency: "XOF",
      description: description.trim() || undefined,
      redirectUrl: redirectUrl.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    });
  };

  const previewAmount = amount ? parseFloat(amount) : 0;
  const fees = previewAmount * 0.04;
  const netAmount = previewAmount - fees;

  return (
    <DashboardLayout title="" breadcrumbs={[{ label: "Liens de paiement", href: "/payment-links" }, { label: "Nouveau lien" }]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-links">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Nouveau lien de paiement</h2>
            <p className="text-sm text-muted-foreground">Creez un lien personnalise pour recevoir des paiements</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations du paiement</CardTitle>
              <CardDescription>Les details essentiels de votre lien de paiement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link-name">Nom du produit ou service</Label>
                <Input
                  id="link-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: T-shirt personnalise, Abonnement mensuel..."
                  required
                  data-testid="input-link-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-amount">Montant (XOF)</Label>
                <Input
                  id="link-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  placeholder="10 000"
                  min="100"
                  required
                  data-testid="input-link-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-description">Description (optionnel)</Label>
                <Textarea
                  id="link-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Decrivez votre produit ou service pour vos clients..."
                  rows={3}
                  data-testid="input-link-description"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Options avancees</CardTitle>
              <CardDescription>Personnalisez davantage votre lien de paiement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link-redirect" className="flex items-center gap-2">
                  <RedirectIcon className="h-4 w-4 text-muted-foreground" />
                  URL de redirection (optionnel)
                </Label>
                <Input
                  id="link-redirect"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  type="url"
                  placeholder="https://votre-site.com/merci"
                  data-testid="input-link-redirect"
                />
                <p className="text-xs text-muted-foreground">Redirigez vos clients apres un paiement reussi</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="link-image" className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  Image du produit (optionnel)
                </Label>
                <Input
                  id="link-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  type="url"
                  placeholder="https://votre-site.com/image-produit.jpg"
                  data-testid="input-link-image"
                />
                <p className="text-xs text-muted-foreground">Ajoutez une image pour illustrer votre produit ou service</p>
              </div>
            </CardContent>
          </Card>

          {previewAmount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-sm text-muted-foreground">Montant du paiement</span>
                  <span className="font-medium" data-testid="text-preview-amount">{formatCurrency(previewAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-sm text-muted-foreground">Frais d'encaissement (4%)</span>
                  <span className="text-sm text-destructive" data-testid="text-preview-fees">- {formatCurrency(fees)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="font-medium">Montant net recu</span>
                  <span className="font-bold text-lg" data-testid="text-preview-net">{formatCurrency(netAmount)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg bg-muted/50 border p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Des frais d'encaissement de 4% seront appliques sur chaque paiement recu via ce lien. 
              Ces frais couvrent les couts de traitement des paiements Mobile Money.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1" data-testid="button-cancel-create">
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending} data-testid="button-confirm-create-link">
              {createMutation.isPending ? "Creation en cours..." : "Creer le lien de paiement"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default function PaymentLinksPage() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const { data: paymentLinks, isLoading } = useQuery<PaymentLink[]>({
    queryKey: ["/api/payment-links"],
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

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copie", description: "Le lien a ete copie dans le presse-papiers." });
  };

  if (showCreate) {
    return (
      <CreatePaymentLinkForm
        onBack={() => setShowCreate(false)}
        onSuccess={() => setShowCreate(false)}
      />
    );
  }

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
          <Button className="gap-2" onClick={() => setShowCreate(true)} data-testid="button-create-link">
            <Plus className="h-4 w-4" />
            Creer un lien
          </Button>
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
              <p className="text-sm text-muted-foreground mt-1">Creez votre premier lien pour commencer a recevoir des paiements</p>
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
                        <span className="font-bold text-base">{formatCurrency(link.amount)}</span>
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

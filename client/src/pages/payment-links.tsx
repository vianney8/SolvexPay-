import { useState, useRef } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Link2, Copy, ExternalLink, Trash2, Search,
  Globe, Activity, ArrowLeft, ImagePlus,
  Info, Pencil, Upload, X, CheckCircle2, Lock,
} from "lucide-react";
import type { PaymentLink } from "@shared/schema";

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num) + " XOF";
}

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

function PaymentLinkForm({ onBack, onSuccess, editLink }: { onBack: () => void; onSuccess: () => void; editLink?: PaymentLink | null }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(editLink?.name || "");
  const [amount, setAmount] = useState(editLink && !editLink.allowCustomAmount ? editLink.amount : "");
  const [allowCustomAmount, setAllowCustomAmount] = useState(editLink?.allowCustomAmount || false);
  const [description, setDescription] = useState(editLink?.description || "");
  const [redirectUrl, setRedirectUrl] = useState(editLink?.redirectUrl || "");
  const [imageUrl, setImageUrl] = useState(editLink?.imageUrl || "");
  const [imagePreview, setImagePreview] = useState(editLink?.imageUrl || "");
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/payment-links", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Lien créé", description: "Votre lien de paiement est prêt à être partagé." });
      onSuccess();
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de créer le lien.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("PATCH", `/api/payment-links/${editLink!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] });
      toast({ title: "Lien modifié", description: "Votre lien a été mis à jour." });
      onSuccess();
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de modifier le lien.", variant: "destructive" }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast({ title: "Image ajoutée" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de télécharger l'image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!allowCustomAmount && !amount) return;
    const payload = {
      name: name.trim(),
      amount: allowCustomAmount ? (amount ? parseFloat(String(amount)) : 0) : parseFloat(String(amount)),
      currency: "XOF",
      allowCustomAmount,
      description: description.trim() || undefined,
      redirectUrl: redirectUrl.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    };
    if (editLink) {
      updateMutation.mutate({ name: payload.name, amount: payload.amount, allowCustomAmount: payload.allowCustomAmount, description: payload.description || null, redirectUrl: payload.redirectUrl || null, imageUrl: payload.imageUrl || null });
    } else {
      createMutation.mutate(payload);
    }
  };

  const previewAmount = !allowCustomAmount && amount ? parseFloat(String(amount)) : 0;
  const fees = previewAmount * 0.04;
  const netAmount = previewAmount - fees;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout title="" breadcrumbs={[{ label: "Liens de paiement" }]}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div
          className="relative rounded-3xl p-5 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 52%) 0%, hsl(300 70% 56%) 60%, hsl(330 80% 52%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0"
                data-testid="button-back-links"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="font-bold text-base leading-tight">{editLink ? "Modifier le lien" : "Nouveau lien de paiement"}</p>
                <p className="text-white/70 text-xs">{editLink ? "Modifiez les informations" : "Créez un lien pour recevoir des paiements"}</p>
              </div>
            </div>
            <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Link2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Informations du paiement</CardTitle>
                  <CardDescription className="text-xs">Détails essentiels de votre lien</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom du produit ou service</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: T-shirt, Abonnement mensuel..." required className="h-11 border-border/70" data-testid="input-link-name" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Montant (XOF)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Libre</span>
                    <Switch checked={allowCustomAmount} onCheckedChange={setAllowCustomAmount} data-testid="switch-custom-amount" />
                  </div>
                </div>
                {allowCustomAmount ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-500/8 border border-violet-500/20">
                      <Info className="h-4 w-4 text-violet-600 flex-shrink-0" />
                      <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">Le client choisit lui-même le montant à payer</p>
                    </div>
                    <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Montant minimum (optionnel)" min="100" className="h-11 border-border/70" data-testid="input-link-min-amount" />
                    <p className="text-xs text-muted-foreground">Laissez vide pour aucun minimum</p>
                  </div>
                ) : (
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="10 000" min="100" required className="h-11 border-border/70 text-lg font-bold" data-testid="input-link-amount" />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (optionnel)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre produit pour vos clients..." rows={3} className="border-border/70 resize-none" data-testid="input-link-description" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL de redirection (optionnel)</Label>
                <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} type="url" placeholder="https://votre-site.com/merci" className="h-11 border-border/70" data-testid="input-link-redirect" />
                <p className="text-xs text-muted-foreground">Redirigez vos clients après paiement réussi</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Image du produit (optionnel)</Label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="input-link-image-file" />
                {imagePreview ? (
                  <div className="relative rounded-2xl border border-border/60 overflow-hidden">
                    <img src={imagePreview} alt="Aperçu" className="w-full h-48 object-cover" data-testid="img-link-preview" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <Button type="button" variant="secondary" size="icon" className="h-8 w-8 rounded-lg shadow-md" onClick={() => fileInputRef.current?.click()} data-testid="button-change-image">
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" variant="destructive" size="icon" className="h-8 w-8 rounded-lg shadow-md" onClick={() => { setImageUrl(""); setImagePreview(""); }} data-testid="button-remove-image">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/60 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/3 transition-all group"
                    data-testid="button-upload-image"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {uploading ? "Téléchargement..." : "Cliquez pour ajouter une image"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF ou WebP (max 5 MB)</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {previewAmount > 0 && (
            <Card className="border-border/60 bg-muted/30">
              <CardContent className="p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aperçu des frais</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Montant du paiement</span>
                  <span className="font-semibold" data-testid="text-preview-amount">{formatCurrency(previewAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frais d'encaissement (4%)</span>
                  <span className="text-destructive font-medium" data-testid="text-preview-fees">- {formatCurrency(fees)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">Montant net reçu</span>
                  <span className="font-black text-lg text-emerald-600 dark:text-emerald-400" data-testid="text-preview-net">{formatCurrency(netAmount)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Des frais d'encaissement de <strong>4%</strong> sont prélevés sur chaque paiement reçu via ce lien.
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12 font-semibold border-border/70" data-testid="button-cancel-create">
              Annuler
            </Button>
            <Button type="submit" className="flex-1 h-12 font-bold shadow-lg shadow-primary/20" disabled={isPending || uploading} data-testid="button-confirm-create-link">
              {uploading ? "Upload en cours..." : isPending ? (editLink ? "Modification..." : "Création...") : (editLink ? "Enregistrer" : "Créer le lien")}
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
  const [editingLink, setEditingLink] = useState<PaymentLink | null>(null);
  const [search, setSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: paymentLinks, isLoading } = useQuery<PaymentLink[]>({ queryKey: ["/api/payment-links"] });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/payment-links/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/payment-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Lien supprimé" });
      setDeleteConfirmId(null);
    },
  });

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/pay/${slug}`);
    toast({ title: "Lien copié !", description: "Le lien a été copié dans le presse-papiers." });
  };

  if (showCreate || editingLink) {
    return (
      <PaymentLinkForm
        onBack={() => { setShowCreate(false); setEditingLink(null); }}
        onSuccess={() => { setShowCreate(false); setEditingLink(null); }}
        editLink={editingLink}
      />
    );
  }

  const filteredLinks = paymentLinks?.filter((link) =>
    link.name.toLowerCase().includes(search.toLowerCase()) ||
    link.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const activeCount = paymentLinks?.filter(l => l.isActive).length || 0;
  const totalUsage = paymentLinks?.reduce((sum, l) => sum + parseInt(String(l.timesUsed) || "0", 10), 0) || 0;

  const summaryCards = [
    { label: "Total liens", value: paymentLinks?.length || 0, icon: Link2, color: "from-violet-500 to-violet-700", testid: "text-total-links" },
    { label: "Liens actifs", value: activeCount, icon: Globe, color: "from-emerald-500 to-emerald-700", testid: "text-active-links" },
    { label: "Utilisations", value: totalUsage, icon: Activity, color: "from-amber-500 to-amber-700", testid: "text-total-usage" },
  ];

  return (
    <DashboardLayout title="Liens de paiement" breadcrumbs={[{ label: "Liens de paiement" }]}>
      <div className="space-y-5">

        <div
          className="relative rounded-3xl p-5 text-white overflow-hidden shadow-xl"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 46%) 0%, hsl(300 68% 52%) 60%, hsl(330 78% 50%) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-base">Liens de paiement</p>
                <p className="text-white/70 text-xs">Recevez des paiements partout en Afrique</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-sm flex-shrink-0 transition-colors"
              data-testid="button-create-link"
            >
              <Plus className="h-4 w-4" /> Créer
            </button>
          </div>
          <div className="relative grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <p className="text-white/60 text-xs font-medium mb-1">Total liens</p>
              <p className="text-white font-black text-xl leading-none" data-testid="text-total-links">{isLoading ? "—" : paymentLinks?.length || 0}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <p className="text-white/60 text-xs font-medium mb-1">Actifs</p>
              <p className="text-white font-black text-xl leading-none" data-testid="text-active-links">{isLoading ? "—" : activeCount}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
              <p className="text-white/60 text-xs font-medium mb-1">Utilisations</p>
              <p className="text-white font-black text-xl leading-none" data-testid="text-total-usage">{isLoading ? "—" : totalUsage}</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un lien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-border/70"
            data-testid="input-search-links"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border/60">
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <Card className="border-border/60 border-dashed">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Link2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground mb-1">Aucun lien de paiement</p>
              <p className="text-sm text-muted-foreground mb-5">Créez votre premier lien pour commencer à recevoir des paiements</p>
              <Button className="gap-2 shadow-lg shadow-primary/20" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> Créer mon premier lien
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              {filteredLinks.map((link, index) => (
                <div
                  key={link.id}
                  className={`flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors ${index > 0 ? "border-t border-border/40" : ""}`}
                  data-testid={`link-row-${link.id}`}
                >
                  <div className="h-11 w-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {link.imageUrl
                      ? <img src={link.imageUrl} alt={link.name} className="w-full h-full object-cover" data-testid={`img-link-${link.id}`} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary/60"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'; }} />
                      : <Link2 className="h-5 w-5 text-primary/60" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-foreground truncate">{link.name}</p>
                      <Badge className={`text-xs shrink-0 ${link.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border/60"}`}>
                        {link.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {(link as any).allowCustomAmount ? (
                        <span className="font-black text-sm text-violet-600 dark:text-violet-400">Montant libre{parseFloat(link.amount) > 0 ? ` (min. ${formatCurrency(link.amount)})` : ""}</span>
                      ) : (
                        <span className="font-black text-sm text-foreground">{formatCurrency(link.amount)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{link.timesUsed} utilisation{parseInt(String(link.timesUsed)) !== 1 ? "s" : ""}</span>
                      {link.createdAt && <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(link.createdAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(link as any).adminLocked ? (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-red-500/8 border border-red-500/20" title="Verrouillé par l'administrateur">
                        <Lock className="h-3.5 w-3.5 text-red-500" />
                      </div>
                    ) : (
                      <Switch
                        checked={link.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: link.id, isActive: checked })}
                        data-testid={`switch-link-${link.id}`}
                      />
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => setEditingLink(link)} data-testid={`button-edit-link-${link.id}`} disabled={!!(link as any).adminLocked}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => copyLink(link.slug)} data-testid={`button-copy-link-${link.id}`}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => window.open(`${window.location.origin}/pay/${link.slug}`, "_blank")} data-testid={`button-open-link-${link.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/5" onClick={() => setDeleteConfirmId(link.id)} data-testid={`button-delete-link-${link.id}`} disabled={!!(link as any).adminLocked}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">Supprimer le lien ?</DialogTitle>
              <DialogDescription className="text-center text-sm">Cette action est irréversible. Le lien sera définitivement supprimé.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setDeleteConfirmId(null)}>Annuler</Button>
              <Button variant="destructive" className="flex-1 h-11 font-semibold" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

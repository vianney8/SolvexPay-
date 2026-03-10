import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Key, Copy, Trash2, Eye, EyeOff, Lock, Zap, BookOpen,
  ShieldAlert, Globe, Webhook, ChevronDown, ChevronUp, Check, AlertTriangle,
  Bolt, Code2, Info, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { Link } from "wouter";
import type { ApiKey } from "@shared/schema";

function formatDate(date: string | Date | null) {
  if (!date) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function CopyButton({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <Button variant="outline" size="icon" className={`flex-shrink-0 border-border/60 h-8 w-8 ${className || ""}`}
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); toast({ title: label ? `${label} copié` : "Copié" }); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function KeyConfigSection({ apiKey }: { apiKey: any }) {
  const { toast } = useToast();
  const [redirectUrl, setRedirectUrl] = useState(apiKey.redirectUrl || "");
  const [webhookUrl, setWebhookUrl] = useState(apiKey.webhookUrl || "");
  const [saved, setSaved] = useState(false);
  const [visibleSecret, setVisibleSecret] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/api-keys/${apiKey.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      toast({ title: "Configuration sauvegardée" });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" }),
  });

  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5" /> Configuration des URLs
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">URL de redirection (après paiement)</Label>
          <p className="text-[11px] text-muted-foreground">L'utilisateur est redirigé ici après un paiement réussi.</p>
          <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://monsite.com/paiement-success" className="h-8 text-xs" data-testid={`input-redirect-url-${apiKey.id}`} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1"><Webhook className="h-3 w-3" /> URL de webhook</Label>
          <p className="text-[11px] text-muted-foreground">SolvexPay envoie une notification POST ici après chaque transaction.</p>
          <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://monsite.com/api/webhook/solvexpay" className="h-8 text-xs" data-testid={`input-webhook-url-${apiKey.id}`} />
        </div>
      </div>
      <Button size="sm" className="h-8 text-xs font-bold gap-1.5" onClick={() => updateMutation.mutate({ redirectUrl, webhookUrl })} disabled={updateMutation.isPending} data-testid={`button-save-config-${apiKey.id}`}>
        {saved ? <><Check className="h-3.5 w-3.5" /> Sauvegardé</> : updateMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
      {apiKey.webhookSecret && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold flex items-center gap-1"><Lock className="h-3 w-3" /> Webhook Secret</Label>
          <p className="text-[11px] text-muted-foreground">Vérifiez l'authenticité des webhooks reçus avec ce secret.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-muted/60 rounded-xl px-3 py-2 border border-border/60">
              <code className="text-xs font-mono truncate block" data-testid={`text-webhook-secret-${apiKey.id}`}>
                {visibleSecret ? apiKey.webhookSecret : `whs_live_${"•".repeat(20)}`}
              </code>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setVisibleSecret(v => !v)}>{visibleSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
            <CopyButton value={apiKey.webhookSecret} label="Webhook Secret" />
          </div>
        </div>
      )}
    </div>
  );
}

const SR_OPERATORS = [
  { code: "MTN", label: "MTN Mobile Money", countries: ["BJ", "CI", "CM"], otp: false, note: "Confirmation USSD automatique" },
  { code: "MOOV", label: "Moov Money", countries: ["BJ", "TG", "BF", "ML", "CI"], otp: false, note: "Confirmation USSD automatique" },
  { code: "ORANGE", label: "Orange Money", countries: ["CI", "SN", "BF", "ML", "CM"], otp: true, note: "OTP requis sur Côte d'Ivoire et Sénégal" },
  { code: "WAVE", label: "Wave", countries: ["CI", "SN"], otp: false, note: "Lien de paiement Wave généré" },
  { code: "TMONEY", label: "T-Money", countries: ["TG"], otp: false, note: "Confirmation USSD automatique" },
  { code: "FREE", label: "Free Money", countries: ["SN"], otp: false, note: "Alias: MIXX" },
  { code: "AIRTEL", label: "Airtel Money", countries: ["COG", "COD"], otp: false, note: "Confirmation USSD automatique" },
  { code: "VODACOM", label: "Vodacom M-Pesa", countries: ["COD"], otp: false, note: "Confirmation USSD automatique" },
];

const SR_COUNTRIES = [
  { code: "BJ", name: "Bénin", currency: "XOF", operators: ["MTN", "MOOV"] },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", operators: ["MTN", "MOOV", "ORANGE", "WAVE"] },
  { code: "SN", name: "Sénégal", currency: "XOF", operators: ["ORANGE", "WAVE", "FREE"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", operators: ["MOOV", "ORANGE"] },
  { code: "ML", name: "Mali", currency: "XOF", operators: ["MOOV", "ORANGE"] },
  { code: "TG", name: "Togo", currency: "XOF", operators: ["MOOV", "TMONEY"] },
  { code: "CM", name: "Cameroun", currency: "XAF", operators: ["MTN", "ORANGE"] },
  { code: "COG", name: "Congo-Brazzaville", currency: "XAF", operators: ["MTN", "AIRTEL"] },
  { code: "COD", name: "Congo-Kinshasa", currency: "CDF", operators: ["AIRTEL", "VODACOM"] },
];

function SrWebhookConfig({ srKey }: { srKey: any }) {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState(srKey.webhookUrl || "");
  const [redirectUrl, setRedirectUrl] = useState(srKey.redirectUrl || "");
  const [saved, setSaved] = useState(false);

  const updateM = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/api-keys/${srKey.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] }); setSaved(true); setTimeout(() => setSaved(false), 2000); toast({ title: "Configuration webhook sauvegardée" }); },
    onError: () => toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" }),
  });

  return (
    <div className="bg-black/30 border border-green-500/15 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold text-green-300 flex items-center gap-1.5"><Webhook className="h-3.5 w-3.5" /> Configuration Webhook SR</p>
      <div className="space-y-2">
        <Label className="text-[11px] text-green-300/80 font-semibold">URL Webhook (notification de paiement)</Label>
        <p className="text-[10px] text-green-300/50">SolvexPay envoie un POST ici dès qu'un paiement est confirmé ou échoue.</p>
        <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://monsite.com/api/webhook/solvexpay" className="h-8 text-xs bg-black/40 border-green-500/20 text-green-200 placeholder:text-green-300/30" data-testid="input-sr-webhook-url" />
      </div>
      <div className="space-y-2">
        <Label className="text-[11px] text-green-300/80 font-semibold">URL de redirection (optionnel)</Label>
        <p className="text-[10px] text-green-300/50">Redirigez l'utilisateur ici après un paiement Wave réussi.</p>
        <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://monsite.com/paiement-success" className="h-8 text-xs bg-black/40 border-green-500/20 text-green-200 placeholder:text-green-300/30" data-testid="input-sr-redirect-url" />
      </div>
      <Button size="sm" className="h-8 text-xs font-bold gap-1.5 bg-green-700 hover:bg-green-600 text-white border-0" onClick={() => updateM.mutate({ webhookUrl, redirectUrl })} disabled={updateM.isPending} data-testid="button-save-sr-webhook">
        {saved ? <><Check className="h-3.5 w-3.5" /> Sauvegardé</> : updateM.isPending ? "Sauvegarde..." : "Sauvegarder"}
      </Button>
    </div>
  );
}

function SrSection({ allKeys }: { allKeys: ApiKey[] }) {
  const { toast } = useToast();
  const [createSrOpen, setCreateSrOpen] = useState(false);
  const [srKeyName, setSrKeyName] = useState("");
  const [visibleSrKey, setVisibleSrKey] = useState(false);
  const [deleteSrId, setDeleteSrId] = useState<string | null>(null);
  const [docSection, setDocSection] = useState<string | null>("quickstart");

  const { data: suspendedData } = useQuery<{ codes: string[] }>({ queryKey: ["/api/public/suspended-countries"], staleTime: 60000 });
  const suspendedCodes = suspendedData?.codes || [];

  const activeSrCountries = SR_COUNTRIES.filter(c => !suspendedCodes.includes(c.code));
  const activeSrOperators = SR_OPERATORS.filter(op => op.countries.some(c => !suspendedCodes.includes(c)));

  const srKey = allKeys.find((k) => (k as any).isSrKey);

  const createSrMutation = useMutation({
    mutationFn: async (name: string) => {
      const resp = await apiRequest("POST", "/api/api-keys", { name, appName: "API SR", isSrKey: true });
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setCreateSrOpen(false); setSrKeyName("");
      toast({ title: "Clé SR créée", description: "Votre clé API SR est prête." });
    },
    onError: (e: any) => {
      try {
        const msg = JSON.parse(e.message?.replace(/^\d+:\s*/, "") || "{}");
        toast({ title: "Erreur", description: msg.message || "Impossible de créer la clé SR.", variant: "destructive" });
      } catch { toast({ title: "Erreur", description: "Impossible de créer la clé SR.", variant: "destructive" }); }
    },
  });

  const deleteSrMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] }); setDeleteSrId(null); toast({ title: "Clé SR supprimée" }); },
  });

  const toggleSrMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/api-keys/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] }),
  });

  const DocToggle = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setDocSection(docSection === id ? null : id)}
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${docSection === id ? "bg-green-500/20 text-green-300" : "bg-black/30 text-green-400/70 hover:bg-green-500/10 hover:text-green-300"}`}
    >
      <span>{label}</span>
      {docSection === id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <>
      <div
        className="relative rounded-3xl overflow-hidden border border-green-500/30 shadow-xl shadow-green-900/20"
        style={{ background: "linear-gradient(135deg, hsl(145 60% 7%) 0%, hsl(160 50% 6%) 100%)" }}
        data-testid="section-api-sr"
      >
        <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top right, hsl(145 70% 40%), transparent 60%)" }} />
        <div className="relative p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
              <Bolt className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-base text-green-300">API SR</h2>
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400 uppercase tracking-wider">Sans Redirection</span>
              </div>
              <p className="text-xs text-green-300/60 mt-0.5">Initiez des paiements directement depuis votre backend, sans redirection côté client.</p>
            </div>
          </div>

          {/* SR Key card */}
          {!srKey ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-green-200">Aucune clé SR créée</p>
                <p className="text-xs text-green-300/50 mt-0.5">1 seule clé SR autorisée par compte.</p>
              </div>
              <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white font-bold gap-2 flex-shrink-0" onClick={() => setCreateSrOpen(true)} data-testid="button-create-sr-key">
                <Plus className="h-3.5 w-3.5" /> Créer ma clé SR
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-green-200">{srKey.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${srKey.isActive ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                      {srKey.isActive ? "Active" : "Inactive"}
                    </span>
                    {(srKey as any).webhookUrl && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1"><Webhook className="h-2.5 w-2.5" />Webhook configuré</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={srKey.isActive} onCheckedChange={(checked) => toggleSrMutation.mutate({ id: srKey.id, isActive: checked })} data-testid="switch-sr-key" />
                    <Button variant="outline" size="icon" className="h-8 w-8 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setDeleteSrId(srKey.id)} data-testid="button-delete-sr-key"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-black/40 rounded-xl px-4 py-2.5 border border-green-500/20">
                    <code className="text-xs font-mono truncate block text-green-300" data-testid="text-sr-key-value">
                      {visibleSrKey ? (srKey.fullKey || `${srKey.keyPrefix}...`) : `${srKey.keyPrefix}${"•".repeat(24)}`}
                    </code>
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => setVisibleSrKey(v => !v)} data-testid="button-toggle-sr-key">
                    {visibleSrKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <CopyButton value={srKey.fullKey || srKey.keyPrefix} label="Clé SR" className="border-green-500/30 text-green-400 hover:bg-green-500/10" />
                </div>
                <p className="text-[10px] text-green-300/40">Créée le {formatDate(srKey.createdAt)} · Dernière utilisation : {formatDate(srKey.lastUsedAt)}</p>
              </div>

              {/* Webhook config for SR key */}
              <SrWebhookConfig srKey={srKey} />
            </div>
          )}

          {/* Documentation complète */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1">
              <Code2 className="h-4 w-4 text-green-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-green-400">Documentation API SR</p>
            </div>

            <DocToggle id="quickstart" label="🚀 Démarrage rapide" />
            {docSection === "quickstart" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-3 text-xs">
                <div>
                  <p className="font-bold text-green-300 mb-1">Endpoint unique</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-green-600 text-white text-[10px] font-bold">POST</span>
                    <code className="text-green-400/80 flex-1 break-all">https://solvexpay.com/api/v1/sr/pay</code>
                    <CopyButton value="https://solvexpay.com/api/v1/sr/pay" label="URL" className="border-green-500/20 text-green-400 hover:bg-green-500/10 h-7 w-7" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-green-300 mb-1">En-têtes requis</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px]">{`Authorization: Bearer sk_live_votre_cle_sr
Content-Type: application/json`}</pre>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-green-300 mb-1">Corps de la requête</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap">{`{
  "amount": 5000,           // Requis — Montant en XOF (min: 100)
  "phone": "22901234567",   // Requis — Numéro complet avec indicatif
  "operator": "mtn",        // Requis — Code opérateur (voir liste)
  "country": "BJ",          // Requis — Code pays ISO (voir liste)
  "otp": "123456",          // Optionnel — OTP si requis par l'opérateur
  "description": "...",     // Optionnel — Libellé transaction
  "customer_name": "...",   // Optionnel — Nom du client
  "customer_email": "..."   // Optionnel — Email du client
}`}</pre>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-green-300 mb-1">Réponse succès (201)</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap">{`{
  "success": true,
  "id": "txn_abc123",       // ID de la transaction SolvexPay
  "status": "pending",      // En attente de validation client
  "reference": "REF...",    // Référence de transaction
  "amount": 5000,
  "fees": 350,              // Frais SolvexPay (% configuré)
  "net_amount": 4650,       // Montant net crédité à vous
  "currency": "XOF",
  "operator": "MTN",
  "phone": "22901234567",
  "message": "Paiement initié. Le client doit valider sur son téléphone.",
  "created_at": "2025-01-01T00:00:00.000Z"
}`}</pre>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-300/80 text-[11px] leading-relaxed">
                    Le statut initial est toujours <strong className="text-blue-300">pending</strong>. Un USSD est envoyé au client pour qu'il valide le paiement. SolvexPay reçoit la confirmation en temps réel et crédite automatiquement votre solde. Votre webhook est notifié à chaque changement de statut.
                  </p>
                </div>
              </div>
            )}

            <DocToggle id="countries" label="🌍 Pays et opérateurs supportés" />
            {docSection === "countries" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-4 text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-green-400/60 border-b border-green-500/10">
                        <th className="text-left pb-2 pr-3 font-bold">Pays</th>
                        <th className="text-left pb-2 pr-3 font-bold">Code</th>
                        <th className="text-left pb-2 pr-3 font-bold">Devise</th>
                        <th className="text-left pb-2 font-bold">Opérateurs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSrCountries.map((c) => (
                        <tr key={c.code} className="border-b border-green-500/5 text-green-300/80">
                          <td className="py-2 pr-3 font-medium">{c.name}</td>
                          <td className="py-2 pr-3"><code className="bg-green-500/10 px-1.5 py-0.5 rounded text-green-400">{c.code}</code></td>
                          <td className="py-2 pr-3 text-green-300/60">{c.currency}</td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              {c.operators.map((op) => (
                                <code key={op} className="bg-black/40 px-1.5 py-0.5 rounded border border-green-500/15 text-green-400/80">{op.toLowerCase()}</code>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300/80 text-[11px] leading-relaxed">
                    Les <strong className="text-amber-300">Congo-Kinshasa (COD)</strong> utilisent la devise <strong className="text-amber-300">CDF</strong>. Les montants sont automatiquement convertis en XOF pour votre solde SolvexPay (1 XOF ≈ 4.5 CDF).
                  </p>
                </div>
              </div>
            )}

            <DocToggle id="operators" label="📡 Détails opérateurs et OTP" />
            {docSection === "operators" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-3 text-xs">
                <p className="text-green-300/70 text-[11px]">Certains opérateurs nécessitent un OTP (mot de passe à usage unique) que le client doit fournir avant le paiement.</p>
                <div className="space-y-2">
                  {activeSrOperators.map((op) => (
                    <div key={op.code} className="bg-black/30 rounded-xl p-3 border border-green-500/10 flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-green-200 text-[11px]">{op.label}</span>
                          <code className="bg-green-500/10 px-1.5 py-0.5 rounded text-green-400 text-[10px]">{op.code.toLowerCase()}</code>
                          {op.otp ? (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[9px] font-bold"><AlertCircle className="h-2.5 w-2.5" />OTP REQUIS</span>
                          ) : (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-bold"><CheckCircle2 className="h-2.5 w-2.5" />OTP optionnel</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {op.countries.filter(c => !suspendedCodes.includes(c)).map((c) => <code key={c} className="bg-black/40 px-1 py-0.5 rounded border border-green-500/10 text-green-400/70 text-[9px]">{c}</code>)}
                        </div>
                        <p className="text-green-300/50 text-[10px]">{op.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-300/80 space-y-1">
                    <p className="font-bold text-amber-300">Opérateurs nécessitant un OTP</p>
                    <p><strong>ORANGE (CI, SN) :</strong> Demandez l'OTP à votre client avant d'appeler l'API. L'OTP est obtenu en composant le <code className="bg-black/40 px-1 rounded">#144#</code> sur son téléphone (CI) ou <code className="bg-black/40 px-1 rounded">#144*82#</code> (SN). L'OTP expire en 5 minutes.</p>
                  </div>
                </div>
              </div>
            )}

            <DocToggle id="webhook" label="🔔 Webhooks et notifications" />
            {docSection === "webhook" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-3 text-xs">
                <p className="text-green-300/70 text-[11px]">SolvexPay envoie un POST JSON à votre URL webhook dès qu'un paiement est confirmé ou échoue. Configurez votre URL webhook dans la section de votre clé SR ci-dessus.</p>
                <div>
                  <p className="font-bold text-green-300 mb-1">Payload webhook reçu</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap">{`{
  "event": "transaction.completed",  // ou "transaction.failed"
  "transaction": {
    "id": "txn_abc123",
    "status": "completed",           // "completed" | "failed"
    "amount": 5000,
    "fees": 350,
    "net_amount": 4650,
    "currency": "XOF",
    "operator": "MTN",
    "phone": "22901234567",
    "reference": "REF...",
    "payer_name": "Jean Dupont",
    "payer_email": "jean@example.com",
    "payer_country": "BJ",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "timestamp": "2025-01-01T00:01:00.000Z"
}`}</pre>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-green-300 mb-1">Vérification de la signature</p>
                  <p className="text-green-300/60 text-[11px] mb-2">Chaque webhook inclut l'en-tête <code className="bg-black/40 px-1 rounded">x-solvexpay-signature</code> signé avec votre Webhook Secret.</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap">{`// Node.js — Vérification de signature
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// Dans votre route webhook :
app.post('/webhook/solvexpay', (req, res) => {
  const sig = req.headers['x-solvexpay-signature'];
  if (!verifyWebhook(req.body, sig, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  // Traitement du webhook...
  res.send('OK');
});`}</pre>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-300/80 text-[11px]">Les webhooks sont relivraison automatiquement en cas d'échec : 0s, 8s, 30s. Répondez toujours avec un code <strong className="text-blue-300">2xx</strong> pour confirmer la réception.</p>
                </div>
              </div>
            )}

            <DocToggle id="status" label="🔍 Vérification du statut" />
            {docSection === "status" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-3 text-xs">
                <p className="text-green-300/70 text-[11px]">Interrogez le statut d'une transaction à tout moment via l'endpoint standard :</p>
                <div className="bg-black/50 rounded-xl p-3 border border-green-500/10 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">GET</span>
                  <code className="text-green-400/80 text-[11px]">https://solvexpay.com/api/v1/transactions/:id</code>
                </div>
                <div>
                  <p className="font-bold text-green-300 mb-1">Exemple cURL</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap">{`curl https://solvexpay.com/api/v1/transactions/txn_abc123 \\
  -H "Authorization: Bearer sk_live_votre_cle_sr"`}</pre>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-green-300 mb-2">Statuts possibles</p>
                  <div className="space-y-2">
                    {[
                      { s: "pending", icon: <AlertCircle className="h-3 w-3 text-amber-400" />, desc: "En attente de validation par le client (USSD en cours)" },
                      { s: "completed", icon: <CheckCircle2 className="h-3 w-3 text-green-400" />, desc: "Paiement validé — votre solde SolvexPay est crédité" },
                      { s: "failed", icon: <XCircle className="h-3 w-3 text-red-400" />, desc: "Paiement refusé ou expiré — aucun débit effectué" },
                    ].map(({ s, icon, desc }) => (
                      <div key={s} className="flex items-start gap-2 p-2 bg-black/30 rounded-xl border border-green-500/10">
                        {icon}
                        <div>
                          <code className="text-green-300 text-[10px]">{s}</code>
                          <p className="text-green-300/50 text-[10px] mt-0.5">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DocToggle id="errors" label="⚠️ Codes d'erreur" />
            {docSection === "errors" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-2 text-xs">
                <p className="text-green-300/70 text-[11px] mb-3">Toutes les erreurs retournent un JSON structuré avec le format suivant :</p>
                <div className="bg-black/50 rounded-xl p-3 border border-green-500/10 mb-3">
                  <pre className="text-green-400/80 text-[11px]">{`{ "error": { "code": "CODE", "message": "...", "status": 400 } }`}</pre>
                </div>
                {[
                  { code: "UNAUTHORIZED", http: "401", desc: "Clé SR manquante, invalide ou désactivée" },
                  { code: "FORBIDDEN", http: "403", desc: "Compte suspendu ou API SR non activée" },
                  { code: "VALIDATION_ERROR", http: "400", desc: "Paramètre manquant ou invalide" },
                  { code: "COUNTRY_SUSPENDED", http: "503", desc: "Paiements suspendus pour ce pays" },
                  { code: "OPERATOR_MAINTENANCE", http: "503", desc: "Opérateur en maintenance" },
                  { code: "SERVICE_UNAVAILABLE", http: "503", desc: "Service de paiement temporairement indisponible" },
                  { code: "SERVER_ERROR", http: "500", desc: "Erreur interne — réessayez dans quelques secondes" },
                ].map(({ code, http, desc }) => (
                  <div key={code} className="flex items-start gap-3 p-2.5 bg-black/30 rounded-xl border border-green-500/10">
                    <code className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${http.startsWith("4") ? "bg-amber-500/20 text-amber-400" : http.startsWith("5") ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>{http}</code>
                    <div className="flex-1">
                      <code className="text-green-300 text-[10px] font-bold">{code}</code>
                      <p className="text-green-300/50 text-[10px] mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DocToggle id="example" label="💻 Exemples de code complets" />
            {docSection === "example" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-4 text-xs">
                <div>
                  <p className="font-bold text-green-300 mb-2">Node.js / Express — Paiement MTN Bénin</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap overflow-x-auto">{`const axios = require('axios');

async function initierPaiementSR(montant, telephone, client) {
  const response = await axios.post(
    'https://solvexpay.com/api/v1/sr/pay',
    {
      amount: montant,        // ex: 5000
      phone: telephone,       // ex: "22901234567"
      operator: 'mtn',        // code opérateur
      country: 'BJ',          // code pays
      customer_name: client,  // optionnel
      description: 'Achat produit XYZ'
    },
    {
      headers: {
        'Authorization': 'Bearer sk_live_votre_cle_sr',
        'Content-Type': 'application/json'
      }
    }
  );

  const { id, reference, status, message } = response.data;
  console.log('Transaction créée:', { id, reference, status });
  // → Afficher message au client : il va recevoir un USSD
  return response.data;
}

// Webhook de confirmation
app.post('/webhook/solvexpay', express.json(), (req, res) => {
  const { event, transaction } = req.body;
  
  if (event === 'transaction.completed') {
    // Paiement reçu — traiter la commande
    console.log('Paiement reçu:', transaction.amount, transaction.currency);
    await commander.valider(transaction.reference);
  } else if (event === 'transaction.failed') {
    // Paiement échoué
    console.log('Paiement échoué:', transaction.reference);
  }
  
  res.send('OK'); // Toujours répondre 200
});`}</pre>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-green-300 mb-2">PHP — Paiement Orange CI avec OTP</p>
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10">
                    <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap overflow-x-auto">{`<?php
$otp = $_POST['otp']; // OTP fourni par le client sur votre formulaire

$ch = curl_init('https://solvexpay.com/api/v1/sr/pay');
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Authorization: Bearer sk_live_votre_cle_sr',
    'Content-Type: application/json',
  ],
  CURLOPT_POSTFIELDS => json_encode([
    'amount'        => 10000,
    'phone'         => '2250701234567',
    'operator'      => 'orange',
    'country'       => 'CI',
    'otp'           => $otp,     // Requis pour Orange CI
    'customer_name' => 'Jean Dupont',
    'description'   => 'Commande #12345',
  ]),
]);

$response = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($response['success']) {
  echo "Paiement initié: " . $response['message'];
  // Stocker $response['id'] pour vérification ultérieure
}
?>`}</pre>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-green-300/80 space-y-1">
                    <p className="font-bold text-green-300">Flux recommandé</p>
                    <p>1. Votre client remplit son numéro (+ OTP si Orange) sur votre page</p>
                    <p>2. Vous appelez <code className="bg-black/40 px-1 rounded">POST /api/v1/sr/pay</code> depuis votre backend</p>
                    <p>3. Le client reçoit un USSD sur son téléphone et valide le paiement</p>
                    <p>4. SolvexPay reçoit la confirmation et crédite votre solde</p>
                    <p>5. Votre webhook reçoit <code className="bg-black/40 px-1 rounded">transaction.completed</code></p>
                  </div>
                </div>
              </div>
            )}

            <DocToggle id="fees" label="💰 Frais et commission" />
            {docSection === "fees" && (
              <div className="bg-black/40 border border-green-500/10 rounded-2xl p-4 space-y-3 text-xs">
                <p className="text-green-300/70 text-[11px]">Les frais API SR sont identiques aux frais API standard, configurables par l'administrateur :</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2.5 bg-black/30 rounded-xl border border-green-500/10">
                    <div className="flex-1">
                      <p className="font-bold text-green-300 text-[11px]">Frais globaux</p>
                      <p className="text-green-300/50 text-[10px] mt-0.5">Taux de base défini par l'administrateur dans le tableau de bord (paramètre <code className="bg-black/40 px-1 rounded">fee_api</code>)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-black/30 rounded-xl border border-green-500/10">
                    <div className="flex-1">
                      <p className="font-bold text-green-300 text-[11px]">Frais par opérateur</p>
                      <p className="text-green-300/50 text-[10px] mt-0.5">L'administrateur peut définir un taux spécifique par opérateur, prioritaire sur le taux global</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 bg-black/30 rounded-xl border border-green-500/10">
                    <div className="flex-1">
                      <p className="font-bold text-green-300 text-[11px]">Frais par pays</p>
                      <p className="text-green-300/50 text-[10px] mt-0.5">Un taux peut être défini spécifiquement pour un opérateur dans un pays donné (priorité maximale)</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-300/80 text-[11px]">
                    Formule : <code className="bg-black/40 px-1 rounded">net_amount = amount - fees = amount × (1 - taux)</code>.
                    Le <code className="bg-black/40 px-1 rounded">net_amount</code> est crédité sur votre solde SolvexPay.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog create SR key */}
      <Dialog open={createSrOpen} onOpenChange={setCreateSrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-2">
              <Bolt className="h-7 w-7 text-green-500" />
            </div>
            <DialogTitle className="text-center">Créer une clé API SR</DialogTitle>
            <DialogDescription className="text-center">Paiements directs sans redirection. Gardez cette clé secrète — ne l'exposez jamais en frontend.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Nom de la clé (ex: Clé SR principale)" value={srKeyName} onChange={(e) => setSrKeyName(e.target.value)} data-testid="input-sr-key-name" />
            <Button className="w-full font-bold bg-green-600 hover:bg-green-500 text-white gap-2" disabled={!srKeyName.trim() || createSrMutation.isPending} onClick={() => createSrMutation.mutate(srKeyName.trim())} data-testid="button-confirm-create-sr-key">
              <Bolt className="h-4 w-4" />{createSrMutation.isPending ? "Création..." : "Créer la clé SR"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setCreateSrOpen(false)}>Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog delete SR key */}
      <Dialog open={!!deleteSrId} onOpenChange={(open) => !open && setDeleteSrId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-2"><AlertTriangle className="h-7 w-7 text-red-500" /></div>
            <DialogTitle className="text-center">Supprimer la clé SR ?</DialogTitle>
            <DialogDescription className="text-center">Cette clé sera supprimée définitivement. Vous pourrez en créer une nouvelle.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="destructive" className="w-full font-bold gap-2" onClick={() => deleteSrId && deleteSrMutation.mutate(deleteSrId)} disabled={deleteSrMutation.isPending} data-testid="button-confirm-delete-sr-key">
              <Trash2 className="h-4 w-4" />{deleteSrMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteSrId(null)} className="w-full">Annuler</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [kycGateOpen, setKycGateOpen] = useState(false);
  const [srPanelOpen, setSrPanelOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [expandedConfig, setExpandedConfig] = useState<Record<string, boolean>>({});

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({ queryKey: ["/api/api-keys"] });
  const { data: currentUser } = useQuery<any>({ queryKey: ["/api/auth/user"] });

  const regularKeys = (apiKeys || []).filter((k) => !(k as any).isSrKey);

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
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiRequest("PATCH", `/api/api-keys/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setDeleteConfirmId(null);
      toast({ title: "Clé supprimée" });
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({ name: fd.get("name") as string, appName: fd.get("appName") as string, websiteUrl: (fd.get("websiteUrl") as string) || undefined });
  };

  return (
    <DashboardLayout title="Clés API" breadcrumbs={[{ label: "Clés API" }]}>
      <div className="max-w-3xl space-y-6">

        {/* Hero */}
        <div className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, hsl(220 83% 48%) 0%, hsl(240 70% 60%) 100%)" }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0"><Key className="h-7 w-7" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-xl" data-testid="text-api-title">Clés API</p>
              <p className="text-white/70 text-sm mt-0.5" data-testid="text-api-subtitle">Intégrez SolvexPay dans vos applications</p>
            </div>
            <Button className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white border-0 font-bold gap-2 backdrop-blur-sm" onClick={() => setCreateOpen(true)} data-testid="button-create-key">
              <Plus className="h-4 w-4" /> Nouvelle clé
            </Button>
          </div>
        </div>

        {/* Create key dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une clé API de production</DialogTitle>
              <DialogDescription>Cette clé vous permettra d'intégrer SolvexPay via la page de paiement hébergée.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Nom de la clé <span className="text-destructive">*</span></Label>
                <Input id="key-name" name="name" placeholder="Ex: Clé principale" required data-testid="input-key-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-appname">Nom de l'application <span className="text-destructive">*</span></Label>
                <Input id="key-appname" name="appName" placeholder="Ex: MonShop, PayApp" required data-testid="input-key-appname" />
                <p className="text-xs text-muted-foreground">Affiché sur la page de paiement SolvexPay.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-website">Site web (optionnel)</Label>
                <Input id="key-website" name="websiteUrl" type="url" placeholder="https://monsite.com" data-testid="input-key-website" />
              </div>
              <Button type="submit" className="w-full font-bold" disabled={createMutation.isPending} data-testid="button-confirm-create-key">
                {createMutation.isPending ? "Création..." : "Créer la clé de production"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete confirm dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-2"><AlertTriangle className="h-7 w-7 text-red-500" /></div>
              <DialogTitle className="text-center">Supprimer la clé API ?</DialogTitle>
              <DialogDescription className="text-center">La clé <strong>"{deleteConfirmName}"</strong> sera supprimée définitivement.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 mt-2">
              <Button variant="destructive" className="w-full font-bold gap-2" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
                <Trash2 className="h-4 w-4" />{deleteMutation.isPending ? "Suppression..." : "Oui, supprimer définitivement"}
              </Button>
              <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="w-full">Annuler</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Keys list */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
        ) : !regularKeys || regularKeys.length === 0 ? (
          <Card className="border-border/60 border-dashed">
            <CardContent className="py-14 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4"><Key className="h-8 w-8 text-primary/40" data-testid="icon-empty-keys" /></div>
              <p className="font-bold mb-1" data-testid="text-empty-message">Aucune clé API</p>
              <p className="text-sm text-muted-foreground mb-5">Créez votre première clé pour intégrer SolvexPay</p>
              <Button className="gap-2 font-bold shadow-lg shadow-primary/20" onClick={() => setCreateOpen(true)} data-testid="button-create-first-key">
                <Plus className="h-4 w-4" /> Créer votre première clé API
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {regularKeys.map((key) => (
              <Card key={key.id} className="border-border/60 overflow-hidden" data-testid={`key-row-${key.id}`}>
                <div className={`h-1 ${key.isActive ? "bg-gradient-to-r from-blue-500 to-violet-500" : "bg-muted"}`} />
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm">{key.name}</h3>
                          {(key as any).appName && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">{(key as any).appName}</span>}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Production</span>
                          {(key as any).adminLocked
                            ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Verrouillée</span>
                            : <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${key.isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>{key.isActive ? "Active" : "Inactive"}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Créée le {formatDate(key.createdAt)}</span>
                          <span className="text-xs text-muted-foreground">Dernière utilisation : {formatDate(key.lastUsedAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(key as any).adminLocked
                          ? <div className="px-2.5 py-1.5 rounded-xl bg-red-500/8 border border-red-500/20" title="Verrouillée par l'administrateur"><Lock className="h-3.5 w-3.5 text-red-500" /></div>
                          : <Switch checked={key.isActive} onCheckedChange={(checked) => toggleMutation.mutate({ id: key.id, isActive: checked })} data-testid={`switch-key-${key.id}`} />}
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/5" data-testid={`button-delete-key-${key.id}`} disabled={!!(key as any).adminLocked} onClick={() => { setDeleteConfirmId(key.id); setDeleteConfirmName(key.name); }}>
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
                      <Button variant="outline" size="icon" className="flex-shrink-0 border-border/60 h-8 w-8" onClick={() => setVisibleKeys(p => ({ ...p, [key.id]: !p[key.id] }))} data-testid={`button-toggle-key-${key.id}`}>
                        {visibleKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <CopyButton value={key.fullKey || key.keyPrefix} label="Clé API" />
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1.5 self-start -mt-2" onClick={() => setExpandedConfig(p => ({ ...p, [key.id]: !p[key.id] }))} data-testid={`button-toggle-config-${key.id}`}>
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

        {/* Documentation link */}
        <Card className="border-border/60" data-testid="section-documentation-link">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0"><BookOpen className="h-6 w-6 text-indigo-600" /></div>
              <div className="flex-1">
                <p className="font-bold text-sm">Documentation API standard</p>
                <p className="text-xs text-muted-foreground mt-0.5">Endpoints checkout, webhooks, codes d'erreur, exemples</p>
              </div>
              <Link href="/documentation">
                <Button size="sm" className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white" data-testid="button-open-docs">
                  <Zap className="h-3.5 w-3.5" /> Voir la doc
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* SR Section — only if admin enabled it AND KYC approved */}
        {currentUser?.apiSrEnabled && currentUser?.kycStatus !== "verified" && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-700 dark:text-green-400">API SR activé — Vérification requise</p>
              <p className="text-xs text-muted-foreground mt-1">
                L'option <strong>API SR (Sans Redirection)</strong> a été activée sur votre compte. Pour créer votre clé SR et commencer à l'utiliser, vous devez d'abord <strong>compléter votre vérification KYC</strong>.
              </p>
              <div className="mt-3">
                <Link href="/kyc">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2" data-testid="btn-kyc-for-sr">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Vérifier mon compte
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
        {currentUser?.apiSrEnabled && currentUser?.kycStatus === "verified" && (
          <>
            <button
              onClick={() => setSrPanelOpen(true)}
              className="w-full group relative rounded-2xl overflow-hidden border border-green-500/30 shadow-lg shadow-green-900/10 text-left"
              style={{ background: "linear-gradient(135deg, hsl(145 60% 7%) 0%, hsl(160 50% 6%) 100%)" }}
              data-testid="button-open-sr-panel"
            >
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ background: "radial-gradient(ellipse at top right, hsl(145 70% 40%), transparent 60%)" }} />
              <div className="relative flex items-center gap-4 px-5 py-4">
                <div className="h-11 w-11 rounded-2xl bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                  <Bolt className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-green-300 uppercase tracking-wide">Gestion des clés API SR</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400 uppercase tracking-wider">Sans Redirection</span>
                  </div>
                  <p className="text-xs text-green-300/50 mt-0.5">Clé SR, configuration webhook, documentation</p>
                </div>
                <ChevronDown className="h-4 w-4 text-green-400/60 flex-shrink-0 group-hover:text-green-400 transition-colors -rotate-90" />
              </div>
            </button>

            <Sheet open={srPanelOpen} onOpenChange={setSrPanelOpen}>
              <SheetContent side="bottom" className="h-[95dvh] p-0 rounded-t-3xl overflow-hidden flex flex-col">
                <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-green-500/15 flex items-center justify-center border border-green-500/30">
                      <Bolt className="h-5 w-5 text-green-600" />
                    </div>
                    <SheetTitle className="text-base font-black">Gestion des clés API SR</SheetTitle>
                  </div>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-5">
                  <SrSection allKeys={apiKeys || []} />
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      {/* KYC Gate Dialog */}
      <Dialog open={kycGateOpen} onOpenChange={setKycGateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-2 shadow-lg"><ShieldAlert className="h-7 w-7 text-white" /></div>
            <DialogTitle className="text-center">Vérification d'identité requise</DialogTitle>
            <DialogDescription className="text-center">L'accès aux clés API nécessite une vérification KYC. Soumettez votre dossier depuis le menu <strong>Vérification KYC</strong>.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Link href="/kyc" onClick={() => setKycGateOpen(false)}>
              <Button className="w-full font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white" data-testid="button-kyc-dialog-api-keys"><ShieldAlert className="h-4 w-4" /> Vérifier mon identité</Button>
            </Link>
            <Button variant="ghost" onClick={() => setKycGateOpen(false)} className="w-full">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

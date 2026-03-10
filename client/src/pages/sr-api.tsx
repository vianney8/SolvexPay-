import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Plus, Copy, Trash2, Eye, EyeOff, Webhook, Check, AlertTriangle,
  Bolt, Code2, Info, CheckCircle2, XCircle, AlertCircle, ArrowLeft, ClipboardList,
} from "lucide-react";
import { Link } from "wouter";
import type { ApiKey } from "@shared/schema";

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

function formatDate(date: string | Date | null) {
  if (!date) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function InlineCopy({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <Button variant="outline" size="icon" className="flex-shrink-0 border-green-500/20 text-green-400 hover:bg-green-500/10 h-7 w-7"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); toast({ title: label ? `${label} copié` : "Copié" }); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function DocBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-bold text-green-300 text-xs mb-2">{title}</p>
      {children}
    </div>
  );
}

function CodeBox({ children, copyValue }: { children: string; copyValue?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const val = copyValue ?? children;
  return (
    <div className="relative bg-black/50 rounded-xl border border-green-500/10 group">
      <pre className="text-green-400/80 text-[11px] whitespace-pre-wrap overflow-x-auto p-3 pr-8">{children}</pre>
      <button
        onClick={() => { navigator.clipboard.writeText(val); setCopied(true); toast({ title: "Copié" }); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-green-500/20 hover:bg-green-500/30"
      >
        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-green-400" />}
      </button>
    </div>
  );
}

function buildCopyAllText(activeSrCountries: typeof SR_COUNTRIES, activeSrOperators: typeof SR_OPERATORS) {
  return `============================
DOCUMENTATION API SR — SOLVEXPAY
============================

ENDPOINT UNIQUE
POST https://solvexpay.com/api/v1/sr/pay

EN-TÊTES REQUIS
Authorization: Bearer sk_live_votre_cle_sr
Content-Type: application/json

CORPS DE LA REQUÊTE
{
  "amount": 5000,           // Requis — Montant en XOF (min: 100)
  "phone": "22901234567",   // Requis — Numéro complet avec indicatif
  "operator": "mtn",        // Requis — Code opérateur (voir liste)
  "country": "BJ",          // Requis — Code pays ISO (voir liste)
  "otp": "123456",          // Optionnel — OTP si requis par l'opérateur
  "description": "...",     // Optionnel — Libellé transaction
  "customer_name": "...",   // Optionnel — Nom du client
  "customer_email": "..."   // Optionnel — Email du client
}

RÉPONSE SUCCÈS (201)
{
  "success": true,
  "id": "txn_abc123",
  "status": "pending",
  "reference": "REF...",
  "amount": 5000,
  "fees": 350,
  "net_amount": 4650,
  "currency": "XOF",
  "operator": "MTN",
  "phone": "22901234567",
  "message": "Paiement initié. Le client doit valider sur son téléphone.",
  "created_at": "2025-01-01T00:00:00.000Z"
}

============================
PAYS ET OPÉRATEURS SUPPORTÉS
============================
${activeSrCountries.map(c => `${c.name} (${c.code}) — ${c.currency} — Opérateurs: ${c.operators.map(o => o.toLowerCase()).join(", ")}`).join("\n")}

============================
DÉTAILS OPÉRATEURS ET OTP
============================
${activeSrOperators.map(op => `${op.label} (${op.code.toLowerCase()}) — ${op.otp ? "OTP REQUIS" : "OTP optionnel"} — ${op.note}`).join("\n")}

ORANGE (CI, SN) : OTP obtenu en composant le #144# (CI) ou #144*82# (SN) — expire en 5 minutes.

============================
WEBHOOKS ET NOTIFICATIONS
============================
PAYLOAD REÇU :
{
  "event": "transaction.completed",
  "transaction": {
    "id": "txn_abc123",
    "status": "completed",
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
}

VÉRIFICATION SIGNATURE (Node.js) :
const crypto = require('crypto');
function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
app.post('/webhook/solvexpay', (req, res) => {
  const sig = req.headers['x-solvexpay-signature'];
  if (!verifyWebhook(req.body, sig, WEBHOOK_SECRET)) return res.status(401).send('Invalid signature');
  res.send('OK');
});

Relances en cas d'échec : 0s, 8s, 30s — Répondez toujours 2xx.

============================
VÉRIFICATION DU STATUT
============================
GET https://solvexpay.com/api/v1/transactions/:id

curl https://solvexpay.com/api/v1/transactions/txn_abc123 \\
  -H "Authorization: Bearer sk_live_votre_cle_sr"

Statuts : pending (USSD en cours) | completed (solde crédité) | failed (refusé/expiré)

============================
CODES D'ERREUR
============================
401 UNAUTHORIZED — Clé SR manquante, invalide ou désactivée
403 FORBIDDEN — Compte suspendu ou API SR non activée
400 VALIDATION_ERROR — Paramètre manquant ou invalide
503 COUNTRY_SUSPENDED — Paiements suspendus pour ce pays
503 OPERATOR_MAINTENANCE — Opérateur en maintenance
503 SERVICE_UNAVAILABLE — Service temporairement indisponible
500 SERVER_ERROR — Erreur interne, réessayez

============================
EXEMPLES DE CODE
============================

Node.js / Express — MTN Bénin :
const axios = require('axios');
async function initierPaiementSR(montant, telephone, client) {
  const response = await axios.post('https://solvexpay.com/api/v1/sr/pay', {
    amount: montant, phone: telephone, operator: 'mtn', country: 'BJ',
    customer_name: client, description: 'Achat produit XYZ'
  }, { headers: { 'Authorization': 'Bearer sk_live_votre_cle_sr', 'Content-Type': 'application/json' } });
  const { id, reference, status, message } = response.data;
  return response.data;
}
app.post('/webhook/solvexpay', express.json(), (req, res) => {
  const { event, transaction } = req.body;
  if (event === 'transaction.completed') { /* traiter la commande */ }
  else if (event === 'transaction.failed') { /* paiement échoué */ }
  res.send('OK');
});

PHP — Orange CI avec OTP :
<?php
$otp = $_POST['otp'];
$ch = curl_init('https://solvexpay.com/api/v1/sr/pay');
curl_setopt_array($ch, [
  CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['Authorization: Bearer sk_live_votre_cle_sr', 'Content-Type: application/json'],
  CURLOPT_POSTFIELDS => json_encode(['amount' => 10000, 'phone' => '2250701234567', 'operator' => 'orange', 'country' => 'CI', 'otp' => $otp, 'customer_name' => 'Jean Dupont', 'description' => 'Commande #12345']),
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);
if ($response['success']) { echo "Paiement initié: " . $response['message']; }
?>

FLUX RECOMMANDÉ :
1. Votre client remplit son numéro (+ OTP si Orange) sur votre page
2. Vous appelez POST /api/v1/sr/pay depuis votre backend
3. Le client reçoit un USSD sur son téléphone et valide
4. SolvexPay crédite votre solde automatiquement
5. Votre webhook reçoit transaction.completed

============================
FRAIS ET COMMISSION
============================
Frais globaux : taux de base configuré par l'administrateur (fee_api)
Frais par opérateur : prioritaire sur le taux global
Frais par pays : priorité maximale
Formule : net_amount = amount - fees = amount × (1 - taux)
`;
}

export default function SrApiPage() {
  const { toast } = useToast();
  const [createSrOpen, setCreateSrOpen] = useState(false);
  const [srKeyName, setSrKeyName] = useState("");
  const [visibleSrKey, setVisibleSrKey] = useState(false);
  const [deleteSrId, setDeleteSrId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const { data: apiKeys } = useQuery<ApiKey[]>({ queryKey: ["/api/api-keys"] });
  const { data: suspendedData } = useQuery<{ codes: string[] }>({ queryKey: ["/api/public/suspended-countries"], staleTime: 60000 });
  const suspendedCodes = suspendedData?.codes || [];
  const activeSrCountries = SR_COUNTRIES.filter(c => !suspendedCodes.includes(c.code));
  const activeSrOperators = SR_OPERATORS.filter(op => op.countries.some(c => !suspendedCodes.includes(c)));

  const srKey = (apiKeys || []).find((k) => (k as any).isSrKey);

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

  const [srWebhookUrl, setSrWebhookUrl] = useState("");
  const [srRedirectUrl, setSrRedirectUrl] = useState("");
  const [webhookSaved, setWebhookSaved] = useState(false);

  const updateWebhookM = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/api-keys/${srKey?.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] }); setWebhookSaved(true); setTimeout(() => setWebhookSaved(false), 2000); toast({ title: "Configuration webhook sauvegardée" }); },
    onError: () => toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" }),
  });

  const handleCopyAll = () => {
    const text = buildCopyAllText(activeSrCountries, activeSrOperators);
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast({ title: "Documentation copiée dans le presse-papier" });
    setTimeout(() => setCopiedAll(false), 3000);
  };

  const currentWebhookUrl = srKey ? ((srKey as any).webhookUrl || "") : "";
  const currentRedirectUrl = srKey ? ((srKey as any).redirectUrl || "") : "";

  return (
    <DashboardLayout title="API SR" breadcrumbs={[{ label: "Clés API", href: "/api-keys" }, { label: "API SR" }]}>
      <div className="max-w-3xl space-y-0">

        {/* Header */}
        <div
          className="relative rounded-3xl overflow-hidden border border-green-500/30 shadow-xl shadow-green-900/20"
          style={{ background: "linear-gradient(135deg, hsl(145 60% 7%) 0%, hsl(160 50% 6%) 100%)" }}
        >
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at top right, hsl(145 70% 40%), transparent 60%)" }} />
          <div className="relative p-5 sm:p-6 space-y-5">

            {/* Top bar */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link href="/api-keys">
                  <Button variant="outline" size="icon" className="h-9 w-9 border-green-500/20 text-green-400 hover:bg-green-500/10 flex-shrink-0" data-testid="button-back-to-api-keys">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="h-11 w-11 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/30 flex-shrink-0">
                  <Bolt className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-black text-base text-green-300">API SR</h1>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400 uppercase tracking-wider">Sans Redirection</span>
                  </div>
                  <p className="text-xs text-green-300/60 mt-0.5">Paiements directs depuis votre backend</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleCopyAll}
                className="flex-shrink-0 bg-green-700/50 hover:bg-green-600/60 text-green-200 border border-green-500/30 gap-2 font-bold text-xs h-9"
                data-testid="button-copy-all-doc"
              >
                {copiedAll ? <><Check className="h-3.5 w-3.5" /> Copié !</> : <><ClipboardList className="h-3.5 w-3.5" /> Tout copier</>}
              </Button>
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
                        {visibleSrKey ? ((srKey as any).fullKey || `${srKey.keyPrefix}...`) : `${srKey.keyPrefix}${"•".repeat(24)}`}
                      </code>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => setVisibleSrKey(v => !v)} data-testid="button-toggle-sr-key">
                      {visibleSrKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className="flex-shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10 h-8 w-8"
                      onClick={() => { navigator.clipboard.writeText((srKey as any).fullKey || srKey.keyPrefix); toast({ title: "Clé SR copiée" }); }} data-testid="button-copy-sr-key">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-green-300/40">Créée le {formatDate(srKey.createdAt)} · Dernière utilisation : {formatDate(srKey.lastUsedAt)}</p>
                </div>

                {/* Webhook Config */}
                <div className="bg-black/30 border border-green-500/15 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-green-300 flex items-center gap-1.5"><Webhook className="h-3.5 w-3.5" /> Configuration Webhook SR</p>
                  <div className="space-y-2">
                    <Label className="text-[11px] text-green-300/80 font-semibold">URL Webhook (notification de paiement)</Label>
                    <p className="text-[10px] text-green-300/50">SolvexPay envoie un POST ici dès qu'un paiement est confirmé ou échoue.</p>
                    <Input
                      defaultValue={currentWebhookUrl}
                      onChange={(e) => setSrWebhookUrl(e.target.value)}
                      key={`wh-${srKey.id}`}
                      placeholder="https://monsite.com/api/webhook/solvexpay"
                      className="h-8 text-xs bg-black/40 border-green-500/20 text-green-200 placeholder:text-green-300/30"
                      data-testid="input-sr-webhook-url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] text-green-300/80 font-semibold flex items-center gap-1.5">
                      URL de redirection
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-bold uppercase tracking-wide">Requis pour Wave</span>
                    </Label>
                    <p className="text-[10px] text-green-300/50">Wave redirige le client vers cette URL après paiement. Obligatoire si vous utilisez l'opérateur <strong className="text-amber-400">wave</strong>. Peut être votre site principal (ex: https://monsite.com).</p>
                    <Input
                      defaultValue={currentRedirectUrl}
                      onChange={(e) => setSrRedirectUrl(e.target.value)}
                      key={`rd-${srKey.id}`}
                      placeholder="https://monsite.com"
                      className={`h-8 text-xs bg-black/40 text-green-200 placeholder:text-green-300/30 ${!currentRedirectUrl ? "border-amber-500/40 focus:border-amber-500/60" : "border-green-500/20"}`}
                      data-testid="input-sr-redirect-url"
                    />
                    {!currentRedirectUrl && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                        <p className="text-[10px] text-amber-300/80">Non configurée — les paiements Wave échoueront avec l'erreur <code className="bg-black/40 px-1 rounded">MISSING_REDIRECT_URL</code></p>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs font-bold gap-1.5 bg-green-700 hover:bg-green-600 text-white border-0"
                    onClick={() => updateWebhookM.mutate({ webhookUrl: srWebhookUrl || currentWebhookUrl, redirectUrl: srRedirectUrl || currentRedirectUrl })}
                    disabled={updateWebhookM.isPending}
                    data-testid="button-save-sr-webhook"
                  >
                    {webhookSaved ? <><Check className="h-3.5 w-3.5" /> Sauvegardé</> : updateWebhookM.isPending ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documentation — all expanded */}
        <div
          className="rounded-b-3xl border border-t-0 border-green-500/20 overflow-hidden"
          style={{ background: "linear-gradient(180deg, hsl(145 55% 6%) 0%, hsl(145 40% 5%) 100%)" }}
        >
          <div className="p-5 sm:p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-green-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-green-400">Documentation API SR</p>
            </div>

            {/* 1. Démarrage rapide */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">🚀 Démarrage rapide</h2>
              <div className="space-y-3 text-xs">
                <DocBlock title="Endpoint unique">
                  <div className="bg-black/50 rounded-xl p-3 border border-green-500/10 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-green-600 text-white text-[10px] font-bold flex-shrink-0">POST</span>
                    <code className="text-green-400/80 flex-1 break-all">https://solvexpay.com/api/v1/sr/pay</code>
                    <InlineCopy value="https://solvexpay.com/api/v1/sr/pay" label="URL" />
                  </div>
                </DocBlock>
                <DocBlock title="En-têtes requis">
                  <CodeBox>{`Authorization: Bearer sk_live_votre_cle_sr\nContent-Type: application/json`}</CodeBox>
                </DocBlock>
                <DocBlock title="Corps de la requête">
                  <CodeBox>{`{\n  "amount": 5000,           // Requis — Montant en XOF (min: 100)\n  "phone": "22901234567",   // Requis — Numéro complet avec indicatif\n  "operator": "mtn",        // Requis — Code opérateur (voir liste)\n  "country": "BJ",          // Requis — Code pays ISO (voir liste)\n  "otp": "123456",          // Optionnel — OTP si requis par l'opérateur\n  "description": "...",     // Optionnel — Libellé transaction\n  "customer_name": "...",   // Optionnel — Nom du client\n  "customer_email": "..."   // Optionnel — Email du client\n}`}</CodeBox>
                </DocBlock>
                <DocBlock title="Réponse succès (201)">
                  <CodeBox>{`{\n  "success": true,\n  "id": "txn_abc123",       // ID de la transaction SolvexPay\n  "status": "pending",      // En attente de validation client\n  "reference": "REF...",    // Référence de transaction\n  "amount": 5000,\n  "fees": 350,              // Frais SolvexPay (% configuré)\n  "net_amount": 4650,       // Montant net crédité à vous\n  "currency": "XOF",\n  "operator": "MTN",\n  "phone": "22901234567",\n  "message": "Paiement initié. Le client doit valider sur son téléphone.",\n  "created_at": "2025-01-01T00:00:00.000Z"\n}`}</CodeBox>
                </DocBlock>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-300/80 text-[11px] leading-relaxed">
                    Le statut initial est toujours <strong className="text-blue-300">pending</strong>. Un USSD est envoyé au client pour qu'il valide le paiement. SolvexPay reçoit la confirmation en temps réel et crédite automatiquement votre solde. Votre webhook est notifié à chaque changement de statut.
                  </p>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-300/80 space-y-1">
                    <p className="font-bold text-amber-300">Cas particulier : Wave (CI, SN)</p>
                    <p>Wave ne fonctionne pas via USSD. La réponse inclut un champ <code className="bg-black/40 px-1 rounded">payment_url</code> — redirigez votre client vers cette URL pour qu'il valide le paiement dans l'app Wave. L'<strong className="text-amber-300">URL de redirection</strong> doit être configurée sur votre clé SR (obligatoire).</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="border-t border-green-500/10" />

            {/* 2. Pays et opérateurs */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">🌍 Pays et opérateurs supportés</h2>
              <div className="overflow-x-auto rounded-xl border border-green-500/10">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-green-400/60 border-b border-green-500/10 bg-black/30">
                      <th className="text-left p-3 pr-2 font-bold">Pays</th>
                      <th className="text-left p-3 pr-2 font-bold">Code</th>
                      <th className="text-left p-3 pr-2 font-bold">Devise</th>
                      <th className="text-left p-3 font-bold">Opérateurs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSrCountries.map((c) => (
                      <tr key={c.code} className="border-b border-green-500/5 text-green-300/80 hover:bg-green-500/5">
                        <td className="py-2.5 px-3 pr-2 font-medium">{c.name}</td>
                        <td className="py-2.5 px-3 pr-2"><code className="bg-green-500/10 px-1.5 py-0.5 rounded text-green-400">{c.code}</code></td>
                        <td className="py-2.5 px-3 pr-2 text-green-300/60">{c.currency}</td>
                        <td className="py-2.5 px-3">
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
                  Le <strong className="text-amber-300">Congo-Kinshasa (COD)</strong> utilise la devise <strong className="text-amber-300">CDF</strong>. Les montants sont automatiquement convertis en XOF pour votre solde SolvexPay (1 XOF ≈ 4.5 CDF).
                </p>
              </div>
            </section>

            <div className="border-t border-green-500/10" />

            {/* 3. Opérateurs et OTP */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">📡 Détails opérateurs et OTP</h2>
              <p className="text-green-300/70 text-[11px]">Certains opérateurs nécessitent un OTP que le client doit fournir avant le paiement.</p>
              <div className="space-y-2">
                {activeSrOperators.map((op) => (
                  <div key={op.code} className="bg-black/30 rounded-xl p-3 border border-green-500/10 flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  <p><strong>ORANGE (CI, SN) :</strong> L'OTP est obtenu en composant le <code className="bg-black/40 px-1 rounded">#144#</code> (CI) ou <code className="bg-black/40 px-1 rounded">#144*82#</code> (SN). Expire en 5 minutes.</p>
                </div>
              </div>
            </section>

            <div className="border-t border-green-500/10" />

            {/* 4. Webhooks */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">🔔 Webhooks et notifications</h2>
              <p className="text-green-300/70 text-[11px]">SolvexPay envoie un POST JSON à votre URL webhook dès qu'un paiement est confirmé ou échoue.</p>
              <div className="space-y-3 text-xs">
                <DocBlock title="Payload webhook reçu">
                  <CodeBox>{`{\n  "event": "transaction.completed",  // ou "transaction.failed"\n  "transaction": {\n    "id": "txn_abc123",\n    "status": "completed",           // "completed" | "failed"\n    "amount": 5000,\n    "fees": 350,\n    "net_amount": 4650,\n    "currency": "XOF",\n    "operator": "MTN",\n    "phone": "22901234567",\n    "reference": "REF...",\n    "payer_name": "Jean Dupont",\n    "payer_email": "jean@example.com",\n    "payer_country": "BJ",\n    "created_at": "2025-01-01T00:00:00.000Z"\n  },\n  "timestamp": "2025-01-01T00:01:00.000Z"\n}`}</CodeBox>
                </DocBlock>
                <DocBlock title="Vérification de la signature">
                  <p className="text-green-300/60 text-[11px] mb-2">Chaque webhook inclut l'en-tête <code className="bg-black/40 px-1 rounded">x-solvexpay-signature</code>.</p>
                  <CodeBox>{`// Node.js — Vérification de signature\nconst crypto = require('crypto');\n\nfunction verifyWebhook(payload, signature, secret) {\n  const expected = 'sha256=' + crypto\n    .createHmac('sha256', secret)\n    .update(JSON.stringify(payload))\n    .digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(expected),\n    Buffer.from(signature)\n  );\n}\n\napp.post('/webhook/solvexpay', (req, res) => {\n  const sig = req.headers['x-solvexpay-signature'];\n  if (!verifyWebhook(req.body, sig, WEBHOOK_SECRET)) {\n    return res.status(401).send('Invalid signature');\n  }\n  // Traitement du webhook...\n  res.send('OK');\n});`}</CodeBox>
                </DocBlock>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300/80 text-[11px]">Les webhooks sont retransmis automatiquement en cas d'échec : 0s, 8s, 30s. Répondez toujours avec un code <strong className="text-blue-300">2xx</strong>.</p>
              </div>
            </section>

            <div className="border-t border-green-500/10" />

            {/* 5. Vérification du statut */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">🔍 Vérification du statut</h2>
              <p className="text-green-300/70 text-[11px]">Interrogez le statut d'une transaction à tout moment :</p>
              <div className="bg-black/50 rounded-xl p-3 border border-green-500/10 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold flex-shrink-0">GET</span>
                <code className="text-green-400/80 text-[11px] flex-1 break-all">https://solvexpay.com/api/v1/transactions/:id</code>
                <InlineCopy value="https://solvexpay.com/api/v1/transactions/:id" label="URL" />
              </div>
              <DocBlock title="Exemple cURL">
                <CodeBox>{`curl https://solvexpay.com/api/v1/transactions/txn_abc123 \\\n  -H "Authorization: Bearer sk_live_votre_cle_sr"`}</CodeBox>
              </DocBlock>
              <div className="space-y-2">
                {[
                  { s: "pending", icon: <AlertCircle className="h-3 w-3 text-amber-400" />, desc: "En attente de validation par le client (USSD en cours)" },
                  { s: "completed", icon: <CheckCircle2 className="h-3 w-3 text-green-400" />, desc: "Paiement validé — votre solde SolvexPay est crédité" },
                  { s: "failed", icon: <XCircle className="h-3 w-3 text-red-400" />, desc: "Paiement refusé ou expiré — aucun débit effectué" },
                ].map(({ s, icon, desc }) => (
                  <div key={s} className="flex items-start gap-2 p-2.5 bg-black/30 rounded-xl border border-green-500/10">
                    {icon}
                    <div>
                      <code className="text-green-300 text-[10px]">{s}</code>
                      <p className="text-green-300/50 text-[10px] mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-green-500/10" />

            {/* 6. Codes d'erreur */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">⚠️ Codes d'erreur</h2>
              <p className="text-green-300/70 text-[11px] mb-1">Format de toutes les erreurs :</p>
              <CodeBox>{`{ "error": { "code": "CODE", "message": "...", "status": 400 } }`}</CodeBox>
              <div className="space-y-2 mt-2">
                {[
                  { code: "UNAUTHORIZED", http: "401", desc: "Clé SR manquante, invalide ou désactivée" },
                  { code: "FORBIDDEN", http: "403", desc: "Compte suspendu ou API SR non activée" },
                  { code: "VALIDATION_ERROR", http: "400", desc: "Paramètre manquant ou invalide" },
                  { code: "MISSING_REDIRECT_URL", http: "400", desc: "URL de redirection manquante sur la clé SR — obligatoire pour Wave" },
                  { code: "COUNTRY_SUSPENDED", http: "503", desc: "Paiements suspendus pour ce pays" },
                  { code: "OPERATOR_MAINTENANCE", http: "503", desc: "Opérateur en maintenance" },
                  { code: "SERVICE_UNAVAILABLE", http: "503", desc: "Service de paiement temporairement indisponible" },
                  { code: "SERVER_ERROR", http: "500", desc: "Erreur interne — réessayez dans quelques secondes" },
                ].map(({ code, http, desc }) => (
                  <div key={code} className="flex items-start gap-3 p-2.5 bg-black/30 rounded-xl border border-green-500/10">
                    <code className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${http.startsWith("4") ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>{http}</code>
                    <div className="flex-1">
                      <code className="text-green-300 text-[10px] font-bold">{code}</code>
                      <p className="text-green-300/50 text-[10px] mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-green-500/10" />

            {/* 7. Exemples de code */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">💻 Exemples de code complets</h2>
              <DocBlock title="Node.js / Express — Paiement MTN Bénin">
                <CodeBox>{`const axios = require('axios');\n\nasync function initierPaiementSR(montant, telephone, client) {\n  const response = await axios.post(\n    'https://solvexpay.com/api/v1/sr/pay',\n    {\n      amount: montant,        // ex: 5000\n      phone: telephone,       // ex: "22901234567"\n      operator: 'mtn',        // code opérateur\n      country: 'BJ',          // code pays\n      customer_name: client,  // optionnel\n      description: 'Achat produit XYZ'\n    },\n    {\n      headers: {\n        'Authorization': 'Bearer sk_live_votre_cle_sr',\n        'Content-Type': 'application/json'\n      }\n    }\n  );\n\n  const { id, reference, status, message } = response.data;\n  console.log('Transaction créée:', { id, reference, status });\n  return response.data;\n}\n\n// Webhook de confirmation\napp.post('/webhook/solvexpay', express.json(), (req, res) => {\n  const { event, transaction } = req.body;\n  \n  if (event === 'transaction.completed') {\n    console.log('Paiement reçu:', transaction.amount, transaction.currency);\n    // traiter la commande\n  } else if (event === 'transaction.failed') {\n    console.log('Paiement échoué:', transaction.reference);\n  }\n  \n  res.send('OK'); // Toujours répondre 200\n});`}</CodeBox>
              </DocBlock>
              <DocBlock title="PHP — Paiement Orange CI avec OTP">
                <CodeBox>{`<?php\n$otp = $_POST['otp']; // OTP fourni par le client\n\n$ch = curl_init('https://solvexpay.com/api/v1/sr/pay');\ncurl_setopt_array($ch, [\n  CURLOPT_POST => true,\n  CURLOPT_RETURNTRANSFER => true,\n  CURLOPT_HTTPHEADER => [\n    'Authorization: Bearer sk_live_votre_cle_sr',\n    'Content-Type: application/json',\n  ],\n  CURLOPT_POSTFIELDS => json_encode([\n    'amount'        => 10000,\n    'phone'         => '2250701234567',\n    'operator'      => 'orange',\n    'country'       => 'CI',\n    'otp'           => $otp,\n    'customer_name' => 'Jean Dupont',\n    'description'   => 'Commande #12345',\n  ]),\n]);\n\n$response = json_decode(curl_exec($ch), true);\ncurl_close($ch);\n\nif ($response['success']) {\n  echo "Paiement initié: " . $response['message'];\n}\n?>`}</CodeBox>
              </DocBlock>
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
            </section>

            <div className="border-t border-green-500/10" />

            {/* 8. Frais */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-green-300 flex items-center gap-2">💰 Frais et commission</h2>
              <p className="text-green-300/70 text-[11px]">Les frais API SR sont configurables par l'administrateur :</p>
              <div className="space-y-2">
                {[
                  { title: "Frais globaux", desc: "Taux de base défini par l'administrateur (paramètre fee_api)" },
                  { title: "Frais par opérateur", desc: "Taux spécifique par opérateur, prioritaire sur le taux global" },
                  { title: "Frais par pays", desc: "Taux pour un opérateur dans un pays donné (priorité maximale)" },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex items-start gap-2 p-2.5 bg-black/30 rounded-xl border border-green-500/10">
                    <div className="flex-1">
                      <p className="font-bold text-green-300 text-[11px]">{title}</p>
                      <p className="text-green-300/50 text-[10px] mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300/80 text-[11px]">
                  Formule : <code className="bg-black/40 px-1 rounded">net_amount = amount - fees = amount × (1 - taux)</code>.
                  Le <code className="bg-black/40 px-1 rounded">net_amount</code> est crédité sur votre solde SolvexPay.
                </p>
              </div>
            </section>

            {/* Bottom copy all */}
            <div className="pt-2 flex justify-center">
              <Button
                onClick={handleCopyAll}
                className="bg-green-700/50 hover:bg-green-600/60 text-green-200 border border-green-500/30 gap-2 font-bold text-xs"
                data-testid="button-copy-all-doc-bottom"
              >
                {copiedAll ? <><Check className="h-3.5 w-3.5" /> Documentation copiée !</> : <><ClipboardList className="h-3.5 w-3.5" /> Copier toute la documentation</>}
              </Button>
            </div>

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
    </DashboardLayout>
  );
}

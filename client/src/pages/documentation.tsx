import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Key, Zap, Webhook, Globe, Lock, BookOpen, Copy, Check,
  ArrowRight, ShieldCheck, AlertCircle, CheckCircle2, XCircle,
  Code2, Terminal, FileText, CreditCard, ArrowDownToLine,
} from "lucide-react";

const BASE_URL = "https://api.solvexpay.com";

const SECTIONS = [
  { id: "intro", label: "Introduction", icon: BookOpen },
  { id: "auth", label: "Authentification", icon: Key },
  { id: "deposit", label: "Initier un dépôt", icon: ArrowDownToLine },
  { id: "status", label: "Vérifier le statut", icon: CheckCircle2 },
  { id: "balance", label: "Consulter le solde", icon: CreditCard },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "errors", label: "Codes d'erreur", icon: AlertCircle },
];

const OPERATORS = [
  { code: "MTN", countries: ["BJ", "CI", "CM", "COG"], label: "MTN Mobile Money" },
  { code: "ORANGE", countries: ["CI", "BF", "CM", "ML", "SN"], label: "Orange Money" },
  { code: "WAVE", countries: ["CI", "SN"], label: "Wave" },
  { code: "MOOV", countries: ["BJ", "CI", "BF", "TG", "ML"], label: "Moov Money" },
  { code: "TMONEY", countries: ["TG"], label: "T-Money" },
  { code: "AIRTEL", countries: ["COD", "COG"], label: "Airtel Money" },
  { code: "VODACOM", countries: ["COD"], label: "Vodacom M-Pesa" },
  { code: "FREE", countries: ["SN"], label: "Free Money" },
];

const ERRORS = [
  { code: 400, key: "INVALID_AMOUNT", desc: "Le montant est invalide ou inférieur au minimum requis" },
  { code: 400, key: "INVALID_PHONE", desc: "Numéro de téléphone invalide ou format incorrect" },
  { code: 400, key: "INVALID_OPERATOR", desc: "Opérateur non reconnu ou non disponible dans ce pays" },
  { code: 401, key: "UNAUTHORIZED", desc: "Clé API manquante, invalide ou désactivée" },
  { code: 403, key: "KYC_REQUIRED", desc: "Vérification KYC requise pour utiliser l'API" },
  { code: 404, key: "NOT_FOUND", desc: "Transaction introuvable avec cet identifiant" },
  { code: 422, key: "INSUFFICIENT_BALANCE", desc: "Solde insuffisant pour effectuer cette opération" },
  { code: 429, key: "RATE_LIMITED", desc: "Trop de requêtes, réessayez dans quelques secondes" },
  { code: 500, key: "SERVER_ERROR", desc: "Erreur interne du serveur, contactez le support" },
  { code: 503, key: "PROVIDER_UNAVAILABLE", desc: "L'opérateur Mobile Money est temporairement indisponible" },
];

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Code copié" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-xl overflow-hidden border border-border/50">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-white/10">
        <span className="text-xs text-slate-400 font-mono">{lang}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-slate-400 hover:text-white hover:bg-white/10 gap-1"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="text-xs">{copied ? "Copié" : "Copier"}</span>
        </Button>
      </div>
      <div className="bg-slate-950 p-4 overflow-x-auto">
        <pre className="text-xs font-mono text-slate-200 whitespace-pre">{code}</pre>
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-500 text-white",
    POST: "bg-emerald-500 text-white",
    PATCH: "bg-amber-500 text-white",
    DELETE: "bg-red-500 text-white",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono ${colors[method] || "bg-muted"}`}>
      {method}
    </span>
  );
}

function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="-mt-20 pt-20" />;
}

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("intro");

  return (
    <DashboardLayout title="Documentation API" breadcrumbs={[{ label: "Documentation API" }]}>
      <div className="max-w-5xl">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${activeSection === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                >
                  <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {s.label}
                </a>
              ))}
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-12">

            <SectionAnchor id="intro" />
            <section className="space-y-6">
              <div
                className="rounded-3xl p-7 text-white"
                style={{ background: "linear-gradient(135deg, hsl(220 83% 48%) 0%, hsl(260 70% 60%) 100%)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black">Documentation API</h1>
                    <p className="text-white/70 text-sm">SolvexPay — Paiements Mobile Money en Afrique</p>
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  L'API SolvexPay vous permet d'intégrer les paiements Mobile Money dans vos applications.
                  Acceptez des paiements depuis 9 pays africains via MTN, Orange, Wave, Moov et plus.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">REST JSON</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">HTTPS requis</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">9 pays</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">8 opérateurs</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Zap, title: "Rapide", desc: "Initiation de paiement en moins de 2 secondes", color: "bg-amber-500/10 text-amber-600" },
                  { icon: ShieldCheck, title: "Sécurisé", desc: "Signatures HMAC-SHA256 sur tous les webhooks", color: "bg-emerald-500/10 text-emerald-600" },
                  { icon: Globe, title: "Pan-africain", desc: "9 pays, 8 opérateurs Mobile Money", color: "bg-blue-500/10 text-blue-600" },
                ].map((item) => (
                  <Card key={item.title} className="border-border/60">
                    <CardContent className="p-4">
                      <div className={`h-9 w-9 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                        <item.icon className="h-4.5 w-4.5" />
                      </div>
                      <p className="font-bold text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Terminal className="h-4 w-4" /> URL de base
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/60 rounded-xl px-4 py-3 border border-border/60 font-mono text-sm font-semibold text-primary">
                    {BASE_URL}
                  </div>
                </CardContent>
              </Card>
            </section>

            <SectionAnchor id="auth" />
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" /> Authentification
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Toutes les requêtes API doivent inclure votre clé API dans le header <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Authorization</code>.
                </p>
              </div>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-700">Gardez votre clé secrète</p>
                    <p className="text-xs text-amber-600 mt-0.5">Ne l'exposez jamais côté client (navigateur). Faites vos appels API uniquement depuis votre serveur backend.</p>
                  </div>
                </CardContent>
              </Card>

              <CodeBlock lang="bash — Authentification" code={`# Incluez votre clé API dans chaque requête
curl -X POST ${BASE_URL}/v1/deposit \\
  -H "Authorization: Bearer sk_live_VOTRE_CLE_API" \\
  -H "Content-Type: application/json"`} />

              <CodeBlock lang="javascript — Node.js" code={`const axios = require('axios');

const client = axios.create({
  baseURL: '${BASE_URL}',
  headers: {
    'Authorization': \`Bearer \${process.env.SOLVEXPAY_API_KEY}\`,
    'Content-Type': 'application/json',
  },
});`} />
            </section>

            <SectionAnchor id="deposit" />
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-primary" /> Initier un dépôt (paiement entrant)
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Demandez à un client de payer via son téléphone Mobile Money. Il reçoit une notification push ou USSD sur son téléphone.
                </p>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                  <MethodBadge method="POST" />
                  <code className="text-sm font-mono font-semibold">/v1/deposit</code>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Paramètres du body (JSON)</p>
                    <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden">
                      {[
                        { param: "amount", type: "number", req: true, desc: "Montant en XOF (minimum 100)" },
                        { param: "phone", type: "string", req: true, desc: "Numéro de téléphone du payeur au format international (+22697000000)" },
                        { param: "operator", type: "string", req: true, desc: "Code opérateur : MTN, ORANGE, WAVE, MOOV, TMONEY, AIRTEL, VODACOM, FREE" },
                        { param: "country", type: "string", req: true, desc: "Code pays ISO 3166-1 alpha-2 : BJ, CI, SN, CM, TG, BF, ML, COD, COG" },
                        { param: "description", type: "string", req: false, desc: "Description affichée au client (optionnel)" },
                        { param: "customer_name", type: "string", req: false, desc: "Nom du client (optionnel, affiché sur la page de paiement)" },
                        { param: "customer_email", type: "string", req: false, desc: "Email du client pour reçu automatique (optionnel)" },
                        { param: "metadata", type: "object", req: false, desc: "Données personnalisées retournées dans le webhook (optionnel)" },
                      ].map((p) => (
                        <div key={p.param} className="flex items-start gap-3 px-4 py-2.5 text-xs">
                          <code className="font-mono font-bold text-primary w-28 flex-shrink-0">{p.param}</code>
                          <code className="font-mono text-muted-foreground w-14 flex-shrink-0">{p.type}</code>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${p.req ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}`}>{p.req ? "requis" : "optionnel"}</span>
                          <span className="text-muted-foreground">{p.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <CodeBlock lang="bash — Exemple de requête" code={`curl -X POST ${BASE_URL}/v1/deposit \\
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "phone": "+22697000000",
    "operator": "MTN",
    "country": "CI",
    "description": "Paiement commande #1234",
    "customer_name": "Jean Dupont",
    "customer_email": "jean@example.com",
    "metadata": { "order_id": "1234", "product": "Premium" }
  }'`} />

              <CodeBlock lang="json — Réponse succès (201)" code={`{
  "id": "txn_9f3a2b1c4d5e6f7a",
  "status": "pending",
  "amount": 5000,
  "currency": "XOF",
  "operator": "MTN",
  "phone": "+22697000000",
  "country": "CI",
  "reference": "REF-ABCD1234EF56",
  "description": "Paiement commande #1234",
  "fees": 250,
  "net_amount": 4750,
  "payment_url": "https://pay.solvexpay.com/txn_9f3a2b1c4d5e6f7a",
  "created_at": "2026-03-04T12:00:00.000Z",
  "metadata": { "order_id": "1234", "product": "Premium" }
}`} />

              <CodeBlock lang="javascript — Node.js" code={`const response = await client.post('/v1/deposit', {
  amount: 5000,
  phone: '+22697000000',
  operator: 'MTN',
  country: 'CI',
  description: 'Paiement commande #1234',
  customer_name: 'Jean Dupont',
  metadata: { order_id: '1234' },
});

const { id, status, payment_url } = response.data;
console.log('Transaction créée:', id, '— Statut:', status);
// Redirigez l'utilisateur vers payment_url si nécessaire (Wave)`} />

              <CodeBlock lang="python" code={`import requests

response = requests.post(
    f'{BASE_URL}/v1/deposit',
    headers={
        'Authorization': f'Bearer {SOLVEXPAY_API_KEY}',
        'Content-Type': 'application/json',
    },
    json={
        'amount': 5000,
        'phone': '+22697000000',
        'operator': 'MTN',
        'country': 'CI',
        'description': 'Paiement commande #1234',
        'metadata': {'order_id': '1234'},
    }
)

data = response.json()
print('Transaction:', data['id'], '— Statut:', data['status'])`} />

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <p className="text-sm font-bold text-blue-700 mb-2">Opérateurs supportés par pays</p>
                  <div className="grid grid-cols-2 gap-2">
                    {OPERATORS.map((op) => (
                      <div key={op.code} className="flex items-center gap-2 text-xs">
                        <code className="font-mono font-bold text-blue-600 w-20 flex-shrink-0">{op.code}</code>
                        <span className="text-muted-foreground">{op.countries.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <SectionAnchor id="status" />
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Vérifier le statut d'une transaction
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Interrogez le statut d'une transaction à tout moment via son identifiant.
                </p>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                  <MethodBadge method="GET" />
                  <code className="text-sm font-mono font-semibold">/v1/transactions/:id</code>
                </div>
              </div>

              <CodeBlock lang="bash" code={`curl ${BASE_URL}/v1/transactions/txn_9f3a2b1c4d5e6f7a \\
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"`} />

              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { status: "pending", color: "amber", desc: "En attente de confirmation du client sur son téléphone" },
                  { status: "completed", color: "emerald", desc: "Paiement confirmé et fonds crédités sur votre compte" },
                  { status: "failed", color: "red", desc: "Paiement échoué (refus, timeout, solde insuffisant...)" },
                ].map((s) => (
                  <div key={s.status} className={`p-3 rounded-xl border border-${s.color}-500/20 bg-${s.color}-500/5`}>
                    <code className={`text-xs font-mono font-bold text-${s.color}-600`}>{s.status}</code>
                    <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>

              <CodeBlock lang="json — Réponse" code={`{
  "id": "txn_9f3a2b1c4d5e6f7a",
  "status": "completed",
  "amount": 5000,
  "currency": "XOF",
  "operator": "MTN",
  "phone": "+22697000000",
  "country": "CI",
  "reference": "REF-ABCD1234EF56",
  "fees": 250,
  "net_amount": 4750,
  "completed_at": "2026-03-04T12:01:35.000Z",
  "created_at": "2026-03-04T12:00:00.000Z",
  "metadata": { "order_id": "1234", "product": "Premium" }
}`} />
            </section>

            <SectionAnchor id="balance" />
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Consulter le solde
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Récupérez le solde disponible sur votre compte SolvexPay.
                </p>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                  <MethodBadge method="GET" />
                  <code className="text-sm font-mono font-semibold">/v1/balance</code>
                </div>
              </div>

              <CodeBlock lang="bash" code={`curl ${BASE_URL}/v1/balance \\
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"`} />

              <CodeBlock lang="json — Réponse" code={`{
  "balance": 45000,
  "currency": "XOF",
  "available": 45000,
  "pending": 5000,
  "updated_at": "2026-03-04T12:00:00.000Z"
}`} />
            </section>

            <SectionAnchor id="webhooks" />
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" /> Webhooks
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Les webhooks vous notifient automatiquement de chaque changement de statut de transaction. C'est la méthode recommandée pour détecter les paiements confirmés.
                </p>
              </div>

              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">Vérification obligatoire</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Vérifiez toujours la signature du webhook avant de traiter l'événement. Ignorez les requêtes avec une signature invalide.</p>
                  </div>
                </CardContent>
              </Card>

              <div>
                <p className="text-sm font-bold mb-3">Configuration</p>
                <ol className="space-y-2 text-sm">
                  {[
                    "Créez ou ouvrez une clé API dans la page Clés API",
                    "Cliquez sur « Configurer URLs & Webhook » sous la clé",
                    "Renseignez votre URL de webhook (ex: https://monapp.com/webhook/solvexpay)",
                    "Copiez votre Webhook Secret et stockez-le dans vos variables d'environnement",
                    "Vérifiez la signature à chaque requête reçue (voir exemple ci-dessous)",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <p className="text-sm font-bold mb-2">Événements envoyés</p>
                <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden">
                  {[
                    { event: "transaction.completed", desc: "Paiement confirmé et crédité sur votre compte" },
                    { event: "transaction.failed", desc: "Paiement échoué (refus client, timeout, solde insuffisant)" },
                    { event: "transaction.pending", desc: "Paiement initié, en attente de confirmation" },
                  ].map((e) => (
                    <div key={e.event} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                      <code className="font-mono font-bold text-primary">{e.event}</code>
                      <span className="text-muted-foreground">{e.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <CodeBlock lang="json — Payload webhook reçu" code={`{
  "event": "transaction.completed",
  "transaction": {
    "id": "txn_9f3a2b1c4d5e6f7a",
    "status": "completed",
    "amount": 5000,
    "currency": "XOF",
    "operator": "MTN",
    "phone": "+22697000000",
    "country": "CI",
    "reference": "REF-ABCD1234EF56",
    "fees": 250,
    "net_amount": 4750,
    "completed_at": "2026-03-04T12:01:35.000Z",
    "metadata": { "order_id": "1234" }
  },
  "signature": "sha256=abc123def456...",
  "timestamp": "2026-03-04T12:01:36.000Z"
}`} />

              <CodeBlock lang="javascript — Vérification de signature (Node.js)" code={`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return \`sha256=\${expected}\` === signature;
}

// Dans votre route Express :
app.post('/webhook/solvexpay', (req, res) => {
  const signature = req.headers['x-solvexpay-signature'];
  const secret = process.env.SOLVEXPAY_WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).json({ error: 'Signature invalide' });
  }
  
  const { event, transaction } = req.body;
  
  if (event === 'transaction.completed') {
    // Livrez le service, activez le compte, confirmez la commande...
    console.log('Paiement confirmé:', transaction.id, transaction.amount, 'XOF');
  }
  
  res.json({ received: true });
});`} />

              <CodeBlock lang="python — Vérification de signature" code={`import hmac
import hashlib
import json

def verify_signature(payload: dict, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(),
        json.dumps(payload, separators=(',', ':')).encode(),
        hashlib.sha256
    ).hexdigest()
    return f"sha256={expected}" == signature

# Dans votre route Flask/Django :
@app.route('/webhook/solvexpay', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Solvexpay-Signature')
    secret = os.environ['SOLVEXPAY_WEBHOOK_SECRET']
    
    if not verify_signature(request.json, signature, secret):
        return jsonify({'error': 'Signature invalide'}), 401
    
    event = request.json['event']
    transaction = request.json['transaction']
    
    if event == 'transaction.completed':
        print(f"Paiement reçu: {transaction['amount']} XOF")
    
    return jsonify({'received': True})`} />
            </section>

            <SectionAnchor id="errors" />
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" /> Codes d'erreur
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  En cas d'erreur, l'API retourne un objet JSON avec un code HTTP et un message explicite.
                </p>
              </div>

              <CodeBlock lang="json — Format d'une erreur" code={`{
  "error": {
    "code": "INVALID_PHONE",
    "message": "Le numéro de téléphone est invalide ou le format est incorrect.",
    "status": 400
  }
}`} />

              <div className="divide-y divide-border/50 border border-border/60 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[60px_160px_1fr] gap-3 px-4 py-2.5 bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>HTTP</span>
                  <span>Code erreur</span>
                  <span>Description</span>
                </div>
                {ERRORS.map((e) => (
                  <div key={e.key} className="grid grid-cols-[60px_160px_1fr] gap-3 px-4 py-2.5 text-xs items-start">
                    <span className={`font-mono font-bold ${e.code >= 500 ? "text-red-600" : e.code >= 400 ? "text-amber-600" : "text-blue-600"}`}>{e.code}</span>
                    <code className="font-mono text-primary">{e.key}</code>
                    <span className="text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>

              <Card className="border-border/60">
                <CardContent className="p-5">
                  <p className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" /> Gestion des erreurs recommandée
                  </p>
                  <CodeBlock lang="javascript" code={`try {
  const response = await client.post('/v1/deposit', payload);
  const transaction = response.data;
  // Traiter le succès...
} catch (error) {
  if (error.response) {
    const { code, message } = error.response.data.error;
    
    switch (code) {
      case 'UNAUTHORIZED':
        console.error('Clé API invalide ou désactivée');
        break;
      case 'INSUFFICIENT_BALANCE':
        console.error('Solde insuffisant');
        break;
      case 'INVALID_PHONE':
        console.error('Numéro invalide:', message);
        break;
      default:
        console.error('Erreur API:', code, message);
    }
  }
}`} />
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Besoin d'aide ?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Notre équipe support est disponible 24/7 pour vous aider à intégrer SolvexPay.
                    </p>
                    <div className="flex gap-3 mt-3">
                      <a href="mailto:support@solvexpay.com" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        <ArrowRight className="h-3 w-3" /> support@solvexpay.com
                      </a>
                      <a href="https://wa.me/22891840498" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline">
                        <ArrowRight className="h-3 w-3" /> WhatsApp 24/7
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

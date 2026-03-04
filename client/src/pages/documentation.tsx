import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Key, Zap, Webhook, Globe, Lock, BookOpen, Copy, Check,
  ArrowRight, ShieldCheck, AlertCircle, CheckCircle2,
  Code2, Terminal, FileText, CreditCard, ArrowDownToLine,
} from "lucide-react";
import { Link } from "wouter";
import solvexpayIcon from "@/assets/images/solvexpay-icon.jpg";

const BASE_URL = "https://solvexpay.com";

const SECTIONS = [
  { id: "intro", label: "Introduction", icon: BookOpen },
  { id: "auth", label: "Authentification", icon: Key },
  { id: "deposit", label: "Initier un dépôt", icon: ArrowDownToLine },
  { id: "status", label: "Vérifier le statut", icon: CheckCircle2 },
  { id: "balance", label: "Solde", icon: CreditCard },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "errors", label: "Codes d'erreur", icon: AlertCircle },
];

const OPERATORS = [
  { code: "MTN", countries: "BJ, CI, CM, COG" },
  { code: "ORANGE", countries: "CI, BF, CM, ML, SN" },
  { code: "WAVE", countries: "CI, SN" },
  { code: "MOOV", countries: "BJ, CI, BF, TG, ML" },
  { code: "TMONEY", countries: "TG" },
  { code: "AIRTEL", countries: "COD, COG" },
  { code: "VODACOM", countries: "COD" },
  { code: "FREE", countries: "SN" },
];

const ERRORS = [
  { code: 400, key: "INVALID_AMOUNT", desc: "Montant invalide ou inférieur au minimum (100 XOF)" },
  { code: 400, key: "INVALID_PHONE", desc: "Numéro de téléphone invalide ou format incorrect" },
  { code: 400, key: "INVALID_OPERATOR", desc: "Opérateur non reconnu ou non disponible" },
  { code: 400, key: "INVALID_COUNTRY", desc: "Code pays invalide ou non supporté" },
  { code: 401, key: "UNAUTHORIZED", desc: "Clé API manquante, invalide ou désactivée" },
  { code: 403, key: "KYC_REQUIRED", desc: "Vérification KYC requise pour utiliser l'API" },
  { code: 404, key: "NOT_FOUND", desc: "Transaction introuvable avec cet identifiant" },
  { code: 503, key: "PROVIDER_UNAVAILABLE", desc: "Opérateur Mobile Money temporairement indisponible" },
  { code: 500, key: "SERVER_ERROR", desc: "Erreur interne, contactez le support" },
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
    <div className="relative rounded-xl overflow-hidden border border-border/50">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-white/10">
        <span className="text-xs text-slate-400 font-mono">{lang}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-400 hover:text-white hover:bg-white/10 gap-1" onClick={handleCopy}>
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
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono ${colors[method] || "bg-muted"}`}>
      {method}
    </span>
  );
}

function ParamRow({ name, type, required, desc }: { name: string; type: string; required: boolean; desc: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 text-xs border-b border-border/40 last:border-0">
      <code className="font-mono font-bold text-primary w-32 flex-shrink-0">{name}</code>
      <code className="font-mono text-muted-foreground w-14 flex-shrink-0">{type}</code>
      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${required ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"}`}>
        {required ? "requis" : "optionnel"}
      </span>
      <span className="text-muted-foreground">{desc}</span>
    </div>
  );
}

function DocContent({ activeSection, setActiveSection }: { activeSection: string; setActiveSection: (s: string) => void }) {
  return (
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
              <div className="pt-4 border-t border-border/50 mt-4">
                <Link href="/api-keys">
                  <Button size="sm" className="w-full gap-1.5 text-xs font-bold">
                    <Key className="h-3.5 w-3.5" /> Mes clés API
                  </Button>
                </Link>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-12">

            {/* INTRO */}
            <section id="intro" className="space-y-5 scroll-mt-20">
              <div
                className="rounded-3xl p-7 text-white"
                style={{ background: "linear-gradient(135deg, hsl(220 83% 48%) 0%, hsl(260 70% 60%) 100%)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black">Documentation API SolvexPay</h1>
                    <p className="text-white/70 text-sm">Paiements Mobile Money — Afrique francophone</p>
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  Intégrez les paiements Mobile Money dans votre application en quelques lignes de code. SolvexPay agrège 8 opérateurs dans 9 pays africains via notre partenaire OmniPay.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">REST · JSON</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">HTTPS requis</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">9 pays · 8 opérateurs</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: Zap, title: "Démarrage rapide", desc: "Créez une clé API et faites votre premier appel en 5 minutes", color: "bg-amber-500/10 text-amber-600" },
                  { icon: ShieldCheck, title: "Sécurisé", desc: "Signatures HMAC-SHA256 sur tous les webhooks reçus", color: "bg-emerald-500/10 text-emerald-600" },
                  { icon: Globe, title: "Multi-pays", desc: "MTN, Orange, Wave, Moov et plus selon le pays", color: "bg-blue-500/10 text-blue-600" },
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Terminal className="h-4 w-4" /> URL de base de l'API
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/60 rounded-xl px-4 py-3 border border-border/60 font-mono text-sm font-semibold text-primary">
                    {BASE_URL}/api/v1
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Toutes les requêtes doivent utiliser HTTPS. Les requêtes HTTP sont rejetées.</p>
                </CardContent>
              </Card>
            </section>

            {/* AUTHENTIFICATION */}
            <section id="auth" className="space-y-5 scroll-mt-20">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" /> Authentification
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Chaque requête doit inclure votre clé API dans le header <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Authorization</code> sous la forme <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">Bearer sk_live_xxx</code>.
                </p>
              </div>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <Lock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-700">Clé confidentielle — côté serveur uniquement</p>
                    <p className="text-xs text-amber-600 mt-0.5">N'exposez jamais votre clé API dans du code JavaScript frontend, une app mobile ou un dépôt public. Utilisez des variables d'environnement.</p>
                  </div>
                </CardContent>
              </Card>

              <CodeBlock lang="bash" code={`curl -X POST ${BASE_URL}/api/v1/deposit \\
  -H "Authorization: Bearer sk_live_VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{ ... }'`} />

              <CodeBlock lang="javascript (Node.js)" code={`// Stockez votre clé dans une variable d'environnement
// SOLVEXPAY_API_KEY=sk_live_xxxx dans votre .env

const response = await fetch('${BASE_URL}/api/v1/deposit', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.SOLVEXPAY_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ ... }),
});`} />
            </section>

            {/* DÉPÔT */}
            <section id="deposit" className="space-y-5 scroll-mt-20">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-primary" /> Initier un dépôt
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Demande au client de payer via son téléphone Mobile Money. Il reçoit une notification push (MTN, Orange...) ou est redirigé vers une page Wave.
                </p>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                  <MethodBadge method="POST" />
                  <code className="text-sm font-mono font-semibold">/api/v1/deposit</code>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Paramètres (body JSON)</p>
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <ParamRow name="amount" type="number" required desc="Montant en XOF — minimum 100" />
                    <ParamRow name="phone" type="string" required desc="Numéro du payeur au format international : +22697000000" />
                    <ParamRow name="operator" type="string" required desc="Code opérateur : MTN, ORANGE, WAVE, MOOV, TMONEY, AIRTEL, VODACOM, FREE" />
                    <ParamRow name="country" type="string" required desc="Code pays ISO : BJ, CI, SN, CM, TG, BF, ML, COD, COG" />
                    <ParamRow name="description" type="string" required={false} desc="Description de la transaction (visible dans votre tableau de bord)" />
                    <ParamRow name="customer_name" type="string" required={false} desc="Nom du client (affiché lors du paiement)" />
                    <ParamRow name="customer_email" type="string" required={false} desc="Email du client pour les reçus" />
                    <ParamRow name="metadata" type="object" required={false} desc="Données personnalisées retournées dans le webhook (order_id, user_id...)" />
                  </div>
                </div>
              </div>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">Opérateurs supportés par pays</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {OPERATORS.map((op) => (
                      <div key={op.code} className="flex items-center gap-1.5 text-xs">
                        <code className="font-mono font-bold text-blue-600 w-16 flex-shrink-0">{op.code}</code>
                        <span className="text-muted-foreground">{op.countries}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <CodeBlock lang="bash — Exemple" code={`curl -X POST ${BASE_URL}/api/v1/deposit \\
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "phone": "+22697000000",
    "operator": "MTN",
    "country": "CI",
    "description": "Commande #1234",
    "customer_name": "Jean Dupont",
    "customer_email": "jean@example.com",
    "metadata": { "order_id": "1234" }
  }'`} />

              <CodeBlock lang="json — Réponse (201 Created)" code={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "amount": 5000,
  "currency": "XOF",
  "operator": "MTN",
  "phone": "+22697000000",
  "country": "CI",
  "reference": "REF-ABCD1234EF56",
  "description": "Commande #1234",
  "fees": 350,
  "net_amount": 4650,
  "payment_url": null,
  "omnipay_id": 12345,
  "created_at": "2026-03-04T12:00:00.000Z",
  "metadata": { "order_id": "1234" }
}`} />

              <Card className="border-violet-500/20 bg-violet-500/5">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-violet-700 mb-1">Note — Opérateur WAVE</p>
                  <p className="text-xs text-violet-600">Pour Wave, le champ <code className="bg-violet-100 px-1 rounded font-mono">payment_url</code> contient une URL vers laquelle rediriger le client. Il doit valider le paiement sur cette page Wave avant confirmation.</p>
                </CardContent>
              </Card>

              <CodeBlock lang="javascript (Node.js)" code={`const response = await fetch('${BASE_URL}/api/v1/deposit', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.SOLVEXPAY_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 5000,
    phone: '+22697000000',
    operator: 'MTN',
    country: 'CI',
    description: 'Commande #1234',
    customer_name: 'Jean Dupont',
    metadata: { order_id: '1234' },
  }),
});

const data = await response.json();

if (!response.ok) {
  console.error('Erreur:', data.error.code, data.error.message);
} else {
  console.log('Transaction créée:', data.id);
  console.log('Statut:', data.status); // "pending"
  // Pour Wave uniquement : rediriger vers data.payment_url
  if (data.payment_url) {
    res.redirect(data.payment_url);
  }
}`} />

              <CodeBlock lang="python" code={`import requests, os

response = requests.post(
    '${BASE_URL}/api/v1/deposit',
    headers={
        'Authorization': f'Bearer {os.environ["SOLVEXPAY_API_KEY"]}',
        'Content-Type': 'application/json',
    },
    json={
        'amount': 5000,
        'phone': '+22697000000',
        'operator': 'MTN',
        'country': 'CI',
        'description': 'Commande #1234',
        'metadata': {'order_id': '1234'},
    }
)

data = response.json()
if not response.ok:
    print('Erreur:', data['error']['code'], data['error']['message'])
else:
    print('Transaction créée:', data['id'], '— Statut:', data['status'])`} />
            </section>

            {/* STATUT */}
            <section id="status" className="space-y-5 scroll-mt-20">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Vérifier le statut d'une transaction
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Interrogez le statut d'une transaction via son <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">id</code> retourné lors de sa création. Préférez les webhooks pour éviter le polling.
                </p>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                  <MethodBadge method="GET" />
                  <code className="text-sm font-mono font-semibold">/api/v1/transactions/:id</code>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { status: "pending", color: "amber", desc: "En attente — le client n'a pas encore validé sur son téléphone" },
                  { status: "completed", color: "emerald", desc: "Confirmé — fonds reçus et crédités sur votre solde SolvexPay" },
                  { status: "failed", color: "red", desc: "Échoué — refus, timeout ou solde Mobile Money insuffisant" },
                ].map((s) => (
                  <div key={s.status} className="p-3 rounded-xl border border-border/60 bg-muted/20">
                    <code className={`text-xs font-mono font-bold ${s.color === "amber" ? "text-amber-600" : s.color === "emerald" ? "text-emerald-600" : "text-red-600"}`}>{s.status}</code>
                    <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>

              <CodeBlock lang="bash" code={`curl ${BASE_URL}/api/v1/transactions/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \\
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"`} />

              <CodeBlock lang="json — Réponse" code={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "amount": 5000,
  "currency": "XOF",
  "operator": "MTN",
  "phone": "+22697000000",
  "country": "CI",
  "reference": "REF-ABCD1234EF56",
  "description": "Commande #1234",
  "fees": 350,
  "net_amount": 4650,
  "payer_name": "Jean Dupont",
  "payer_email": "jean@example.com",
  "created_at": "2026-03-04T12:00:00.000Z",
  "completed_at": "2026-03-04T12:01:35.000Z"
}`} />
            </section>

            {/* SOLDE */}
            <section id="balance" className="space-y-5 scroll-mt-20">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Consulter le solde
                </h2>
                <p className="text-muted-foreground text-sm mt-1">Récupérez le solde disponible sur votre compte SolvexPay (en XOF).</p>
              </div>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                  <MethodBadge method="GET" />
                  <code className="text-sm font-mono font-semibold">/api/v1/balance</code>
                </div>
              </div>

              <CodeBlock lang="bash" code={`curl ${BASE_URL}/api/v1/balance \\
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"`} />

              <CodeBlock lang="json — Réponse" code={`{
  "balance": 45000,
  "currency": "XOF",
  "available": 45000,
  "updated_at": "2026-03-04T12:00:00.000Z"
}`} />
            </section>

            {/* WEBHOOKS */}
            <section id="webhooks" className="space-y-5 scroll-mt-20">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" /> Webhooks
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  SolvexPay envoie une requête HTTP POST à votre URL webhook à chaque changement de statut. C'est la méthode recommandée — plus fiable que le polling.
                </p>
              </div>

              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">Vérifiez toujours la signature</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Chaque webhook est signé avec votre Webhook Secret (HMAC-SHA256). Ignorez toute requête avec une signature invalide ou absente.</p>
                  </div>
                </CardContent>
              </Card>

              <div>
                <p className="text-sm font-bold mb-3">Comment configurer :</p>
                <ol className="space-y-2">
                  {[
                    "Dans la page Clés API, cliquez « Configurer URLs & Webhook » sous votre clé",
                    "Renseignez votre URL de webhook (ex: https://monsite.com/api/webhook/solvexpay)",
                    "Copiez votre Webhook Secret et stockez-le dans vos variables d'environnement",
                    "Dans votre serveur, vérifiez la signature à chaque requête reçue (voir exemple)",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
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
                    { event: "transaction.completed", desc: "Paiement confirmé — fonds crédités sur votre solde" },
                    { event: "transaction.failed", desc: "Paiement échoué (refus, timeout, solde Mobile Money insuffisant)" },
                  ].map((e) => (
                    <div key={e.event} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                      <code className="font-mono font-bold text-primary">{e.event}</code>
                      <span className="text-muted-foreground">{e.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <CodeBlock lang="json — Payload reçu (POST vers votre URL webhook)" code={`{
  "event": "transaction.completed",
  "transaction": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "completed",
    "amount": 5000,
    "currency": "XOF",
    "operator": "MTN",
    "phone": "+22697000000",
    "reference": "REF-ABCD1234EF56",
    "fees": 350,
    "net_amount": 4650,
    "created_at": "2026-03-04T12:00:00.000Z"
  },
  "timestamp": "2026-03-04T12:01:36.000Z"
}
// Header: x-solvexpay-signature: sha256=abc123def456...`} />

              <CodeBlock lang="javascript — Vérification signature (Express)" code={`const crypto = require('crypto');

app.post('/api/webhook/solvexpay', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-solvexpay-signature'];
  const secret = process.env.SOLVEXPAY_WEBHOOK_SECRET;

  // Vérifier la signature HMAC-SHA256
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(req.body)  // body brut (Buffer), avant JSON.parse
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).json({ error: 'Signature invalide' });
  }

  const { event, transaction } = JSON.parse(req.body.toString());

  if (event === 'transaction.completed') {
    const { id, amount, reference, metadata } = transaction;
    
    // Exemple : activer un abonnement, livrer un produit, confirmer une commande
    console.log(\`Paiement reçu: \${amount} XOF — ref: \${reference}\`);
    await activerCommande(metadata?.order_id);
  }

  res.json({ received: true });
});`} />

              <CodeBlock lang="python — Vérification signature (Flask)" code={`import hmac, hashlib, os
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/webhook/solvexpay', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Solvexpay-Signature', '')
    secret = os.environ['SOLVEXPAY_WEBHOOK_SECRET']
    
    # Vérifier avec le body brut (avant parsing)
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        request.get_data(),  # body brut
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        return jsonify({'error': 'Signature invalide'}), 401

    data = request.get_json()
    event = data['event']
    transaction = data['transaction']

    if event == 'transaction.completed':
        print(f"Paiement reçu: {transaction['amount']} XOF")
        # Activer le service, confirmer la commande...

    return jsonify({'received': True})`} />
            </section>

            {/* ERREURS */}
            <section id="errors" className="space-y-5 scroll-mt-20">
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
    "message": "Numéro de téléphone invalide ou format incorrect.",
    "status": 400
  }
}`} />

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[60px_170px_1fr] gap-3 px-4 py-2 bg-muted/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>HTTP</span><span>Code</span><span>Description</span>
                </div>
                {ERRORS.map((e) => (
                  <div key={e.key} className="grid grid-cols-[60px_170px_1fr] gap-3 px-4 py-2.5 text-xs border-t border-border/40 items-start">
                    <span className={`font-mono font-bold ${e.code >= 500 ? "text-red-600" : e.code >= 400 ? "text-amber-600" : "text-blue-600"}`}>{e.code}</span>
                    <code className="font-mono text-primary">{e.key}</code>
                    <span className="text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>

              <CodeBlock lang="javascript — Gestion des erreurs" code={`const response = await fetch('${BASE_URL}/api/v1/deposit', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${API_KEY}\`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const data = await response.json();

if (!response.ok) {
  const { code, message } = data.error;
  switch (code) {
    case 'UNAUTHORIZED':     // Clé invalide ou désactivée
    case 'KYC_REQUIRED':     // KYC non vérifié
    case 'INVALID_AMOUNT':   // Montant < 100
    case 'INVALID_PHONE':    // Format téléphone incorrect
    case 'PROVIDER_UNAVAILABLE': // Opérateur indisponible
    default:
      console.error(\`Erreur \${code}: \${message}\`);
  }
}`} />

              <Card className="border-border/60 bg-muted/20">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Besoin d'aide pour l'intégration ?</p>
                    <p className="text-xs text-muted-foreground mt-1">Notre équipe est disponible 24/7 pour vous accompagner.</p>
                    <div className="flex gap-4 mt-3">
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
  );
}

export default function DocumentationPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("intro");

  if (user) {
    return (
      <DashboardLayout title="Documentation API" breadcrumbs={[{ label: "Documentation API" }]}>
        <DocContent activeSection={activeSection} setActiveSection={setActiveSection} />
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <img src={solvexpayIcon} alt="SolvexPay" className="h-7 w-7 rounded-lg" />
              <span className="font-black text-sm">
                <span className="text-blue-800">Solvex</span><span className="text-slate-400">Pay</span>
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-muted-foreground">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`hover:text-foreground transition-colors ${activeSection === s.id ? "text-primary font-semibold" : ""}`}
              >
                {s.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button size="sm" variant="outline" className="font-semibold">Se connecter</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-bold">Créer un compte</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DocContent activeSection={activeSection} setActiveSection={setActiveSection} />
      </main>
    </div>
  );
}

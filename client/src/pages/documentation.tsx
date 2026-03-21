import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  { id: "countries", label: "Pays supportés", icon: Globe },
  { id: "auth", label: "Authentification", icon: Key },
  { id: "deposit", label: "Initier un dépôt", icon: ArrowDownToLine },
  { id: "status", label: "Vérifier le statut", icon: CheckCircle2 },
  { id: "balance", label: "Solde", icon: CreditCard },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "errors", label: "Codes d'erreur", icon: AlertCircle },
];

const COUNTRIES_DATA: Array<{ code: string; name: string; flag: string; currency: string; operators: string[] }> = [
  { code: "BJ", name: "Bénin",             flag: "🇧🇯", currency: "XOF", operators: ["MTN", "Moov"] },
  { code: "CI", name: "Côte d'Ivoire",     flag: "🇨🇮", currency: "XOF", operators: ["MTN", "Moov", "Orange", "Wave"] },
  { code: "SN", name: "Sénégal",           flag: "🇸🇳", currency: "XOF", operators: ["Orange", "Wave", "Free"] },
  { code: "BF", name: "Burkina Faso",      flag: "🇧🇫", currency: "XOF", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo",              flag: "🇹🇬", currency: "XOF", operators: ["Moov", "TMoney"] },
  { code: "CM", name: "Cameroun",          flag: "🇨🇲", currency: "XAF", operators: ["MTN", "Orange"] },
  { code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬", currency: "XAF", operators: ["MTN", "Airtel"] },
];

const OPERATOR_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  MTN:    { bg: "bg-amber-100 dark:bg-amber-900/40",  text: "text-amber-800 dark:text-amber-200",  dot: "bg-amber-500" },
  Orange: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-200", dot: "bg-orange-500" },
  Moov:   { bg: "bg-blue-100 dark:bg-blue-900/40",    text: "text-blue-800 dark:text-blue-200",    dot: "bg-blue-500" },
  Wave:   { bg: "bg-teal-100 dark:bg-teal-900/40",    text: "text-teal-800 dark:text-teal-200",    dot: "bg-teal-500" },
  TMoney: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-800 dark:text-violet-200", dot: "bg-violet-500" },
  Airtel: { bg: "bg-red-100 dark:bg-red-900/40",      text: "text-red-800 dark:text-red-200",      dot: "bg-red-500" },
  Free:   { bg: "bg-rose-100 dark:bg-rose-900/40",    text: "text-rose-800 dark:text-rose-200",    dot: "bg-rose-500" },
};

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
  const { data: contactLinks } = useQuery<Record<string, string>>({ queryKey: ["/api/support-links"] });
  const { data: suspendedData } = useQuery<{ codes: string[] }>({
    queryKey: ["/api/public/suspended-countries"],
    queryFn: async () => { const r = await fetch("/api/public/suspended-countries"); return r.json(); },
    staleTime: 60_000,
  });
  const suspendedCodes = suspendedData?.codes || [];
  const filteredOperators = OPERATORS.map(op => ({
    ...op,
    countries: op.countries.split(", ").filter(cc => !suspendedCodes.includes(cc)).join(", "),
  })).filter(op => op.countries.length > 0);
  const supportEmail = contactLinks?.support_link_email?.replace("mailto:", "") || "support@solvexpay.com";
  const supportWhatsApp = contactLinks?.support_link_whatsapp_direct || "https://wa.me/22891840498";
  const supportEmailHref = contactLinks?.support_link_email || "mailto:support@solvexpay.com";
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
                  Intégrez les paiements Mobile Money dans votre application en quelques lignes de code. SolvexPay agrège 8 opérateurs dans 9 pays africains.
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

            {/* PAYS & OPÉRATEURS */}
            <section id="countries" className="space-y-5 scroll-mt-20">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" /> Pays et opérateurs supportés
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Les pays et opérateurs disponibles en temps réel. Les pays suspendus sont automatiquement exclus.
                </p>
              </div>

              {(() => {
                const activeCountries = COUNTRIES_DATA.filter(c => !suspendedCodes.includes(c.code));
                if (activeCountries.length === 0) {
                  return (
                    <Card className="border-border/60">
                      <CardContent className="p-6 text-center text-sm text-muted-foreground">
                        Aucun pays disponible pour le moment.
                      </CardContent>
                    </Card>
                  );
                }
                const xofCountries = activeCountries.filter(c => c.currency === "XOF");
                const xafCountries = activeCountries.filter(c => c.currency === "XAF");

                const CountryCard = ({ c }: { c: typeof COUNTRIES_DATA[0] }) => (
                  <div className="rounded-2xl border border-border/60 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/40">
                      <span className="text-2xl">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.code}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black border font-mono ${
                        c.currency === "XOF"
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                          : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                      }`}>{c.currency}</span>
                    </div>
                    <div className="px-4 py-3 flex flex-wrap gap-1.5">
                      {c.operators.map(op => {
                        const s = OPERATOR_STYLES[op] ?? { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-400" };
                        return (
                          <span key={op} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border border-transparent ${s.bg} ${s.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                            {op}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );

                return (
                  <div className="space-y-6">
                    {xofCountries.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-300 dark:border-emerald-700 font-mono">XOF</span>
                          <span className="text-xs text-muted-foreground">Zone franc CFA — Afrique de l'Ouest</span>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {xofCountries.map(c => <CountryCard key={c.code} c={c} />)}
                        </div>
                      </div>
                    )}
                    {xafCountries.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black border border-blue-300 dark:border-blue-700 font-mono">XAF</span>
                          <span className="text-xs text-muted-foreground">Zone franc CFA — Afrique Centrale</span>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {xafCountries.map(c => <CountryCard key={c.code} c={c} />)}
                        </div>
                      </div>
                    )}
                    <Card className="border-border/60 bg-muted/20">
                      <CardContent className="p-4">
                        <p className="text-xs font-bold mb-2">Valeurs à utiliser dans l'API</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Paramètre <code className="font-mono bg-muted px-1 rounded">country</code></p>
                            <div className="flex flex-wrap gap-1">
                              {activeCountries.map(c => (
                                <code key={c.code} className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono font-bold">{c.code}</code>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Paramètre <code className="font-mono bg-muted px-1 rounded">operator</code></p>
                            <div className="flex flex-wrap gap-1">
                              {["MTN","Orange","Moov","Wave","TMoney","Airtel","Free"].map(op => (
                                <code key={op} className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[10px] font-mono font-bold">{op}</code>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
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
                  <ArrowDownToLine className="h-5 w-5 text-primary" /> Initier un paiement
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Toutes les intégrations SolvexPay utilisent un <strong>flux de redirection obligatoire</strong> vers la page de paiement hébergée SolvexPay. C'est sur cette page que le client saisit son numéro de téléphone et choisit son opérateur — le prompt USSD lui est ensuite envoyé directement.
                </p>
              </div>

              {/* Flux visuel obligatoire */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Flux de paiement — Étapes obligatoires</p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {[
                      { num: "1", title: "Votre serveur", desc: "Appelle l'API SolvexPay avec le montant" },
                      { num: "2", title: "Redirection obligatoire", desc: "Redirigez le client vers payment_url" },
                      { num: "3", title: "Page SolvexPay", desc: "Le client saisit son téléphone et opérateur" },
                      { num: "4", title: "Prompt USSD", desc: "Le client confirme sur son téléphone" },
                      { num: "5", title: "Webhook", desc: "Votre serveur reçoit la confirmation" },
                    ].map((step, i, arr) => (
                      <div key={step.num} className="flex sm:flex-col items-center gap-2 sm:gap-1 flex-1">
                        <div className="flex sm:flex-col items-center gap-1 w-full">
                          <div className="h-8 w-8 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center flex-shrink-0">{step.num}</div>
                          <div className="text-center hidden sm:block">
                            <p className="text-xs font-bold mt-1">{step.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{step.desc}</p>
                          </div>
                          <div className="sm:hidden">
                            <p className="text-xs font-bold">{step.title}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{step.desc}</p>
                          </div>
                        </div>
                        {i < arr.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 rotate-90 sm:rotate-0 hidden sm:block" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Redirection OBLIGATOIRE vers payment_url</p>
                    <p className="text-xs text-red-600 mt-0.5">Après chaque appel API, vous devez impérativement rediriger votre client vers l'URL <code className="bg-red-100 px-1 rounded font-mono">payment_url</code> retournée. C'est sur la page SolvexPay que le client saisit son numéro Mobile Money et reçoit son prompt USSD. Aucun USSD n'est envoyé par votre serveur.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">Méthode simple — Redirection directe (sans JavaScript)</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Construisez une URL avec votre clé API et redirigez directement. Aucun appel API séparé nécessaire — idéal pour les intégrations rapides.</p>
                  </div>
                </CardContent>
              </Card>

              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                  <MethodBadge method="GET" />
                  <code className="text-sm font-mono font-semibold">/api/v1/checkout</code>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Paramètres (query string)</p>
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <ParamRow name="key" type="string" required desc="Votre clé API : sk_live_xxxx" />
                    <ParamRow name="amount" type="number" required desc="Montant en XOF — minimum 100" />
                    <ParamRow name="description" type="string" required={false} desc="Description de la transaction" />
                    <ParamRow name="customer_name" type="string" required={false} desc="Nom du client (pré-rempli sur la page)" />
                    <ParamRow name="customer_email" type="string" required={false} desc="Email du client" />
                    <ParamRow name="country" type="string" required={false} desc="Code pays ISO pour pré-sélectionner le pays (BJ, CI, SN...)" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">→ Réponse : redirection HTTP 302 vers la page de paiement SolvexPay. L'utilisateur voit directement le formulaire de paiement.</p>
                </div>
              </div>

              <CodeBlock lang="html — Intégration la plus simple (lien direct)" code={`<!-- Bouton de paiement — aucun JavaScript requis -->
<a href="https://solvexpay.com/api/v1/checkout?key=sk_live_xxxx&amount=5000&description=Commande+1234&customer_name=Jean+Dupont">
  Payer 5 000 XOF
</a>

<!-- Ou avec un formulaire -->
<form action="https://solvexpay.com/api/v1/checkout" method="GET">
  <input type="hidden" name="key" value="sk_live_xxxx" />
  <input type="hidden" name="amount" value="5000" />
  <input type="hidden" name="description" value="Commande #1234" />
  <button type="submit">Payer maintenant</button>
</form>`} />

              <CodeBlock lang="javascript (Node.js) — Génération côté serveur" code={`// Sur votre serveur : générez l'URL et redirigez
app.get('/payer', (req, res) => {
  const params = new URLSearchParams({
    key: process.env.SOLVEXPAY_API_KEY,
    amount: '5000',
    description: 'Commande #1234',
    customer_name: req.user.name,
    customer_email: req.user.email,
  });
  res.redirect(\`https://solvexpay.com/api/v1/checkout?\${params}\`);
});`} />

              <div className="border-t border-border/60 pt-5">
                <p className="text-sm font-bold mb-1">Méthode API JSON (POST) — Intégration serveur</p>
                <p className="text-xs text-muted-foreground mb-4">Créez le paiement depuis votre serveur, obtenez le <code className="bg-muted px-1 rounded font-mono">payment_url</code> et redirigez obligatoirement votre client vers cette URL. Les paramètres optionnels pré-remplissent le formulaire sur la page SolvexPay.</p>

                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                    <MethodBadge method="POST" />
                    <code className="text-sm font-mono font-semibold">/api/v1/deposit</code>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Paramètres (body JSON)</p>
                    <div className="border border-border/60 rounded-xl overflow-hidden">
                      <ParamRow name="amount" type="number" required desc="Montant — minimum 100 XOF" />
                      <ParamRow name="description" type="string" required={false} desc="Description de la transaction (affichée sur la page de paiement)" />
                      <ParamRow name="customer_name" type="string" required={false} desc="Nom du client — pré-rempli sur la page SolvexPay" />
                      <ParamRow name="customer_email" type="string" required={false} desc="Email du client" />
                      <ParamRow name="country" type="string" required={false} desc="Code pays ISO (BJ, CI, SN…) — pré-sélectionne le pays sur la page" />
                      <ParamRow name="phone" type="string" required={false} desc="Numéro de téléphone — pré-rempli sur la page (le client peut modifier)" />
                      <ParamRow name="operator" type="string" required={false} desc="Opérateur (MTN, Orange, Wave…) — pré-sélectionné sur la page" />
                      <ParamRow name="metadata" type="object" required={false} desc="Données libres retournées dans le webhook (order_id, user_id…)" />
                    </div>
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                      <p className="text-xs text-amber-700 font-semibold">⚠ Après cet appel, redirigez impérativement votre client vers <code className="bg-amber-100 px-1 rounded font-mono">data.payment_url</code>. Aucun USSD n'est envoyé par votre serveur — c'est la page SolvexPay qui gère la confirmation Mobile Money.</p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">Pays supportés</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {filteredOperators.map((op) => (
                      <div key={op.code} className="flex items-center gap-1.5 text-xs">
                        <code className="font-mono font-bold text-blue-600 w-16 flex-shrink-0">{op.code}</code>
                        <span className="text-muted-foreground">{op.countries}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <CodeBlock lang="javascript (Node.js) — POST /api/v1/deposit" code={`const response = await fetch('${BASE_URL}/api/v1/deposit', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.SOLVEXPAY_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 5000,
    description: 'Commande #1234',
    customer_name: 'Jean Dupont',
    customer_email: 'jean@example.com',
    country: 'CI',              // facultatif — pré-sélectionne le pays
    metadata: { order_id: '1234' },
  }),
});

const data = await response.json();

if (!response.ok) {
  console.error('Erreur:', data.error.code, data.error.message);
} else {
  // OBLIGATOIRE : rediriger l'utilisateur vers la page de paiement SolvexPay
  res.redirect(data.payment_url);
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
        'description': 'Commande #1234',
        'customer_name': 'Jean Dupont',
        'customer_email': 'jean@example.com',
        'country': 'CI',        # facultatif
        'metadata': {'order_id': '1234'},
    }
)

data = response.json()
if not response.ok:
    print('Erreur:', data['error']['code'], data['error']['message'])
else:
    # OBLIGATOIRE : rediriger l'utilisateur vers la page de paiement SolvexPay
    return redirect(data['payment_url'])  # Flask/Django`} />
            </section>

            {/* STATUT */}
            <section id="status" className="space-y-5 scroll-mt-20">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Vérifier le statut d'une transaction
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Deux endpoints complémentaires : un pour lire le statut (GET), un pour forcer la vérification et le crédit du wallet si le paiement a été complété chez l'opérateur (POST).
                </p>
              </div>

              {/* GET status */}
              <div className="border border-border/60 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                  <MethodBadge method="GET" />
                  <code className="text-sm font-mono font-semibold">/api/v1/transactions/:id</code>
                  <span className="text-xs text-muted-foreground ml-auto">Lecture seule</span>
                </div>
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">Retourne le statut actuel de la transaction tel qu'enregistré dans SolvexPay. N'appelle pas l'opérateur en temps réel.</p>
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

              {/* POST verify */}
              <div className="border-t border-border/60 pt-5 space-y-4">
                <div>
                  <p className="text-sm font-bold mb-1">Forcer la vérification d'un paiement en attente</p>
                  <p className="text-xs text-muted-foreground">
                    Si vous n'avez pas reçu de webhook après quelques minutes alors que le client a confirmé sur son téléphone, appelez cet endpoint. SolvexPay interroge l'opérateur en temps réel, crédite votre solde si le paiement est confirmé, et envoie le webhook immédiatement.
                  </p>
                </div>

                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Zap className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-700">Récupération automatique en arrière-plan</p>
                      <p className="text-xs text-emerald-600 mt-0.5">SolvexPay vérifie automatiquement toutes les 3 minutes les transactions <code className="bg-emerald-100 px-1 rounded font-mono">pending</code> de moins d'1h. Si le paiement est confirmé chez l'opérateur, le crédit et le webhook sont déclenchés automatiquement — sans action de votre part. Cet endpoint vous permet de forcer ce processus immédiatement.</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                    <MethodBadge method="POST" />
                    <code className="text-sm font-mono font-semibold">/api/v1/transactions/:id/verify</code>
                    <span className="text-xs text-emerald-600 font-semibold ml-auto">Appel opérateur en temps réel</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-muted-foreground">Aucun body requis. Authentification via header <code className="bg-muted px-1 rounded font-mono">Authorization: Bearer sk_live_xxx</code>.</p>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-muted-foreground uppercase tracking-wide">Comportement :</p>
                      <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                        <li>Si le paiement est déjà <code className="bg-muted px-1 rounded font-mono">completed</code> → retourne le statut actuel sans modifier</li>
                        <li>Si <code className="bg-muted px-1 rounded font-mono">pending</code> et confirmé chez l'opérateur → crédite votre solde + envoie le webhook + retourne <code className="bg-muted px-1 rounded font-mono">completed</code></li>
                        <li>Si <code className="bg-muted px-1 rounded font-mono">pending</code> et non confirmé → retourne <code className="bg-muted px-1 rounded font-mono">pending</code> sans modification</li>
                        <li>Si <code className="bg-muted px-1 rounded font-mono">failed</code> → retourne le statut actuel sans modifier</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <CodeBlock lang="bash — Forcer la vérification" code={`curl -X POST ${BASE_URL}/api/v1/transactions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/verify \\
  -H "Authorization: Bearer sk_live_xxxxxxxxxxxx"`} />

                <CodeBlock lang="javascript (Node.js) — Vérification après timeout" code={`// À utiliser si votre webhook n'arrive pas après 3-5 minutes
async function verifyPayment(transactionId) {
  const response = await fetch(
    \`${BASE_URL}/api/v1/transactions/\${transactionId}/verify\`,
    {
      method: 'POST',
      headers: { 'Authorization': \`Bearer \${process.env.SOLVEXPAY_API_KEY}\` },
    }
  );
  const data = await response.json();

  if (data.status === 'completed') {
    console.log('Paiement confirmé — solde crédité');
    // Le webhook a également été envoyé vers votre URL configurée
  } else if (data.status === 'pending') {
    console.log('Toujours en attente — le client n\\'a peut-être pas encore validé');
  }

  return data;
}`} />

                <CodeBlock lang="json — Réponse (paiement confirmé)" code={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "completed",
  "amount": 5000,
  "currency": "XOF",
  "operator": "MTN",
  "phone": "+22697000000",
  "fees": 350,
  "net_amount": 4650,
  "credited": true,
  "completed_at": "2026-03-04T12:01:35.000Z"
}`} />
              </div>
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

app.post('/api/webhook/solvexpay', express.raw({ type: 'application/json' }), async (req, res) => {
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
    const { amount, reference } = transaction;
    // Exemple : activer un abonnement, livrer un produit, confirmer une commande
    console.log(\`Paiement reçu: \${amount} XOF — ref: \${reference}\`);
    // await activerCommande(reference);
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

              <CodeBlock lang="javascript — Gestion des erreurs (POST /api/v1/deposit)" code={`const response = await fetch('${BASE_URL}/api/v1/deposit', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${API_KEY}\`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 5000, description: 'Commande #1234' }),
});

const data = await response.json();

if (!response.ok) {
  const { code, message } = data.error;
  switch (code) {
    case 'UNAUTHORIZED':     // Clé invalide ou désactivée
    case 'KYC_REQUIRED':     // KYC non vérifié
    case 'INVALID_AMOUNT':   // Montant < 100
    default:
      console.error(\`Erreur \${code}: \${message}\`);
  }
} else {
  // Toujours rediriger vers payment_url — jamais de paiement direct
  res.redirect(data.payment_url);
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
                      <a href={supportEmailHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                        <ArrowRight className="h-3 w-3" /> {supportEmail}
                      </a>
                      <a href={supportWhatsApp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline">
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  Zap, 
  Info, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Server
} from "lucide-react";
import { useState } from "react";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

const payRequestExample = `{
  "amount": 5000,
  "phone": "22997000000",
  "operator": "MTN",
  "country": "BJ",
  "description": "Achat Article #123",
  "customer_name": "Jean Dupont",
  "customer_email": "jean.dupont@email.com"
}`;

const payResponseExample = `{
  "id": "tx_8f2e1a9c",
  "status": "pending",
  "reference": "SP-20240320-ABCDEF",
  "amount": 5000,
  "fees": 350,
  "payment_url": "https://solvexpay.com/pay-api/..."
}`;

export default function PartnerDocs() {
  return (
    <div className="max-w-4xl space-y-8">
      <div
        className="relative rounded-3xl p-10 text-white overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, hsl(262 83% 46%) 0%, hsl(240 70% 55%) 100%)" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="relative space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> API Directe v1.0
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tight">Documentation API</h2>
          <p className="text-white/70 text-lg font-bold uppercase tracking-widest max-w-xl">
            Intégrez le Mobile Money en mode "direct" sans redirection forcée.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
          <Server className="h-5 w-5 text-primary" /> Introduction
        </h3>
        <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed tracking-widest">
          L'API Partenaire SolvexPay vous permet d'initier des transactions Mobile Money directement depuis vos serveurs. Contrairement aux liens de paiement classiques, vous contrôlez l'interface utilisateur de bout en bout.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
            <Terminal className="h-5 w-5 text-primary" /> Endpoint de Paiement
          </h3>
          <Badge className="bg-emerald-500/10 text-emerald-600 font-black uppercase px-3 py-1 border-emerald-500/20">POST</Badge>
        </div>
        
        <div className="bg-zinc-950 rounded-2xl p-5 font-mono text-sm text-zinc-300 border border-zinc-800 relative group overflow-hidden shadow-xl">
           <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
           <code className="break-all block font-black">https://solvexpay.com/api/partner/v1/pay</code>
           <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton value="https://solvexpay.com/api/partner/v1/pay" />
           </div>
        </div>

        <Card className="border-border/60 rounded-3xl shadow-sm bg-muted/20">
          <CardContent className="p-6 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authentification</p>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border/60 font-mono text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-muted-foreground">Authorization:</span>
              <span className="font-bold text-foreground">Bearer {"{VOTRE_CLE_API}"}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" /> Requête (JSON)
          </h3>
          <div className="bg-zinc-950 rounded-2xl p-5 font-mono text-[11px] text-zinc-300 border border-zinc-800 relative group shadow-xl">
            <pre className="whitespace-pre-wrap leading-relaxed">{payRequestExample}</pre>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton value={payRequestExample} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" /> Réponse (JSON)
          </h3>
          <div className="bg-zinc-950 rounded-2xl p-5 font-mono text-[11px] text-zinc-300 border border-zinc-800 relative group shadow-xl">
            <pre className="whitespace-pre-wrap leading-relaxed">{payResponseExample}</pre>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton value={payResponseExample} />
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
          <Info className="h-5 w-5 text-primary" /> Paramètres du Body
        </h3>
        <div className="border border-border/60 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border/60 font-black uppercase text-[10px] tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Champ</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-bold text-xs uppercase tracking-widest">
              {[
                { name: "amount", type: "number", desc: "Montant en devise locale (min 100)" },
                { name: "phone", type: "string", desc: "Numéro avec indicatif (ex: 229...)" },
                { name: "operator", type: "string", desc: "MTN, Orange, Moov, Wave, etc." },
                { name: "country", type: "string", desc: "Code ISO 3166-1 (BJ, CI, TG, ...)" },
                { name: "otp", type: "string", desc: "Requis pour Orange CI / Moov (Optionnel)" },
              ].map((row) => (
                <tr key={row.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-black text-primary">{row.name}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.type}</td>
                  <td className="px-5 py-4 lowercase tracking-normal">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Card className="border-border/60 rounded-3xl bg-primary/5 border-primary/20 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
           <Zap className="h-12 w-12 text-primary/10 -rotate-12" />
        </div>
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center gap-3">
             <AlertCircle className="h-6 w-6 text-primary" />
             <p className="font-black text-xl uppercase tracking-tight">Gestion des Webhooks</p>
          </div>
          <p className="text-sm font-bold text-muted-foreground uppercase leading-relaxed tracking-widest">
            Après chaque transaction, SolvexPay envoie une notification POST à l'URL configurée dans votre espace partenaire. Assurez-vous d'avoir une URL publique et sécurisée (HTTPS).
          </p>
          <Button variant="outline" className="font-black h-11 px-8 rounded-xl border-primary/20 text-primary hover:bg-primary/10">
            Explorer les Webhooks <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

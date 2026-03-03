import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ArrowRight,
  Link2,
  BarChart3,
  Code2,
  HeadphonesIcon,
  ShieldCheck,
  Smartphone,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from "lucide-react";
import solvexpayLogo from "../assets/images/solvexpay-logo.png";

const operators = ["MTN", "Moov", "Orange", "TMoney", "Wave", "Airtel"];

const countries = [
  { code: "BJ", name: "🇧🇯 Bénin", currency: "XOF" },
  { code: "BF", name: "🇧🇫 Burkina Faso", currency: "XOF" },
  { code: "CM", name: "🇨🇲 Cameroun", currency: "XAF" },
  { code: "CI", name: "🇨🇮 Côte d'Ivoire", currency: "XOF" },
  { code: "TG", name: "🇹🇬 Togo", currency: "XOF" },
  { code: "SN", name: "🇸🇳 Sénégal", currency: "XOF" },
  { code: "CD", name: "🇨🇩 RDC", currency: "CDF" },
];

const pricing: Record<string, { operator: string; payIn: string; payOut: string }[]> = {
  BJ: [
    { operator: "MTN", payIn: "5%", payOut: "5%" },
    { operator: "Moov", payIn: "5%", payOut: "5%" },
  ],
  BF: [
    { operator: "Orange", payIn: "5%", payOut: "5%" },
    { operator: "Moov", payIn: "5%", payOut: "5%" },
  ],
  CM: [
    { operator: "MTN", payIn: "5%", payOut: "5%" },
    { operator: "Orange", payIn: "5%", payOut: "5%" },
  ],
  CI: [
    { operator: "MTN", payIn: "5%", payOut: "5%" },
    { operator: "Orange", payIn: "5%", payOut: "5%" },
    { operator: "Wave", payIn: "5%", payOut: "5%" },
    { operator: "Moov", payIn: "5%", payOut: "5%" },
  ],
  TG: [
    { operator: "TMoney", payIn: "5%", payOut: "5%" },
    { operator: "Moov", payIn: "5%", payOut: "5%" },
  ],
  SN: [
    { operator: "Orange", payIn: "5%", payOut: "5%" },
    { operator: "Wave", payIn: "5%", payOut: "5%" },
  ],
  CD: [
    { operator: "Airtel", payIn: "5%", payOut: "5%" },
    { operator: "Vodacom", payIn: "5%", payOut: "5%" },
  ],
};

const faqs = [
  {
    q: "Faut-il un compte bancaire ?",
    a: "Non, aucun compte bancaire n'est nécessaire. Vous recevez et retirez votre argent directement via Mobile Money (MTN, Moov, Orange, TMoney, Wave).",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "SolvexPay accepte MTN Mobile Money, Moov Money, Orange Money, TMoney et Wave dans les pays couverts.",
  },
  {
    q: "En combien de temps puis-je retirer mes fonds ?",
    a: "Les retraits sont traités instantanément et crédités directement sur votre numéro Mobile Money.",
  },
  {
    q: "SolvexPay est-il disponible dans mon pays ?",
    a: "SolvexPay est disponible au Bénin, Burkina Faso, Togo, Cameroun, Côte d'Ivoire, Sénégal, RDC et Congo Brazzaville.",
  },
  {
    q: "Y a-t-il un abonnement mensuel ?",
    a: "Non. Vous payez uniquement une commission de 5% sur chaque transaction encaissée. Pas de frais fixes, pas de surprise.",
  },
];

const features = [
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Moyens de Paiement",
    desc: "MTN, Moov, Orange, TMoney, Wave — tous les opérateurs majeurs d'Afrique.",
  },
  {
    icon: <Link2 className="w-6 h-6" />,
    title: "Liens de Paiement",
    desc: "Générez un lien, partagez-le sur WhatsApp, Instagram ou Facebook et encaissez.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Statistiques en temps réel",
    desc: "Suivez vos transactions et obtenez des rapports détaillés pour décider mieux.",
  },
  {
    icon: <Code2 className="w-6 h-6" />,
    title: "API de Paiement",
    desc: "Intégrez SolvexPay dans votre application avec notre API simple et documentée.",
  },
  {
    icon: <HeadphonesIcon className="w-6 h-6" />,
    title: "Support 7j/7",
    desc: "Une équipe réactive disponible à tout moment pour vous accompagner.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: "Conformité KYC",
    desc: "Vérification sécurisée de l'identité pour protéger votre activité.",
  },
];

const steps = [
  {
    num: "01",
    title: "Créez votre lien de paiement",
    desc: "Définissez un montant en quelques secondes. Aucun site web requis.",
  },
  {
    num: "02",
    title: "Partagez votre lien",
    desc: "Envoyez-le à vos clients sur WhatsApp, Instagram ou par SMS.",
  },
  {
    num: "03",
    title: "Recevez votre argent",
    desc: "Vos clients paient par Mobile Money. Retirez vos fonds quand vous voulez.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border-b border-border py-5 cursor-pointer"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-base">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {open && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [activeCountry, setActiveCountry] = useState("CI");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg" data-testid="text-logo">SolvexPay</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="button-login">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="button-register-nav">
                Commencer
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-24 px-4 overflow-hidden bg-gradient-to-b from-primary/8 to-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto relative text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm">
            🌍 Paiements Mobile Money en Afrique
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight" data-testid="text-hero-title">
            Unifiez vos paiements avec{" "}
            <span className="text-primary">SolvexPay</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-description">
            Alimentez votre expansion à travers un réseau de millions d'utilisateurs actifs.
            Vos paiements circulent plus vite, plus loin, et plus intelligemment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-8" data-testid="button-cta-primary">
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://wa.me/22892299772" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                <MessageCircle className="h-4 w-4" />
                Nous contacter
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            {["Gratuit pour commencer", "Sans carte bancaire", "Inscription en 30 secondes"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 px-4 border-y border-border bg-muted/30 overflow-hidden">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6 font-medium">
          Moyens de paiement acceptés
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap max-w-2xl mx-auto">
          {operators.map((op) => (
            <span
              key={op}
              className="px-4 py-2 rounded-full border border-border bg-card text-sm font-semibold"
            >
              {op}
            </span>
          ))}
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <Badge variant="secondary">Pour les entrepreneurs</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Transformez votre passion en revenus
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Artisans, créateurs, couturiers — acceptez les paiements de vos clients en toute
              simplicité, même sans site web.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <Badge variant="secondary">Comment ça marche</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Votre premier paiement en 3 étapes
            </h2>
            <p className="text-muted-foreground">
              Encaissez dès aujourd'hui, sans site web
            </p>
          </div>

          <div className="relative space-y-0">
            {steps.map((step, i) => (
              <div key={step.num} className="flex gap-6 items-start pb-10 last:pb-0 relative">
                {i < steps.length - 1 && (
                  <div className="absolute left-[1.625rem] top-12 bottom-0 w-px bg-border" />
                )}
                <div className="flex-shrink-0 w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm w-12 h-12">
                  {step.num}
                </div>
                <div className="pt-2 space-y-1">
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/register">
              <Button size="lg" className="gap-2" data-testid="button-cta-steps">
                Créer un lien de paiement maintenant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <Badge variant="secondary">Tarifs</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Frais par opérateur</h2>
            <p className="text-muted-foreground">
              Aucun abonnement. Vous payez seulement quand vous encaissez.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {countries.map((c) => (
              <button
                key={c.code}
                onClick={() => setActiveCountry(c.code)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  activeCountry === c.code
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Opérateur</span>
              <span className="text-center">Pay In</span>
              <span className="text-center">Pay Out</span>
            </div>
            {(pricing[activeCountry] || []).map((row, i) => (
              <div
                key={row.operator}
                className={`grid grid-cols-3 px-6 py-4 items-center text-sm ${
                  i % 2 === 0 ? "bg-background" : "bg-muted/20"
                }`}
              >
                <span className="font-medium">{row.operator}</span>
                <span className="text-center text-primary font-semibold">{row.payIn}</span>
                <span className="text-center text-primary font-semibold">{row.payOut}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Devise : {countries.find((c) => c.code === activeCountry)?.currency}
          </p>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 space-y-3">
            <Badge variant="secondary">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Questions fréquentes</h2>
          </div>
          <div>
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Prêt à encaisser vos clients ?
          </h2>
          <p className="text-muted-foreground text-lg">
            Rejoignez des milliers de vendeurs qui font confiance à SolvexPay
            pour leurs paiements en Afrique.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-8" data-testid="button-cta-bottom">
                Créer un compte gratuit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://wa.me/22892299772" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                <MessageCircle className="h-4 w-4" />
                Nous contacter
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-bold text-sm">SolvexPay</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            © 2025 SolvexPay. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}

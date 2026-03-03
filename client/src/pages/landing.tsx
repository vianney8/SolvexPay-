import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronRight,
  LinkIcon,
  Smartphone,
  Code2,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Star,
  Users,
} from "lucide-react";

import solvexpayLogo from "../assets/images/solvexpay-logo.png";
import heroBanner from "../assets/images/hero-banner.png";
import paymentLinksImg from "../assets/images/payment-links.png";
import mobileMoneyImg from "../assets/images/mobile-money.png";
import apiGatewayImg from "../assets/images/api-gateway.png";
import flagBenin from "../assets/images/flag-benin.png";
import flagBurkina from "../assets/images/flag-burkina.png";
import flagCotedivoire from "../assets/images/flag-cotedivoire.png";
import flagSenegal from "../assets/images/flag-senegal.png";
import flagTogo from "../assets/images/flag-togo.png";

const countries = [
  { name: "Bénin", flag: flagBenin },
  { name: "Burkina Faso", flag: flagBurkina },
  { name: "Côte d'Ivoire", flag: flagCotedivoire },
  { name: "Sénégal", flag: flagSenegal },
  { name: "Togo", flag: flagTogo },
];

const stats = [
  { value: "5+", label: "Pays couverts", icon: Globe },
  { value: "10+", label: "Opérateurs", icon: Smartphone },
  { value: "99.9%", label: "Disponibilité", icon: TrendingUp },
  { value: "24/7", label: "Support actif", icon: Star },
];

const features = [
  {
    icon: LinkIcon,
    title: "Liens de Paiement",
    description: "Créez des liens personnalisés et partagez-les via WhatsApp, SMS ou email. Recevez des paiements en quelques secondes.",
    color: "from-violet-500 to-purple-600",
    badge: "Populaire",
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    description: "MTN, Orange, Wave, Moov, Airtel et plus. Acceptez les paiements depuis tous les opérateurs majeurs d'Afrique.",
    color: "from-emerald-500 to-teal-600",
    badge: "10+ réseaux",
  },
  {
    icon: Code2,
    title: "API Gateway",
    description: "Intégrez notre API RESTful dans votre application. Documentation complète, SDKs disponibles, webhooks en temps réel.",
    color: "from-amber-500 to-orange-600",
    badge: "Développeurs",
  },
];

const steps = [
  { step: "01", title: "Créez votre compte", desc: "Inscription gratuite en moins de 30 secondes, sans carte bancaire requise." },
  { step: "02", title: "Configurez votre profil", desc: "Ajoutez vos informations, complétez votre KYC et accédez à toutes les fonctionnalités." },
  { step: "03", title: "Acceptez des paiements", desc: "Créez vos liens ou intégrez l'API et commencez à recevoir des paiements instantanément." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-sm" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-8 h-8 rounded-xl object-cover ring-1 ring-violet-500/30" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent" data-testid="text-logo">SolvexPay</span>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login" data-testid="link-login">
                <Button variant="ghost" className="font-medium" data-testid="button-login">
                  Se connecter
                </Button>
              </Link>
              <Link href="/register">
                <Button className="font-semibold shadow-lg shadow-violet-500/20" data-testid="button-register-nav">
                  Commencer gratuitement
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 mesh-bg" />
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute top-40 right-1/4 w-48 h-48 rounded-full bg-amber-500/6 blur-3xl" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="px-4 py-1.5 bg-violet-500/10 text-violet-600 border-violet-500/20 font-semibold text-sm" data-testid="flags-marquee">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {countries.map((c) => (
                        <img key={c.name} src={c.flag} alt={c.name} className="w-5 h-3.5 rounded-sm object-cover ring-1 ring-white" />
                      ))}
                    </div>
                    <span>5 pays • 10+ opérateurs</span>
                  </div>
                </Badge>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight" data-testid="text-hero-title">
                  Paiements{" "}
                  <span className="relative">
                    <span className="text-gradient-brand">Mobile Money</span>
                  </span>
                  {" "}pour l'Afrique
                </h1>

                <p className="text-lg text-muted-foreground max-w-lg leading-relaxed" data-testid="text-hero-description">
                  Acceptez les paiements MTN, Orange, Wave et bien plus. Créez des liens, gérez vos transactions et intégrez notre API en quelques minutes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-13 px-8 text-base font-semibold shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] transition-all duration-200"
                    data-testid="button-cta-primary"
                  >
                    Créer un compte gratuit
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-2">
                {["Gratuit pour commencer", "Sans carte bancaire", "30 secondes d'inscription"].map((text) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/20 via-transparent to-emerald-500/15 rounded-3xl blur-3xl scale-110" />
              <div className="relative rounded-3xl overflow-hidden ring-1 ring-border/50 shadow-2xl shadow-violet-500/10">
                <img
                  src={heroBanner}
                  alt="SolvexPay - Plateforme de paiement africaine"
                  className="w-full object-cover"
                  loading="eager"
                  decoding="async"
                  data-testid="img-hero-banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
              </div>

              <div className="absolute -top-4 -right-4 bg-white dark:bg-card rounded-2xl shadow-xl p-4 border border-border/80 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Paiements traités</p>
                  <p className="text-lg font-bold text-foreground">+2.5M XOF</p>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-card rounded-2xl shadow-xl p-4 border border-border/80 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <Users className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Utilisateurs actifs</p>
                  <p className="text-lg font-bold text-foreground">500+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 border-y border-border/40 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <Badge className="px-4 py-1.5 bg-primary/10 text-primary border-primary/20 font-semibold">Nos Solutions</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold" data-testid="text-solutions-title">
              Tout pour{" "}
              <span className="text-gradient-brand">accepter les paiements</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Des outils puissants et simples pour gérer vos paiements Mobile Money en Afrique.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative rounded-3xl overflow-hidden border border-border/60 bg-card hover:shadow-2xl hover:shadow-primary/8 transition-all duration-500 hover:-translate-y-1"
                data-testid={`card-feature-${i}`}
              >
                <div className={`h-48 bg-gradient-to-br ${feature.color} relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_white_0%,_transparent_60%)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <feature.icon className="h-20 w-20 text-white/30" />
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/20 text-white border-white/20 text-xs font-semibold backdrop-blur-sm">
                      {feature.badge}
                    </Badge>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <Badge className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">Simple & Rapide</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold">Démarrez en <span className="text-gradient-brand">3 étapes</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-500/30 to-violet-500/0" />
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center space-y-4 p-8 rounded-3xl bg-card border border-border/60 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md" />
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mx-auto">
                    <span className="text-xl font-black text-white">{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <div className="max-w-4xl mx-auto text-center relative space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Prêt à accepter des paiements<br />à travers l'Afrique ?
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Rejoignez des centaines de marchands qui utilisent SolvexPay pour gérer leurs paiements Mobile Money.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button
                size="lg"
                className="h-13 px-10 text-base font-bold bg-white text-violet-700 hover:bg-white/95 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200"
                data-testid="button-cta-bottom"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            {[
              { icon: Shield, text: "Sécurisé & Chiffré" },
              { icon: Zap, text: "Instantané" },
              { icon: Globe, text: "Pan-africain" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white/80" data-testid={`text-advantage-${text.toLowerCase().replace(/\s+/g, "-")}`}>
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 px-4 border-t border-border/40 bg-card/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-base bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground transition-colors">Conditions d'utilisation</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">Confidentialité</span>
            <span className="cursor-pointer hover:text-foreground transition-colors">Contact</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            © 2025 SolvexPay. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}

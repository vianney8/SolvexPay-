import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Users,
  TrendingUp,
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
  { name: "Benin", flag: flagBenin },
  { name: "Burkina Faso", flag: flagBurkina },
  { name: "Cote d'Ivoire", flag: flagCotedivoire },
  { name: "Senegal", flag: flagSenegal },
  { name: "Togo", flag: flagTogo },
];

const stats = [
  { label: "Pays couverts", value: "7+", icon: Globe },
  { label: "Operateurs", value: "8+", icon: Smartphone },
  { label: "Utilisateurs", value: "1K+", icon: Users },
  { label: "Transactions", value: "10K+", icon: TrendingUp },
];

const features = [
  {
    icon: LinkIcon,
    title: "Liens de Paiement",
    description: "Creez des liens personnalises et partagez-les par SMS, WhatsApp ou email. Recevez des paiements sans site web.",
    image: paymentLinksImg,
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    description: "Acceptez MTN, Orange, Wave, Moov, Airtel, TMoney, Vodacom dans 7 pays africains. Paiement USSD direct.",
    image: mobileMoneyImg,
  },
  {
    icon: Code2,
    title: "API & SDK",
    description: "Integrez les paiements dans votre application en quelques lignes de code. Documentation complete et support technique.",
    image: apiGatewayImg,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2.5">
              <img src={solvexpayLogo} alt="SolvexPay" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-bold text-lg tracking-tight" data-testid="text-logo">SolvexPay</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" data-testid="link-login">
                <Button variant="ghost" size="sm" data-testid="button-login">
                  Connexion
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="button-register">
                  Commencer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex gap-2" data-testid="flags-marquee">
                {countries.map((c) => (
                  <div key={c.name} className="rounded-lg border border-border/50 bg-card/50 p-1.5 backdrop-blur-sm">
                    <img src={c.flag} alt={c.name} className="w-9 h-6 rounded object-cover" />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight" data-testid="text-hero-title">
                  Paiements Mobile Money{" "}
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                    simplifes
                  </span>{" "}
                  pour l'Afrique
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg leading-relaxed" data-testid="text-hero-description">
                  Acceptez les paiements de MTN, Orange, Wave et 5 autres operateurs dans 7 pays. Integration en quelques minutes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2 h-12 px-6 text-base" data-testid="button-cta-primary">
                    Creer un compte gratuit
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                {["Gratuit pour commencer", "Sans carte bancaire", "Inscription en 30s"].map((text) => (
                  <div key={text} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 rounded-3xl blur-3xl" />
              <img
                src={heroBanner}
                alt="SolvexPay"
                className="relative rounded-2xl w-full object-cover shadow-2xl shadow-emerald-500/10"
                loading="eager"
                data-testid="img-hero-banner"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-4 px-4 border-y border-border/50 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center py-4">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Solutions</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-solutions-title">
              Tout pour accepter les paiements
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Des outils modernes pour gerer vos paiements Mobile Money a travers l'Afrique.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, i) => {
              const FeatureIcon = feature.icon;
              const isReversed = i % 2 === 1;

              return (
                <Card key={feature.title} className="overflow-hidden border-border/50" data-testid={`card-feature-${i}`}>
                  <div className={`grid md:grid-cols-2 ${isReversed ? "md:grid-flow-dense" : ""}`}>
                    <div className={`relative ${isReversed ? "md:col-start-2" : ""}`}>
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-52 md:h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:hidden" />
                    </div>
                    <div className="p-8 sm:p-10 flex flex-col justify-center space-y-4">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FeatureIcon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      <Link href="/register">
                        <Button variant="outline" size="sm" className="gap-1.5 w-fit mt-2" data-testid={`button-feature-learn-more-${i}`}>
                          En savoir plus
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Avantages</p>
            <h2 className="text-3xl font-bold tracking-tight">Pourquoi SolvexPay ?</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center space-y-3 p-6">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold">Securise</h3>
              <p className="text-sm text-muted-foreground">Signature HMAC-SHA256 sur chaque transaction. Vos fonds sont proteges.</p>
            </div>
            <div className="text-center space-y-3 p-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
                <Zap className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="font-semibold">Instantane</h3>
              <p className="text-sm text-muted-foreground">Paiements USSD directs. Le client confirme sur son telephone en secondes.</p>
            </div>
            <div className="text-center space-y-3 p-6">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
                <Globe className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold">Pan-Africain</h3>
              <p className="text-sm text-muted-foreground">7 pays, 8 operateurs, 3 devises. Une seule integration pour toute l'Afrique.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Pret a commencer ?</h2>
          <p className="text-muted-foreground text-lg">
            Creez votre compte gratuitement et commencez a accepter les paiements Mobile Money en quelques minutes.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2 h-12 px-8 text-base" data-testid="button-cta-bottom">
              Creer un compte gratuit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-6 h-6 rounded-md object-cover" />
            <span className="font-bold text-sm">SolvexPay</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            &copy; 2026 SolvexPay. Tous droits reserves.
          </p>
        </div>
      </footer>
    </div>
  );
}

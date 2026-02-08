import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  CreditCard, 
  CheckCircle2,
  ChevronRight,
  LinkIcon,
  Smartphone,
  Code2,
  ArrowRight,
  Shield,
  Zap,
  Globe
} from "lucide-react";

import heroBanner from "../assets/images/hero-banner.png";
import paymentLinksImg from "../assets/images/payment-links.png";
import mobileMoneyImg from "../assets/images/mobile-money.png";
import apiGatewayImg from "../assets/images/api-gateway.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl" data-testid="text-logo">SolvexPay</span>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login" data-testid="link-login">
                <Button variant="outline" data-testid="button-login">
                  Se connecter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 dark:from-primary/10 dark:to-primary/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge variant="secondary" className="px-4 py-1.5">
                La solution de paiement #1 en Afrique
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight" data-testid="text-hero-title">
                Simplifiez vos{" "}
                <span className="text-primary">paiements</span>{" "}
                à travers l'Afrique
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl" data-testid="text-hero-description">
                Acceptez les paiements Mobile Money de MTN, Orange, Wave et bien plus. 
                Créez des liens de paiement, gérez vos transactions et intégrez notre API 
                en quelques minutes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-primary">
                    Créer un compte gratuit
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Gratuit pour commencer</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Sans carte bancaire</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Inscription en 30 secondes</span>
                </div>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
              <img 
                src={heroBanner} 
                alt="SolvexPay - Plateforme de paiement africaine" 
                className="relative rounded-2xl w-full object-cover"
                data-testid="img-hero-banner"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <Badge variant="secondary" className="px-4 py-1.5">Nos Solutions</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold" data-testid="text-solutions-title">
              Tout ce dont vous avez besoin pour{" "}
              <span className="text-primary">accepter les paiements</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Des outils puissants et simples pour gérer vos paiements Mobile Money en Afrique.
            </p>
          </div>

          <div className="space-y-8">
            <Card className="overflow-hidden" data-testid="card-payment-links">
              <div className="relative">
                <img 
                  src={paymentLinksImg} 
                  alt="Liens de Paiement SolvexPay" 
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </div>
              <div className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold" data-testid="text-feature-payment-links">Liens de Paiement</h3>
                <p className="text-muted-foreground">
                  Créez des liens personnalisés pour vos produits et services. 
                  Partagez-les facilement avec vos clients par SMS, WhatsApp ou email.
                </p>
              </div>
            </Card>

            <Card className="overflow-hidden" data-testid="card-mobile-money">
              <div className="relative">
                <img 
                  src={mobileMoneyImg} 
                  alt="Paiements Mobile Money SolvexPay" 
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </div>
              <div className="p-6 space-y-4">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold" data-testid="text-feature-mobile-money">Paiements Mobile Money</h3>
                <p className="text-muted-foreground">
                  Acceptez les paiements via tous les opérateurs Mobile Money d'Afrique de l'Ouest. 
                  Orange Money, MTN, Moov, Wave, Free Money, T-Money et bien plus. 
                  Transactions instantanées, sécurisées et fiables.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" data-testid="badge-orange-money">
                    <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
                    Orange Money
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-mtn">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                    MTN
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-moov">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                    Moov
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-wave">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2" />
                    Wave
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-free">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    Free Money
                  </Badge>
                  <Badge variant="secondary" data-testid="badge-others">
                    + 6 autres
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden" data-testid="card-api-gateway">
              <div className="relative">
                <img 
                  src={apiGatewayImg} 
                  alt="API Gateway SolvexPay" 
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              </div>
              <div className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold" data-testid="text-feature-api">API Gateway</h3>
                <p className="text-muted-foreground">
                  Intégrez les paiements directement dans votre site web ou 
                  application avec notre API sécurisée et documentée.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex items-center gap-2" data-testid="text-advantage-security">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Transactions sécurisées</span>
              </div>
              <div className="flex items-center gap-2" data-testid="text-advantage-speed">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Paiements instantanés</span>
              </div>
              <div className="flex items-center gap-2" data-testid="text-advantage-coverage">
                <Globe className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Couverture pan-africaine</span>
              </div>
            </div>
            <Link href="/register">
              <Button data-testid="button-cta-bottom">
                Commencer maintenant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">SolvexPay</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            &copy; 2025 SolvexPay
          </p>
        </div>
      </footer>
    </div>
  );
}

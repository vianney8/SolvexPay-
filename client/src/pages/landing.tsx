import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Globe2, 
  CreditCard, 
  Smartphone, 
  BarChart3,
  CheckCircle2,
  ChevronRight
} from "lucide-react";

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
              <span className="font-bold text-xl" data-testid="text-logo">SolvaxPay</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
                Fonctionnalités
              </a>
              <a href="#providers" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-providers">
                Fournisseurs
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-pricing">
                Tarifs
              </a>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <a href="/api/login" data-testid="link-login">
                <Button variant="ghost" data-testid="button-login">
                  Connexion
                </Button>
              </a>
              <a href="/api/login" data-testid="link-get-started">
                <Button data-testid="button-get-started">
                  Commencer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
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
                <a href="/api/login">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="button-cta-primary">
                    Créer un compte gratuit
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="#features">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-cta-secondary">
                    Découvrir les fonctionnalités
                  </Button>
                </a>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Gratuit pour commencer</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Sans carte bancaire</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-3xl blur-3xl" />
              <Card className="relative p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Solde total</p>
                    <p className="text-3xl font-bold" data-testid="text-demo-balance">2,450,000 XOF</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Dépôts</p>
                    <p className="text-xl font-semibold text-primary">+1.2M</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Retraits</p>
                    <p className="text-xl font-semibold">-350K</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">MTN Mobile Money</p>
                        <p className="text-xs text-muted-foreground">Il y a 2 min</p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary">+25,000 XOF</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Orange Money</p>
                        <p className="text-xs text-muted-foreground">Il y a 5 min</p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary">+15,000 XOF</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">Fonctionnalités</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-features-title">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-muted-foreground text-lg">
              Une plateforme complète pour gérer tous vos paiements en Afrique
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Liens de paiement</h3>
              <p className="text-muted-foreground">
                Créez des liens de paiement personnalisés en quelques secondes. 
                Partagez-les par SMS, email ou réseaux sociaux.
              </p>
            </Card>
            
            <Card className="p-6 hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">API puissante</h3>
              <p className="text-muted-foreground">
                Intégrez nos paiements dans votre application avec notre API RESTful. 
                Documentation complète et SDKs disponibles.
              </p>
            </Card>
            
            <Card className="p-6 hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sécurité maximale</h3>
              <p className="text-muted-foreground">
                Vos transactions sont sécurisées avec un chiffrement de bout en bout. 
                Conformité PCI-DSS garantie.
              </p>
            </Card>
            
            <Card className="p-6 hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Globe2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-devises</h3>
              <p className="text-muted-foreground">
                Acceptez les paiements en XOF, NGN, GHS, KES et plus. 
                Conversion automatique disponible.
              </p>
            </Card>
            
            <Card className="p-6 hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Tableau de bord</h3>
              <p className="text-muted-foreground">
                Visualisez vos transactions en temps réel. 
                Rapports détaillés et exportations disponibles.
              </p>
            </Card>
            
            <Card className="p-6 hover-elevate">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Mobile Money</h3>
              <p className="text-muted-foreground">
                Intégration native avec MTN, Orange, Wave, Airtel et tous 
                les principaux opérateurs africains.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section id="providers" className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">Fournisseurs</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Tous les opérateurs Mobile Money
          </h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            Nous supportons les principaux fournisseurs de Mobile Money en Afrique de l'Ouest et de l'Est
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {["MTN", "Orange", "Wave", "Airtel", "Moov", "Free"].map((provider) => (
              <Card key={provider} className="p-6 flex items-center justify-center hover-elevate">
                <span className="font-semibold text-lg">{provider}</span>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="secondary" className="mb-4">Tarification</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Des tarifs simples et transparents
          </h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl mx-auto">
            Payez uniquement pour ce que vous utilisez. Pas de frais cachés.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-left">
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <p className="text-muted-foreground mb-6">Pour les petits commerces</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">1.5%</span>
                <span className="text-muted-foreground"> / transaction</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Jusqu'à 5M XOF/mois
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  API complète
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Support email
                </li>
              </ul>
              <a href="/api/login">
                <Button variant="outline" className="w-full">Commencer</Button>
              </a>
            </Card>
            
            <Card className="p-8 text-left border-primary relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Populaire</Badge>
              <h3 className="text-xl font-semibold mb-2">Business</h3>
              <p className="text-muted-foreground mb-6">Pour les entreprises en croissance</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">1.2%</span>
                <span className="text-muted-foreground"> / transaction</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Volume illimité
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Webhooks avancés
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Support prioritaire
                </li>
              </ul>
              <a href="/api/login">
                <Button className="w-full">Commencer</Button>
              </a>
            </Card>
            
            <Card className="p-8 text-left">
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <p className="text-muted-foreground mb-6">Pour les grandes organisations</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">Sur mesure</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Tarifs négociés
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  SLA personnalisé
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Account manager dédié
                </li>
              </ul>
              <Button variant="outline" className="w-full">Nous contacter</Button>
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl">SolvaxPay</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 SolvaxPay. Tous droits réservés.
            </p>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  CreditCard, 
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
            
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">SolvexPay</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La plateforme de paiement pan-africaine pour les entreprises modernes.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground transition-colors">Commencer</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Connexion</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carrières</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Conditions</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground text-center">
              © 2025 SolvexPay. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

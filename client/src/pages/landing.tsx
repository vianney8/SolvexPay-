import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  CreditCard,
  BarChart3,
  Lock,
  Wallet,
  Send,
  QrCode
} from "lucide-react";

const countries = [
  { name: "Bénin", colors: ["#008751", "#FCD116"] },
  { name: "Burkina Faso", colors: ["#009E49", "#EF2B2D", "#FCD116"] },
  { name: "Côte d'Ivoire", colors: ["#F77F00", "#FFFFFF", "#009E60"] },
  { name: "Sénégal", colors: ["#00853F", "#FDEF42", "#E31B23"] },
  { name: "Togo", colors: ["#006A4E", "#FFCE00", "#D21034"] },
];

function FlagIcon({ colors, name }: { colors: string[]; name: string }) {
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" className="rounded-sm" aria-label={name}>
      {colors.length === 2 && (
        <>
          <rect width="20" height="28" fill={colors[0]} />
          <rect x="20" width="20" height="28" fill={colors[1]} />
        </>
      )}
      {colors.length === 3 && (
        <>
          <rect width="14" height="28" fill={colors[0]} />
          <rect x="13" width="14" height="28" fill={colors[1]} />
          <rect x="26" width="14" height="28" fill={colors[2]} />
        </>
      )}
    </svg>
  );
}

function HeroVisual() {
  return (
    <div className="relative w-full aspect-square max-w-md mx-auto" data-testid="img-hero-banner">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-400/10 to-primary/20 rounded-3xl" />
      <div className="relative p-8 flex flex-col gap-4 h-full justify-center">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solde disponible</p>
              <p className="font-bold text-lg">1,250,000 XOF</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">MTN MoMo</Badge>
            <Badge variant="secondary" className="text-xs">Orange Money</Badge>
            <Badge variant="secondary" className="text-xs">Wave</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Transactions</span>
            </div>
            <p className="font-bold text-xl">2,458</p>
            <p className="text-xs text-green-500">+12.5%</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Transferts</span>
            </div>
            <p className="font-bold text-xl">892</p>
            <p className="text-xs text-green-500">+8.3%</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-medium">Paiement reçu</p>
                <p className="text-xs text-muted-foreground">Il y a 2 min</p>
              </div>
            </div>
            <span className="font-bold text-sm text-green-500">+25,000 XOF</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisualPayment() {
  return (
    <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-cyan-50 via-teal-50 to-sky-50 dark:from-cyan-950/30 dark:via-teal-950/20 dark:to-sky-950/30 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg">
          <LinkIcon className="w-8 h-8 text-white" />
        </div>
        <div className="bg-card border border-border rounded-lg p-3 w-full max-w-xs shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <QrCode className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono truncate">pay.solvexpay.com/abc123</span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-semibold">Abonnement Premium</span>
            <Badge variant="secondary">15,000 XOF</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Badge variant="outline" className="text-xs">SMS</Badge>
          <Badge variant="outline" className="text-xs">WhatsApp</Badge>
          <Badge variant="outline" className="text-xs">Email</Badge>
        </div>
      </div>
    </div>
  );
}

function FeatureVisualMobile() {
  return (
    <div className="w-full h-48 md:h-full min-h-[12rem] bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/20 dark:to-yellow-950/30 flex items-center justify-center p-6">
      <div className="grid grid-cols-2 gap-3 max-w-xs w-full">
        {[
          { name: "MTN", color: "bg-yellow-400", textColor: "text-yellow-900" },
          { name: "Orange", color: "bg-orange-400", textColor: "text-orange-900" },
          { name: "Wave", color: "bg-blue-400", textColor: "text-blue-900" },
          { name: "Moov", color: "bg-cyan-400", textColor: "text-cyan-900" },
          { name: "Airtel", color: "bg-red-400", textColor: "text-red-900" },
          { name: "Free", color: "bg-green-400", textColor: "text-green-900" },
        ].map((op) => (
          <div key={op.name} className="bg-card border border-border rounded-lg p-2.5 flex items-center gap-2 shadow-sm">
            <div className={`w-7 h-7 rounded-md ${op.color} flex items-center justify-center`}>
              <Smartphone className={`w-3.5 h-3.5 ${op.textColor}`} />
            </div>
            <span className="text-xs font-medium">{op.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureVisualAPI() {
  return (
    <div className="w-full h-64 sm:h-80 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-lg p-4 w-full max-w-sm shadow-sm font-mono text-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-muted-foreground ml-2">api.solvexpay.com</span>
        </div>
        <div className="space-y-1 text-muted-foreground">
          <p><span className="text-blue-500">POST</span> /v1/payments</p>
          <p className="pl-2">{"{"}</p>
          <p className="pl-4"><span className="text-green-500">"amount"</span>: <span className="text-orange-500">25000</span>,</p>
          <p className="pl-4"><span className="text-green-500">"currency"</span>: <span className="text-orange-500">"XOF"</span>,</p>
          <p className="pl-4"><span className="text-green-500">"provider"</span>: <span className="text-orange-500">"mtn_momo"</span>,</p>
          <p className="pl-4"><span className="text-green-500">"phone"</span>: <span className="text-orange-500">"+22990..."</span></p>
          <p className="pl-2">{"}"}</p>
          <div className="mt-2 pt-2 border-t border-border">
            <p><span className="text-green-500">200</span> OK</p>
            <p className="pl-2"><span className="text-green-500">"status"</span>: <span className="text-orange-500">"success"</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl" data-testid="text-logo">SolvexPay</span>
            </div>
            
            <div className="flex items-center gap-3">
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="overflow-hidden max-w-xs" data-testid="flags-marquee">
                <div className="flex animate-marquee gap-3">
                  {[...countries, ...countries].map((country, i) => (
                    <div
                      key={`${country.name}-${i}`}
                      className="flex-shrink-0 rounded-md border border-border bg-card p-1.5"
                    >
                      <FlagIcon colors={country.colors} name={country.name} />
                    </div>
                  ))}
                </div>
              </div>
              
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
              <HeroVisual />
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
              <FeatureVisualPayment />
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
              <div className="grid md:grid-cols-2">
                <FeatureVisualMobile />
                <div className="p-6 space-y-3 flex flex-col justify-center">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold" data-testid="text-feature-mobile-money">Mobile Money</h3>
                  <p className="text-muted-foreground text-sm">
                    Acceptez les paiements via tous les opérateurs d'Afrique : 
                    Orange, MTN, Wave, Moov, Airtel, Free et plus encore.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden" data-testid="card-api-gateway">
              <FeatureVisualAPI />
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
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">SolvexPay</span>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            &copy; 2025 SolvexPay. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}

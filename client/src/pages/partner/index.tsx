import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, Building2, Globe, Zap, ShieldCheck } from "lucide-react";
import solvexpayLogo from "../../assets/images/solvexpay-logo.png";

export default function PartnerAuthPage() {
  const [, navigate] = useLocation();
  const { login, user } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  if (user && user.isPartner) {
    navigate("/partner/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login.mutateAsync(formData);
      if (!data.isPartner) {
        toast({ 
          title: "Accès refusé", 
          description: "Ce compte n'est pas un compte partenaire.", 
          variant: "destructive" 
        });
        return;
      }
      navigate("/partner/dashboard");
    } catch (error: any) {
      const message = error?.message || "Erreur de connexion";
      toast({ title: "Erreur", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-lg" />
              <img src={solvexpayLogo} alt="SolvexPay" className="relative w-16 h-16 rounded-2xl object-cover ring-2 ring-primary/20 shadow-xl" />
            </div>
            <div className="text-center">
              <h1 className="font-black text-3xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">SolvexPay</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Espace Partenaire</p>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-foreground" data-testid="text-login-title">Connexion Partenaire</h2>
            <p className="text-muted-foreground text-sm">Gérez vos paiements directs et clés API.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="partenaire@entreprise.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="pl-10 h-12 border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mot de Passe</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pl-10 pr-11 h-12 border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-bold text-base shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.01] transition-all rounded-xl"
              disabled={login.isPending}
              data-testid="button-submit-login"
            >
              {login.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</>
              ) : (
                <span className="flex items-center gap-2 justify-center">Accéder au portail <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          <div className="pt-6 border-t border-border/40 text-center">
            <p className="text-sm text-muted-foreground">
              Vous n'êtes pas partenaire ?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Inscrivez-vous ici
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-muted/30 relative flex-col justify-center p-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
              <Zap className="h-3.5 w-3.5" /> Direct Pay API
            </div>
            <h2 className="text-4xl font-black text-foreground leading-tight">
              L'API de paiement la plus<br />
              <span className="text-primary">puissante pour l'Afrique.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Intégrez le Mobile Money directement dans votre flux de paiement, sans redirection, avec une sécurité maximale.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Paiements Directs", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "KYC Automatisé", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Dashboard Temps Réel", icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Couverture Régionale", icon: Globe, color: "text-violet-500", bg: "bg-violet-500/10" },
            ].map((feature) => (
              <div key={feature.label} className="flex items-center gap-3 p-4 rounded-2xl bg-background border border-border/60 shadow-sm">
                <div className={`h-10 w-10 rounded-xl ${feature.bg} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <span className="font-bold text-sm text-foreground leading-tight">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

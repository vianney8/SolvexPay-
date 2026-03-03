import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, ArrowRight, ChevronDown, CheckCircle2 } from "lucide-react";
import solvexpayLogo from "../assets/images/solvexpay-logo.png";
import heroBanner from "../assets/images/hero-banner.png";

const countryCodes = [
  { code: "+229", country: "Bénin", flag: "\u{1F1E7}\u{1F1EF}" },
  { code: "+225", country: "Côte d'Ivoire", flag: "\u{1F1E8}\u{1F1EE}" },
  { code: "+226", country: "Burkina Faso", flag: "\u{1F1E7}\u{1F1EB}" },
  { code: "+228", country: "Togo", flag: "\u{1F1F9}\u{1F1EC}" },
  { code: "+221", country: "Sénégal", flag: "\u{1F1F8}\u{1F1F3}" },
];

function AuthPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between h-full p-10 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, hsl(262 60% 10%) 0%, hsl(262 50% 16%) 50%, hsl(240 30% 8%) 100%)" }}>
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-violet-500/30 blur-sm" />
          <img src={solvexpayLogo} alt="SolvexPay" className="relative w-10 h-10 rounded-xl object-cover ring-1 ring-white/20" />
        </div>
        <span className="font-bold text-2xl text-white">SolvexPay</span>
      </div>

      <div className="relative space-y-6">
        <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
          <img src={heroBanner} alt="SolvexPay" className="w-full h-48 object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Paiements Mobile Money<br />
            <span className="text-emerald-400">pour toute l'Afrique</span>
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            MTN, Orange, Wave, Moov et bien plus. Gérez vos transactions depuis une seule plateforme.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "5+", label: "Pays" },
            { value: "10+", label: "Opérateurs" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/6 rounded-xl p-3 text-center border border-white/8">
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-2 text-white/40 text-xs">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Système opérationnel • Sécurisé par chiffrement TLS</span>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }
    try {
      await login.mutateAsync(formData);
      navigate("/dashboard");
    } catch (error: any) {
      const message = error?.message || "Erreur de connexion";
      let errorText = message;
      try {
        const parsed = JSON.parse(message.replace(/^\d+:\s*/, ""));
        errorText = parsed.message || message;
      } catch {
        if (message.includes("401")) errorText = "Email ou mot de passe incorrect";
      }
      toast({ title: "Erreur", description: errorText, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-10 h-10 rounded-xl object-cover" data-testid="img-login-logo" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
            </Link>
            <h1 className="text-3xl font-bold text-foreground mt-4" data-testid="text-login-title">Bon retour 👋</h1>
            <p className="text-muted-foreground">Connectez-vous à votre compte pour continuer.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="pl-10 h-11 border-border/70 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
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
                  placeholder="Votre mot de passe"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pl-10 pr-11 h-11 border-border/70 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] transition-all"
              disabled={login.isPending}
              data-testid="button-submit-login"
            >
              {login.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  Se connecter <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline" data-testid="link-register">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative">
        <AuthPanel />
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countryCode, setCountryCode] = useState("+229");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const passwordChecks = {
    minLength: formData.password.length >= 6,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fullName.trim().length < 2) {
      toast({ title: "Erreur", description: "Le nom complet doit contenir au moins 2 caractères", variant: "destructive" });
      return;
    }
    if (formData.phone.length < 8) {
      toast({ title: "Erreur", description: "Numéro de téléphone invalide (8 chiffres minimum)", variant: "destructive" });
      return;
    }
    if (!passwordChecks.minLength) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    try {
      await register.mutateAsync({
        fullName: formData.fullName,
        email: formData.email,
        phone: `${countryCode}${formData.phone}`,
        password: formData.password,
      });
      toast({ title: "Bienvenue !", description: "Votre compte a été créé avec succès" });
      navigate("/dashboard");
    } catch (error: any) {
      const message = error?.message || "Erreur lors de l'inscription";
      let errorText = message;
      try {
        const parsed = JSON.parse(message.replace(/^\d+:\s*/, ""));
        errorText = parsed.message || message;
      } catch {
        if (message.includes("409")) errorText = "Un compte avec cet email existe déjà";
      }
      toast({ title: "Erreur", description: errorText, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-7 py-4">
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-10 h-10 rounded-xl object-cover" data-testid="img-register-logo" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
            </Link>
            <h1 className="text-3xl font-bold text-foreground mt-4" data-testid="text-register-title">Créer un compte</h1>
            <p className="text-muted-foreground">Commencez à accepter des paiements en Afrique.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom Complet</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Jean Dupont"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="pl-10 h-11 border-border/70 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  data-testid="input-fullname"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="pl-10 h-11 border-border/70 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de Téléphone</label>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                    className="flex items-center gap-1.5 border border-border/70 rounded-lg px-3 h-11 text-sm bg-background hover:bg-muted/50 transition-colors min-w-[110px]"
                    data-testid="button-country-code"
                  >
                    <span className="text-base">{countryCodes.find(c => c.code === countryCode)?.flag}</span>
                    <span className="font-medium text-sm">{countryCode}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-popover border border-popover-border rounded-xl shadow-xl z-50 min-w-[240px] py-1.5 overflow-hidden">
                      {countryCodes.map((cc) => {
                        const isSelected = cc.code === countryCode;
                        return (
                          <button
                            key={cc.code}
                            type="button"
                            className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                              isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                            }`}
                            onClick={() => { setCountryCode(cc.code); setShowCountryDropdown(false); }}
                            data-testid={`option-country-${cc.code}`}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-primary" />}
                            <span className="text-base">{cc.flag}</span>
                            <span>{cc.country} ({cc.code})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <Input
                  type="tel"
                  placeholder="97 00 00 00"
                  value={formData.phone}
                  onChange={(e) => { const val = e.target.value.replace(/[^0-9\s]/g, ""); setFormData({ ...formData, phone: val }); }}
                  required
                  className="flex-1 h-11 border-border/70 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mot de Passe</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="6 caractères minimum"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pl-10 pr-11 h-11 border-border/70 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  data-testid="input-password"
                />
                <button type="button" className="absolute right-3.5 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)} data-testid="button-toggle-password">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className={`flex items-center gap-1 text-xs ${passwordChecks.minLength ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <CheckCircle2 className="w-3 h-3" />
                  6 caractères minimum
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirmer le mot de passe</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirmez votre mot de passe"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="pl-10 pr-11 h-11 border-border/70 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  data-testid="input-confirm-password"
                />
                <button type="button" className="absolute right-3.5 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowConfirm(!showConfirm)} data-testid="button-toggle-confirm">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-destructive font-medium" data-testid="text-password-mismatch">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] transition-all mt-2"
              disabled={register.isPending}
              data-testid="button-submit-register"
            >
              {register.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
              ) : (
                <span className="flex items-center gap-2 justify-center">Créer mon compte <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline" data-testid="link-login">
                Se connecter
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              En continuant, vous acceptez nos{" "}
              <span className="underline cursor-pointer hover:text-foreground transition-colors">Conditions d'Utilisation</span>{" "}
              et notre{" "}
              <span className="underline cursor-pointer hover:text-foreground transition-colors">Politique de Confidentialité</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative">
        <AuthPanel />
      </div>
    </div>
  );
}

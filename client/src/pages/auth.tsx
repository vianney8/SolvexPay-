import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, ArrowRight, ChevronDown, CreditCard } from "lucide-react";

const countryCodes = [
  { code: "+229", country: "Bénin", flag: "\u{1F1E7}\u{1F1EF}" },
  { code: "+225", country: "Côte d'Ivoire", flag: "\u{1F1E8}\u{1F1EE}" },
  { code: "+226", country: "Burkina Faso", flag: "\u{1F1E7}\u{1F1EB}" },
  { code: "+228", country: "Togo", flag: "\u{1F1F9}\u{1F1EC}" },
  { code: "+221", country: "Sénégal", flag: "\u{1F1F8}\u{1F1F3}" },
];

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <div className="w-14 h-14 rounded-md bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center mx-auto" data-testid="img-login-logo">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-login-title">Se connecter</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="pl-10"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mot de Passe</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Votre mot de passe"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="pl-10 pr-10"
                data-testid="input-password"
              />
              <button
                type="button"
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground"
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
                Continuer <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline" data-testid="link-register">
            Créer un compte
          </Link>
        </p>
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block">
            <div className="w-14 h-14 rounded-md bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center mx-auto" data-testid="img-register-logo">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-register-title">Créer un compte</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom Complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Jean Dupont"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
                className="pl-10"
                data-testid="input-fullname"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="pl-10"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Numéro de Téléphone</label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center gap-1.5 border border-input rounded-md px-3 h-9 text-sm bg-background hover-elevate min-w-[100px]"
                  data-testid="button-country-code"
                >
                  <span className="text-base">{countryCodes.find(c => c.code === countryCode)?.flag}</span>
                  <span className="font-medium">{countryCode}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 min-w-[230px] py-1 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                    {countryCodes.map((cc) => {
                      const isSelected = cc.code === countryCode;
                      return (
                        <button
                          key={cc.code}
                          type="button"
                          className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => {
                            setCountryCode(cc.code);
                            setShowCountryDropdown(false);
                          }}
                          data-testid={`option-country-${cc.code}`}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
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
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9\s]/g, "");
                  setFormData({ ...formData, phone: val });
                }}
                required
                className="flex-1"
                data-testid="input-phone"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mot de Passe</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="6 caractères minimum"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="pl-10 pr-10"
                data-testid="input-password"
              />
              <button
                type="button"
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              <span className={`text-xs flex items-center gap-1 ${passwordChecks.minLength ? "text-primary" : "text-muted-foreground"}`}>
                {passwordChecks.minLength ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                )}
                6 caractères minimum
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirmer</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirmez votre mot de passe"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="pl-10 pr-10"
                data-testid="input-confirm-password"
              />
              <button
                type="button"
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirm(!showConfirm)}
                data-testid="button-toggle-confirm"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-destructive" data-testid="text-password-mismatch">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground"
            disabled={register.isPending}
            data-testid="button-submit-register"
          >
            {register.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                Continuer <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline" data-testid="link-login">
              Se connecter
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            En continuant, vous acceptez nos{" "}
            <span className="underline cursor-pointer">Conditions d'Utilisation</span>{" "}
            et notre{" "}
            <span className="underline cursor-pointer">Politique de Confidentialité</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

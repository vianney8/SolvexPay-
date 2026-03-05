import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, ArrowRight, ChevronDown, CheckCircle2, Smartphone, Globe, Zap, ShieldCheck, RefreshCw } from "lucide-react";
import { OperatorLogo } from "@/components/operator-logo";
import solvexpayLogo from "../assets/images/solvexpay-logo.png";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

const countryCodes = [
  { code: "+229", country: "Bénin", flag: "🇧🇯" },
  { code: "+225", country: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+226", country: "Burkina Faso", flag: "🇧🇫" },
  { code: "+228", country: "Togo", flag: "🇹🇬" },
  { code: "+221", country: "Sénégal", flag: "🇸🇳" },
  { code: "+223", country: "Mali", flag: "🇲🇱" },
  { code: "+237", country: "Cameroun", flag: "🇨🇲" },
  { code: "+243", country: "RD Congo", flag: "🇨🇩" },
  { code: "+242", country: "Congo-Brazza.", flag: "🇨🇬" },
];

const operators = ["MTN", "Orange", "Wave", "Moov", "TMoney", "Airtel", "Vodacom", "Free"];

function AuthPanel() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full p-10 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, hsl(262 80% 12%) 0%, hsl(262 60% 20%) 40%, hsl(200 70% 16%) 100%)" }}
    >
      {/* Animated orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-violet-500/15 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-16 left-0 w-72 h-72 rounded-full bg-emerald-500/12 blur-3xl animate-float-delayed pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-cyan-500/8 blur-2xl animate-float-slow pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />

      {/* Logo */}
      <div className="relative flex items-center gap-3 z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-violet-400/30 blur-md" />
          <img src={solvexpayLogo} alt="SolvexPay" className="relative w-11 h-11 rounded-xl object-cover ring-2 ring-white/20 shadow-xl" />
        </div>
        <div>
          <span className="font-extrabold text-2xl text-white">SolvexPay</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Système opérationnel</span>
          </div>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30">
            <Globe className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-xs font-semibold text-violet-200">9 pays · 10+ opérateurs</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Paiements Mobile Money<br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">pour toute l'Afrique</span>
          </h2>
          <p className="text-white/55 text-sm leading-relaxed max-w-xs">
            MTN, Orange, Wave, Moov et bien plus. Gérez vos transactions depuis une seule plateforme sécurisée.
          </p>
        </div>

        {/* Operator logos grid */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Opérateurs supportés</p>
          <div className="grid grid-cols-4 gap-3">
            {operators.map((op) => (
              <div
                key={op}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/6 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <OperatorLogo operator={op} size={38} />
                <span className="text-[10px] font-semibold text-white/60 text-center leading-tight">{op}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Countries flags */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Pays couverts</p>
          <div className="flex flex-wrap gap-2">
            {countryCodes.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/6 border border-white/10"
              >
                <span className="text-base">{c.flag}</span>
                <span className="text-xs font-medium text-white/70">{c.country.split("-")[0].trim()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "9+", label: "Pays", icon: Globe, color: "text-violet-300" },
            { value: "10+", label: "Opérateurs", icon: Smartphone, color: "text-emerald-300" },
            { value: "99.9%", label: "Uptime", icon: Zap, color: "text-amber-300" },
          ].map((s) => (
            <div key={s.label} className="bg-white/6 rounded-2xl p-3.5 border border-white/8 text-center">
              <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1`} />
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/45 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-2 text-white/35 text-xs">
        <Lock className="h-3 w-3" />
        <span>Sécurisé par chiffrement TLS · Conforme KYC/AML</span>
      </div>
    </div>
  );
}

function VerifyEmailStep({ userId, email, onSuccess }: { userId: string; email: string; onSuccess: (user: any) => void }) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast({ title: "Erreur", description: "Entrez le code à 6 chiffres reçu par email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/verify-email", { userId, code: code.trim() });
      const user = await res.json();
      onSuccess(user);
    } catch (error: any) {
      const message = error?.message || "";
      let errorText = "Code invalide. Réessayez.";
      try {
        const parsed = JSON.parse(message.replace(/^\d+:\s*/, ""));
        errorText = parsed.message || errorText;
      } catch {}
      toast({ title: "Erreur", description: errorText, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { userId });
      toast({ title: "Code envoyé", description: "Un nouveau code a été envoyé à votre email." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de renvoyer le code. Réessayez plus tard.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/25 blur-lg" />
              <img src={solvexpayLogo} alt="SolvexPay" className="relative w-14 h-14 rounded-2xl object-cover ring-2 ring-violet-200 shadow-xl" />
            </div>
            <span className="font-extrabold text-2xl bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
          </div>

          <div className="space-y-2">
            <Link href="/" className="hidden lg:inline-flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-10 h-10 rounded-xl object-cover" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
            </Link>
            <div className="space-y-1 mt-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                  <ShieldCheck className="h-6 w-6 text-violet-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-foreground" data-testid="text-verify-title">Vérification email</h1>
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                Un code à 6 chiffres a été envoyé à <strong className="text-foreground">{email}</strong>. Vérifiez votre boîte de réception.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Code de vérification</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                className="h-14 text-center text-2xl font-mono font-bold tracking-[0.5em] border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
                data-testid="input-verification-code"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Valable 15 minutes. Vérifiez aussi vos spams.</p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-bold text-base shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.01] transition-all rounded-xl"
              disabled={loading || code.length !== 6}
              data-testid="button-submit-verify"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification...</>
              ) : (
                <span className="flex items-center gap-2 justify-center">Confirmer le code <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Vous n'avez pas reçu le code ?</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl"
              onClick={handleResend}
              disabled={resending}
              data-testid="button-resend-code"
            >
              {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Renvoyer le code
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative">
        <AuthPanel />
      </div>
    </div>
  );
}

export function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [verificationData, setVerificationData] = useState<{ userId: string; email: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }
    try {
      const data = await login.mutateAsync(formData);
      navigate("/dashboard");
    } catch (error: any) {
      const message = error?.message || "Erreur de connexion";
      let errorText = message;
      try {
        const parsed = JSON.parse(message.replace(/^\d+:\s*/, ""));
        errorText = parsed.message || message;
        if (parsed.blocked) {
          toast({ title: "Compte suspendu", description: "Votre compte a été suspendu par l'administrateur. Contactez le support.", variant: "destructive" });
          return;
        }
        if (parsed.requiresVerification) {
          setVerificationData({ userId: parsed.userId, email: parsed.email });
          return;
        }
      } catch {
        if (message.includes("401")) errorText = "Email ou mot de passe incorrect";
      }
      toast({ title: "Erreur", description: errorText, variant: "destructive" });
    }
  };

  if (verificationData) {
    return (
      <VerifyEmailStep
        userId={verificationData.userId}
        email={verificationData.email}
        onSuccess={(user) => {
          queryClient.setQueryData(["/api/auth/user"], user);
          navigate("/dashboard");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">

          {/* Top decoration for mobile */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/25 blur-lg" />
              <img src={solvexpayLogo} alt="SolvexPay" className="relative w-14 h-14 rounded-2xl object-cover ring-2 ring-violet-200 shadow-xl" />
            </div>
            <span className="font-extrabold text-2xl bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
          </div>

          <div className="space-y-2">
            <Link href="/" className="hidden lg:inline-flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-10 h-10 rounded-xl object-cover" data-testid="img-login-logo" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
            </Link>

            <div className="space-y-1 mt-2">
              <h1 className="text-3xl font-extrabold text-foreground" data-testid="text-login-title">Bon retour 👋</h1>
              <p className="text-muted-foreground text-sm">Connectez-vous à votre compte pour continuer.</p>
            </div>
          </div>

          {/* Colorful operator bar */}
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-violet-50 to-emerald-50 border border-violet-100/80">
            <div className="flex -space-x-1.5">
              {["MTN", "Orange", "Wave", "Moov"].map((op) => (
                <div key={op} className="ring-2 ring-white rounded-full overflow-hidden flex-shrink-0">
                  <OperatorLogo operator={op} size={26} />
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-violet-700 flex-1">MTN, Orange, Wave, Moov et 6 autres opérateurs</p>
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
                  placeholder="Votre mot de passe"
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
                  data-testid="button-toggle-password"
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
                <span className="flex items-center gap-2 justify-center">Se connecter <ArrowRight className="h-4 w-4" /></span>
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
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countryCode, setCountryCode] = useState("+229");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [verificationData, setVerificationData] = useState<{ userId: string; email: string } | null>(null);
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
      const data = await register.mutateAsync({
        fullName: formData.fullName,
        email: formData.email,
        phone: `${countryCode}${formData.phone}`,
        password: formData.password,
      });
      if (data?.requiresVerification) {
        setVerificationData({ userId: data.userId, email: data.email });
      } else {
        toast({ title: "Bienvenue !", description: "Votre compte a été créé avec succès" });
        navigate("/dashboard");
      }
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

  if (verificationData) {
    return (
      <VerifyEmailStep
        userId={verificationData.userId}
        email={verificationData.email}
        onSuccess={(user) => {
          queryClient.setQueryData(["/api/auth/user"], user);
          navigate("/dashboard");
        }}
      />
    );
  }

  const selectedCountry = countryCodes.find(c => c.code === countryCode)!;

  return (
    <div className="min-h-screen flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-4">

          {/* Top decoration for mobile */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-1">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/25 blur-lg" />
              <img src={solvexpayLogo} alt="SolvexPay" className="relative w-12 h-12 rounded-2xl object-cover ring-2 ring-violet-200 shadow-xl" />
            </div>
            <span className="font-extrabold text-xl bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
          </div>

          <div className="space-y-2">
            <Link href="/" className="hidden lg:inline-flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-10 h-10 rounded-xl object-cover" data-testid="img-register-logo" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
            </Link>
            <div className="space-y-1 mt-2">
              <h1 className="text-3xl font-extrabold text-foreground" data-testid="text-register-title">Créer un compte</h1>
              <p className="text-muted-foreground text-sm">Commencez à accepter des paiements en Afrique.</p>
            </div>
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
                  className="pl-10 h-12 border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
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
                  className="pl-10 h-12 border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
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
                    className="flex items-center gap-1.5 border border-border/70 rounded-xl px-3 h-12 text-sm bg-background hover:bg-muted/50 transition-colors min-w-[120px]"
                    data-testid="button-country-code"
                  >
                    <span className="text-base">{selectedCountry?.flag}</span>
                    <span className="font-semibold text-sm">{countryCode}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                  </button>
                  {showCountryDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-popover border border-popover-border rounded-2xl shadow-2xl z-50 min-w-[260px] py-2 overflow-hidden max-h-72 overflow-y-auto">
                      {countryCodes.map((cc) => {
                        const isSelected = cc.code === countryCode;
                        return (
                          <button
                            key={cc.code}
                            type="button"
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                              isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"
                            }`}
                            onClick={() => { setCountryCode(cc.code); setShowCountryDropdown(false); }}
                            data-testid={`option-country-${cc.code}`}
                          >
                            <span className="text-xl flex-shrink-0">{cc.flag}</span>
                            <span className="flex-1">{cc.country}</span>
                            <span className="text-xs text-muted-foreground font-mono">{cc.code}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-primary" />}
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
                  className="flex-1 h-12 border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
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
                  className="pl-10 pr-11 h-12 border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
                  data-testid="input-password"
                />
                <button type="button" className="absolute right-3.5 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)} data-testid="button-toggle-password">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className={`flex items-center gap-1.5 pt-0.5 text-xs ${passwordChecks.minLength ? "text-emerald-600" : "text-muted-foreground"}`}>
                <CheckCircle2 className="w-3 h-3" />
                6 caractères minimum
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
                  className="pl-10 pr-11 h-12 border-border/70 bg-background focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl"
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
              className="w-full h-12 font-bold text-base shadow-lg shadow-primary/25 hover:shadow-primary/35 hover:scale-[1.01] transition-all mt-2 rounded-xl"
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

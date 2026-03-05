import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  User, Mail, Lock, Eye, EyeOff, Save, Loader2, Shield,
  Smartphone, Upload, BadgeCheck, AlertTriangle, Store,
  ChevronRight,
} from "lucide-react";

const countryCodes = [
  { code: "+229", country: "Bénin", label: "BJ +229" },
  { code: "+225", country: "Côte d'Ivoire", label: "CI +225" },
  { code: "+226", country: "Burkina Faso", label: "BF +226" },
  { code: "+228", country: "Togo", label: "TG +228" },
  { code: "+221", country: "Sénégal", label: "SN +221" },
  { code: "+223", country: "Mali", label: "ML +223" },
  { code: "+237", country: "Cameroun", label: "CM +237" },
  { code: "+243", country: "RD Congo", label: "COD +243" },
  { code: "+242", country: "Congo", label: "COG +242" },
];

const WITHDRAWAL_COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", operators: ["MTN", "Moov"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", operators: ["TMoney", "Moov"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", operators: ["Orange", "Wave", "Free"] },
  { code: "ML", name: "Mali", flag: "🇲🇱", prefix: "+223", operators: ["Orange", "Moov"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", operators: ["MTN", "Orange"] },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", prefix: "+242", operators: ["Airtel", "MTN"] },
];

function detectCountryCode(phone: string) {
  return countryCodes.find(c => phone?.startsWith(c.code))?.code || "+229";
}
function stripCountryCode(phone: string) {
  for (const cc of countryCodes) {
    if (phone?.startsWith(cc.code)) return phone.slice(cc.code.length);
  }
  return phone || "";
}
function stripWithdrawalPrefix(phone: string, allPrefixes: string[]) {
  if (!phone) return "";
  for (const p of allPrefixes) {
    if (phone.startsWith(p)) return phone.slice(p.length).trim();
  }
  return phone;
}

function kycStatusLabel(status: string) {
  if (status === "verified") return { label: "Vérifié", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (status === "pending") return { label: "En attente", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  if (status === "rejected") return { label: "Rejeté", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
  return { label: "Non démarré", color: "bg-muted text-muted-foreground" };
}

function FileUploadField({ label, fieldName, value, onUploaded, required }: { label: string; fieldName: string; value: string; onUploaded: (url: string) => void; required?: boolean }) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (data.imageUrl) { onUploaded(data.imageUrl); toast({ title: "Photo téléchargée" }); }
      else toast({ title: "Erreur", description: "Impossible de télécharger", variant: "destructive" });
    } catch {
      toast({ title: "Erreur", description: "Erreur de téléchargement", variant: "destructive" });
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}{required && <span className="text-rose-500 ml-1">*</span>}</Label>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border/60 group">
          <img src={value} alt={label} className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button type="button" size="sm" variant="secondary" onClick={() => ref.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />Changer
            </Button>
          </div>
          <div className="absolute top-2 right-2">
            <Badge className="bg-emerald-500 text-white text-xs border-0">✓</Badge>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
          data-testid={`btn-upload-${fieldName}`}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          <span className="text-xs font-medium">{uploading ? "Téléchargement…" : "Cliquez pour choisir une photo"}</span>
        </button>
      )}
    </div>
  );
}

const navItems = [
  { key: "profile", label: "Profil", icon: User, desc: "Informations personnelles" },
  { key: "withdrawal", label: "Compte de retrait", icon: Smartphone, desc: "Mobile Money par défaut" },
  { key: "kyc", label: "Vérification KYC", icon: Shield, desc: "Identité & documents" },
  { key: "security", label: "Sécurité", icon: Lock, desc: "Mot de passe" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isVerified = (user as any)?.kycStatus === "verified";
  const [activeSection, setActiveSection] = useState("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [selectedCode, setSelectedCode] = useState("+229");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [wCountry, setWCountry] = useState("BJ");
  const [wOperator, setWOperator] = useState("");
  const [wPhone, setWPhone] = useState("");

  const [kycFirstName, setKycFirstName] = useState("");
  const [kycLastName, setKycLastName] = useState("");
  const [kycDocumentNumber, setKycDocumentNumber] = useState("");
  const [kycDocumentFront, setKycDocumentFront] = useState("");
  const [kycDocumentBack, setKycDocumentBack] = useState("");
  const [kycSelfie, setKycSelfie] = useState("");

  const wSelectedCountry = WITHDRAWAL_COUNTRIES.find(c => c.code === wCountry) || WITHDRAWAL_COUNTRIES[0];

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setMerchantName((user as any).merchantName || "");
      setSelectedCode(detectCountryCode(user.phone || ""));
      setPhoneNumber(stripCountryCode(user.phone || ""));
      const savedCountry = (user as any).withdrawalCountry || "BJ";
      setWCountry(savedCountry);
      setWOperator((user as any).withdrawalOperator || "");
      const savedPhone = (user as any).withdrawalPhone || "";
      setWPhone(stripWithdrawalPrefix(savedPhone, WITHDRAWAL_COUNTRIES.map(c => c.prefix)));
      if ((user as any).kycFirstName) setKycFirstName((user as any).kycFirstName);
      if ((user as any).kycLastName) setKycLastName((user as any).kycLastName);
      if ((user as any).kycDocumentNumber) setKycDocumentNumber((user as any).kycDocumentNumber);
      if ((user as any).kycDocumentFront) setKycDocumentFront((user as any).kycDocumentFront);
      if ((user as any).kycDocumentBack) setKycDocumentBack((user as any).kycDocumentBack);
      if ((user as any).kycSelfie) setKycSelfie((user as any).kycSelfie);
    }
  }, [user]);

  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("PATCH", "/api/auth/user", data); return res.json(); },
    onSuccess: (data) => { queryClient.setQueryData(["/api/auth/user"], data); toast({ title: "Profil mis à jour" }); },
    onError: () => toast({ title: "Erreur", description: "Impossible de mettre à jour le profil.", variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => { const res = await apiRequest("PATCH", "/api/auth/password", data); return res.json(); },
    onSuccess: () => { setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" }); toast({ title: "Mot de passe modifié" }); },
    onError: (error: any) => {
      let msg = "Impossible de modifier le mot de passe.";
      try { const p = JSON.parse(error?.message?.replace(/^\d+:\s*/, "") || "{}"); msg = p.message || msg; } catch {}
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    },
  });

  const withdrawalAccountMutation = useMutation({
    mutationFn: async (data: { country: string; operator: string; phone: string }) => { const res = await apiRequest("PATCH", "/api/auth/withdrawal-account", data); return res.json(); },
    onSuccess: (data) => { queryClient.setQueryData(["/api/auth/user"], data); toast({ title: "Compte de retrait mis à jour" }); },
    onError: () => toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" }),
  });

  const kycMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/kyc/submit", data); return res.json(); },
    onSuccess: (data) => { queryClient.setQueryData(["/api/auth/user"], data); toast({ title: "Demande envoyée", description: "Votre demande a été soumise. Vous recevrez une réponse sous 24h au plus tard 48h." }); },
    onError: (error: any) => {
      let msg = "Erreur lors de la soumission.";
      try { const p = JSON.parse(error?.message?.replace(/^\d+:\s*/, "") || "{}"); msg = p.message || msg; } catch {}
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      if (!firstName.trim()) {
        toast({ title: "Erreur", description: "Le prénom est obligatoire", variant: "destructive" });
        return;
      }
      if (!phoneNumber.trim() || phoneNumber.replace(/\s/g, "").length < 8) {
        toast({ title: "Erreur", description: "Le numéro de téléphone est obligatoire (8 chiffres minimum)", variant: "destructive" });
        return;
      }
    }
    const payload: any = { email, merchantName: merchantName || null };
    if (!isVerified) { payload.firstName = firstName; payload.lastName = lastName; payload.phone = `${selectedCode}${phoneNumber}`; }
    profileMutation.mutate(payload);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 6) { toast({ title: "Erreur", description: "6 caractères minimum", variant: "destructive" }); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    passwordMutation.mutate({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFirstName || !kycLastName) { toast({ title: "Erreur", description: "Prénom et nom requis", variant: "destructive" }); return; }
    if (!kycDocumentNumber) { toast({ title: "Erreur", description: "Numéro de la pièce requis", variant: "destructive" }); return; }
    if (!kycDocumentFront) { toast({ title: "Erreur", description: "Photo recto du document requise", variant: "destructive" }); return; }
    if (!kycSelfie) { toast({ title: "Erreur", description: "Selfie requis", variant: "destructive" }); return; }
    kycMutation.mutate({ kycFirstName, kycLastName, kycDocumentNumber, kycDocumentFront, kycDocumentBack: kycDocumentBack || null, kycSelfie });
  };

  const kycStatus = (user as any)?.kycStatus || "not_started";
  const kycSt = kycStatusLabel(kycStatus);
  const kycAlreadySubmitted = kycStatus === "pending" || kycStatus === "verified";

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || user?.email || "Mon compte";

  return (
    <DashboardLayout title="Paramètres" breadcrumbs={[{ label: "Paramètres" }]}>
      <div className="max-w-5xl space-y-6">

        {/* ── Header banner ── */}
        <div
          className="relative rounded-3xl overflow-hidden p-6 text-white"
          style={{ background: "linear-gradient(135deg, hsl(262 83% 46%) 0%, hsl(280 65% 58%) 60%, hsl(200 70% 50%) 100%)" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
          <div className="relative flex items-center gap-5">
            <div className="ring-4 ring-white/30 rounded-full shadow-2xl flex-shrink-0">
              <UserAvatar
                firstName={firstName || undefined}
                lastName={lastName || undefined}
                userId={user?.id}
                email={email || undefined}
                profileImageUrl={(user as any)?.profileImageUrl}
                size={72}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-2xl leading-tight" data-testid="text-settings-name">{displayName}</p>
              <p className="text-white/65 text-sm mt-0.5" data-testid="text-settings-email">{email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {user?.id && (
                  <span className="text-white/55 text-xs font-mono bg-white/10 px-2.5 py-1 rounded-lg border border-white/10" data-testid="text-user-id">
                    ID : {String(user.id).slice(0, 8).toUpperCase()}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${kycSt.color}`} data-testid="badge-kyc-status">
                  KYC : {kycSt.label}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg border border-white/15 bg-white/10 text-white/70 font-medium">
                  Français · XOF
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">

          {/* ── Left navigation panel ── */}
          <Card className="border-border/60 overflow-hidden lg:sticky lg:top-6">
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = activeSection === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setActiveSection(item.key)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-150 text-left group ${
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "text-foreground hover:bg-muted/70"
                      }`}
                      data-testid={`nav-settings-${item.key}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive ? "bg-white/20" : "bg-muted group-hover:bg-background"
                      }`}>
                        <item.icon className={`w-4.5 h-4.5 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} style={{ width: "18px", height: "18px" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-none mb-0.5 ${isActive ? "text-white" : ""}`}>{item.label}</p>
                        <p className={`text-xs truncate ${isActive ? "text-white/60" : "text-muted-foreground"}`}>{item.desc}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? "text-white/70 translate-x-0.5" : "text-muted-foreground/40"}`} />
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          {/* ── Right content panel ── */}
          <div className="space-y-5">

            {/* ────── PROFIL ────── */}
            {activeSection === "profile" && (
              <div className="space-y-5">
                {isVerified && (
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 flex items-start gap-3">
                    <BadgeCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Compte vérifié — Prénom, nom et téléphone sont verrouillés. Seul l'email et le nom marchand peuvent être modifiés.</p>
                  </div>
                )}

                <Card className="border-border/60">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-base" data-testid="text-profile-title">Informations personnelles</p>
                        <p className="text-xs text-muted-foreground">{isVerified ? "Certains champs sont verrouillés après vérification" : "Gérez vos informations de profil"}</p>
                      </div>
                    </div>
                    <form onSubmit={handleProfileSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prénom</Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" className="pl-10 h-11 border-border/70 disabled:opacity-60" disabled={isVerified} data-testid="input-firstname" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom</Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" className="pl-10 h-11 border-border/70 disabled:opacity-60" disabled={isVerified} data-testid="input-lastname" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adresse email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="pl-10 h-11 border-border/70" data-testid="input-settings-email" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Numéro de téléphone {!isVerified && <span className="text-rose-500 ml-0.5">*</span>}
                        </Label>
                        <div className="flex gap-2">
                          <Select value={selectedCode} onValueChange={setSelectedCode} disabled={isVerified}>
                            <SelectTrigger className="w-[130px] h-11 border-border/70 disabled:opacity-60" data-testid="button-settings-country-code">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countryCodes.map((cc) => (
                                <SelectItem key={cc.code} value={cc.code} data-testid={`option-settings-country-${cc.code}`}>{cc.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ""))} placeholder="97 00 00 00" className="flex-1 h-11 border-border/70 disabled:opacity-60" disabled={isVerified} required={!isVerified} data-testid="input-settings-phone" />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5" />Nom marchand (optionnel)
                        </Label>
                        <div className="relative">
                          <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="Ex: Ma Boutique En Ligne" className="pl-10 h-11 border-border/70" data-testid="input-merchant-name" />
                        </div>
                        <p className="text-xs text-muted-foreground">Ce nom s'affichera sur vos liens de paiement.</p>
                      </div>

                      <Button type="submit" className="gap-2 h-11 font-semibold shadow-lg shadow-primary/20" disabled={profileMutation.isPending} data-testid="button-save-profile">
                        {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Enregistrer les modifications
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ────── COMPTE DE RETRAIT ────── */}
            {activeSection === "withdrawal" && (
              <Card className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-bold text-base" data-testid="text-withdrawal-account-title">Compte de retrait par défaut</p>
                      <p className="text-xs text-muted-foreground">Pré-remplit le formulaire de retrait automatiquement</p>
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!wOperator || !wPhone) { toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" }); return; }
                      withdrawalAccountMutation.mutate({ country: wCountry, operator: wOperator, phone: wPhone });
                    }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pays Mobile Money</Label>
                      <Select value={wCountry} onValueChange={(v) => { setWCountry(v); setWOperator(""); setWPhone(""); }}>
                        <SelectTrigger className="h-11 border-border/70" data-testid="select-withdrawal-country"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WITHDRAWAL_COUNTRIES.map((c) => (<SelectItem key={c.code} value={c.code} data-testid={`option-w-country-${c.code}`}>{c.flag} {c.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opérateur</Label>
                      <div className="flex flex-wrap gap-2">
                        {wSelectedCountry.operators.map((op) => (
                          <button key={op} type="button" onClick={() => setWOperator(op)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${wOperator === op ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400" : "border-border/70 bg-background text-muted-foreground hover:border-orange-400 hover:text-orange-600"}`} data-testid={`button-w-operator-${op}`}>{op}</button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro Mobile Money</Label>
                      <div className="flex gap-0 rounded-xl border border-border/70 overflow-hidden focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/10 transition-all">
                        <div className="flex items-center gap-2 px-3 bg-muted/40 border-r border-border/70 flex-shrink-0 select-none">
                          <span className="text-base">{wSelectedCountry.flag}</span>
                          <span className="text-sm font-semibold text-muted-foreground">{wSelectedCountry.prefix}</span>
                        </div>
                        <Input value={wPhone} onChange={(e) => setWPhone(e.target.value.replace(/[^0-9\s]/g, ""))} placeholder="97 00 00 00" className="flex-1 h-11 border-0 rounded-none focus-visible:ring-0 bg-transparent" data-testid="input-withdrawal-phone" />
                      </div>
                      <p className="text-xs text-muted-foreground">Entrez uniquement le numéro local, sans indicatif</p>
                    </div>

                    <Button type="submit" className="gap-2 h-11 font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20" disabled={withdrawalAccountMutation.isPending} data-testid="button-save-withdrawal-account">
                      {withdrawalAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Enregistrer le compte de retrait
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* ────── KYC ────── */}
            {activeSection === "kyc" && (
              <Card className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kycStatus === "verified" ? "bg-emerald-500/10" : kycStatus === "pending" ? "bg-amber-500/10" : "bg-primary/10"}`}>
                        <Shield className={`h-5 w-5 ${kycStatus === "verified" ? "text-emerald-600" : kycStatus === "pending" ? "text-amber-600" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-bold text-base">Vérification d'identité (KYC)</p>
                        <p className="text-xs text-muted-foreground">Vérifiez votre identité pour débloquer tous les services</p>
                      </div>
                    </div>
                    <Badge className={kycSt.color}>{kycSt.label}</Badge>
                  </div>

                  {kycStatus === "verified" && (
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 flex items-start gap-3">
                      <BadgeCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">Identité vérifiée</p>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Votre compte a été vérifié avec succès. Tous les services sont débloqués.</p>
                      </div>
                    </div>
                  )}

                  {kycStatus === "pending" && (
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-amber-700 dark:text-amber-300">En cours de vérification</p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">Votre dossier est en cours de révision. Vous serez notifié dans un délai de 24h à 48h.</p>
                      </div>
                    </div>
                  )}

                  {kycStatus === "rejected" && (
                    <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-rose-700 dark:text-rose-300">Demande rejetée</p>
                        {(user as any)?.kycRejectionReason && <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Motif : {(user as any).kycRejectionReason}</p>}
                        <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">Vous pouvez soumettre une nouvelle demande ci-dessous.</p>
                      </div>
                    </div>
                  )}

                  {kycStatus === "not_started" && (
                    <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300 mb-5">
                      <p className="font-semibold mb-1">Documents requis :</p>
                      <ul className="space-y-1 text-xs list-disc list-inside">
                        <li>Pièce d'identité (CNI, passeport ou permis) — recto obligatoire, verso recommandé</li>
                        <li>Selfie tenant la pièce d'identité</li>
                      </ul>
                    </div>
                  )}

                  {(kycStatus === "not_started" || kycStatus === "rejected") && (
                    <form onSubmit={handleKycSubmit} className="space-y-5 mt-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prénom <span className="text-rose-500">*</span></Label>
                          <Input value={kycFirstName} onChange={e => setKycFirstName(e.target.value)} placeholder="Prénom sur document" className="h-11 border-border/70" required data-testid="input-kyc-firstname" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom <span className="text-rose-500">*</span></Label>
                          <Input value={kycLastName} onChange={e => setKycLastName(e.target.value)} placeholder="Nom sur document" className="h-11 border-border/70" required data-testid="input-kyc-lastname" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de la pièce d'identité <span className="text-rose-500">*</span></Label>
                        <Input value={kycDocumentNumber} onChange={e => setKycDocumentNumber(e.target.value)} placeholder="Ex : BJ12345678" className="h-11 border-border/70 font-mono" required data-testid="input-kyc-document-number" />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FileUploadField label="Pièce d'identité (recto)" fieldName="doc-front" value={kycDocumentFront} onUploaded={setKycDocumentFront} required />
                        <FileUploadField label="Pièce d'identité (verso)" fieldName="doc-back" value={kycDocumentBack} onUploaded={setKycDocumentBack} />
                      </div>

                      <FileUploadField label="Selfie avec la pièce d'identité" fieldName="selfie" value={kycSelfie} onUploaded={setKycSelfie} required />

                      <Button type="submit" className="w-full gap-2 h-11 font-semibold" disabled={kycMutation.isPending || !kycDocumentFront || !kycSelfie || !kycFirstName || !kycLastName || !kycDocumentNumber} data-testid="button-submit-kyc">
                        {kycMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                        Soumettre la demande de vérification
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ────── SÉCURITÉ ────── */}
            {activeSection === "security" && (
              <Card className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-bold text-base" data-testid="text-password-title">Sécurité du compte</p>
                      <p className="text-xs text-muted-foreground">Modifiez votre mot de passe</p>
                    </div>
                  </div>
                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    {[
                      { key: "currentPassword", label: "Mot de passe actuel", show: showCurrentPassword, setShow: setShowCurrentPassword, testId: "input-current-password", toggleTestId: "button-toggle-current-password" },
                      { key: "newPassword", label: "Nouveau mot de passe", show: showNewPassword, setShow: setShowNewPassword, testId: "input-new-password", toggleTestId: "button-toggle-new-password" },
                      { key: "confirmPassword", label: "Confirmer le nouveau mot de passe", show: showConfirmPassword, setShow: setShowConfirmPassword, testId: "input-confirm-new-password", toggleTestId: "button-toggle-confirm-new-password" },
                    ].map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{field.label}</Label>
                        <div className="relative flex items-center">
                          <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input type={field.show ? "text" : "password"} value={(passwordData as any)[field.key]} onChange={(e) => setPasswordData({ ...passwordData, [field.key]: e.target.value })} placeholder="••••••••" className="pl-10 pr-11 h-11 border-border/70" required data-testid={field.testId} />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => field.setShow(!field.show)} data-testid={field.toggleTestId}>
                            {field.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {field.key === "newPassword" && passwordData.newPassword.length > 0 && passwordData.newPassword.length < 6 && (<p className="text-xs text-destructive font-medium">6 caractères minimum</p>)}
                        {field.key === "confirmPassword" && passwordData.confirmPassword.length > 0 && passwordData.newPassword !== passwordData.confirmPassword && (<p className="text-xs text-destructive font-medium" data-testid="text-password-mismatch">Les mots de passe ne correspondent pas</p>)}
                      </div>
                    ))}
                    <Button type="submit" variant="destructive" className="gap-2 h-11 font-semibold" disabled={passwordMutation.isPending} data-testid="button-change-password">
                      {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Modifier le mot de passe
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

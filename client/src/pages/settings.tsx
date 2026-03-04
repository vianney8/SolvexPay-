import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  User, Mail, Lock, Eye, EyeOff, Save, Loader2, Shield, Globe,
  Webhook, Copy, CheckCircle2, ExternalLink, Settings, Smartphone,
  Upload, Camera, FileText, AlertTriangle, BadgeCheck, Store,
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

function WebhookCard() {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { data: webhookData } = useQuery<{ webhookUrl: string; callbackUrl: string; domain: string; instructions: string; steps: string[] }>({ queryKey: ["/api/settings/webhook-urls"] });
  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copié !", description: "URL copiée dans le presse-papiers." });
    setTimeout(() => setCopiedField(null), 2000);
  };
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <Webhook className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-base font-bold" data-testid="text-webhook-title">Webhook & Callback OmniPay</CardTitle>
            <CardDescription className="text-xs">Configurez ces URLs dans votre tableau de bord OmniPay</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {[
          { label: "URL du Webhook", key: "webhook", value: webhookData?.webhookUrl, desc: "Reçoit les événements: payment.completed, payment.failed", testId: "input-webhook-url" },
          { label: "URL de Callback", key: "callback", value: webhookData?.callbackUrl, desc: "URL où le client est redirigé après paiement", testId: "input-callback-url" },
        ].map((item) => (
          <div key={item.key} className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{item.label}</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={item.value || "Chargement..."} className="font-mono text-xs h-10 bg-muted/40 border-border/60 text-muted-foreground" data-testid={item.testId} />
              <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0 border-border/60" onClick={() => item.value && copy(item.value, item.key)} data-testid={`button-copy-${item.key}`}>
                {copiedField === item.key ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
        ))}
        <Separator />
        {webhookData?.steps && (
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instructions de configuration</Label>
            <ol className="space-y-2">
              {webhookData.steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-3">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                  <span>{step.replace(/^\d+\.\s*/, "")}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="pt-1">
          <a href="https://omnipay.webtechci.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold transition-colors" data-testid="link-sendavapay-dashboard">
            <ExternalLink className="h-4 w-4" />Ouvrir le tableau de bord OmniPay
          </a>
        </div>
      </CardContent>
    </Card>
  );
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isVerified = (user as any)?.kycStatus === "verified";

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
    if (!kycDocumentFront) { toast({ title: "Erreur", description: "Photo recto du document requise", variant: "destructive" }); return; }
    if (!kycSelfie) { toast({ title: "Erreur", description: "Selfie requis", variant: "destructive" }); return; }
    kycMutation.mutate({ kycFirstName, kycLastName, kycDocumentFront, kycDocumentBack: kycDocumentBack || null, kycSelfie });
  };

  const kycStatus = (user as any)?.kycStatus || "not_started";
  const kycSt = kycStatusLabel(kycStatus);
  const kycAlreadySubmitted = kycStatus === "pending" || kycStatus === "verified";

  return (
    <DashboardLayout title="Paramètres" breadcrumbs={[{ label: "Paramètres" }]}>
      <div className="max-w-2xl space-y-6">
        <div className="relative rounded-3xl p-6 text-white overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, hsl(262 83% 52%) 0%, hsl(280 70% 60%) 100%)" }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/30">
              <UserAvatar userId={user?.id} email={email || undefined} size={56} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xl">{[firstName, lastName].filter(Boolean).join(" ") || "Mon compte"}</p>
              <p className="text-white/70 text-sm">{email}</p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {user?.id && <span className="text-white/60 text-xs font-mono bg-white/10 px-2 py-0.5 rounded-md" data-testid="text-user-id">ID : {String(user.id).slice(0, 8).toUpperCase()}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-md border ${kycSt.color}`} data-testid="badge-kyc-status">KYC : {kycSt.label}</span>
              </div>
            </div>
            <div className="ml-auto flex-shrink-0">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Settings className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-5">
          <TabsList className="h-11 w-full grid grid-cols-3 bg-muted/50 rounded-xl border border-border/60 p-1">
            <TabsTrigger value="profile" className="rounded-lg font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-settings-profile">
              <User className="h-3.5 w-3.5 mr-1.5" />Profil
            </TabsTrigger>
            <TabsTrigger value="kyc" className="rounded-lg font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-settings-kyc">
              <Shield className="h-3.5 w-3.5 mr-1.5" />Vérification
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg font-semibold text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm" data-testid="tab-settings-security">
              <Lock className="h-3.5 w-3.5 mr-1.5" />Sécurité
            </TabsTrigger>
          </TabsList>

          {/* ── PROFILE TAB ── */}
          <TabsContent value="profile" className="space-y-5">
            {isVerified && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 flex items-start gap-2.5">
                <BadgeCheck className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">Compte vérifié — Prénom, nom et téléphone sont verrouillés. Seul l'email et le nom marchand peuvent être modifiés.</p>
              </div>
            )}

            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold" data-testid="text-profile-title">Informations personnelles</CardTitle>
                    <CardDescription className="text-xs">{isVerified ? "Certains champs sont verrouillés après vérification" : "Gérez vos informations de profil"}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Numéro de téléphone</Label>
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
                      <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ""))} placeholder="97 00 00 00" className="flex-1 h-11 border-border/70 disabled:opacity-60" disabled={isVerified} data-testid="input-settings-phone" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" />Nom marchand
                    </Label>
                    <div className="relative">
                      <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} placeholder="Ex: Ma Boutique En Ligne" className="pl-10 h-11 border-border/70" data-testid="input-merchant-name" />
                    </div>
                    <p className="text-xs text-muted-foreground">Ce nom s'affichera sur vos liens de paiement à la place de votre prénom et nom.</p>
                  </div>

                  <Button type="submit" className="gap-2 h-11 font-semibold shadow-lg shadow-primary/20" disabled={profileMutation.isPending} data-testid="button-save-profile">
                    {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer les modifications
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 py-1">
                  <div><p className="font-semibold text-sm">Langue</p><p className="text-xs text-muted-foreground">Langue de l'interface</p></div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">Français</Badge>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between gap-4 py-1">
                  <div><p className="font-semibold text-sm">Devise par défaut</p><p className="text-xs text-muted-foreground">Devise principale pour les transactions</p></div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">XOF (FCFA)</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold" data-testid="text-withdrawal-account-title">Compte de retrait par défaut</CardTitle>
                    <CardDescription className="text-xs">Pré-remplit le formulaire de retrait automatiquement</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); if (!wOperator || !wPhone) { toast({ title: "Erreur", description: "Veuillez remplir tous les champs", variant: "destructive" }); return; } withdrawalAccountMutation.mutate({ country: wCountry, operator: wOperator, phone: wPhone }); }} className="space-y-5">
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
                        <button key={op} type="button" onClick={() => setWOperator(op)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${wOperator === op ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400" : "border-border/70 bg-background text-muted-foreground hover:border-orange-400 hover:text-orange-600"}`} data-testid={`button-w-operator-${op}`}>{op}</button>
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

            <WebhookCard />
          </TabsContent>

          {/* ── KYC TAB ── */}
          <TabsContent value="kyc" className="space-y-5">
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kycStatus === "verified" ? "bg-emerald-500/10" : kycStatus === "pending" ? "bg-amber-500/10" : "bg-primary/10"}`}>
                      <Shield className={`h-5 w-5 ${kycStatus === "verified" ? "text-emerald-600" : kycStatus === "pending" ? "text-amber-600" : "text-primary"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Vérification d'identité (KYC)</CardTitle>
                      <CardDescription className="text-xs">Vérifiez votre identité pour débloquer tous les services</CardDescription>
                    </div>
                  </div>
                  <Badge className={kycSt.color}>{kycSt.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">

                {kycStatus === "verified" && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 flex items-start gap-3">
                    <BadgeCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">Identité vérifiée</p>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Votre compte a été vérifié avec succès. Tous les services sont débloqués.</p>
                    </div>
                  </div>
                )}

                {kycStatus === "pending" && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-amber-700 dark:text-amber-300">En cours de vérification</p>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">Votre dossier est en cours de révision par nos équipes. Vous serez notifié dans un délai de 24h au plus tard 48h.</p>
                    </div>
                  </div>
                )}

                {kycStatus === "rejected" && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-rose-700 dark:text-rose-300">Demande rejetée</p>
                      {(user as any)?.kycRejectionReason && <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Motif : {(user as any).kycRejectionReason}</p>}
                      <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">Vous pouvez soumettre une nouvelle demande ci-dessous.</p>
                    </div>
                  </div>
                )}

                {kycStatus === "not_started" && (
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-semibold mb-1">Documents requis :</p>
                    <ul className="space-y-1 text-xs list-disc list-inside">
                      <li>Pièce d'identité (CNI, passeport ou permis) — recto obligatoire, verso recommandé</li>
                      <li>Selfie tenant la pièce d'identité</li>
                    </ul>
                  </div>
                )}

                {kycStatus !== "verified" && (
                  <form onSubmit={handleKycSubmit} className="space-y-5">
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

                    <Separator />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FileUploadField label="Pièce d'identité (recto)" fieldName="doc-front" value={kycDocumentFront} onUploaded={setKycDocumentFront} required />
                      <FileUploadField label="Pièce d'identité (verso)" fieldName="doc-back" value={kycDocumentBack} onUploaded={setKycDocumentBack} />
                    </div>

                    <FileUploadField label="Selfie avec la pièce d'identité" fieldName="selfie" value={kycSelfie} onUploaded={setKycSelfie} required />

                    {kycStatus === "pending" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Vous pouvez mettre à jour votre dossier et soumettre à nouveau.</p>
                    )}

                    <Button type="submit" className="w-full gap-2 h-11 font-semibold" disabled={kycMutation.isPending || !kycDocumentFront || !kycSelfie || !kycFirstName || !kycLastName} data-testid="button-submit-kyc">
                      {kycMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      {kycStatus === "pending" ? "Mettre à jour la demande" : "Soumettre la demande de vérification"}
                    </Button>
                  </form>
                )}

                {kycStatus === "verified" && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-muted-foreground">Documents soumis :</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(user as any)?.kycDocumentFront && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Recto</p>
                          <img src={(user as any).kycDocumentFront} alt="Recto" className="rounded-xl border border-border/60 w-full h-32 object-cover" />
                        </div>
                      )}
                      {(user as any)?.kycDocumentBack && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Verso</p>
                          <img src={(user as any).kycDocumentBack} alt="Verso" className="rounded-xl border border-border/60 w-full h-32 object-cover" />
                        </div>
                      )}
                      {(user as any)?.kycSelfie && (
                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-xs text-muted-foreground font-medium">Selfie</p>
                          <img src={(user as any).kycSelfie} alt="Selfie" className="rounded-xl border border-border/60 w-full h-40 object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SECURITY TAB ── */}
          <TabsContent value="security">
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold" data-testid="text-password-title">Sécurité du compte</CardTitle>
                    <CardDescription className="text-xs">Modifiez votre mot de passe</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

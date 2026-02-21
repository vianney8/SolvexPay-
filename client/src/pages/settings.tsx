import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Shield,
  Bell,
  Globe,
  Webhook,
  Copy,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

const countryCodes = [
  { code: "+229", country: "Benin", label: "BJ +229" },
  { code: "+225", country: "Cote d'Ivoire", label: "CI +225" },
  { code: "+226", country: "Burkina Faso", label: "BF +226" },
  { code: "+228", country: "Togo", label: "TG +228" },
  { code: "+221", country: "Senegal", label: "SN +221" },
];

function detectCountryCode(phone: string) {
  return countryCodes.find(c => phone?.startsWith(c.code))?.code || "+229";
}

function stripCountryCode(phone: string) {
  for (const cc of countryCodes) {
    if (phone?.startsWith(cc.code)) {
      return phone.slice(cc.code.length);
    }
  }
  return phone || "";
}

function WebhookConfigCard() {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: webhookData } = useQuery<{
    webhookUrl: string;
    callbackUrl: string;
    domain: string;
    instructions: string;
    steps: string[];
  }>({
    queryKey: ["/api/settings/webhook-urls"],
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copie !", description: "URL copiee dans le presse-papiers." });
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Webhook className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <CardTitle data-testid="text-webhook-title">Webhook & Callback SendavaPay</CardTitle>
            <CardDescription>Configurez ces URLs dans votre tableau de bord SendavaPay</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">URL du Webhook</Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={webhookData?.webhookUrl || "Chargement..."}
              className="font-mono text-sm bg-muted"
              data-testid="input-webhook-url"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => webhookData && copyToClipboard(webhookData.webhookUrl, "webhook")}
              data-testid="button-copy-webhook"
            >
              {copiedField === "webhook" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Recoit les evenements: payment.completed, payment.failed, credit.completed</p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">URL de Callback (Redirection)</Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={webhookData?.callbackUrl || "Chargement..."}
              className="font-mono text-sm bg-muted"
              data-testid="input-callback-url"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => webhookData && copyToClipboard(webhookData.callbackUrl, "callback")}
              data-testid="button-copy-callback"
            >
              {copiedField === "callback" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">URL ou le client est redirige apres le paiement</p>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Instructions de configuration</Label>
          {webhookData?.steps ? (
            <ol className="space-y-2">
              {webhookData.steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">{i + 1}</span>
                  <span>{step.replace(/^\d+\.\s*/, "")}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Chargement des instructions...</p>
          )}
        </div>

        <div className="pt-2">
          <a
            href="https://sendavapay.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            data-testid="link-sendavapay-dashboard"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir le tableau de bord SendavaPay
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCode, setSelectedCode] = useState("+229");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setSelectedCode(detectCountryCode(user.phone || ""));
      setPhoneNumber(stripCountryCode(user.phone || ""));
    }
  }, [user]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; phone: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/user", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({
        title: "Profil mis a jour",
        description: "Vos informations ont ete mises a jour avec succes.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre a jour le profil.",
        variant: "destructive",
      });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/auth/password", data);
      return res.json();
    },
    onSuccess: () => {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Mot de passe modifie",
        description: "Votre mot de passe a ete modifie avec succes.",
      });
    },
    onError: (error: any) => {
      let msg = "Impossible de modifier le mot de passe.";
      try {
        const parsed = JSON.parse(error?.message?.replace(/^\d+:\s*/, "") || "{}");
        msg = parsed.message || msg;
      } catch {}
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate({
      firstName,
      lastName,
      email,
      phone: `${selectedCode}${phoneNumber}`,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caracteres", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  return (
    <DashboardLayout title="Parametres" breadcrumbs={[{ label: "Parametres" }]}>
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle data-testid="text-profile-title">Informations personnelles</CardTitle>
                <CardDescription>Gerez vos informations de profil</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prenom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Prenom"
                      className="pl-10"
                      data-testid="input-firstname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Nom"
                      className="pl-10"
                      data-testid="input-lastname"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="pl-10"
                    data-testid="input-settings-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Numero de telephone</Label>
                <div className="flex gap-2">
                  <Select value={selectedCode} onValueChange={setSelectedCode}>
                    <SelectTrigger className="w-[130px]" data-testid="button-settings-country-code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code} data-testid={`option-settings-country-${cc.code}`}>
                          {cc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9\s]/g, "");
                      setPhoneNumber(val);
                    }}
                    placeholder="97 00 00 00"
                    className="flex-1"
                    data-testid="input-settings-phone"
                  />
                </div>
              </div>

              <Button type="submit" className="gap-2" disabled={profileMutation.isPending} data-testid="button-save-profile">
                {profileMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle data-testid="text-password-title">Securite</CardTitle>
                <CardDescription>Modifiez votre mot de passe</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Mot de passe actuel"
                    className="pl-10 pr-10"
                    required
                    data-testid="input-current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    data-testid="button-toggle-current-password"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="6 caracteres minimum"
                    className="pl-10 pr-10"
                    required
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    data-testid="button-toggle-new-password"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordData.newPassword.length > 0 && passwordData.newPassword.length < 6 && (
                  <p className="text-xs text-destructive">6 caracteres minimum</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirmez le mot de passe"
                    className="pl-10 pr-10"
                    required
                    data-testid="input-confirm-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="button-toggle-confirm-new-password"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordData.confirmPassword.length > 0 && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-xs text-destructive" data-testid="text-password-mismatch">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <Button type="submit" variant="destructive" className="gap-2" disabled={passwordMutation.isPending} data-testid="button-change-password">
                {passwordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Modifier le mot de passe
              </Button>
            </form>
          </CardContent>
        </Card>

        <WebhookConfigCard />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle data-testid="text-preferences-title">Preferences</CardTitle>
                <CardDescription>Parametres de l'application</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Langue</p>
                  <p className="text-sm text-muted-foreground">Langue de l'interface</p>
                </div>
                <Badge>Francais</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Devise par defaut</p>
                  <p className="text-sm text-muted-foreground">Devise principale pour les transactions</p>
                </div>
                <Badge>XOF (FCFA)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

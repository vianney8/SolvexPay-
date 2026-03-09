import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Loader2, 
  Building2, 
  Globe, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Terminal,
  Settings as SettingsIcon,
  LogOut
} from "lucide-react";

export default function PartnerSettings() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("profile");
  const { data: profileData } = useQuery<any>({ queryKey: ["/api/partner/profile"] });

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
    }
    if (profileData?.profile) {
      setCompanyName(profileData.profile.companyName || "");
    }
  }, [user, profileData]);

  const profileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", "/api/partner/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/profile"] });
      toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées avec succès." });
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de mettre à jour le profil.", variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", "/api/partner/password", data);
    },
    onSuccess: () => {
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Mot de passe modifié", description: "Votre nouveau mot de passe est actif." });
    },
    onError: (error: any) => {
      let msg = "Erreur de changement de mot de passe.";
      try {
        const p = JSON.parse(error.message?.replace(/^\d+:\s*/, "") || "{}");
        msg = p.message || msg;
      } catch {}
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMutation.mutate({ companyName });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Erreur", description: "6 caractères minimum.", variant: "destructive" });
      return;
    }
    passwordMutation.mutate({ oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword });
  };

  const navItems = [
    { id: "profile", label: "Profil Entreprise", icon: Building2, desc: "Identité de votre marque" },
    { id: "security", label: "Sécurité", icon: Lock, desc: "Gérer votre mot de passe" },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div
        className="relative rounded-3xl p-8 text-white overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, hsl(262 83% 46%) 0%, hsl(280 65% 58%) 60%, hsl(200 70% 50%) 100%)" }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="relative flex items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/10 shadow-lg backdrop-blur-sm">
             <Building2 className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black uppercase tracking-tight truncate">{companyName || "Mon Entreprise"}</h2>
            <p className="text-white/70 font-bold text-xs uppercase tracking-widest mt-1">Compte Partenaire Direct</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              className="bg-white/10 text-white hover:bg-white/20 font-bold rounded-xl h-10 px-4"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Quitter
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card className="border-border/60 rounded-3xl shadow-sm overflow-hidden lg:sticky lg:top-6">
          <CardContent className="p-3">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 text-left group ${
                    activeSection === item.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${activeSection === item.id ? "bg-white/20" : "bg-muted group-hover:bg-background"}`}>
                    <item.icon className={`h-5 w-5 ${activeSection === item.id ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-xs uppercase tracking-tight ${activeSection === item.id ? "text-white" : "text-foreground"}`}>{item.label}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${activeSection === item.id ? "text-white/60" : "text-muted-foreground"}`}>{item.desc}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 transition-transform ${activeSection === item.id ? "text-white/50 translate-x-1" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {activeSection === "profile" && (
            <Card className="border-border/60 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Informations Entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom de l'entreprise</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)} 
                        className="pl-10 h-12 border-border/70 rounded-xl bg-background"
                        placeholder="Ex: Ma Société SAS"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2 opacity-60 grayscale pointer-events-none">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email de contact (Verrouillé)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={email} readOnly className="pl-10 h-12 border-border/70 rounded-xl bg-muted" />
                    </div>
                  </div>
                  <Button type="submit" className="h-12 font-black uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-primary/20" disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Enregistrer le profil
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <Card className="border-border/60 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-6 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" /> Changer le mot de passe
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ancien mot de passe</Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input 
                        type={showOldPassword ? "text" : "password"} 
                        value={passwordData.oldPassword} 
                        onChange={(e) => setPasswordData(p => ({ ...p, oldPassword: e.target.value }))}
                        className="pl-10 pr-11 h-12 border-border/70 rounded-xl bg-background"
                        required
                      />
                      <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3.5 text-muted-foreground p-0.5">
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nouveau mot de passe</Label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input 
                          type={showNewPassword ? "text" : "password"} 
                          value={passwordData.newPassword} 
                          onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                          className="pl-10 pr-11 h-12 border-border/70 rounded-xl bg-background"
                          required
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 text-muted-foreground p-0.5">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirmer le mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input 
                          type="password" 
                          value={passwordData.confirmPassword} 
                          onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                          className="pl-10 h-12 border-border/70 rounded-xl bg-background"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button type="submit" className="h-12 font-black uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-primary/20" disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Mettre à jour le mot de passe
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 rounded-3xl bg-amber-500/5 border-amber-500/20 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-sm uppercase tracking-tight text-amber-900">Vérification KYC</p>
                  <p className="text-[10px] font-bold text-amber-700 uppercase leading-relaxed tracking-widest">
                    Les comptes partenaires sont soumis à une vérification manuelle par nos administrateurs. Certaines fonctionnalités peuvent être restreintes tant que votre profil n'est pas entièrement validé.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

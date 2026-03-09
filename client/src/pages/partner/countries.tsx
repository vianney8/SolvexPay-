import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Globe, ShieldCheck, Zap, AlertCircle, Save, Loader2, Info } from "lucide-react";
import { useState, useEffect } from "react";

const AVAILABLE_COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", operators: ["MTN", "Moov"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", operators: ["Orange", "MTN", "Moov", "Wave"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", operators: ["Moov", "Orange"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", operators: ["TMoney", "Moov"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", operators: ["Orange", "Wave", "Free"] },
  { code: "ML", name: "Mali", flag: "🇲🇱", operators: ["Orange", "Moov"] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", operators: ["MTN", "Orange"] },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", operators: ["Vodacom", "Airtel", "Orange"] },
  { code: "COG", name: "Congo-Brazzaville", flag: "🇨🇬", operators: ["Airtel", "MTN"] },
];

export default function PartnerCountries() {
  const { toast } = useToast();
  const [enabledCountries, setEnabledCountries] = useState<string[]>([]);
  const { data: profileData, isLoading } = useQuery<any>({ queryKey: ["/api/partner/profile"] });

  useEffect(() => {
    if (profileData?.profile?.enabledCountries) {
      setEnabledCountries(profileData.profile.enabledCountries);
    }
  }, [profileData]);

  const updateMutation = useMutation({
    mutationFn: async (countries: string[]) => {
      return apiRequest("PATCH", "/api/partner/profile", { enabledCountries: countries });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/profile"] });
      toast({ title: "Pays mis à jour", description: "Les pays autorisés pour vos paiements directs ont été enregistrés." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour les pays.", variant: "destructive" });
    },
  });

  const toggleCountry = (code: string) => {
    setEnabledCountries(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div
        className="relative rounded-3xl p-8 text-white overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, hsl(142 70% 45%) 0%, hsl(160 80% 40%) 100%)" }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
            <Globe className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-2xl uppercase tracking-tight">Zone de Couverture</p>
            <p className="text-white/70 text-sm font-bold mt-1 uppercase tracking-widest">Gérez vos pays d'activation</p>
          </div>
          <Button
            className="flex-shrink-0 bg-white text-emerald-600 hover:bg-white/90 font-black h-12 px-6 rounded-xl shadow-lg transition-transform active:scale-95"
            onClick={() => updateMutation.mutate(enabledCountries)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)
        ) : (
          AVAILABLE_COUNTRIES.map((country) => (
            <Card 
              key={country.code} 
              className={`border-border/60 rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer group ${enabledCountries.includes(country.code) ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5 shadow-md" : "hover:border-primary/30"}`}
              onClick={() => toggleCountry(country.code)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl filter drop-shadow-sm">{country.flag}</span>
                    <div className="min-w-0">
                      <p className="font-black text-sm uppercase tracking-tight truncate">{country.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{country.code}</p>
                    </div>
                  </div>
                  <Checkbox 
                    checked={enabledCountries.includes(country.code)} 
                    onCheckedChange={() => toggleCountry(country.code)}
                    className="h-6 w-6 rounded-lg data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/40">
                  {country.operators.map(op => (
                    <span key={op} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${enabledCountries.includes(country.code) ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" : "border-border/60 text-muted-foreground bg-muted/50"}`}>
                      {op}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-border/60 rounded-3xl bg-amber-500/5 border-amber-500/20 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-sm uppercase tracking-tight text-amber-900">Important</p>
              <p className="text-xs font-bold text-amber-700 uppercase leading-relaxed tracking-widest">
                L'activation d'un pays vous permet d'initier des paiements directs via l'API pour les clients de ce pays. Assurez-vous d'avoir testé l'intégration pour chaque opérateur local.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 rounded-3xl shadow-sm bg-muted/20 border-dashed border-2">
        <CardContent className="p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <div className="max-w-md mx-auto">
            <p className="font-black text-lg uppercase tracking-tight">Besoin d'un autre pays ?</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Nous étendons constamment notre couverture. Si votre pays cible n'est pas listé, contactez votre chargé de compte.
            </p>
          </div>
          <Button variant="outline" className="font-black h-10 px-8 rounded-xl uppercase tracking-widest text-[10px] border-border/60 hover:bg-background transition-all">
            Contacter le Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

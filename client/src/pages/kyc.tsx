import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Upload,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

type KycStatus = "not_started" | "pending" | "verified" | "rejected";

export default function KycPage() {
  const { toast } = useToast();

  const [kycStatus] = useState<KycStatus>("not_started");
  const [submitting, setSubmitting] = useState(false);
  const [docType, setDocType] = useState("cni");
  const [idNumber, setIdNumber] = useState("");
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber) {
      toast({ title: "Erreur", description: "Veuillez saisir le numero du document", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({
        title: "Documents soumis",
        description: "Votre verification est en cours. Vous serez notifie par email.",
      });
    }, 2000);
  };

  const getStatusConfig = (status: KycStatus) => {
    switch (status) {
      case "verified":
        return {
          badge: <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Verifie</Badge>,
          icon: <CheckCircle2 className="h-10 w-10 text-primary" />,
          title: "Identite verifiee",
          description: "Votre identite a ete verifiee avec succes. Vous avez acces a toutes les fonctionnalites.",
          bgColor: "bg-primary/10",
        };
      case "pending":
        return {
          badge: <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> En cours de verification</Badge>,
          icon: <Clock className="h-10 w-10 text-muted-foreground" />,
          title: "Verification en cours",
          description: "Vos documents sont en cours d'examen. Ce processus prend generalement 24 a 48 heures.",
          bgColor: "bg-muted",
        };
      case "rejected":
        return {
          badge: <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Rejete</Badge>,
          icon: <AlertCircle className="h-10 w-10 text-destructive" />,
          title: "Verification rejetee",
          description: "Veuillez soumettre a nouveau vos documents avec des informations correctes.",
          bgColor: "bg-destructive/10",
        };
      default:
        return {
          badge: <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Non verifie</Badge>,
          icon: <ShieldCheck className="h-10 w-10 text-muted-foreground" />,
          title: "Verification requise",
          description: "Verifiez votre identite pour acceder a toutes les fonctionnalites de SolvexPay.",
          bgColor: "bg-muted",
        };
    }
  };

  const statusConfig = getStatusConfig(kycStatus);

  return (
    <DashboardLayout title="Verification KYC" breadcrumbs={[{ label: "Verification KYC" }]}>
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className={`h-14 w-14 rounded-xl ${statusConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                {statusConfig.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-lg" data-testid="text-kyc-status-title">{statusConfig.title}</h3>
                  {statusConfig.badge}
                </div>
                <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
              </div>
            </div>
            {kycStatus !== "not_started" && kycStatus !== "rejected" && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold bg-primary text-primary-foreground">
                      1
                    </div>
                    <span className="text-xs text-muted-foreground">Documents</span>
                  </div>
                  <div className="h-px flex-1 bg-border min-w-4" />
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${kycStatus === "pending" || kycStatus === "verified" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      2
                    </div>
                    <span className="text-xs text-muted-foreground">Examen</span>
                  </div>
                  <div className="h-px flex-1 bg-border min-w-4" />
                  <div className="flex items-center gap-2">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${kycStatus === "verified" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      3
                    </div>
                    <span className="text-xs text-muted-foreground">Valide</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {(kycStatus === "not_started" || kycStatus === "rejected") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base" data-testid="text-kyc-form-title">Soumettre vos documents</CardTitle>
              <CardDescription>Remplissez le formulaire ci-dessous pour commencer la verification</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>Type de document</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger data-testid="select-doc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cni">Carte Nationale d'Identite (CNI)</SelectItem>
                      <SelectItem value="passport">Passeport</SelectItem>
                      <SelectItem value="permis">Permis de conduire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id-number">Numero du document</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="id-number"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="Entrez le numero de votre document"
                      className="pl-10"
                      required
                      data-testid="input-id-number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Recto du document</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover-elevate cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setDocFront(e.target.files?.[0] || null)}
                        className="hidden"
                        id="doc-front"
                        data-testid="input-doc-front"
                      />
                      <label htmlFor="doc-front" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">{docFront ? docFront.name : "Cliquez pour telecharger"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou PDF (max 5MB)</p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Verso du document</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover-elevate cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setDocBack(e.target.files?.[0] || null)}
                        className="hidden"
                        id="doc-back"
                        data-testid="input-doc-back"
                      />
                      <label htmlFor="doc-back" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">{docBack ? docBack.name : "Cliquez pour telecharger"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou PDF (max 5MB)</p>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Selfie avec le document</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover-elevate cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelfie(e.target.files?.[0] || null)}
                      className="hidden"
                      id="selfie"
                      data-testid="input-selfie"
                    />
                    <label htmlFor="selfie" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">{selfie ? selfie.name : "Prenez un selfie avec votre document"}</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG ou JPG (max 5MB)</p>
                    </label>
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting} data-testid="button-submit-kyc">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {submitting ? "Envoi en cours..." : "Soumettre pour verification"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {kycStatus === "pending" && (
          <Card>
            <CardContent className="py-10 text-center">
              <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Verification en cours</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Vos documents sont en cours d'examen par notre equipe. Ce processus prend generalement
                entre 24 et 48 heures. Vous recevrez un email de confirmation.
              </p>
            </CardContent>
          </Card>
        )}

        {kycStatus === "verified" && (
          <Card>
            <CardContent className="py-10 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold text-lg">Identite verifiee</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Votre identite a ete verifiee avec succes. Vous avez maintenant acces a toutes les
                fonctionnalites de SolvexPay.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
